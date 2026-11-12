#!/usr/bin/env python3
"""
Décor de l'accueil : un désert de dunes dessiné en courbes de niveau, comme une carte topographique.
Génère apps/web/public/accueil/dunes.svg (image fixe, légère, sans carte ni tuiles à charger).

  python3 scripts/build-landing-dunes.py

Relief inventé (graine fixe : le résultat est toujours le même) : de longues dunes ondulées poussées par le
vent, quelques dunes en étoile, et un fond qui ondule doucement. Une courbe sur cinq est plus marquée
(« courbe maîtresse ») comme sur les vraies cartes.
"""
import math
from pathlib import Path

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from scipy.ndimage import gaussian_filter  # noqa: E402

W, H = 1600, 1000  # taille du dessin (viewBox)
N = 520  # résolution de la grille de relief (colonnes)
OUT = Path(__file__).resolve().parent.parent / "apps/web/public/accueil/dunes.svg"

rng = np.random.default_rng(7)
nx, ny = N, int(N * H / W)
x = np.linspace(0, W, nx)
y = np.linspace(0, H, ny)
X, Y = np.meshgrid(x, y)


def noise(scale: float, amp: float = 1.0) -> np.ndarray:
    """Bruit lisse (aléatoire filtré) d'échelle `scale` pixels, normalisé entre -amp et amp."""
    n = gaussian_filter(rng.standard_normal((ny, nx)), sigma=scale * nx / W, mode="wrap")
    return amp * n / np.abs(n).max()


# Longues dunes (« seifs ») : crêtes orientées par le vent, ondulées, au profil dissymétrique
# (pente douce face au vent, face d'avalanche raide de l'autre côté).
angle = math.radians(-18)
u = X * math.cos(angle) + Y * math.sin(angle)
v = -X * math.sin(angle) + Y * math.cos(angle)
v = v + 70 * noise(300) + 18 * noise(110)
period = 112
t = (v / period) % 1.0
profile = np.where(t < 0.78, t / 0.78, (1 - t) / 0.22)  # dents de scie : pente douce, face raide
profile = profile ** 1.35
ridge_strength = 0.75 + 0.25 * noise(320)
dunes = profile * ridge_strength * (1 + 0.15 * np.sin(u / 95 + 2 * noise(200)))

# Dunes en étoile : quelques sommets isolés.
stars = np.zeros_like(X)
for cx, cy, r, hgt in [(1240, 300, 120, 1.5), (420, 760, 105, 1.25), (980, 820, 85, 1.0), (180, 220, 90, 1.1), (1450, 760, 95, 1.2)]:
    d = np.hypot(X - cx, Y - cy)
    a = np.arctan2(Y - cy, X - cx)
    arms = 1 + 0.28 * np.cos(3 * a + 0.6)  # trois bras
    stars += hgt * np.exp(-((d / (r * arms)) ** 2))

base = 0.35 * noise(500) + 0.08 * noise(180)
Z = dunes + 0.6 * stars + base
Z = gaussian_filter(Z, sigma=1.0)
Z = (Z - Z.min()) / (Z.max() - Z.min())

LEVELS = np.linspace(0.03, 0.99, 40)
fig = plt.figure()
cs = plt.contour(X, Y, Z, levels=LEVELS)


def simplify(pts: np.ndarray, eps: float) -> np.ndarray:
    """Ramer-Douglas-Peucker : garde la forme avec moins de points."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    nrm = np.hypot(*ab)
    if nrm == 0:
        d = np.hypot(*(pts - a).T)
    else:
        d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / nrm
    i = int(np.argmax(d))
    if d[i] > eps:
        left = simplify(pts[: i + 1], eps)
        right = simplify(pts[i:], eps)
        return np.vstack([left[:-1], right])
    return np.array([a, b])


def path_d(pts: np.ndarray) -> str:
    out = [f"M{pts[0][0]:.0f} {pts[0][1]:.0f}"]
    prev = pts[0]
    for p in pts[1:]:
        dx, dy = p[0] - prev[0], p[1] - prev[1]
        out.append(f"l{dx:.0f} {dy:.0f}")
        prev = np.round(prev + np.round([dx, dy]))
    return "".join(out)


groups: dict[str, list[str]] = {"minor": [], "major": []}
for k, segs in enumerate(cs.allsegs):
    kind = "major" if k % 5 == 2 else "minor"
    for seg in segs:
        if len(seg) < 6:
            continue
        pts = simplify(np.asarray(seg), 1.2)
        length = np.sum(np.hypot(*np.diff(pts, axis=0).T))
        if length < 40:
            continue
        groups[kind].append(path_d(pts))
plt.close(fig)

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">
<!-- Désert de dunes en courbes de niveau, généré par scripts/build-landing-dunes.py -->
<g fill="none" stroke="#D9B98A" stroke-linejoin="round" stroke-linecap="round">
<path stroke-opacity=".16" stroke-width="1" d="{''.join(groups['minor'])}"/>
<path stroke-opacity=".34" stroke-width="1.6" d="{''.join(groups['major'])}"/>
</g>
</svg>
"""
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(svg)
print(f"{OUT} : {len(svg) / 1024:.0f} Ko, {len(groups['minor'])} + {len(groups['major'])} courbes")
