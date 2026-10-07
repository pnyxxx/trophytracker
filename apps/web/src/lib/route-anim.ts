/**
 * Parcours d'une trace pour les animations 3D (exemple de l'accueil, « Revivre le road trip ») :
 * position à une fraction du trajet, cap lissé (regard porté quelques centaines de mètres devant,
 * sinon la caméra tournerait à chaque lacet) et kilomètres parcourus.
 */
export type LonLat = [number, number];

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distM(a: LonLat, b: LonLat) {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Cap (degrés, 0 = nord) de a vers b. */
export function bearing(a: LonLat, b: LonLat) {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface Route {
  path: LonLat[];
  /** Distance cumulée (m) à chaque point. */
  cum: number[];
  total: number;
}

export function makeRoute(path: LonLat[]): Route {
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1]! + distM(path[i - 1]!, path[i]!));
  return { path, cum, total: cum.at(-1) ?? 0 };
}

/** Indice du dernier point avant la distance `d` (recherche dichotomique). */
function indexAt(r: Route, d: number) {
  let lo = 0;
  let hi = r.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (r.cum[mid]! <= d) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Position à la distance `d` (m) depuis le départ, interpolée entre deux points. */
export function pointAtDist(r: Route, d: number): LonLat {
  if (r.path.length === 0) return [0, 0];
  const dd = Math.max(0, Math.min(r.total, d));
  const i = indexAt(r, dd);
  const a = r.path[i]!;
  const b = r.path[Math.min(i + 1, r.path.length - 1)]!;
  const seg = r.cum[Math.min(i + 1, r.cum.length - 1)]! - r.cum[i]!;
  const t = seg > 0 ? (dd - r.cum[i]!) / seg : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Points de la trace jusqu'à la distance `d`, terminés par la position exacte (la trace qui « se dessine »). */
export function pathUntil(r: Route, d: number): LonLat[] {
  if (r.path.length === 0) return [];
  const i = indexAt(r, Math.max(0, Math.min(r.total, d)));
  return [...r.path.slice(0, i + 1), pointAtDist(r, d)];
}

/** Cap regardant `ahead` mètres devant : il suit la direction générale, pas chaque virage. */
export function headingAtDist(r: Route, d: number, ahead = 600) {
  const a = pointAtDist(r, d);
  const b = pointAtDist(r, Math.min(r.total, d + ahead));
  return a[0] === b[0] && a[1] === b[1] ? bearing(pointAtDist(r, Math.max(0, d - ahead)), a) : bearing(a, b);
}

/** Rapproche un angle d'une cible par le plus court chemin (lissage de la caméra). */
export function easeAngle(from: number, to: number, k: number) {
  const diff = ((to - from + 540) % 360) - 180;
  return (from + diff * k + 360) % 360;
}
