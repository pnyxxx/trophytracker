-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — road trips
--
--  Le site devient un carnet de route en direct pour tous les road trips :
--   - plus d'événement commun, de parcours de référence ni d'étapes imposées
--     (table waypoints, réglages event_*) : chaque road trip a ses propres dates ;
--   - plus de classement ni de « fournitures » ;
--   - un compte peut avoir plusieurs road trips (un accès payé ou un code par road trip) ;
--   - visibilité : « par lien » (par défaut : visible avec le lien, jamais référencé),
--     « publique » (référencée par les moteurs de recherche) ou privée (voyageurs seuls) ;
--     l'adresse d'un road trip porte un suffixe aléatoire, impossible à deviner ;
--   - codes offerts uniquement au format TT-XXXX-XXXX.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── 1. Ce qui n'existe plus ──────────────────────────────────────────────────
drop table if exists public.waypoints cascade;
drop function if exists private.check_waypoint_parent() cascade;
delete from public.settings where key like 'event\_%';
drop function if exists public.search_crews(text, boolean, integer, integer);

-- Le déclencheur « updated_at » liste ses colonnes : on le recrée sans celles qui disparaissent.
drop trigger if exists crews_touch on public.crews;
alter table public.crews drop column if exists current_rank, drop column if exists supplies_count;

delete from public.access_codes where code like '4L-%';
alter table public.access_codes drop constraint if exists access_codes_code_check;
alter table public.access_codes add constraint access_codes_code_check check (code ~ '^TT-[A-Z0-9]{4}-[A-Z0-9]{4}$');

-- ── 2. Dates et visibilité de chaque road trip ───────────────────────────────
alter table public.crews
  add column starts_on date,
  add column ends_on   date,
  add column is_listed boolean not null default false,
  add constraint crews_dates_check check (ends_on is null or starts_on is null or ends_on >= starts_on);
comment on column public.crews.starts_on is 'Jour du départ prévu : le suivi GPS oublié se lance tout seul ce jour-là.';
comment on column public.crews.ends_on   is 'Jour du retour prévu (facultatif).';
comment on column public.crews.is_public is 'Visible par toute personne qui a le lien (sinon : voyageurs seuls).';
comment on column public.crews.is_listed is 'Référencé par les moteurs de recherche (plan du site) ; n''a de sens que si is_public.';
grant update (starts_on, ends_on, is_listed) on public.crews to authenticated;
create trigger crews_touch before update of
  name, car_number, tagline, story, school, city, contact_email, instagram_url, facebook_url, fundraiser_url,
  website_url, avatar_path, cover_path, cover_focus_x, cover_focus_y, is_public, is_listed, starts_on, ends_on,
  start_lat, start_lon, start_region
on public.crews for each row execute function private.touch_updated_at();

