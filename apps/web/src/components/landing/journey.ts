/**
 * Le parcours illustré de l'accueil (Biarritz → Marrakech) : étapes de l'édition 2027 jour par
 * jour (d'après 4ltrophy.com), tracé routier et fonctions pour placer la 4L selon le défilement.
 * Données illustratives : la vraie trace de chaque équipage vient du GPS.
 */
import { haversineKm } from '@/lib/geo';
// Partagé avec scripts/demo-trace.mjs : la trace de démo de J4L Club suit exactement ce tracé.
import ROAD_PATH from './road-path.json';

export interface JourneyStop {
  kind: string;
  name: string;
  country: string;
  cc: string;
  lat: number;
  lon: number;
  text: string;
  /** Jours du raid passés à l'étape (J1 = ouverture du village départ). */
  days: [number, number];
  /** Panneau sur la carte : net (par défaut), flou, ou aucun (lieu déjà signalé). */
  sign?: 'blurred' | null;
  /** Kilomètre de l'étape sur la route depuis Biarritz. */
  km: number;
}

/** Distance officielle annoncée par l'organisation (aller-retour compris). */
export const TOTAL_KM = 6000;
/** Durée du raid, du village départ à la traversée retour. */
export const TOTAL_DAYS = 12;

// Une étape par jour de route. Les boucles autour de Merzouga sont un tracé illustratif.
const WP: Omit<JourneyStop, 'km'>[] = [
  { kind: 'Village départ', name: 'Biarritz', country: 'France', cc: 'FR', lat: 43.46484, lon: -1.53571, days: [1, 2], text: 'Deux jours de contrôles au village départ, puis les 4L s’élancent. À la maison, vous ouvrez un lien : pas d’appli, pas de compte.' },
  { kind: 'Étape libre · première nuit', name: 'Salamanque', country: 'Espagne', cc: 'ES', lat: 40.96821, lon: -5.66642, days: [3, 3], text: 'Première nuit en Espagne. La trace se dessine en temps réel, kilomètre après kilomètre, sans recharger la page.' },
  { kind: 'Bivouac avant la traversée', name: 'Algésiras', country: 'Espagne', cc: 'ES', lat: 36.21315, lon: -5.41098, days: [4, 4], text: 'Premier bivouac, au bout de l’Europe. Demain matin, embarquement pour l’Afrique.' },
  { kind: 'Traversée · bivouac du Moyen Atlas', name: 'Boulajoul', country: 'Maroc', cc: 'MA', lat: 32.88438, lon: -4.98768, days: [5, 5], text: 'Deux heures de ferry jusqu’à Tanger Med, puis la route du Moyen Atlas. Plus de réseau ? Le téléphone garde les points en mémoire et complète la trace dès qu’il capte.' },
  { kind: 'Arrivée dans les dunes', name: 'Merzouga', country: 'Maroc', cc: 'MA', lat: 31.21516, lon: -3.99763, days: [6, 6], text: 'Première étape d’orientation jusqu’à l’Erg Chebbi. Les photos du soir arrivent sur la page de l’équipage.' },
  { kind: 'Boucle dans le désert · Merzouga', name: 'Boucle 1', country: 'Maroc', cc: 'MA', lat: 31.21516, lon: -3.99763, days: [7, 7], sign: null, text: 'Une journée de boucle au roadbook et à la boussole, retour au bivouac le soir. Les 360° pour y être presque.' },
  { kind: 'Boucle dans le désert · Merzouga', name: 'Boucle 2', country: 'Maroc', cc: 'MA', lat: 31.21516, lon: -3.99763, days: [8, 8], sign: null, text: 'Deuxième boucle dans les dunes. Les sponsors y sont aussi : leur logo sur la carte, au milieu du Sahara.' },
  { kind: 'Étape marathon · nuit en autonomie', name: 'Marathon', country: 'Maroc', cc: 'MA', lat: 30.69721, lon: -6.24786, days: [9, 9], sign: 'blurred', text: 'Merzouga – Marrakech d’une traite : 48 heures en totale autonomie, et une nuit en plein désert, loin de tout.' },
  { kind: 'Arrivée', name: 'Marrakech', country: 'Maroc', cc: 'MA', lat: 31.58108, lon: -7.98231, days: [10, 12], text: 'Fin du marathon par le Haut Atlas et la ligne d’arrivée. Remise des prix le lendemain, puis le bateau du retour : une trace souvenir complète.' },
];

/**
 * Lieux traversés qui ne sont pas des fins d'étape : le port d'arrivée au Maroc, et les villes de
 * l'étape marathon (Merzouga → Marrakech), dont les panneaux sont flous sur la carte.
 */
export const PASSAGES: { name: string; lat: number; lon: number; blurred?: boolean }[] = [
  { name: 'Tanger Med', lat: 35.87604, lon: -5.51333 },
  { name: 'Tazarine', lat: 30.77971, lon: -5.56691, blurred: true },
  { name: 'Ouarzazate', lat: 30.9205, lon: -6.89998, blurred: true },
  { name: 'Tizi n’Tichka', lat: 31.2877, lon: -7.38261, blurred: true },
];

