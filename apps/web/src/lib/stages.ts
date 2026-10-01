/**
 * Où en est un équipage sur le parcours : jour du raid, étape en cours, sous-étapes.
 *
 * L'étape en cours combine deux sources :
 *  1. la POSITION GPS, recalée sur la route de référence (kilomètre atteint sur le parcours,
 *     qui ne recule jamais) — et non plus la distance totale parcourue, qui augmente aussi
 *     quand on tourne en rond (boucles de Merzouga) ;
 *  2. le CALENDRIER (jours J1… de chaque étape) : tant que le programme dit qu'on est à une
 *     étape (ex. Merzouga J6-8) et que la 4L reste dans les environs, l'étape reste « sur place »,
 *     même si les boucles l'emmènent à des dizaines de kilomètres du bivouac.
 * Sans position GPS pendant le raid, on affiche l'étape du programme, en le disant.
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
  const day = dayIndex(now) - dayIndex(startDate) + 1;
  const total = endDate ? dayIndex(endDate) - dayIndex(startDate) + 1 : null;
  if (day < 1) return { phase: 'before', day: null, total, daysUntil: 1 - day };
  if (total != null && day > total) return { phase: 'after', day: null, total, daysUntil: null };
  return { phase: 'during', day, total, daysUntil: null };
}

// ─── Position sur la route ──────────────────────────────────────────────────

export interface Route {
  /** Points [lon, lat] du parcours, dans l'ordre. */
  pts: [number, number][];
  /** Kilomètre de chaque point. */
  cum: number[];
  /** Au-delà de cette distance (km) du tracé, une position est « hors parcours ». */
  toleranceKm: number;
}

/** Point de trace : [lat, lon, …] (format de get_track). */
type TrackPoint = readonly [number, number, ...unknown[]];

/**
 * Kilomètre atteint sur la route d'après la trace GPS, ou null si la 4L n'est jamais passée sur
 * le parcours. Recalage simple : on suit la trace dans l'ordre (un point par kilomètre roulé) et on
 * cherche le point de route le plus proche dans une fenêtre plausible (on ne peut pas avancer de
 * 300 km sur la route en roulant 10 km), ce qui évite de « sauter » sur un autre tronçon proche.
 */
export function routeProgress(points: readonly TrackPoint[], route: Route): number | null {
  const { pts, cum, toleranceKm } = route;
  if (pts.length < 2 || points.length === 0) return null;
  let idx = -1;
  let rolled = 0; // km roulés depuis le dernier recalage
  let prev: TrackPoint | null = null;
  let lastSample: TrackPoint | null = null;

  const match = (p: TrackPoint) => {
    // Fenêtre de recherche : un peu en arrière, et en avant de ce qui a pu être roulé.
    const reach = idx < 0 ? Infinity : cum[idx]! + rolled * 1.5 + 30;
    const lo = idx < 0 ? 0 : Math.max(0, lowerBound(cum, cum[idx]! - 10));
    let best = Infinity;
    let at = -1;
    for (let j = lo; j < pts.length && cum[j]! <= reach; j++) {
      const d = haversineKm(p[0], p[1], pts[j]![1], pts[j]![0]);
      if (d < best) [best, at] = [d, j];
    }
    if (at >= 0 && best <= toleranceKm) {
      if (at > idx) idx = at; // on ne recule jamais sur le parcours
      rolled = 0;
    }
  };

  points.forEach((p, i) => {
    if (prev) rolled += haversineKm(prev[0], prev[1], p[0], p[1]);
    prev = p;
    const isLast = i === points.length - 1;
    if (lastSample && !isLast && haversineKm(lastSample[0], lastSample[1], p[0], p[1]) < 1) return;
    lastSample = p;
    match(p);
  });
  return idx < 0 ? null : cum[idx]!;
}

