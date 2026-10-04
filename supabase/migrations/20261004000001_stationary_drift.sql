-- ═════════════════════════════════════════════════════════════════════════════
--  Positions à l'arrêt : le téléphone garde le GPS allumé (stop detection désactivée)
-- ═════════════════════════════════════════════════════════════════════════════
--
--  Identique à 20261002000001_photo_positions_tracking, sauf la règle « à l'arrêt » :
--   - est à l'arrêt un point à moins de p_min_distance_m du dernier point stocké, ou
--     dans le rayon de dérive (2 × précision annoncée, 100 m au plus) sans vitesse
--     de déplacement (< 10 km/h) : la dérive d'un téléphone garé ne dessine plus
--     d'étoile autour de la voiture ;
--   - un point à l'arrêt n'est stocké qu'après p_max_silence_s sans point (désormais
--     30 min par défaut) et ne compte jamais dans la distance parcourue.

create or replace function private.ingest_position(
  p_crew           uuid,
  p_recorded_at    timestamptz,
  p_lat            float8,
  p_lon            float8,
  p_speed_kmh      float8,
  p_course         float8,
  p_altitude       float8,
  p_accuracy       float8,
  p_battery        float8,
  p_source         text,
  p_min_distance_m float8 default 15,
  p_max_silence_s  float8 default 1800
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_last_fix timestamptz;
  v_enabled  boolean;
  v_stopped  timestamptz;
  v_start    date;
  v_prev     record;
  v_pending  record;
  v_has_prev boolean;
  v_jump     boolean := false;
  v_dist     float8 := 0;
  v_dt       float8;
  v_speed    float8 := p_speed_kmh;
  v_counted  float8;
  v_still    boolean := false;
begin
  if p_lat is null or p_lon is null or p_recorded_at is null
     or p_lat not between -90 and 90 or p_lon not between -180 and 180
     or (p_lat = 0 and p_lon = 0)
     or p_recorded_at > now() + interval '5 minutes' then
    return 'invalid';
  end if;

  select last_fix_at, tracking_enabled, tracking_stopped_at into v_last_fix, v_enabled, v_stopped
  from public.crews where id = p_crew for update;
  if not found then return 'invalid'; end if;

  if not v_enabled then
    -- Filet de sécurité : le jour du départ officiel, un suivi oublié se lance tout seul…
    select value::date into v_start from public.settings where key = 'event_start_date';
    if v_start is not null
       and (now() at time zone 'Europe/Paris')::date >= v_start
       -- … sauf si l'équipage l'a arrêté exprès depuis le début du raid.
       and (v_stopped is null or (v_stopped at time zone 'Europe/Paris')::date < v_start) then
      update public.crews set tracking_enabled = true where id = p_crew;
      delete from public.gps_test_fixes where crew_id = p_crew;
    else
      insert into public.gps_test_fixes (crew_id, lat, lon, speed_kmh, accuracy, battery, recorded_at)
      values (p_crew, p_lat, p_lon, p_speed_kmh, p_accuracy, p_battery, p_recorded_at)
      on conflict (crew_id) do update
        set lat = excluded.lat, lon = excluded.lon, speed_kmh = excluded.speed_kmh, accuracy = excluded.accuracy,
            battery = excluded.battery, recorded_at = excluded.recorded_at, received_at = now()
        where public.gps_test_fixes.recorded_at < excluded.recorded_at;
      return 'test';
    end if;
  end if;

  select lat, lon, recorded_at into v_prev
  from public.positions where crew_id = p_crew
  order by recorded_at desc limit 1;
  v_has_prev := found;

  if v_has_prev then
    if p_recorded_at <= v_prev.recorded_at then return 'stale'; end if;
    v_dist := private.haversine_m(v_prev.lat, v_prev.lon, p_lat, p_lon);
    v_dt := extract(epoch from (p_recorded_at - v_prev.recorded_at));

    if v_dt < 3600 and (v_dist / v_dt) * 3.6 > 400 then
      -- Saut impossible depuis le dernier point : confirmé par le point écarté juste avant ?
      select lat, lon, recorded_at into v_pending from private.gps_pending_jumps where crew_id = p_crew;
      if found
         and p_recorded_at > v_pending.recorded_at
         and p_recorded_at - v_pending.recorded_at < interval '30 minutes'
         and private.haversine_m(v_pending.lat, v_pending.lon, p_lat, p_lon)
             <= greatest(1000, extract(epoch from (p_recorded_at - v_pending.recorded_at)) * 400 / 3.6) then
        v_jump := true;  -- vrai changement de lieu
      else
        insert into private.gps_pending_jumps (crew_id, lat, lon, recorded_at)
        values (p_crew, p_lat, p_lon, p_recorded_at)
        on conflict (crew_id) do update
          set lat = excluded.lat, lon = excluded.lon, recorded_at = excluded.recorded_at;
        return 'glitch';
      end if;
    end if;

    if v_speed is null and v_dt > 0 and not v_jump then v_speed := (v_dist / v_dt) * 3.6; end if;
  end if;

  -- Point accepté : un éventuel saut en attente n'a plus lieu d'être.
  delete from private.gps_pending_jumps where crew_id = p_crew;

  -- « Dernière position connue » : toujours à jour, même si le point n'est pas stocké.
  if v_last_fix is null or p_recorded_at > v_last_fix then
    update public.crews
       set last_lat = p_lat, last_lon = p_lon, last_speed_kmh = v_speed, last_fix_at = p_recorded_at
     where id = p_crew;
  end if;

  -- À l'arrêt : tout près du dernier point stocké, ou dans le rayon de dérive sans rouler.
  -- On compare au dernier point STOCKÉ : une dérive lente ne peut pas avancer pas à pas.
  v_still := v_has_prev and not v_jump and (
    v_dist < p_min_distance_m
    or (v_dist < least(2 * coalesce(p_accuracy, 0), 100) and coalesce(p_speed_kmh, 0) < 10));

  if v_still and v_dt < p_max_silence_s then
    return 'skipped';
  end if;

  -- Ni la dérive GPS à l'arrêt, ni un changement de lieu ne comptent dans la distance parcourue.
  v_counted := case when v_jump or v_still then 0 else v_dist end;

  insert into public.positions
    (crew_id, recorded_at, lat, lon, speed_kmh, course, altitude, accuracy, battery, distance_from_prev_m, source)
  values
    (p_crew, p_recorded_at, p_lat, p_lon, v_speed, p_course, p_altitude, p_accuracy, p_battery, v_counted, p_source)
  on conflict (crew_id, recorded_at) do nothing;
  if not found then return 'stale'; end if;

  if v_counted > 0 then
    update public.crews set total_distance_m = total_distance_m + v_counted where id = p_crew;
  end if;
  return 'stored';
end;
$$;
