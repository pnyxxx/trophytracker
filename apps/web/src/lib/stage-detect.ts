/**
 * Étapes « intelligentes » : repère dans la trace GPS les endroits où le road trip s'est arrêté
 * (pause déjeuner, visite, nuit…), pour proposer aux voyageurs de les ajouter en un clic.
 *
 * Un arrêt = des positions qui restent à moins de `radiusM` d'un même point pendant au moins
 * `minStopS`. C'est une NUIT si l'arrêt dure plus de `nightS` ou s'il couvre 3 h du matin.
 * Le téléphone envoie peu de points à l'arrêt (un toutes les 30 min) : c'est la durée qui compte,
 * pas le nombre de points.
 */
import type { TrackPoint } from '@/hooks/useLiveTrack';

export interface Stay {
  lat: number;
  lon: number;
  /** Arrivée et départ (secondes) ; `leftAt` null si le road trip y est encore. */
  arrivedAt: number;
  leftAt: number | null;
  kind: 'start' | 'stop' | 'night';
  /** Durée de l'arrêt (secondes). */
  duration: number;
}

export interface DetectOptions {
  radiusM?: number;
  minStopS?: number;
  nightS?: number;
  /** Instant présent (secondes), pour savoir si le dernier arrêt est en cours. */
  now?: number;
}

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;
function dist(aLat: number, aLon: number, bLat: number, bLon: number) {
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** L'intervalle [from, to] (secondes) contient-il 3 h du matin, heure locale ? */
function coversSmallHours(from: number, to: number) {
  const d = new Date(from * 1000);
  d.setHours(3, 0, 0, 0);
  if (d.getTime() / 1000 < from) d.setDate(d.getDate() + 1);
  return d.getTime() / 1000 <= to;
}

export function detectStays(points: readonly TrackPoint[], opts: DetectOptions = {}): Stay[] {
  const radiusM = opts.radiusM ?? 350;
  const minStopS = opts.minStopS ?? 40 * 60;
  const nightS = opts.nightS ?? 5 * 3600;
  const now = opts.now ?? Date.now() / 1000;
  const stays: Stay[] = [];
  let i = 0;
  while (i < points.length) {
    const a = points[i]!;
    let j = i;
    let sumLat = a[0];
    let sumLon = a[1];
    while (j + 1 < points.length && dist(a[0], a[1], points[j + 1]![0], points[j + 1]![1]) <= radiusM) {
      j++;
      sumLat += points[j]![0];
      sumLon += points[j]![1];
    }
    const last = j === points.length - 1;
    // Dernier point d'un arrêt déjà commencé (au moins deux positions, à l'arrêt) : il dure jusqu'à maintenant.
    const stillThere = last && j > i && (points[j]![3] ?? 0) < 3;
    const end = stillThere ? Math.max(points[j]![2], Math.min(now, points[j]![2] + 6 * 3600)) : points[j]![2];
    const duration = end - a[2];
    if (duration >= minStopS) {
      const n = j - i + 1;
      const night = duration >= nightS || coversSmallHours(a[2], end);
      stays.push({
        lat: sumLat / n,
        lon: sumLon / n,
        arrivedAt: a[2],
        leftAt: stillThere ? null : points[j]![2],
        kind: i === 0 && !stillThere ? 'start' : night ? 'night' : 'stop',
        duration,
      });
      i = j + 1;
    } else {
      i++;
    }
  }
  return stays;
}

export interface KnownStage {
  lat: number;
  lon: number;
  arrived_at: string | null;
}

/** Garde les arrêts qui ne correspondent à aucune étape déjà créée (même endroit, même moment). */
export function newStays(stays: Stay[], stages: readonly KnownStage[], nearM = 600): Stay[] {
  return stays.filter((s) => !stages.some((st) => {
    if (dist(s.lat, s.lon, st.lat, st.lon) > nearM) return false;
    if (!st.arrived_at) return true;
    const t = new Date(st.arrived_at).getTime() / 1000;
    return t >= s.arrivedAt - 6 * 3600 && t <= (s.leftAt ?? s.arrivedAt + s.duration) + 6 * 3600;
  }));
}

/** Identifiant stable d'un arrêt (pour se souvenir de ceux qu'on a écartés). */
export const stayKey = (s: Pick<Stay, 'lat' | 'lon' | 'arrivedAt'>) => `${s.lat.toFixed(3)},${s.lon.toFixed(3)},${s.arrivedAt}`;

/** « 2 h 15 », « 45 min », « 1 nuit » */
export function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${String(rest).padStart(2, '0')}` : `${h} h`;
}
