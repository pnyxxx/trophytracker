/**
 * Horloge de l'équipage de DÉMONSTRATION (crews.is_demo).
 *
 * Le service tracker lui fait rejouer en boucle un vrai trajet, de Saint-Quentin à Merzouga
 * (apps/tracker/src/demo.ts), avec de vraies heures de positions. Pour que sa page montre le raid
 * comme s'il avait lieu maintenant (« J4 / 12 », étape en cours, dénivelé par jour…), on traduit
 * chaque instant réel en heure DU RAID : la conduite se déroule en temps réel, les nuits et le
 * village départ (raccourcis à quelques minutes) sautent à l'heure du départ suivant.
 * La correspondance est générée avec le trajet (scripts/build-demo-route.mjs).
 */
import type { TrackPoint } from '@/hooks/useLiveTrack';
import DEMO from './demo-clock.json';

const EPOCH = Date.parse(DEMO.epoch);
const CYCLE_MS = DEMO.cycleS * 1000;
/** [seconde du tour, seconde du raid depuis le jour 1 à 0 h] */
const CLOCK = DEMO.clock as [number, number][];

/** Minuit (heure locale) du premier jour du raid. */
function dayOne(startDate: string) {
  const [y, m, d] = startDate.split('-').map(Number);
  return new Date(y!, m! - 1, d!).getTime();
}

/** Heure du raid (ms) correspondant à l'instant réel `t` (ms). */
export function demoRaidTime(startDate: string, t: number): number {
  const s = (t - (EPOCH + Math.floor((t - EPOCH) / CYCLE_MS) * CYCLE_MS)) / 1000;
  const k = Math.max(0, CLOCK.findIndex(([r], i) => i === CLOCK.length - 1 || CLOCK[i + 1]![0] > s));
  const [r0, v0] = CLOCK[k]!;
  const [r1, v1] = CLOCK[Math.min(k + 1, CLOCK.length - 1)]!;
  const v = r1 > r0 ? v0 + ((v1 - v0) * Math.min(1, Math.max(0, (s - r0) / (r1 - r0)))) : v0;
  return dayOne(startDate) + v * 1000;
}

/** Trace avec les heures du raid à la place des heures réelles. */
export function demoTrack(points: TrackPoint[], startDate: string): TrackPoint[] {
  return points.map(([lat, lon, t, speed, alt]) => [lat, lon, demoRaidTime(startDate, t * 1000) / 1000, speed, alt]);
}
