-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — positions des photos, suivi GPS lancé / arrêté, trace effaçable
--
--  1. Photos : position (lat/lon) et instant de la prise de vue, pour les placer
--     sur la carte. Retrouvés sur l'appareil (EXIF, trace de la 4L) ou saisis.
--  2. Suivi GPS : un équipage peut tester son téléphone chez lui sans rien
--     publier. Tant que le suivi est ARRÊTÉ, les positions reçues ne vont pas
--     dans la trace : seule la dernière est gardée, visible des membres
--     (« mode essai »). Filet de sécurité : un suivi resté arrêté se lance tout
--     seul dès le jour du départ officiel (event_start_date), sauf si l'équipage
--     l'a arrêté exprès ce jour-là ou après.
--  3. Effacer la trace : le propriétaire repart de zéro (après ses essais).
-- ═════════════════════════════════════════════════════════════════════════════


-- ─── 1. Photos placées sur la carte ──────────────────────────────────────────

alter table public.photos
  add column lat      double precision check (lat between -90 and 90),
  add column lon      double precision check (lon between -180 and 180),
  add column taken_at timestamptz,
  add constraint photos_lat_lon_ensemble check ((lat is null) = (lon is null));

comment on column public.photos.taken_at is 'Instant de la prise de vue (EXIF), si connu.';

grant insert (lat, lon, taken_at) on public.photos to authenticated;
grant update (lat, lon, taken_at) on public.photos to authenticated;


-- ─── 2. Suivi lancé / arrêté et mode essai ───────────────────────────────────

-- Les équipages existants démarrent ARRÊTÉS eux aussi (le raid est en février).
alter table public.crews
  add column tracking_enabled    boolean not null default false,
  add column tracking_stopped_at timestamptz;

comment on column public.crews.tracking_enabled is 'Suivi lancé : les positions reçues vont dans la trace publique. Arrêté : mode essai.';
comment on column public.crews.tracking_stopped_at is 'Dernier arrêt volontaire du suivi (empêche le lancement automatique de le relancer).';

-- Dernière position reçue en mode essai : visible des seuls membres de l'équipage.
create table public.gps_test_fixes (
  crew_id     uuid primary key references public.crews (id) on delete cascade,
  lat         double precision not null,
  lon         double precision not null,
  speed_kmh   real,
  accuracy    real,
  battery     real,
  recorded_at timestamptz not null,
  received_at timestamptz not null default now()
);
comment on table public.gps_test_fixes is 'Dernière position reçue pendant que le suivi est arrêté (essai du téléphone), jamais publiée.';

alter table public.gps_test_fixes enable row level security;
revoke all on public.gps_test_fixes from public, anon, authenticated;
grant select on public.gps_test_fixes to authenticated;
create policy "essai GPS : membres de l'équipage" on public.gps_test_fixes
  for select to authenticated
  using (private.can_edit_crew(crew_id));

-- Lancer ou arrêter le suivi (tout membre de l'équipage).
create or replace function public.set_tracking(p_crew uuid, p_enabled boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.can_edit_crew(p_crew) then
    raise exception 'Vous ne gérez pas cet équipage' using errcode = '42501';
  end if;
  update public.crews
     set tracking_enabled = p_enabled,
         tracking_stopped_at = case when p_enabled then tracking_stopped_at else now() end
   where id = p_crew;
  -- Une fois lancé, la position d'essai n'a plus de sens.
  if p_enabled then delete from public.gps_test_fixes where crew_id = p_crew; end if;
end;
$$;

revoke all on function public.set_tracking(uuid, boolean) from public, anon;
grant execute on function public.set_tracking(uuid, boolean) to authenticated;


-- ─── 3. Effacer la trace ─────────────────────────────────────────────────────

-- Efface toute la trace d'un équipage (propriétaire ou admin) : positions, kilomètres, dernière position.
create or replace function public.reset_track(p_crew uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not (private.crew_role(p_crew) = 'owner' or private.is_admin()) then
    raise exception 'Seul le propriétaire de l''équipage peut effacer la trace' using errcode = '42501';
  end if;
  delete from public.positions where crew_id = p_crew;
  delete from private.gps_pending_jumps where crew_id = p_crew;
  delete from public.gps_test_fixes where crew_id = p_crew;
  update public.crews
     set last_lat = null, last_lon = null, last_speed_kmh = null, last_fix_at = null, total_distance_m = 0
   where id = p_crew;
end;
$$;

revoke all on function public.reset_track(uuid) from public, anon;
grant execute on function public.reset_track(uuid) to authenticated;


-- ─── Réception des positions : mode essai et lancement automatique ───────────
-- Identique à 20260925000002_gps_jump_confirmation, avec le bloc « suivi arrêté ».
-- Nouveau résultat possible : 'test' (position gardée comme essai, hors trace).

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
  p_max_silence_s  float8 default 300
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

  if v_has_prev and not v_jump and v_dist < p_min_distance_m and v_dt < p_max_silence_s then
    return 'skipped';
  end if;

  -- Ni la dérive GPS à l'arrêt, ni un changement de lieu ne comptent dans la distance parcourue.
  v_counted := case when v_jump then 0 when v_dist >= p_min_distance_m then v_dist else 0 end;

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
