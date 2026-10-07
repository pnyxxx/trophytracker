-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — télémétrie en direct
--
--  get_telemetry : le dernier état connu du road trip pour le tableau de bord de sa page
--  (vitesse, altitude, cap, précision, batterie du téléphone) et le bilan du jour
--  (kilomètres, temps de route, altitude maximale). Le dénivelé, sensible au bruit de l'altitude GPS,
--  est calculé par le site sur la trace lissée.
--  Même visibilité que la trace : road trip visible, ou voyageur.
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.get_telemetry(p_crew uuid, p_tz text default 'Europe/Paris')
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_last  public.positions;
  v_tz    text := coalesce((select name from pg_timezone_names where name = p_tz), 'Europe/Paris');
  v_day0  timestamptz;
  v_today record;
begin
  if not private.can_view_crew(p_crew) then return null; end if;
  select * into v_last from public.positions where crew_id = p_crew order by recorded_at desc limit 1;
  if not found then return null; end if;

  -- « Aujourd'hui » : depuis minuit, heure du lecteur de la page.
  v_day0 := (date_trunc('day', now() at time zone v_tz)) at time zone v_tz;
  select coalesce(sum(distance_from_prev_m), 0) as dist,
         max(altitude) as max_alt,
         -- Temps de route : intervalles entre deux points en mouvement, plafonnés à 5 min (trous de réseau).
         coalesce(sum(case when speed_kmh >= 5 then least(gap_s, 300) else 0 end), 0) as moving_s
    into v_today
  from (
    select distance_from_prev_m, speed_kmh, altitude,
           extract(epoch from recorded_at - lag(recorded_at) over (order by recorded_at)) as gap_s
    from public.positions
    where crew_id = p_crew and recorded_at >= v_day0
  ) t;

  return jsonb_build_object(
    'recorded_at', v_last.recorded_at,
    'lat', round(v_last.lat::numeric, 5),
    'lon', round(v_last.lon::numeric, 5),
    'speed_kmh', round(v_last.speed_kmh::numeric),
    'course', round(v_last.course::numeric),
    'altitude', round(v_last.altitude::numeric),
    'accuracy', round(v_last.accuracy::numeric),
    'battery', round(v_last.battery::numeric),
    'today', jsonb_build_object(
      'distance_km', round((v_today.dist / 1000)::numeric, 1),
      'moving_minutes', round((v_today.moving_s / 60)::numeric),
      'max_altitude', round(v_today.max_alt::numeric)
    )
  );
end;
$$;

revoke execute on function public.get_telemetry(uuid, text) from public;
grant execute on function public.get_telemetry(uuid, text) to anon, authenticated;
