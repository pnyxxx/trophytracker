-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — journal de bord
--
--  Une page de journal par jour de road trip, écrite par les voyageurs ; un brouillon
--  peut être rédigé par l'IA (Edge Function journal-draft) à partir du résumé de la
--  journée, puis relu, modifié et publié par un voyageur. Rien n'est publié sans eux.
--
--  get_day_summary : les faits d'une journée (kilomètres, heures, altitudes, étapes,
--  photos), réservés aux voyageurs : c'est ce qui sert à rédiger le brouillon.
-- ═════════════════════════════════════════════════════════════════════════════

create table public.journal_entries (
  id           uuid primary key default gen_random_uuid(),
  crew_id      uuid not null references public.crews (id) on delete cascade,
  day          date not null,
  title        text not null check (char_length(trim(title)) between 1 and 120),
  body         text not null check (char_length(body) between 1 and 4000),
  ai_generated boolean not null default false,
  published    boolean not null default true,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (crew_id, day)
);
comment on table public.journal_entries is 'Journal de bord : une page par jour, écrite (ou relue) par les voyageurs.';

create trigger journal_entries_touch before update on public.journal_entries
  for each row execute function private.touch_updated_at();

alter table public.journal_entries enable row level security;
grant select on public.journal_entries to anon, authenticated;
grant insert (crew_id, day, title, body, ai_generated, published) on public.journal_entries to authenticated;
grant update (title, body, ai_generated, published) on public.journal_entries to authenticated;
grant delete on public.journal_entries to authenticated;

create policy "journal : pages publiées d'un road trip visible, ou voyageurs" on public.journal_entries
  for select to anon, authenticated
  using ((published and private.can_view_crew(crew_id)) or private.can_edit_crew(crew_id));
create policy "journal : ajout par les voyageurs" on public.journal_entries
  for insert to authenticated with check (private.can_edit_crew(crew_id));
create policy "journal : modification par les voyageurs" on public.journal_entries
  for update to authenticated using (private.can_edit_crew(crew_id)) with check (private.can_edit_crew(crew_id));
create policy "journal : suppression par les voyageurs" on public.journal_entries
  for delete to authenticated using (private.can_edit_crew(crew_id));

-- ── Résumé d'une journée (voyageurs seulement) ───────────────────────────────
create or replace function public.get_day_summary(p_crew uuid, p_day date, p_tz text default 'Europe/Paris')
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_tz   text := coalesce((select name from pg_timezone_names where name = p_tz), 'Europe/Paris');
  v_from timestamptz := p_day::timestamp at time zone v_tz;
  v_to   timestamptz := (p_day + 1)::timestamp at time zone v_tz;
  v_pos  record;
begin
  if not private.can_edit_crew(p_crew) then
    raise exception 'Réservé aux voyageurs du road trip' using errcode = '42501';
  end if;

  select count(*) as points,
         coalesce(sum(distance_from_prev_m), 0) / 1000 as km,
         min(recorded_at) as first_at, max(recorded_at) as last_at,
         max(altitude) as max_alt, min(altitude) as min_alt, max(speed_kmh) as max_speed
    into v_pos
  from public.positions where crew_id = p_crew and recorded_at >= v_from and recorded_at < v_to;

  return jsonb_build_object(
    'road_trip', (select name from public.crews where id = p_crew),
    'day', p_day,
    'day_number', (select p_day - starts_on + 1 from public.crews where id = p_crew),
    'distance_km', round(v_pos.km::numeric, 1),
    'first_position_at', to_char(v_pos.first_at at time zone v_tz, 'HH24:MI'),
    'last_position_at', to_char(v_pos.last_at at time zone v_tz, 'HH24:MI'),
    'max_altitude_m', round(v_pos.max_alt::numeric),
    'min_altitude_m', round(v_pos.min_alt::numeric),
    'max_speed_kmh', round(v_pos.max_speed::numeric),
    'stages', coalesce((
      select jsonb_agg(jsonb_build_object('kind', kind, 'name', name, 'place', place, 'note', note,
                         'arrived', to_char(arrived_at at time zone v_tz, 'HH24:MI'),
                         'left', to_char(left_at at time zone v_tz, 'HH24:MI')) order by arrived_at)
      from public.trip_stages
      where crew_id = p_crew and arrived_at >= v_from and arrived_at < v_to), '[]'::jsonb),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object('title', title, 'location', location, 'description', description) order by taken_at)
      from public.photos
      where crew_id = p_crew and taken_at >= v_from and taken_at < v_to), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_day_summary(uuid, date, text) from public, anon;
grant execute on function public.get_day_summary(uuid, date, text) to authenticated;
