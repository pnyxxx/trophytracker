/**
 * Le parcours illustré de l'accueil (Biarritz → Marrakech) : étapes racontées,
 * tracé routier approximatif et fonctions pour placer la 4L selon le défilement.
 * Données purement illustratives : la vraie trace de chaque équipage vient du GPS.
 */
import { haversineKm } from '@/lib/geo';

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
export const PATH: [number, number][] = [
  [-1.53571, 43.46484], [-1.65121, 43.37461], [-1.911, 43.28424], [-2.22207, 43.28574], [-2.28638, 43.25941], [-2.35598, 43.28563],
  [-2.43632, 43.19582], [-2.43662, 43.08641], [-2.63948, 42.92898], [-2.71233, 42.90537], [-2.69598, 42.88176], [-2.81868, 42.79876],
  [-2.87149, 42.70916], [-2.96808, 42.70257], [-3.11505, 42.62285], [-3.19887, 42.61482], [-3.56346, 42.39989], [-3.61212, 42.33885],
  [-3.81783, 42.31065], [-3.93737, 42.26424], [-4.2624, 42.04244], [-4.45169, 41.97294], [-4.77889, 41.63066], [-4.90657, 41.53144],
  [-5.01668, 41.51144], [-5.32577, 41.20889], [-5.4816, 41.14227], [-5.50862, 41.07834], [-5.64698, 40.98777], [-5.66642, 40.96821],
  [-5.66727, 40.87921], [-5.61856, 40.67057], [-5.67844, 40.45792], [-5.97195, 40.23662], [-6.12927, 40.05557], [-6.15727, 39.97354],
  [-6.35406, 39.84077], [-6.41182, 39.73264], [-6.39994, 39.55872], [-6.43654, 39.48301], [-6.39914, 39.40567], [-6.34959, 39.38803],
  [-6.27025, 39.16795], [-6.37835, 38.91138], [-6.37029, 38.54135], [-6.23184, 38.00518], [-6.21996, 37.83435], [-6.16617, 37.76393],
  [-6.18252, 37.68499], [-6.0857, 37.52844], [-5.92735, 37.04047], [-6.08972, 36.65372], [-5.89336, 36.45639], [-5.79786, 36.47217],
  [-5.66162, 36.41314], [-5.58107, 36.23701], [-5.49601, 36.17644], [-5.41098, 36.21315], [-5.46411, 36.13188], [-5.44829, 36.15577],
  [-5.51333, 35.87604], [-5.6285, 35.72522], [-5.7536, 35.66893], [-5.86338, 35.65217], [-5.9116, 35.67616], [-5.95705, 35.65071],
  [-6.02711, 35.4357], [-6.0132, 35.31679], [-6.06714, 35.27732], [-6.07189, 35.19784], [-6.14616, 35.14008], [-6.22779, 34.83921],
  [-6.36325, 34.73247], [-6.52379, 34.41435], [-6.50336, 34.29608], [-6.67352, 34.16239], [-6.7133, 34.0256], [-6.55276, 34.0168],
  [-6.44607, 33.91761], [-6.21103, 33.82261], [-5.85966, 33.81389], [-5.76361, 33.88049], [-5.6735, 33.89327], [-5.58858, 33.83599],
  [-5.51539, 33.83364], [-5.46859, 33.73141], [-5.37273, 33.68844], [-5.35709, 33.57556], [-5.17491, 33.43106], [-5.18443, 33.40505],
  [-5.07764, 33.28889], [-5.06813, 33.15452], [-5.0166, 33.07695], [-5.07175, 33.02875], [-5.06069, 32.93992], [-4.98768, 32.88438],
  [-4.94571, 32.87614], [-4.96134, 32.82335], [-4.90904, 32.73522], [-4.8418, 32.6977], [-4.57277, 32.65563], [-4.488, 32.57518],
  [-4.48725, 32.44078], [-4.5465, 32.31537], [-4.39162, 32.26037], [-4.36268, 32.11833], [-4.40282, 32.04717], [-4.47554, 32.02515],
  [-4.49744, 31.98144], [-4.24861, 31.84306], [-4.17823, 31.68513], [-4.20661, 31.61357], [-4.18481, 31.5291], [-4.23335, 31.43553],
  [-4.13592, 31.35574], [-4.16263, 31.26779], [-3.99763, 31.21516], [-4.5, 31.3], [-5.53, 31.51], [-6.33, 31.16],
  [-6.9, 30.92], [-7.38, 31.29], [-7.6, 31.42], [-7.98231, 31.58108],
];
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
