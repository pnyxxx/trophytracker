/**
 * Données du roadbook d'un équipage : étapes (avec sous-étapes et jours), kilomètre de chaque
 * étape et étape en cours (le jour choisit l'étape, le GPS précise : voir lib/stages.ts).
 */
import { useMemo } from 'react';
import type { Waypoint } from '@/lib/supabase';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { haversineKm } from '@/lib/geo';
import { routeKmOf } from '@/components/landing/journey';
import { dayOfRaid, plannedFor, stageState, type RaidDay, type StageState, type StagePoint } from '@/lib/stages';

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

export function useRoadbook(
  waypoints: Waypoint[], totalKm: number | null, points: TrackPoint[], cal: RaidDay, startDate: string | null,
): Roadbook {
  const { stops, onReferenceRoute } = useMemo(() => buildStops(waypoints, totalKm), [waypoints, totalKm]);
  const input = useMemo(
    () =>
      stops.map((s) => ({
        lat: s.lat,
        lon: s.lon,
        km: s.km,
        dayStart: s.day_start,
        dayEnd: s.day_end,
        subs: s.subs.map((u) => ({ lat: u.lat, lon: u.lon, dayStart: u.day_start, dayEnd: u.day_end })),
      })),
    [stops],
  );
  // Positions du raid avec leur jour (J1…) : les essais d'avant le départ ne comptent pas.
  const raidPoints = useMemo<StagePoint[]>(() => {
    if (!startDate) return [];
    return points
      .map(([lat, lon, t]) => ({ lat, lon, day: dayOfRaid(startDate, new Date(t * 1000)) }))
      .filter((p) => p.day >= 1);
  }, [points, startDate]);
  // Kilomètre de la dernière position sur la route (barre de progression), si elle est dessus.
  const last = points.at(-1);
  const routeKm = useMemo(() => {
    if (!last || !onReferenceRoute || !stops.length) return null;
    const km = routeKmOf(last[0], last[1]);
    return km == null ? null : km - (routeKmOf(stops[0]!.lat, stops[0]!.lon) ?? 0);
  }, [last, onReferenceRoute, stops]);

  return useMemo(
    () => ({ stops, onReferenceRoute, state: stageState(input, cal, raidPoints, routeKm), planned: plannedFor(input, cal.day) }),
    [stops, onReferenceRoute, input, cal, raidPoints, routeKm],
  );
}
