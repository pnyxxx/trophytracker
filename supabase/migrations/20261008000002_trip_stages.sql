-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — étapes d'un road trip
--
--  Les étapes sont créées par les voyageurs eux-mêmes (aucun parcours imposé) :
--  à la main, ou en un clic depuis une suggestion (arrêt ou nuit détectés dans la
--  trace GPS par le site). Elles s'affichent sur la carte et dans le carnet de route.
--  Lecture : comme le road trip ; écriture : ses voyageurs.
--
--  crews.shared_at : premier partage du lien (case « Partager » du guide de départ).
-- ═════════════════════════════════════════════════════════════════════════════

create table public.trip_stages (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references public.crews (id) on delete cascade,
  kind        text not null default 'stop' check (kind in ('start', 'stop', 'night', 'highlight', 'finish')),
  name        text not null check (char_length(trim(name)) between 1 and 80),
  note        text check (char_length(note) <= 1000),
  place       text check (char_length(place) <= 120),
  lat         double precision not null check (lat between -90 and 90),
  lon         double precision not null check (lon between -180 and 180),
  arrived_at  timestamptz,
  left_at     timestamptz,
  source      text not null default 'manual' check (source in ('manual', 'detected')),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (left_at is null or arrived_at is null or left_at >= arrived_at)
);
create index trip_stages_crew_idx on public.trip_stages (crew_id, arrived_at nulls last, created_at);
comment on table public.trip_stages is 'Étapes d''un road trip, créées par ses voyageurs (manuellement ou depuis une suggestion).';

create trigger trip_stages_touch before update on public.trip_stages
  for each row execute function private.touch_updated_at();

alter table public.trip_stages enable row level security;
grant select on public.trip_stages to anon, authenticated;
grant insert (crew_id, kind, name, note, place, lat, lon, arrived_at, left_at, source) on public.trip_stages to authenticated;
grant update (kind, name, note, place, lat, lon, arrived_at, left_at) on public.trip_stages to authenticated;
grant delete on public.trip_stages to authenticated;

create policy "étapes : road trip visible" on public.trip_stages
  for select to anon, authenticated using (private.can_view_crew(crew_id));
create policy "étapes : ajout par les voyageurs" on public.trip_stages
  for insert to authenticated with check (private.can_edit_crew(crew_id));
create policy "étapes : modification par les voyageurs" on public.trip_stages
  for update to authenticated using (private.can_edit_crew(crew_id)) with check (private.can_edit_crew(crew_id));
create policy "étapes : suppression par les voyageurs" on public.trip_stages
  for delete to authenticated using (private.can_edit_crew(crew_id));

alter publication supabase_realtime add table public.trip_stages;

-- ── Guide de départ : le lien a-t-il déjà été partagé ? ──────────────────────
alter table public.crews add column shared_at timestamptz;
grant update (shared_at) on public.crews to authenticated;
