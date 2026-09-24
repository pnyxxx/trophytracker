-- ═════════════════════════════════════════════════════════════════════════════
--  TrophysTracker — 2/5 : fonctions
--
--  Toutes les fonctions SECURITY DEFINER :
--   - fixent `search_path = ''` et qualifient chaque objet (anti-détournement) ;
--   - vérifient elles-mêmes les droits de l'appelant (auth.uid()).
-- ═════════════════════════════════════════════════════════════════════════════


-- ─── Helpers d'autorisation (utilisés par les règles RLS) ────────────────────

create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.crew_role(p_crew uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select role from public.crew_members where crew_id = p_crew and user_id = (select auth.uid());
$$;

create or replace function private.can_edit_crew(p_crew uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.crew_role(p_crew) is not null or private.is_admin();
$$;

create or replace function private.can_view_crew(p_crew uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.crews where id = p_crew and is_public)
      or private.can_edit_crew(p_crew);
$$;

-- Pour le stockage : "<crew_id>/photos/xxx.webp" → l'utilisateur gère-t-il ce crew ?
create or replace function private.can_edit_crew_path(p_path text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_folder text := split_part(p_path, '/', 1);
begin
  if v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.can_edit_crew(v_folder::uuid);
end;
$$;


-- ─── Création automatique du profil à l'inscription ─────────────────────────

create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',   -- fourni par Google
    split_part(new.email, '@', 1)
  ));
begin
  if char_length(v_name) < 2 then v_name := 'Voyageur'; end if;
  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 60));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();


-- ─── Compteur d'abonnés (évite un COUNT à chaque affichage) ──────────────────

create or replace function private.update_followers_count()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.crews set followers_count = followers_count + 1 where id = new.crew_id;
  elsif tg_op = 'DELETE' then
    update public.crews set followers_count = greatest(followers_count - 1, 0) where id = old.crew_id;
  end if;
  return null;
end;
$$;

create trigger follows_count
  after insert or delete on public.follows
  for each row execute function private.update_followers_count();


-- ─── Utilitaires ─────────────────────────────────────────────────────────────

-- Distance orthodromique (formule de Haversine), en mètres.
create or replace function private.haversine_m(lat1 float8, lon1 float8, lat2 float8, lon2 float8)
returns float8
language sql immutable parallel safe
set search_path = ''
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

-- "L'Équipage du Nord !" → "l-equipage-du-nord"
create or replace function private.slugify(p_text text)
returns text
language sql immutable
set search_path = ''
as $$
  select left(trim(both '-' from regexp_replace(lower(extensions.unaccent(p_text)), '[^a-z0-9]+', '-', 'g')), 50);
$$;

create or replace function private.sha256_hex(p_text text)
returns text
language sql immutable
set search_path = ''
as $$
  select encode(extensions.digest(p_text, 'sha256'), 'hex');
$$;


-- ═════════════════════════════════════════════════════════════════════════════
--  INGESTION GPS — appelée uniquement par le service `tracker`
-- ═════════════════════════════════════════════════════════════════════════════
--
--  Règles :
--   - points invalides ignorés : hors bornes, (0,0), trop dans le futur ;
--   - points plus anciens que le dernier stocké ignorés ('stale') ;
--   - « sauts » impossibles (> 400 km/h) ignorés : glitch GPS ('glitch') ;
--   - un point n'est stocké que si la voiture a bougé de p_min_distance_m, ou si
--     rien n'a été stocké depuis p_max_silence_s (pas de milliers de points garés) ;
--   - la distance totale est cumulée à l'insertion → statistiques instantanées ;
--   - la ligne de l'équipage est verrouillée : deux positions simultanées ne
--     peuvent pas fausser le total.
--  Vitesse attendue en km/h (les conversions nœuds / m/s sont faites par le tracker).

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
  v_prev     record;
  v_has_prev boolean;
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

  select last_fix_at into v_last_fix from public.crews where id = p_crew for update;
  if not found then return 'invalid'; end if;

  select lat, lon, recorded_at into v_prev
  from public.positions where crew_id = p_crew
  order by recorded_at desc limit 1;
  v_has_prev := found;

  if v_has_prev then
    if p_recorded_at <= v_prev.recorded_at then return 'stale'; end if;
    v_dist := private.haversine_m(v_prev.lat, v_prev.lon, p_lat, p_lon);
    v_dt := extract(epoch from (p_recorded_at - v_prev.recorded_at));
    if v_dt < 3600 and (v_dist / v_dt) * 3.6 > 400 then return 'glitch'; end if;
    if v_speed is null and v_dt > 0 then v_speed := (v_dist / v_dt) * 3.6; end if;
  end if;

  -- « Dernière position connue » : toujours à jour, même si le point n'est pas stocké.
  if v_last_fix is null or p_recorded_at > v_last_fix then
    update public.crews
       set last_lat = p_lat, last_lon = p_lon, last_speed_kmh = v_speed, last_fix_at = p_recorded_at
     where id = p_crew;
  end if;

  if v_has_prev and v_dist < p_min_distance_m and v_dt < p_max_silence_s then
    return 'skipped';
  end if;

  -- La dérive GPS à l'arrêt ne compte pas dans la distance parcourue.
  v_counted := case when v_dist >= p_min_distance_m then v_dist else 0 end;

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

