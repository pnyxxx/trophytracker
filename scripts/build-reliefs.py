#!/usr/bin/env python3
"""
Fonds du site : des reliefs inventés dessinés en courbes de niveau, comme une carte topographique, tous dans la
même palette sable. Génère apps/web/public/fonds/<relief>.svg (images fixes et légères, rien à charger d'autre).

  python3 scripts/build-reliefs.py            # tous les reliefs
  python3 scripts/build-reliefs.py montagnes  # un seul

Reliefs (graine fixe : le résultat est toujours le même) :
  - dunes     : longues dunes ondulées poussées par le vent, quelques dunes en étoile (accueil) ;
  - montagnes : crêtes vives, sommets et vallées (page d'un road trip, création) ;
  - canyon    : plateaux en terrasses entaillés par une rivière qui serpente (espace voyageur) ;
  - collines  : vallons doux et arrondis (compte, connexion, pages d'information).
Une courbe sur cinq est plus marquée (« courbe maîtresse »), comme sur les vraies cartes.
"""
import math
import sys
from pathlib import Path

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from scipy.ndimage import gaussian_filter  # noqa: E402

W, H = 1600, 1000  # taille du dessin (viewBox)
N = 520  # résolution de la grille de relief (colonnes)
OUT = Path(__file__).resolve().parent.parent / "apps/web/public/fonds"

nx, ny = N, int(N * H / W)
X, Y = np.meshgrid(np.linspace(0, W, nx), np.linspace(0, H, ny))


def make_noise(seed: int):
    rng = np.random.default_rng(seed)

    def noise(scale: float) -> np.ndarray:
        """Bruit lisse (aléatoire filtré) d'échelle `scale` pixels, entre -1 et 1."""
        n = gaussian_filter(rng.standard_normal((ny, nx)), sigma=scale * nx / W, mode="wrap")
        return n / np.abs(n).max()

    return noise


def dunes() -> np.ndarray:
    noise = make_noise(7)
    angle = math.radians(-18)
    u = X * math.cos(angle) + Y * math.sin(angle)
    v = -X * math.sin(angle) + Y * math.cos(angle)
    v = v + 70 * noise(300) + 18 * noise(110)
    t = (v / 112) % 1.0
    profile = np.where(t < 0.78, t / 0.78, (1 - t) / 0.22) ** 1.35  # pente douce, face d'avalanche raide
    dunes = profile * (0.75 + 0.25 * noise(320)) * (1 + 0.15 * np.sin(u / 95 + 2 * noise(200)))
    stars = np.zeros_like(X)
    for cx, cy, r, hgt in [(1240, 300, 120, 1.5), (420, 760, 105, 1.25), (980, 820, 85, 1.0), (180, 220, 90, 1.1), (1450, 760, 95, 1.2)]:
        d = np.hypot(X - cx, Y - cy)
        arms = 1 + 0.28 * np.cos(3 * np.arctan2(Y - cy, X - cx) + 0.6)  # trois bras
        stars += hgt * np.exp(-((d / (r * arms)) ** 2))
    return dunes + 0.6 * stars + 0.35 * noise(500) + 0.08 * noise(180)


def montagnes() -> np.ndarray:
    noise = make_noise(21)
    # Bruit « en crêtes » : 1 - |bruit| fait de longues arêtes vives là où le bruit passe par zéro ;
    # deux échelles seulement, pour des lignes de crête lisibles plutôt qu'un semis de bosses.
    ridges = (1 - np.abs(noise(320))) ** 4 + 0.45 * (1 - np.abs(noise(160))) ** 4
    # Une grande chaîne en diagonale, plus haute au centre.
    chain = np.exp(-(((Y - 0.55 * X - 120) / 420) ** 2))
    return ridges * (0.45 + 0.9 * chain) + 0.2 * noise(700) + 0.03 * noise(60)


def canyon() -> np.ndarray:
    noise = make_noise(33)
    base = 0.6 * noise(520) + 0.25 * noise(200) + 0.08 * noise(70)
    base = (base - base.min()) / (base.max() - base.min())
    steps = 6
    q = np.floor(base * steps)
    frac = base * steps - q
    terraces = (q + frac ** 7) / steps  # plateaux plats, falaises raides
    # Une rivière qui serpente creuse une gorge profonde dans le plateau.
    river_y = 520 + 160 * np.sin(X / 260 + 0.6) + 55 * np.sin(X / 97) + 40 * noise(300)
    d = np.abs(Y - river_y)
    gorge = np.clip((d - 18) / 120, 0, 1)
    return terraces * (0.15 + 0.85 * gorge ** 0.5) + 0.04 * noise(40)


def collines() -> np.ndarray:
    noise = make_noise(55)
    return noise(380) + 0.6 * noise(190) + 0.3 * noise(95) + 0.08 * noise(45)


RELIEFS = {
    "dunes": (dunes, 40, 1.0),
    "montagnes": (montagnes, 50, 0.9),
    "canyon": (canyon, 60, 0.7),
    "collines": (collines, 48, 1.0),
}


def simplify(pts: np.ndarray, eps: float) -> np.ndarray:
    """Ramer-Douglas-Peucker : garde la forme avec moins de points."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    nrm = np.hypot(*ab)
    d = np.hypot(*(pts - a).T) if nrm == 0 else np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / nrm
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([simplify(pts[: i + 1], eps)[:-1], simplify(pts[i:], eps)])
    return np.array([a, b])


def path_d(pts: np.ndarray) -> str:
    out = [f"M{pts[0][0]:.0f} {pts[0][1]:.0f}"]
    prev = np.round(pts[0])
    for p in pts[1:]:
        step = np.round(p - prev)
        out.append(f"l{step[0]:.0f} {step[1]:.0f}")
        prev = prev + step
    return "".join(out)


def build(name: str) -> None:
    fn, n_levels, smooth = RELIEFS[name]
    z = gaussian_filter(fn(), sigma=smooth)
    z = (z - z.min()) / (z.max() - z.min())
    fig = plt.figure()
    cs = plt.contour(X, Y, z, levels=np.linspace(0.03, 0.99, n_levels))
    groups: dict[str, list[str]] = {"minor": [], "major": []}
    for k, segs in enumerate(cs.allsegs):
        kind = "major" if k % 5 == 2 else "minor"
        for seg in segs:
            if len(seg) < 6:
                continue
            pts = simplify(np.asarray(seg), 1.2)
            if np.sum(np.hypot(*np.diff(pts, axis=0).T)) < 40:
                continue
            groups[kind].append(path_d(pts))
    plt.close(fig)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">
<!-- Relief « {name} » en courbes de niveau, généré par scripts/build-reliefs.py -->
<g fill="none" stroke="#D9B98A" stroke-linejoin="round" stroke-linecap="round">
<path stroke-opacity=".16" stroke-width="1" d="{''.join(groups['minor'])}"/>
<path stroke-opacity=".34" stroke-width="1.6" d="{''.join(groups['major'])}"/>
</g>
</svg>
"""
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}.svg").write_text(svg)
    print(f"{name:10s} {len(svg) / 1024:4.0f} Ko · {len(groups['minor'])} + {len(groups['major'])} courbes")


if __name__ == "__main__":
    for name in sys.argv[1:] or RELIEFS:
        build(name)
