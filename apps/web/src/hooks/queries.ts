/**
 * Accès aux données (React Query). Chaque hook = une requête mise en cache,
 * partagée entre les composants et rafraîchie automatiquement.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, type Crew } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import { useAuth } from './auth';

export const keys = {
  event: ['event'] as const,
  crews: (q: string, live: boolean, limit: number) => ['crews', q, live, limit] as const,
  crew: (slug: string) => ['crew', slug] as const,
  stats: (crewId: string) => ['stats', crewId] as const,
  photos: (crewId: string) => ['photos', crewId] as const,
  sponsors: (crewId: string) => ['sponsors', crewId] as const,
  members: (crewId: string) => ['members', crewId] as const,
  tracking: (crewId: string) => ['tracking', crewId] as const,
  follows: (userId: string) => ['follows', userId] as const,
  myCrews: (userId: string) => ['my-crews', userId] as const,
};

export interface EventInfo {
  name: string;
  startDate: string | null;
  endDate: string | null;
  totalKm: number | null;
  waypoints: import('@/lib/supabase').Waypoint[];
}

export function useEvent() {
  return useQuery({
    queryKey: keys.event,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<EventInfo> => {
      const [settings, waypoints] = await Promise.all([
        supabase.from('settings').select('key, value').then(unwrap),
        supabase.from('waypoints').select('*').order('sort_order').then(unwrap),
      ]);
      const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));
      return {
        name: s.event_name ?? 'Départ',
        startDate: s.event_start_date ?? null,
        endDate: s.event_end_date ?? null,
        totalKm: s.event_total_km ? Number(s.event_total_km) : null,
        waypoints,
      };
    },
  });
}

export type CrewSummary = Pick<
  Crew,
  | 'id' | 'slug' | 'name' | 'car_number' | 'tagline' | 'school' | 'city' | 'avatar_path' | 'followers_count'
  | 'last_lat' | 'last_lon' | 'last_speed_kmh' | 'last_fix_at' | 'total_distance_m'
>;

export function useCrew(slug: string | undefined) {
  return useQuery({
    queryKey: keys.crew(slug ?? ''),
    enabled: !!slug,
    queryFn: async () => unwrap(await supabase.from('crews').select('*').eq('slug', slug!).maybeSingle()),
  });
}

export interface CrewStats {
  total_distance_km: number;
  current_speed_kmh: number;
  avg_speed_kmh: number | null;
  live: boolean;
  last_fix_at: string | null;
  points_count: number;
  current_rank: number | null;
  supplies_count: number | null;
  followers_count: number;
}

export function useCrewStats(crewId: string | undefined) {
  return useQuery({
    queryKey: keys.stats(crewId ?? ''),
    enabled: !!crewId,
    refetchInterval: 60_000,
    queryFn: async () => unwrap(await supabase.rpc('get_crew_stats', { p_crew: crewId! })) as unknown as CrewStats | null,
  });
}

export function usePhotos(crewId: string | undefined) {
  return useQuery({
    queryKey: keys.photos(crewId ?? ''),
    enabled: !!crewId,
    queryFn: async () =>
      unwrap(await supabase.from('photos').select('*').eq('crew_id', crewId!).order('created_at', { ascending: false })),
  });
}

export function useSponsors(crewId: string | undefined) {
  return useQuery({
    queryKey: keys.sponsors(crewId ?? ''),
    enabled: !!crewId,
    queryFn: async () =>
      unwrap(await supabase.from('sponsors').select('*').eq('crew_id', crewId!).order('sort_order').order('name')),
  });
}

export function useCrewMembers(crewId: string | undefined) {
  return useQuery({
    queryKey: keys.members(crewId ?? ''),
    enabled: !!crewId,
    queryFn: async () => unwrap(await supabase.rpc('get_crew_members', { p_crew: crewId! })),
  });
}

/** Ids des road trips suivis par l'utilisateur connecté. */
export function useFollowedIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.follows(user?.id ?? ''),
    enabled: !!user,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('follows').select('crew_id'));
      return new Set(rows.map((r) => r.crew_id));
    },
  });
}

export function useFollowedCrews() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...keys.follows(user?.id ?? ''), 'crews'],
    enabled: !!user,
    queryFn: async () => {
      const rows = unwrap(
        await supabase.from('follows').select('created_at, crew:crews(*)').order('created_at', { ascending: false }),
      );
      return rows.map((r) => r.crew).filter((c): c is Crew => !!c);
    },
  });
}

export function useMyCrews() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.myCrews(user?.id ?? ''),
    enabled: !!user,
    queryFn: async () => {
      const rows = unwrap(
        await supabase.from('crew_members').select('role, crew:crews(*)').eq('user_id', user!.id),
      );
      return rows
        .filter((r) => r.crew)
        .map((r) => ({ role: r.role as 'owner' | 'member', crew: r.crew as Crew }))
        .sort((a, b) => a.crew.name.localeCompare(b.crew.name));
    },
  });
}

/** Rôle de l'utilisateur connecté dans un road trip (null si non membre). */
export function useMyRole(crewId: string | undefined) {
  const { data } = useMyCrews();
  const { isAdmin } = useAuth();
  const role = data?.find((m) => m.crew.id === crewId)?.role ?? null;
  return { role, canEdit: !!role || isAdmin, isOwner: role === 'owner' || isAdmin };
}