/**
 * Tracé [lon, lat] qui suit les routes (vraie trace de Biarritz à Merzouga, deux boucles illustratives
 * dans le désert, puis l'itinéraire routier du marathon par Tazarine, Ouarzazate et le Tichka) ;
 * chaque étape est un sommet exact du tracé.
 */
export const PATH = ROAD_PATH as [number, number][];
// Merzouga revient trois fois (arrivée puis deux boucles) : on cherche chaque étape après la précédente.
const STOP_PATH_IDX: number[] = [];
WP.forEach((w) => {
  const from = (STOP_PATH_IDX.at(-1) ?? -1) + 1;
  const i = PATH.findIndex(([lon, lat], k) => k >= from && lon === w.lon && lat === w.lat);
  if (i < 0) throw new Error(`Étape ${w.name} absente du tracé`);
  STOP_PATH_IDX.push(i);
});

// Tracé densifié (un point tous les ~6 km) et distance cumulée : la 4L avance à vitesse régulière.
export const DENSE: [number, number][] = [PATH[0]!];
const CUM: number[] = [0];
const stopDenseIdx: number[] = [0];
PATH.forEach((pt, i) => {
  if (!i) return;
  const a = PATH[i - 1]!;
  const d = haversineKm(a[1], a[0], pt[1], pt[0]);
  const n = Math.max(1, Math.ceil(d / 6));
  for (let k = 1; k <= n; k++) {
    DENSE.push([a[0] + ((pt[0] - a[0]) * k) / n, a[1] + ((pt[1] - a[1]) * k) / n]);
    CUM.push(CUM.at(-1)! + d / n);
  }
  if (STOP_PATH_IDX.includes(i)) stopDenseIdx.push(DENSE.length - 1);
});
const LEN = CUM.at(-1)!;

/** Position (0 → 1) de chaque étape le long du tracé. */
export const STOP_FRAC = stopDenseIdx.map((i) => CUM[i]! / LEN);

/** Longueur de la route, de Biarritz à Marrakech (≈ 2 400 km). */
export const ROUTE_KM = Math.round(LEN);

export const STOPS: JourneyStop[] = WP.map((w, i) => ({ ...w, km: Math.round(CUM[stopDenseIdx[i]!]!) }));

/** Kilomètre de la 4L pour une progression p (0 → 1). */
export const kmAt = (p: number) => Math.round(Math.min(1, Math.max(0, p)) * LEN);

/**
 * Étape en cours pour une progression p : celle qu'on est en train de rouler (chaque étape est une
 * journée, de l'étape précédente jusqu'à celle-ci), ou celle où l'on se trouve à l'arrêt.
 */
export const stageAt = (p: number) => {
  const i = STOP_FRAC.findIndex((f) => f >= p - 0.012);
  return i === -1 ? STOPS.length - 1 : i;
};

/** Jour du raid : sur la route, le jour de l'étape ; à l'arrêt, les jours qu'on y passe (« 1–2 »). */
export function dayAt(p: number): string {
  const i = stageAt(p);
  const [a, b] = STOPS[i]!.days;
  return i > 0 && p < STOP_FRAC[i]! - 0.012 ? String(a) : a === b ? String(a) : `${a}–${b}`;
}

/**
 * Tracé SANS les boucles de Merzouga (tracé illustratif) : quand le tracé revient sur une étape
 * (Merzouga), on retire le détour fait depuis. Seulement sur les étapes : l'arrivée et le départ du
 * marathon partagent la route de Rissani, qu'il faut garder. C'est la route de référence du
 * roadbook des équipages (kilomètres des étapes, barre de progression).
 */
export const MAIN_PATH: [number, number][] = [];
const STOP_KEYS = new Set(WP.map((w) => [w.lon, w.lat].join()));
PATH.forEach((pt) => {
  const at = STOP_KEYS.has(pt.join()) ? MAIN_PATH.findIndex((p) => p[0] === pt[0] && p[1] === pt[1]) : -1;
  if (at >= 0) MAIN_PATH.splice(at + 1);
  else MAIN_PATH.push(pt);
});

/** Route de référence densifiée (un point tous les ~2 km) et son kilométrage cumulé. */
export const MAIN_ROUTE: { pts: [number, number][]; cum: number[] } = { pts: [MAIN_PATH[0]!], cum: [0] };
MAIN_PATH.forEach((pt, i) => {
  if (!i) return;
  const a = MAIN_PATH[i - 1]!;
  const d = haversineKm(a[1], a[0], pt[1], pt[0]);
  const n = Math.max(1, Math.ceil(d / 2));
  for (let k = 1; k <= n; k++) {
    MAIN_ROUTE.pts.push([a[0] + ((pt[0] - a[0]) * k) / n, a[1] + ((pt[1] - a[1]) * k) / n]);
    MAIN_ROUTE.cum.push(MAIN_ROUTE.cum.at(-1)! + d / n);
  }
});

