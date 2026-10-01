-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — l'altitude dans la trace envoyée au site
--
--  Le téléphone (Traccar Client) envoie l'altitude avec chaque position et elle est
--  stockée dans positions.altitude, mais get_track ne la renvoyait pas. On l'ajoute
--  en 5e valeur de chaque point (arrondie au mètre, null si le téléphone ne l'a pas
--  donnée) : [lat, lon, timestamp_s, vitesse_kmh|null, altitude_m|null].
--  Les anciens lecteurs, qui ne lisent que les 4 premières valeurs, ne changent pas.
--  Sert au profil d'élévation de la page équipage.
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.get_track(p_crew uuid, p_since timestamptz default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.can_view_crew(p_crew) then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_array(
             round(lat::numeric, 6), round(lon::numeric, 6),
             floor(extract(epoch from recorded_at))::bigint,
             round(speed_kmh::numeric),
             round(altitude::numeric)) order by recorded_at)
    from (
      select lat, lon, recorded_at, speed_kmh, altitude from public.positions
      where crew_id = p_crew and (p_since is null or recorded_at > p_since)
      order by recorded_at
      limit 100000
    ) t
  ), '[]'::jsonb);
end;
$$;
