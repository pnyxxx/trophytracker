/**
 * Données « en direct » d'un road trip pour sa page : dernière télémétrie (get_telemetry), lieu le plus proche
 * (Photon, position arrondie à ~1 km) et jour du voyage.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, type Crew } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import { dayOfTrip, localDate } from '@/lib/days';
import { describePosition } from '@/lib/geocode';

export const round2 = (n: number | null | undefined) => (n == null ? null : Math.round(n * 100) / 100);

export interface Telemetry {
  recorded_at: string;
  lat: number;
  lon: number;
  speed_kmh: number | null;
  course: number | null;
  altitude: number | null;
  accuracy: number | null;
  battery: number | null;
  today: { distance_km: number; moving_minutes: number; max_altitude: number | null };
}


export function useTelemetry(crew: Pick<Crew, 'id' | 'last_fix_at'> | undefined) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useQuery({
    queryKey: ['telemetry', crew?.id, crew?.last_fix_at],
    enabled: !!crew?.last_fix_at,
    refetchInterval: 60_000,
    queryFn: async () => unwrap(await supabase.rpc('get_telemetry', { p_crew: crew!.id, p_tz: tz })) as unknown as Telemetry,
  });
}

/** Ville ou lieu-dit le plus proche de la dernière position (position arrondie à ~1 km). */
export function usePlaceName(lat: number | null | undefined, lon: number | null | undefined) {
  const [la, lo] = [round2(lat), round2(lon)];
  return useQuery({
    queryKey: ['place', la, lo],
    enabled: la != null && lo != null,
    staleTime: 60 * 60_000,
    queryFn: async ({ signal }) => {
      const p = await describePosition(la!, lo!, signal);
      return p ? p.city ?? p.title : null;
    },
  }).data ?? null;
}

/** Jour du road trip (J1 = départ) et nombre de jours prévus. */
export function tripDay(crew: Pick<Crew, 'starts_on' | 'ends_on'>, firstFix: number | null) {
  const start = crew.starts_on ?? (firstFix != null ? localDate(firstFix) : null);
  if (!start) return { day: null, total: null };
  const day = dayOfTrip(start, new Date());
  const total = crew.ends_on ? dayOfTrip(start, new Date(`${crew.ends_on}T12:00:00`)) : null;
  return { day: day >= 1 ? day : null, total };
}

/** Visibilité d'un road trip, pour les sponsors : visites de la page (par jour), proches et encouragements. */
export function useVisibility(crewId: string | undefined) {
  return useQuery({
    queryKey: ['visibility', crewId],
    enabled: !!crewId,
    staleTime: 60_000,
    queryFn: async () => {
      const [views, subs, cheers] = await Promise.all([
        supabase.from('crew_page_views').select('day, views').eq('crew_id', crewId!).order('day'),
        supabase.from('crew_subscribers').select('id', { count: 'exact', head: true }).eq('crew_id', crewId!).is('unsubscribed_at', null),
        supabase.from('cheers').select('id', { count: 'exact', head: true }).eq('crew_id', crewId!),
      ]);
      const days = unwrap(views);
      return {
        days,
        totalViews: days.reduce((n, d) => n + d.views, 0),
        invited: subs.count ?? 0,
        cheers: cheers.count ?? 0,
      };
    },
  });
}

/** Les 30 derniers jours de visites, jour par jour (0 les jours sans visite). */
export function lastDays(days: { day: string; views: number }[], n = 30, today = new Date()) {
  const byDay = new Map(days.map((d) => [d.day, d.views]));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i));
    const iso = localDate(d.getTime() / 1000);
    return { day: iso, views: byDay.get(iso) ?? 0 };
  });
}