-- Retrouve l'équipage correspondant à une clé d'appareil (appli Traccar Client).
create or replace function private.crew_for_device_key(p_key text)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select crew_id from public.crew_devices where device_key_hash = private.sha256_hex(p_key);
$$;

-- Équipages associés à un appareil du serveur Traccar.
create or replace function private.traccar_links()
returns table (crew_id uuid, traccar_device_id text)
language sql stable security definer
set search_path = ''
as $$
  select crew_id, traccar_device_id from public.crew_devices where traccar_device_id is not null;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
--  API PUBLIQUE (appelable depuis le site via supabase.rpc('…'))
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Recherche d'équipages ────────────────────────────────────────────────────
create or replace function public.search_crews(
  p_query     text default null,
  p_live_only boolean default false,
  p_limit     integer default 24,
  p_offset    integer default 0
)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with filtered as (
    select c.* from public.crews c
    where c.is_public
      and (p_query is null or p_query = '' or (
            lower(c.name) like '%' || lower(p_query) || '%'
         or c.car_number ilike '%' || p_query || '%'
         or c.school ilike '%' || p_query || '%'
         or c.city ilike '%' || p_query || '%'))
      and (not p_live_only or c.last_fix_at > now() - interval '10 minutes')
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.last_fix_at desc nulls last, p.name)
      from (
        select id, slug, name, car_number, tagline, school, city, avatar_path, followers_count,
               last_lat, last_lon, last_speed_kmh, last_fix_at, total_distance_m
        from filtered
        order by last_fix_at desc nulls last, name
        limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
      ) p
    ), '[]'::jsonb)
  );
$$;

-- ── Création d'un équipage (l'appelant en devient propriétaire) ──────────────
create or replace function public.create_crew(p_name text, p_car_number text default null, p_tagline text default null)
returns public.crews
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_base text;
  v_slug text;
  v_crew public.crews;
  i      integer := 1;
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;

  if not private.is_admin() and (
    select count(*) from public.crew_members where user_id = v_uid and role = 'owner'
  ) >= 3 then
    raise exception 'Vous gérez déjà 3 équipages' using errcode = 'P0001';
  end if;

  v_base := coalesce(nullif(private.slugify(p_name), ''), 'equipage');
  if char_length(v_base) < 2 then v_base := 'equipage-' || v_base; end if;
  v_slug := v_base;
  while exists (select 1 from public.crews where slug = v_slug) loop
    i := i + 1;
    v_slug := v_base || '-' || i;
  end loop;

  insert into public.crews (slug, name, car_number, tagline)
  values (v_slug, trim(p_name), nullif(trim(p_car_number), ''), nullif(trim(p_tagline), ''))
  returning * into v_crew;

  insert into public.crew_members (crew_id, user_id, role) values (v_crew.id, v_uid, 'owner');
  insert into public.crew_devices (crew_id) values (v_crew.id);
  return v_crew;
end;
$$;

-- ── Membres ─────────────────────────────────────────────────────────────────
create or replace function public.get_crew_members(p_crew uuid)
returns table (user_id uuid, display_name text, role text)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_insider boolean := private.can_edit_crew(p_crew);
begin
  if not private.can_view_crew(p_crew) then return; end if;
  return query
    select case when v_insider then m.user_id end, p.display_name, m.role
    from public.crew_members m join public.profiles p on p.id = m.user_id
    where m.crew_id = p_crew
    order by m.created_at;
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
    raise exception 'Réservé au propriétaire de l''équipage' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cet email : la personne doit d''abord s''inscrire' using errcode = 'P0002';
  end if;
  insert into public.crew_members (crew_id, user_id, role) values (p_crew, v_user, 'member')
  on conflict do nothing;
  if not found then raise exception 'Cette personne est déjà membre' using errcode = '23505'; end if;
end;
$$;

