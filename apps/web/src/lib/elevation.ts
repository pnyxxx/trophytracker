/**
 * Profil d'élévation RÉEL d'un équipage, à partir de l'altitude envoyée par le téléphone avec
 * chaque position (Traccar Client). Pas de donnée externe : si le téléphone n'envoie pas
 * l'altitude, il n'y a pas de profil (et la section ne s'affiche pas).
 *
 * L'altitude GPS d'un téléphone est bruitée (± 10-20 m) : on la lisse (médiane glissante) et on
 * ne compte une montée ou une descente qu'au-delà d'un seuil, sinon le dénivelé serait gonflé
 * par le bruit, même sur une route plate.
 */
import { haversineKm } from './geo';
import { dayOfTrip } from './days';

export interface AltPoint {
  /** Kilomètre parcouru depuis le premier point de la trace (distance GPS). */
  km: number;
  /** Altitude lissée (m). */
  alt: number;
  /** Jour du raid du point (1 = départ), null sans date de départ. */
  day: number | null;
}

export interface Climb {
  km: number;
  up: number;
  down: number;
  max: number;
  maxKm: number;
  min: number;
}

/** Il faut assez de points avec altitude pour qu'un profil ait un sens. */
export const MIN_ALT_POINTS = 20;
/** Fenêtre de la médiane glissante (points). */
const MEDIAN_WINDOW = 5;
/** Seuil anti-bruit pour les dénivelés (m). */
const HYSTERESIS_M = 10;

type TrackLike = readonly [number, number, number, ...unknown[]];

/** Points de la trace qui ont une altitude, kilométrés et lissés ; null si trop peu. */
export function altitudeProfile(points: readonly TrackLike[], startDate: string | null): AltPoint[] | null {
  const raw: { km: number; alt: number; t: number }[] = [];
  let km = 0;
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (prev) km += haversineKm(prev[0], prev[1], p[0], p[1]);
    const alt = p[4];
    if (typeof alt === 'number' && Number.isFinite(alt)) raw.push({ km, alt, t: p[2] });
  });
  if (raw.length < MIN_ALT_POINTS) return null;

  const half = Math.floor(MEDIAN_WINDOW / 2);
  return raw.map((r, i) => {
    const win = raw.slice(Math.max(0, i - half), i + half + 1).map((w) => w.alt).sort((a, b) => a - b);
    return {
      km: r.km,
      alt: Math.round(win[Math.floor(win.length / 2)]!),
      day: startDate ? dayOfTrip(startDate, new Date(r.t * 1000)) : null,
    };
  });
}

/** Distance, dénivelés positif / négatif et altitudes extrêmes d'une portion de profil. */
export function climbOf(pts: readonly AltPoint[]): Climb | null {
  if (pts.length < 2) return null;
  let [up, down] = [0, 0];
  let ref = pts[0]!.alt;
  let max = pts[0]!;
  let min = pts[0]!.alt;
  for (const p of pts) {
    const diff = p.alt - ref;
    if (diff >= HYSTERESIS_M) [up, ref] = [up + diff, p.alt];
    else if (diff <= -HYSTERESIS_M) [down, ref] = [down - diff, p.alt];
    if (p.alt > max.alt) max = p;
    min = Math.min(min, p.alt);
  }
  return {
    km: Math.round(pts.at(-1)!.km - pts[0]!.km),
    up: Math.round(up / 10) * 10,
    down: Math.round(down / 10) * 10,
    max: max.alt,
    maxKm: max.km,
    min,
  };
}

/** Points des jours [from, to] du raid. */
export const pointsOfDays = (pts: readonly AltPoint[], from: number, to: number) =>
  pts.filter((p) => p.day != null && p.day >= from && p.day <= to);

/** Allège un profil pour le dessin (au plus `max` points, en gardant les extrêmes de chaque paquet). */
export function thin(pts: readonly AltPoint[], max = 600): AltPoint[] {
  if (pts.length <= max) return [...pts];
  const step = pts.length / (max / 2);
  const out: AltPoint[] = [];
  for (let i = 0; i < pts.length; i += step) {
    const chunk = pts.slice(Math.floor(i), Math.floor(i + step));
    if (!chunk.length) continue;
    let [lo, hi] = [chunk[0]!, chunk[0]!];
    for (const p of chunk) {
      if (p.alt < lo.alt) lo = p;
      if (p.alt > hi.alt) hi = p;
    }
    out.push(...(lo.km <= hi.km ? [lo, hi] : [hi, lo]));
  }
  return out;
}
