-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — 1/5 : tables
--
--  Organisation des schémas :
--    public   → tables et fonctions exposées à l'API (protégées par RLS, cf. 3_security)
--    private  → fonctions internes, JAMAIS exposées par l'API REST
-- ═════════════════════════════════════════════════════════════════════════════

create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;

-- Met à jour automatiquement la colonne updated_at.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─── Profils (complément de auth.users, géré par Supabase Auth) ─────────────

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  role         text not null default 'user' check (role in ('user', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.profiles is 'Profil public de chaque compte (1 ligne par utilisateur de auth.users).';

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();


-- ─── Équipages ──────────────────────────────────────────────────────────────

create table public.crews (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  name            text not null check (char_length(name) between 2 and 80),
  car_number      text check (char_length(car_number) <= 10),
  tagline         text check (char_length(tagline) <= 140),
  story           text check (char_length(story) <= 5000),
  school          text check (char_length(school) <= 120),
  city            text check (char_length(city) <= 80),
  contact_email   text check (char_length(contact_email) <= 254),
  instagram_url   text check (instagram_url ~* '^https?://' and char_length(instagram_url) <= 300),
  website_url     text check (website_url ~* '^https?://' and char_length(website_url) <= 300),
  avatar_path     text,
  cover_path      text,
  is_public       boolean not null default true,

  -- Saisis par l'équipage
  current_rank    integer check (current_rank > 0),
  supplies_count  integer check (supplies_count >= 0),

  -- Dernier état connu (mis à jour par l'ingestion GPS, lecture instantanée)
  last_lat         double precision,
  last_lon         double precision,
  last_speed_kmh   real,
  last_fix_at      timestamptz,
  total_distance_m double precision not null default 0,
  followers_count  integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Les images d'un équipage doivent être rangées dans SON dossier du stockage.
  constraint crews_avatar_in_folder check (avatar_path is null or avatar_path like id::text || '/%'),
  constraint crews_cover_in_folder  check (cover_path  is null or cover_path  like id::text || '/%')
);
comment on table public.crews is 'Équipages du raid. Visibles par tous si is_public.';

create index crews_last_fix_idx on public.crews (last_fix_at desc nulls last);
create index crews_name_trgm_idx on public.crews using gin (lower(name) extensions.gin_trgm_ops);

create trigger crews_touch before update of
  name, car_number, tagline, story, school, city, contact_email, instagram_url,
  website_url, avatar_path, cover_path, is_public, current_rank, supplies_count
  on public.crews for each row execute function private.touch_updated_at();


-- Informations techniques et secrètes liées au GPS (séparées pour ne jamais
-- être lisibles via l'API : aucun droit de lecture n'est accordé sur cette table).
create table public.crew_devices (
  crew_id           uuid primary key references public.crews (id) on delete cascade,
  traccar_device_id text unique,
  device_key_hash   text unique,
  updated_at        timestamptz not null default now()
);
comment on table public.crew_devices is 'Liaison GPS (Traccar / clé d''appareil hashée). Accès uniquement via fonctions.';

create trigger crew_devices_touch before update on public.crew_devices
  for each row execute function private.touch_updated_at();


create table public.crew_members (
  crew_id    uuid not null references public.crews (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create index crew_members_user_idx on public.crew_members (user_id);
comment on table public.crew_members is 'Membres pouvant gérer la page d''un équipage.';


create table public.follows (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  crew_id    uuid not null references public.crews (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, crew_id)
);
create index follows_crew_idx on public.follows (crew_id);
comment on table public.follows is 'Équipages suivis par un utilisateur (proches, sponsors…).';


-- ─── Positions GPS ──────────────────────────────────────────────────────────

create table public.positions (
  id                   bigint generated always as identity primary key,
  crew_id              uuid not null references public.crews (id) on delete cascade,
  recorded_at          timestamptz not null,
  lat                  double precision not null check (lat between -90 and 90),
  lon                  double precision not null check (lon between -180 and 180),
  speed_kmh            real,
  course               real,
  altitude             real,
  accuracy             real,
  battery              real,
  distance_from_prev_m double precision not null default 0,
  source               text not null check (source in ('traccar', 'device', 'manual')),
  created_at           timestamptz not null default now(),
  -- Empêche les doublons quand la même position est relue plusieurs fois.
  unique (crew_id, recorded_at)
);
comment on table public.positions is 'Trace GPS. Écriture uniquement via private.ingest_position().';


-- ─── Contenus des équipages ─────────────────────────────────────────────────

create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  crew_id      uuid not null references public.crews (id) on delete cascade,
  kind         text not null check (kind in ('classic', 'panorama')),
  title        text not null check (char_length(title) between 1 and 120),
  description  text check (char_length(description) <= 1000),
  location     text check (char_length(location) <= 120),
  taken_label  text check (char_length(taken_label) <= 60),
  storage_path text not null check (storage_path like crew_id::text || '/%'),
  width        integer check (width > 0),
  height       integer check (height > 0),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index photos_crew_idx on public.photos (crew_id, created_at desc);


create table public.sponsors (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references public.crews (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  logo_path   text check (logo_path like crew_id::text || '/%'),
  website_url text check (website_url ~* '^https?://' and char_length(website_url) <= 300),
  city        text check (char_length(city) <= 80),
  lat         double precision check (lat between -90 and 90),
  lon         double precision check (lon between -180 and 180),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((lat is null) = (lon is null))
);
create index sponsors_crew_idx on public.sponsors (crew_id, sort_order);

create trigger sponsors_touch before update on public.sponsors
  for each row execute function private.touch_updated_at();


-- ─── Événement (commun à tous les équipages) ────────────────────────────────

create table public.waypoints (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('start', 'stage', 'night', 'boat', 'bivouac', 'finish')),
  name        text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 500),
  country     text check (char_length(country) <= 60),
  lat         double precision not null check (lat between -90 and 90),
  lon         double precision not null check (lon between -180 and 180),
  sort_order  integer not null default 0,
  planned_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.waypoints is 'Points du parcours officiel, affichés sur toutes les cartes.';

create trigger waypoints_touch before update on public.waypoints
  for each row execute function private.touch_updated_at();


create table public.settings (
  key        text primary key check (key in ('event_name', 'event_start_date', 'event_end_date', 'event_total_km')),
  value      text not null check (char_length(value) <= 200),
  updated_at timestamptz not null default now()
);
comment on table public.settings is 'Réglages publics de l''édition en cours.';

create trigger settings_touch before update on public.settings
  for each row execute function private.touch_updated_at();
