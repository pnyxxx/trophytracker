/**
 * Le parcours illustré de l'accueil (Biarritz → Marrakech) : étapes racontées,
 * tracé routier approximatif et fonctions pour placer la 4L selon le défilement.
 * Données purement illustratives : la vraie trace de chaque équipage vient du GPS.
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
  /** Kilomètre de l'étape sur un parcours total de TOTAL_KM. */
  km: number;
}

export const TOTAL_KM = 6000;

const WP: Omit<JourneyStop, 'km'>[] = [
  { kind: 'Village départ', name: 'Biarritz', country: 'France', cc: 'FR', lat: 43.46484, lon: -1.53571, text: 'Les 4L s’alignent au village départ. À la maison, vous ouvrez un lien. C’est tout : pas d’appli, pas de compte.' },
  { kind: 'Étape de nuit', name: 'Salamanque', country: 'Espagne', cc: 'ES', lat: 40.96821, lon: -5.66642, text: 'Première nuit en Espagne. La trace se dessine en temps réel, kilomètre après kilomètre, sans recharger la page.' },
  { kind: 'Traversée vers le Maroc', name: 'Algésiras', country: 'Espagne', cc: 'ES', lat: 36.21315, lon: -5.41098, text: 'Le ferry. Plus de réseau ? Le téléphone garde les points en mémoire et complète la trace dès qu’il capte.' },
  { kind: 'Bivouac', name: 'Boulajoul', country: 'Maroc', cc: 'MA', lat: 32.88438, lon: -4.98768, text: 'Premier bivouac. Les photos du soir arrivent sur la page — et les 360° pour y être presque.' },
  { kind: 'Dunes de l’Erg Chebbi', name: 'Merzouga', country: 'Maroc', cc: 'MA', lat: 31.21516, lon: -3.99763, text: 'Les dunes. Les sponsors y sont aussi : leur logo sur la carte, au milieu du Sahara.' },
  { kind: 'Arrivée', name: 'Marrakech', country: 'Maroc', cc: 'MA', lat: 31.58108, lon: -7.98231, text: 'Ligne d’arrivée. Une trace souvenir complète, du premier au dernier kilomètre.' },
];

/**
 * Tracé [lon, lat] qui suit les routes (de Biarritz au village de Merzouga, puis approximatif
 * jusqu'à Marrakech) ; chaque étape est un sommet exact du tracé.
 */
export const PATH = ROAD_PATH as [number, number][];
const STOP_PATH_IDX = WP.map((w) => PATH.findIndex(([lon, lat]) => lon === w.lon && lat === w.lat));

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

export const STOPS: JourneyStop[] = WP.map((w, i) => ({ ...w, km: Math.round(STOP_FRAC[i]! * TOTAL_KM) }));

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
export function citySignHtml(name: string) {
  const safe = name.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  return `<div style="background:#C9CDD2;padding:3px;border-radius:6px;box-shadow:0 6px 14px rgba(0,0,0,.5)"><div style="background:#fff;border:3px solid #D22B2B;border-radius:3px;padding:3px 9px;font:800 14px 'Big Shoulders Display',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#111;white-space:nowrap">${safe}</div></div><div style="width:2px;height:18px;background:#C9CDD2"></div><div style="width:6px;height:6px;border-radius:50%;background:#F4ECDF;box-shadow:0 0 0 2px rgba(0,0,0,.4)"></div>`;
}
