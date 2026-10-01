/**
 * Où en est un équipage sur le parcours : jour du raid, étape en cours, sous-étapes (boucles).
 *
 * Au 4L Trophy, chaque étape a son jour : c'est LA DATE qui choisit l'étape (J7 = Boucle 1,
 * J8 = Boucle 2, J9 = départ du marathon…). Le GPS ne sert qu'à préciser où en est l'équipage
 * dans sa journée, en distance à vol d'oiseau :
 *  - étape de route : « En route » tant que la 4L n'est pas passée à moins de 10 km de l'étape,
 *    puis « Sur place » ;
 *  - boucle : « Au départ » au bivouac, « En cours » dès qu'elle s'en éloigne de plus de 5 km,
 *    « Faite » quand elle revient à moins de 3 km ;
 *  - sans position GPS : l'étape du programme, signalée comme telle.
 */
import { haversineKm } from './geo';

// ─── Calendrier ─────────────────────────────────────────────────────────────

export interface RaidDay {
  /** before : avant le départ ; during : pendant ; after : terminé ; unknown : dates non réglées. */
  phase: 'before' | 'during' | 'after' | 'unknown';
  /** Jour du raid (1 = jour du départ officiel), null avant le départ ou sans date. */
  day: number | null;
  /** Durée du raid en jours (date de fin incluse). */
  total: number | null;
  /** Jours restants avant le départ (phase « before »). */
  daysUntil: number | null;
}

/** Nombre de jours calendaires entre deux dates locales (« AAAA-MM-JJ » ou Date). */
function dayIndex(d: string | Date) {
  if (typeof d === 'string') {
    const [y, m, day] = d.split('-').map(Number);
    return Date.UTC(y!, m! - 1, day!) / 86_400_000;
  }
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
}

/** Jour du raid (1 = jour du départ) d'un instant donné, sans borne. */
export const dayOfRaid = (startDate: string, at: Date) => dayIndex(at) - dayIndex(startDate) + 1;

/**
 * Jour du raid à la date `now`, en jours CALENDAIRES (J1 toute la journée du départ, J2 dès minuit) ;
 * s'arrête à la date de fin au lieu de compter indéfiniment.
 */
export function raidDay(startDate: string | null, endDate: string | null, now: Date = new Date()): RaidDay {
  if (!startDate) return { phase: 'unknown', day: null, total: null, daysUntil: null };
  const day = dayOfRaid(startDate, now);
  const total = endDate ? dayIndex(endDate) - dayIndex(startDate) + 1 : null;
  if (day < 1) return { phase: 'before', day: null, total, daysUntil: 1 - day };
  if (total != null && day > total) return { phase: 'after', day: null, total, daysUntil: null };
  return { phase: 'during', day, total, daysUntil: null };
}

// ─── Étape en cours ─────────────────────────────────────────────────────────

interface Place {
  lat: number;
  lon: number;
  dayStart: number | null;
  dayEnd: number | null;
}

export interface StageInput extends Place {
  /** Kilomètre de l'étape sur la route (pour la barre de progression). */
  km: number;
  subs: Place[];
}

/** Position GPS avec son jour du raid. */
export interface StagePoint {
  lat: number;
  lon: number;
  day: number;
}

export type StageStatus = 'done' | 'current' | 'upcoming';
/** Une sous-étape (boucle) peut aussi être « au départ » : jour J, 4L encore au bivouac. */
export type SubStatus = StageStatus | 'ready';

export interface StageState {
  /** gps : précisé par la position ; programme : d'après le calendrier seul ; none : hors raid. */
  source: 'gps' | 'programme' | 'none';
  /** Étape du jour (celle où l'on est, ou vers laquelle on roule), -1 avant le départ. */
  index: number;
  /** true : sur place à l'étape `index` ; false : en route vers elle. */
  here: boolean;
  /** Arrivés à la dernière étape. */
  finished: boolean;
  /** Kilomètre atteint sur la route (pour la barre de progression). */
  progressKm: number;
  statuses: StageStatus[];
  subStatuses: SubStatus[][];
}

/** À moins de 10 km d'une étape, on y est. */
export const ARRIVAL_KM = 10;
/** Une boucle commence quand la 4L s'éloigne de plus de 5 km du bivouac (le camp est grand)… */
export const LOOP_LEAVE_KM = 5;
/** … et elle est faite quand la 4L revient à moins de 3 km. */
export const LOOP_BACK_KM = 3;