create or replace function public.set_crew_member_role(p_crew uuid, p_user uuid, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if private.crew_role(p_crew) is distinct from 'owner' and not private.is_admin() then
    raise exception 'Réservé au propriétaire de l''équipage' using errcode = '42501';
  end if;
  if p_role not in ('owner', 'member') then raise exception 'Rôle invalide'; end if;
  if p_role = 'member' and (
    select count(*) from public.crew_members where crew_id = p_crew and role = 'owner' and user_id <> p_user
  ) = 0 then
    raise exception 'L''équipage doit garder au moins un propriétaire';
  end if;
  update public.crew_members set role = p_role where crew_id = p_crew and user_id = p_user;
end;
$$;

-- Quitter un équipage (soi-même) ou en retirer quelqu'un (propriétaire).
create or replace function public.remove_crew_member(p_crew uuid, p_user uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_user is distinct from auth.uid()
     and private.crew_role(p_crew) is distinct from 'owner' and not private.is_admin() then
    raise exception 'Réservé au propriétaire de l''équipage' using errcode = '42501';
  end if;
  if exists (select 1 from public.crew_members where crew_id = p_crew and user_id = p_user and role = 'owner')
     and (select count(*) from public.crew_members where crew_id = p_crew and role = 'owner') = 1 then
    raise exception 'Le dernier propriétaire ne peut pas quitter l''équipage (supprimez-le ou nommez un autre propriétaire)';
  end if;
  delete from public.crew_members where crew_id = p_crew and user_id = p_user;
end;
$$;

-- ── GPS : clé d'appareil & infos de suivi ────────────────────────────────────
create or replace function public.regenerate_device_key(p_crew uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_key text := 'tt_' || encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not private.can_edit_crew(p_crew) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  -- Seul le hash est conservé : la clé n'est affichée qu'une fois.
  insert into public.crew_devices (crew_id, device_key_hash) values (p_crew, private.sha256_hex(v_key))
  on conflict (crew_id) do update set device_key_hash = excluded.device_key_hash;
  return v_key;
end;
$$;

create or replace function public.revoke_device_key(p_crew uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.can_edit_crew(p_crew) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.crew_devices set device_key_hash = null where crew_id = p_crew;
end;
$$;

create or replace function public.get_crew_tracking(p_crew uuid)
returns table (traccar_device_id text, has_device_key boolean)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.can_edit_crew(p_crew) then return; end if;
  return query
    select d.traccar_device_id, d.device_key_hash is not null
    from public.crew_devices d where d.crew_id = p_crew;
end;
$$;

-- ── Trace & statistiques ─────────────────────────────────────────────────────
-- Format compact : [[lat, lon, timestamp_s, vitesse_kmh|null], …]
-- Le site charge toute la trace une fois, puis uniquement les nouveaux points.
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
             round(speed_kmh::numeric)) order by recorded_at)
    from (
      select lat, lon, recorded_at, speed_kmh from public.positions
      where crew_id = p_crew and (p_since is null or recorded_at > p_since)
      order by recorded_at
      limit 100000
    ) t
  ), '[]'::jsonb);
end;
$$;

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
    'current_rank', c.current_rank,
    'supplies_count', c.supplies_count,
    'followers_count', c.followers_count
  );
end;
$$;

-- ── Compte utilisateur ──────────────────────────────────────────────────────
-- Suppression du compte (droit à l'effacement RGPD).
create or replace function public.delete_my_account()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if exists (
    select 1 from public.crew_members m
    where m.user_id = v_uid and m.role = 'owner'
      and (select count(*) from public.crew_members o where o.crew_id = m.crew_id and o.role = 'owner') = 1
  ) then
    raise exception 'Vous êtes le seul propriétaire d''un équipage : supprimez-le ou nommez un autre propriétaire avant de supprimer votre compte';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- ── Administration ──────────────────────────────────────────────────────────
create or replace function public.admin_list_users(p_search text default null)
returns table (id uuid, email text, display_name text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, p.display_name, p.role, u.created_at, u.last_sign_in_at
    from auth.users u join public.profiles p on p.id = u.id
    where p_search is null or p_search = ''
       or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
    order by u.created_at desc
    limit 200;
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'Vous ne pouvez pas retirer vos propres droits';
  end if;
  update public.profiles set role = p_role where id = p_user;
end;
$$;

create or replace function public.admin_list_crews()
returns table (id uuid, slug text, name text, car_number text, is_public boolean,
               traccar_device_id text, has_device_key boolean, last_fix_at timestamptz, followers_count integer)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return query
    select c.id, c.slug, c.name, c.car_number, c.is_public,
           d.traccar_device_id, d.device_key_hash is not null, c.last_fix_at, c.followers_count
    from public.crews c left join public.crew_devices d on d.crew_id = c.id
    order by c.name;
end;
$$;

create or replace function public.admin_set_traccar_device(p_crew uuid, p_device text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  insert into public.crew_devices (crew_id, traccar_device_id) values (p_crew, nullif(trim(p_device), ''))
  on conflict (crew_id) do update set traccar_device_id = excluded.traccar_device_id;
exception when unique_violation then
  raise exception 'Cet appareil Traccar est déjà associé à un autre équipage';
end;
$$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Réservé aux administrateurs' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'crews', (select count(*) from public.crews),
    'live_crews', (select count(*) from public.crews where last_fix_at > now() - interval '10 minutes'),
    'positions', (select count(*) from public.positions),
    'follows', (select count(*) from public.follows)
  );
end;
$$;
