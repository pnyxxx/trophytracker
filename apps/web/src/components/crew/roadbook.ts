/**
 * Données du roadbook d'un équipage : étapes (avec sous-étapes et jours), kilomètre de chaque
 * étape, position de la 4L sur le parcours et étape en cours (voir lib/stages.ts).
 */
import { useMemo } from 'react';
import type { Waypoint } from '@/lib/supabase';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { haversineKm } from '@/lib/geo';
import { MAIN_ROUTE, routeKmOf } from '@/components/landing/journey';
import { plannedFor, routeProgress, stageState, straightRoute, type RaidDay, type StageState } from '@/lib/stages';

// La route réelle est ~30 % plus longue que la ligne droite entre les étapes.
const ROAD_FACTOR = 1.3;

export interface RoadbookStop extends Waypoint {
  km: number;
  subs: Waypoint[];
}

export interface Roadbook {
  stops: RoadbookStop[];
  /** Les étapes sont sur la route de référence (kilomètres réels de la route). */
  onReferenceRoute: boolean;
  state: StageState;
  /** Étape prévue au programme aujourd'hui. */
  planned: { index: number; sub: number };
}

/** Kilomètre de chaque étape principale (les sous-étapes sont rangées sous leur étape). */
export function buildStops(waypoints: Waypoint[], totalKm: number | null) {
  const main = waypoints.filter((w) => !w.parent_id);
  const subsOf = (id: string) => waypoints.filter((w) => w.parent_id === id);
  // Lu sur la route de référence quand toutes les étapes s'y trouvent, dans l'ordre ;
  // sinon estimé à vol d'oiseau, mis à l'échelle de la distance officielle.
  const onRoute = main.map((w) => routeKmOf(w.lat, w.lon));
  if (main.length && onRoute.every((km, i) => km !== null && (i === 0 || km >= onRoute[i - 1]!))) {
    return { onReferenceRoute: true, stops: main.map((w, i) => ({ ...w, km: onRoute[i]! - onRoute[0]!, subs: subsOf(w.id) })) };
  }
  let acc = 0;
  const raw = main.map((w, i) => {
    const prev = main[i - 1];
    if (prev) acc += haversineKm(prev.lat, prev.lon, w.lat, w.lon);
    return acc;
  });
  const length = totalKm ?? acc * ROAD_FACTOR;
  return {
    onReferenceRoute: false,
    stops: main.map((w, i) => ({ ...w, km: acc ? (raw[i]! / acc) * length : 0, subs: subsOf(w.id) })),
  };
}

export function useRoadbook(waypoints: Waypoint[], totalKm: number | null, points: TrackPoint[], cal: RaidDay): Roadbook {
  const { stops, onReferenceRoute } = useMemo(() => buildStops(waypoints, totalKm), [waypoints, totalKm]);
  const input = useMemo(
    () =>
      stops.map((s) => ({
        km: s.km,
        dayStart: s.day_start,
        dayEnd: s.day_end,
        subs: s.subs.map((u) => ({ dayStart: u.day_start, dayEnd: u.day_end })),
      })),
    [stops],
  );
  const progressKm = useMemo(() => {
    if (stops.length < 2) return null;
    const route = onReferenceRoute
      ? { ...MAIN_ROUTE, cum: MAIN_ROUTE.cum.map((km) => km - (routeKmOf(stops[0]!.lat, stops[0]!.lon) ?? 0)), toleranceKm: 15 }
      : straightRoute(stops);
    return routeProgress(points, route);
  }, [points, stops, onReferenceRoute]);

  return useMemo(
    () => ({ stops, onReferenceRoute, state: stageState(input, progressKm, cal), planned: plannedFor(input, cal.day) }),
    [stops, onReferenceRoute, input, progressKm, cal],
  );
}