/**
 * Tracé allégé pour la carte de la page Équipages : suit la route à ~`toleranceKm`
 * près (moins détaillé que l'accueil), sans les boucles de Merzouga, et passe exactement par chaque
 * étape et chaque lieu traversé.
 */
function simplifiedRoute(toleranceKm: number): [number, number][] {
  const keep = new Set([...WP, ...PASSAGES].map((w) => [w.lon, w.lat].join()));
  const path = MAIN_PATH;
  // Distance (km) d'un point au segment [a, b], en projection plane locale.
  const off = (p: [number, number], a: [number, number], b: [number, number]) => {
    const k = Math.cos((a[1] * Math.PI) / 180);
    const [ax, ay, bx, by, px, py] = [a[0] * k, a[1], b[0] * k, b[1], p[0] * k, p[1]];
    const [dx, dy] = [bx - ax, by - ay];
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy) * 111;
  };
  // Douglas-Peucker, appliqué entre deux lieux à garder.
  const rdp = (pts: [number, number][]): [number, number][] => {
    if (pts.length < 3) return pts;
    let [far, dist] = [0, 0];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = off(pts[i]!, pts[0]!, pts.at(-1)!);
      if (d > dist) [far, dist] = [i, d];
    }
    return dist > toleranceKm ? [...rdp(pts.slice(0, far + 1)).slice(0, -1), ...rdp(pts.slice(far))] : [pts[0]!, pts.at(-1)!];
  };
  const out: [number, number][] = [path[0]!];
  let from = 0;
  path.forEach((pt, i) => {
    if (i && (keep.has(pt.join()) || i === path.length - 1)) {
      out.push(...rdp(path.slice(from, i + 1)).slice(1));
      from = i;
    }
  });
  return out;
}

export const ROUTE_LINE = simplifiedRoute(5);

/** Pays traversé (code ISO) à une position : la frontière est à Hendaye, le Maroc commence à Tanger. */
export const countryAt = ([lon, lat]: [number, number]) => (lat < 35.95 ? 'MA' : lat > 43.35 && lon > -1.79 ? 'FR' : 'ES');

/**
 * Kilomètre sur la route de référence (sans les boucles) du point le plus proche de (lat, lon),
 * ou null s'il est à plus de 15 km du tracé : sert à placer les étapes officielles sur le roadbook.
 */
export function routeKmOf(lat: number, lon: number): number | null {
  let best = Infinity;
  let at = 0;
  MAIN_ROUTE.pts.forEach(([x, y], i) => {
    const d = haversineKm(lat, lon, y, x);
    if (d < best) [best, at] = [d, i];
  });
  return best <= 15 ? Math.round(MAIN_ROUTE.cum[at]!) : null;
}

export const idxAt = (p: number) => {
  const target = p * LEN;
  let lo = 0;
  let hi = CUM.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (CUM[m]! <= target) lo = m;
    else hi = m;
  }
  return lo;
};

/** Coordonnées [lon, lat] de la 4L pour une progression p (0 → 1). */
export const posAt = (p: number): [number, number] => {
  p = Math.min(1, Math.max(0, p));
  const i = idxAt(p);
  const j = Math.min(DENSE.length - 1, i + 1);
  const seg = CUM[j]! - CUM[i]! || 1;
  const t = (p * LEN - CUM[i]!) / seg;
  return [DENSE[i]![0] + (DENSE[j]![0] - DENSE[i]![0]) * t, DENSE[i]![1] + (DENSE[j]![1] - DENSE[i]![1]) * t];
};

const bearing = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180;
  const y = Math.sin((b[0] - a[0]) * r) * Math.cos(b[1] * r);
  const x = Math.cos(a[1] * r) * Math.sin(b[1] * r) - Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos((b[0] - a[0]) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
};

/** Cap (en degrés) de la 4L à la progression p. */
export const headingAt = (p: number) => (p > 0.96 ? bearing(posAt(p - 0.04), posAt(p)) : bearing(posAt(p), posAt(p + 0.04)));

/** « 6000 » → « 6 000 » */
export const fmtKm = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Panneau d'entrée de ville (cadre gris, bord rouge) en HTML, pour les marqueurs de carte. */
export function citySignHtml(name: string, blurred = false) {
  const safe = name.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  return `<div style="background:#C9CDD2;${blurred ? 'filter:blur(3px);' : ''}padding:3px;border-radius:6px;box-shadow:0 6px 14px rgba(0,0,0,.5)"><div style="background:#fff;border:3px solid #D22B2B;border-radius:3px;padding:3px 9px;font:800 14px 'Big Shoulders Display',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#111;white-space:nowrap">${safe}</div></div><div style="width:2px;height:18px;background:#C9CDD2"></div><div style="width:6px;height:6px;border-radius:50%;background:#F4ECDF;box-shadow:0 0 0 2px rgba(0,0,0,.4)"></div>`;
}