const covers = (day: number, s: { dayStart: number | null; dayEnd: number | null }) =>
  s.dayStart != null && day >= s.dayStart && day <= (s.dayEnd ?? s.dayStart);
const dist = (p: { lat: number; lon: number }, s: { lat: number; lon: number }) => haversineKm(p.lat, p.lon, s.lat, s.lon);

/** État d'une boucle d'après les positions du jour (dans l'ordre) autour du bivouac. */
export function loopStatus(today: readonly StagePoint[], base: { lat: number; lon: number }): 'ready' | 'current' | 'done' {
  if (!today.some((p) => dist(p, base) > LOOP_LEAVE_KM)) return 'ready';
  return dist(today.at(-1)!, base) < LOOP_BACK_KM ? 'done' : 'current';
}

/** Étape (et sous-étape) prévue au programme un jour donné : la dernière étape qui couvre ce jour. */
export function plannedFor(stops: Pick<StageInput, 'dayStart' | 'dayEnd' | 'subs'>[], day: number | null): { index: number; sub: number } {
  let index = -1;
  if (day != null) stops.forEach((s, i) => covers(day, s) && (index = i));
  return { index, sub: index < 0 ? -1 : stops[index]!.subs.findIndex((s) => covers(day!, s)) };
}

/**
 * @param points positions du raid avec leur jour, dans l'ordre
 * @param routeKm kilomètre de la dernière position sur la route (null : hors route ou inconnue)
 */
export function stageState(stops: StageInput[], cal: RaidDay, points: readonly StagePoint[], routeKm: number | null): StageState {
  const n = stops.length;
  const make = (index: number, here: boolean, source: StageState['source'], progressKm: number, subs?: (i: number) => SubStatus[]): StageState => ({
    source,
    index,
    here,
    finished: index === n - 1 && here,
    progressKm,
    statuses: stops.map((_, i) => (i < index ? 'done' : i === index ? 'current' : 'upcoming')),
    subStatuses: stops.map((s, i) => subs?.(i) ?? s.subs.map(() => (i < index ? 'done' : 'upcoming'))),
  });

  if (!n || cal.phase === 'before' || cal.phase === 'unknown') return make(-1, false, 'none', 0);
  if (cal.phase === 'after') {
    return { ...make(n - 1, true, 'none', stops.at(-1)!.km), statuses: stops.map(() => 'done'), subStatuses: stops.map((s) => s.subs.map(() => 'done')) };
  }

  const day = cal.day!;
  // Étapes du jour (J5 : Tanger Med puis Boulajoul) ; un jour sans étape : en route vers la suivante.
  let todays = stops.flatMap((s, i) => (covers(day, s) ? [i] : []));
  if (!todays.length) {
    const next = stops.findIndex((s) => s.dayStart != null && s.dayStart > day);
    todays = [next === -1 ? n - 1 : next];
  }
  const since = stops[todays[0]!]!.dayStart ?? day;
  const source = points.some((p) => p.day >= since && p.day <= day) ? 'gps' : 'programme';

  // Étape atteinte : la 4L est passée à moins de 10 km depuis le premier jour de l'étape.
  const reached = (i: number) =>
    i === 0 || points.some((p) => p.day >= (stops[i]!.dayStart ?? day) && p.day <= day && dist(p, stops[i]!) <= ARRIVAL_KM);
  let index: number;
  let here: boolean;
  if (source === 'gps') {
    const next = todays.find((i) => !reached(i));
    [index, here] = next === undefined ? [todays.at(-1)!, true] : [next, false];
  } else {
    // Sans GPS : on suppose l'étape atteinte après son premier jour (J10 à Marrakech, J7 à Merzouga…).
    index = todays.at(-1)!;
    here = index === 0 || day > (stops[index]!.dayStart ?? day);
  }

  const prevKm = stops[index - 1]?.km ?? 0;
  const progressKm = here ? stops[index]!.km : Math.min(stops[index]!.km, Math.max(prevKm, routeKm ?? prevKm));
  const today = points.filter((p) => p.day === day);

  return make(index, here, source, progressKm, (i) =>
    stops[i]!.subs.map((sub): SubStatus => {
      if (i < index) return 'done';
      if (i > index || !here) return 'upcoming';
      if (sub.dayEnd != null && day > sub.dayEnd) return 'done';
      if (!covers(day, sub)) return 'upcoming';
      return today.length ? loopStatus(today, sub) : 'current';
    }),
  );
}