/** Premier indice i tel que arr[i] >= x (arr croissant). */
function lowerBound(arr: number[], x: number) {
  let [lo, hi] = [0, arr.length];
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (arr[m]! < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}

// ─── Étape en cours ─────────────────────────────────────────────────────────

export interface StageInput {
  /** Kilomètre de l'étape sur la route. */
  km: number;
  dayStart: number | null;
  dayEnd: number | null;
  subs: { dayStart: number | null; dayEnd: number | null }[];
}

export type StageStatus = 'done' | 'current' | 'upcoming';

export interface StageState {
  /** gps : d'après la position ; programme : d'après le calendrier (pas de position) ; none : pas commencé. */
  source: 'gps' | 'programme' | 'none';
  /** Étape en cours (celle où l'on est, ou vers laquelle on roule), -1 si aucune. */
  index: number;
  /** true : sur place à l'étape `index` ; false : en route vers elle. */
  here: boolean;
  /** Arrivés à la dernière étape. */
  finished: boolean;
  /** Kilomètre atteint sur la route (pour la barre de progression). */
  progressKm: number;
  statuses: StageStatus[];
  subStatuses: StageStatus[][];
}

/** À moins de 10 km d'une étape, on y est. */
export const ARRIVAL_KM = 10;
/**
 * Distance sur la route, au-delà de l'étape, où l'on reste « sur place » tant que le calendrier le
 * dit. Les boucles de Merzouga font ~100 km et reviennent au bivouac : elles ne s'en éloignent pas de
 * plus de ~50 km, même en suivant la route du marathon. 150 km laisse une large marge ; hors des
 * jours de l'étape, cette règle ne joue pas (le départ du marathon, J9, passe tout de suite « en route »).
 */
export const STAY_ZONE_KM = 150;

const within = (day: number | null, s: { dayStart: number | null; dayEnd: number | null }) =>
  day != null && s.dayStart != null && day >= s.dayStart && day <= (s.dayEnd ?? s.dayStart);

export function stageState(stops: StageInput[], progressKm: number | null, cal: RaidDay): StageState {
  const n = stops.length;
  let index = -1;
  let here = false;
  let source: StageState['source'] = 'none';

  if (n && progressKm != null) {
    source = 'gps';
    // Dernière étape atteinte (ou dépassée) par la 4L.
    let reached = 0;
    stops.forEach((s, i) => {
      if (s.km <= progressKm + ARRIVAL_KM) reached = i;
    });
    const stop = stops[reached]!;
    const sticky = within(cal.day, stop) && progressKm <= stop.km + STAY_ZONE_KM;
    if (progressKm <= stop.km + ARRIVAL_KM || sticky || reached === n - 1) [index, here] = [reached, true];
    else [index, here] = [reached + 1, false];
  } else if (n && cal.phase === 'during') {
    // Pas de position : étape du jour d'après le programme (la dernière qui couvre ce jour).
    source = 'programme';
    stops.forEach((s, i) => {
      if (within(cal.day, s)) index = i;
    });
    if (index >= 0) here = cal.day! > (stops[index]!.dayStart ?? 0) || index === 0;
    else source = 'none';
  }

  const finished = index === n - 1 && here && source === 'gps';
  const statuses = stops.map((_, i): StageStatus => (i < index ? 'done' : i === index ? 'current' : 'upcoming'));
  const subStatuses = stops.map((s, i) =>
    s.subs.map((sub): StageStatus => {
      if (i < index || cal.phase === 'after') return 'done';
      if (i > index || !here || cal.day == null) return 'upcoming';
      if (sub.dayEnd != null && cal.day > sub.dayEnd) return 'done';
      return within(cal.day, sub) ? 'current' : 'upcoming';
    }),
  );

  const progress =
    progressKm ?? (source === 'programme' ? (here ? stops[index]!.km : (stops[index - 1]?.km ?? 0)) : 0);
  return { source, index, here, finished, progressKm: progress, statuses, subStatuses };
}

/** Route en lignes droites entre des étapes (quand elles ne sont pas sur la route de référence). */
export function straightRoute(stops: { lat: number; lon: number; km: number }[]): Route {
  const pts: [number, number][] = [];
  const cum: number[] = [];
  stops.forEach((s, i) => {
    const prev = stops[i - 1];
    if (!prev) {
      pts.push([s.lon, s.lat]);
      cum.push(s.km);
      return;
    }
    const k = Math.max(1, Math.ceil(haversineKm(prev.lat, prev.lon, s.lat, s.lon) / 2));
    for (let j = 1; j <= k; j++) {
      pts.push([prev.lon + ((s.lon - prev.lon) * j) / k, prev.lat + ((s.lat - prev.lat) * j) / k]);
      cum.push(prev.km + ((s.km - prev.km) * j) / k);
    }
  });
  // Les routes s'écartent des lignes droites : tolérance plus large.
  return { pts, cum, toleranceKm: 60 };
}

/** Étape (et sous-étape) prévue au programme un jour donné : la dernière étape qui couvre ce jour. */
export function plannedFor(stops: StageInput[], day: number | null): { index: number; sub: number } {
  let index = -1;
  stops.forEach((s, i) => {
    if (within(day, s)) index = i;
  });
  const sub = index < 0 ? -1 : stops[index]!.subs.findIndex((s) => within(day, s));
  return { index, sub };
}