create or replace function private.sitemap_crews()
returns table (slug text, updated_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select c.slug, c.updated_at from public.crews c where c.is_public and c.is_listed order by c.slug;
$$;

-- ── 3. Plusieurs road trips par compte ───────────────────────────────────────
drop index if exists public.crew_members_one_crew_per_user;
create index if not exists crew_members_user_idx on public.crew_members (user_id);

-- Suffixe aléatoire de l'adresse : 6 caractères sans ambiguïté.
create or replace function private.random_suffix()
returns text
language plpgsql volatile
set search_path = ''
as $$
declare
  v_chars constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_bytes bytea := extensions.gen_random_bytes(6);
  v_out   text := '';
begin
  for i in 0..5 loop
    v_out := v_out || substr(v_chars, 1 + get_byte(v_bytes, i) % char_length(v_chars), 1);
  end loop;
  return v_out;
end;
$$;

drop function if exists public.create_crew(text, text, text);
create function public.create_crew(p_name text, p_starts_on date default null, p_tagline text default null)
returns public.crews
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_purchase uuid;
  v_base     text;
  v_slug     text;
  v_crew     public.crews;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if not private.mfa_ok() then raise exception 'Code de double authentification requis' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Donnez un nom à votre road trip (2 caractères minimum)' using errcode = 'P0001';
  end if;
  if (select count(*) from public.crew_members where user_id = v_uid and role = 'owner') >= 20 then
    raise exception 'Vous gérez déjà 20 road trips : supprimez-en un pour en créer un nouveau' using errcode = 'P0001';
  end if;

  if not private.is_admin() then
    select id into v_purchase from public.crew_purchases
     where user_id = v_uid and status = 'paid' and used_at is null
     order by paid_at limit 1 for update;
    if v_purchase is null then
      raise exception 'Un accès est nécessaire pour créer un road trip (paiement ou code offert)' using errcode = 'P0001';
    end if;
  end if;

  v_base := left(coalesce(nullif(private.slugify(p_name), ''), 'road-trip'), 50);
  loop
    v_slug := v_base || '-' || private.random_suffix();
    exit when not exists (select 1 from public.crews where slug = v_slug);
  end loop;

  insert into public.crews (slug, name, tagline, starts_on)
  values (v_slug, trim(p_name), nullif(trim(p_tagline), ''), p_starts_on)
  returning * into v_crew;

  insert into public.crew_members (crew_id, user_id, role) values (v_crew.id, v_uid, 'owner');
  insert into public.crew_devices (crew_id) values (v_crew.id);
  if v_purchase is not null then
    update public.crew_purchases set used_at = now(), crew_id = v_crew.id where id = v_purchase;
  end if;
  return v_crew;
end;
$$;

create or replace function public.add_crew_member(p_crew uuid, p_email text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if private.crew_role(p_crew) is distinct from 'owner' and not private.is_admin() then
    raise exception 'Réservé au propriétaire du road trip' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cet email : la personne doit d''abord s''inscrire' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.crew_members where crew_id = p_crew and user_id = v_user) then
    raise exception 'Cette personne fait déjà partie du road trip' using errcode = '23505';
  end if;
  insert into public.crew_members (crew_id, user_id, role) values (p_crew, v_user, 'member');
end;
$$;

create or replace function public.purchase_start(p_user uuid, p_email text)
returns table (purchase_id uuid, amount_cents integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_amount integer := private.crew_price_at(now());
  v_id     uuid;
begin
  if exists (select 1 from public.crew_purchases where user_id = p_user and status = 'paid' and used_at is null) then
    raise exception 'Vous avez déjà un accès non utilisé : créez votre road trip' using errcode = 'P0001';
  end if;
  insert into public.crew_purchases (user_id, customer_email, source, amount_cents, terms_accepted_at, immediate_start_at)
  values (p_user, p_email, 'stripe', v_amount, now(), now())
  returning id into v_id;
  return query select v_id, v_amount;
end;
$$;

create or replace function public.redeem_access_code(p_code text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_input text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_code  public.access_codes;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if exists (select 1 from public.crew_purchases where user_id = v_uid and status = 'paid' and used_at is null) then
    raise exception 'Vous avez déjà un accès non utilisé : créez votre road trip' using errcode = 'P0001';
  end if;
  if (select count(*) from private.access_code_failures where user_id = v_uid and at > now() - interval '1 hour') >= 10 then
    return 'too_many';
  end if;

  -- « TT-K7QM-2XRP », « ttk7qm2xrp » ou « K7QM 2XRP » : tout est accepté.
  if v_input !~ '^TT' or char_length(v_input) <> 10 then v_input := 'TT' || v_input; end if;
  select * into v_code from public.access_codes where replace(code, '-', '') = v_input for update;
  if v_code.id is null or v_code.revoked_at is not null then
    insert into private.access_code_failures (user_id) values (v_uid);
    return 'invalid';
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then return 'expired'; end if;
  if v_code.uses >= v_code.max_uses then return 'exhausted'; end if;
  if exists (select 1 from public.crew_purchases where user_id = v_uid and access_code_id = v_code.id) then
    return 'already_used';
  end if;

  insert into public.crew_purchases (user_id, customer_email, source, status, amount_cents, paid_at, access_code_id)
  values (v_uid, (select email from auth.users where id = v_uid), 'code', 'paid', 0, now(), v_code.id);
  update public.access_codes set uses = uses + 1 where id = v_code.id;
  return 'ok';
end;
$$;

-- ── 4. Statistiques sans classement ──────────────────────────────────────────
create or replace function public.get_crew_stats(p_crew uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  c        public.crews;
  v_live   boolean;
  v_avg    numeric;
  w        record;
  v_points bigint;
begin
  if not private.can_view_crew(p_crew) then return null; end if;
  select * into c from public.crews where id = p_crew;
  v_live := c.last_fix_at > now() - interval '10 minutes';

  -- Vitesse moyenne sur la dernière heure de roulage = distance / durée.
  if c.last_fix_at is not null then
    select sum(distance_from_prev_m) as dist, min(recorded_at) as t0, max(recorded_at) as t1 into w
    from public.positions
    where crew_id = p_crew and recorded_at >= c.last_fix_at - interval '1 hour';
    if w.t1 - w.t0 > interval '1 minute' then
      v_avg := round((w.dist / 1000) / (extract(epoch from w.t1 - w.t0) / 3600));
    end if;
  end if;

  select count(*) into v_points from public.positions where crew_id = p_crew;

  return jsonb_build_object(
    'total_distance_km', round((c.total_distance_m / 1000)::numeric, 1),
    'current_speed_kmh', case when v_live then round(coalesce(c.last_speed_kmh, 0)::numeric) else 0 end,
    'avg_speed_kmh', v_avg,
    'live', coalesce(v_live, false),
    'last_fix_at', c.last_fix_at,
    'points_count', v_points,
    'followers_count', c.followers_count
  );
end;
$$;

-- ── 5. Le suivi oublié se lance le jour du départ du road trip ───────────────
CREATE OR REPLACE FUNCTION private.ingest_position(p_crew uuid, p_recorded_at timestamp with time zone, p_lat double precision, p_lon double precision, p_speed_kmh double precision, p_course double precision, p_altitude double precision, p_accuracy double precision, p_battery double precision, p_source text, p_min_distance_m double precision DEFAULT 15, p_max_silence_s double precision DEFAULT 1800)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    -- Filet de sécurité : le jour du départ prévu du road trip, un suivi oublié se lance tout seul…
    select starts_on into v_start from public.crews where id = p_crew;
    if v_start is not null
       and (now() at time zone 'Europe/Paris')::date >= v_start
       -- … sauf si les voyageurs l'ont arrêté exprès depuis le jour du départ.
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
$function$;

-- ── Droits ───────────────────────────────────────────────────────────────────
revoke execute on function public.create_crew(text, date, text) from public, anon;
grant execute on function public.create_crew(text, date, text) to authenticated;
revoke execute on function private.random_suffix() from public, anon, authenticated;
