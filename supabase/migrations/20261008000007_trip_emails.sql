-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — e-mails aux proches qui suivent un road trip
--
--  Trois e-mails, envoyés par le service tracker (file private.trip_mails) :
--   - « invite »    : un voyageur invite un proche par e-mail à suivre le voyage (pas besoin de compte) ;
--   - « departure » : « C'est parti ! », au premier « Je pars » (suivi lancé) ;
--   - « evening »   : résumé du soir (kilomètres, altitude, photos, mot du journal), chaque soir de route,
--                     à partir de 21 h, heure de Paris.
--  Destinataires de « departure » et « evening » : les abonnés avec un compte (follows, e-mails acceptés)
--  et les proches invités par e-mail (crew_subscribers). Chaque e-mail porte un lien de désinscription
--  en un clic (jeton aléatoire, public.unsubscribe), sans compte.
--  Rien n'est envoyé pour le road trip d'exemple ni pour une page réservée aux voyageurs.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Abonnés : e-mails et désinscription ──────────────────────────────────────
alter table public.follows
  add column emails boolean not null default true,
  add column unsub_token uuid not null default gen_random_uuid() unique;
comment on column public.follows.emails is 'Reçoit les e-mails du voyage (« C''est parti », résumé du soir).';

grant update (emails) on public.follows to authenticated;
create policy "abonnements : régler ses e-mails" on public.follows
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Proches invités par e-mail (sans compte) ─────────────────────────────────
create table public.crew_subscribers (
  id              uuid primary key default gen_random_uuid(),
  crew_id         uuid not null references public.crews (id) on delete cascade,
  email           text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 254),
  invited_by      uuid references auth.users (id) on delete set null default auth.uid(),
  unsub_token     uuid not null default gen_random_uuid() unique,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);
create unique index crew_subscribers_email_idx on public.crew_subscribers (crew_id, lower(email));
comment on table public.crew_subscribers is
  'Proches invités par e-mail par les voyageurs : invitation, puis « C''est parti » et résumé du soir, jusqu''à désinscription.';

alter table public.crew_subscribers enable row level security;
grant select, delete on public.crew_subscribers to authenticated;
create policy "proches invités : vus par les voyageurs" on public.crew_subscribers
  for select to authenticated using (private.can_edit_crew(crew_id));
create policy "proches invités : retirés par les voyageurs" on public.crew_subscribers
  for delete to authenticated using (private.can_edit_crew(crew_id));

-- ── File d'envoi ─────────────────────────────────────────────────────────────
create table private.trip_mails (
  id          bigint generated always as identity primary key,
  crew_id     uuid not null references public.crews (id) on delete cascade,
  kind        text not null check (kind in ('invite', 'departure', 'evening')),
  day         date not null default (now() at time zone 'Europe/Paris')::date,
  email       text not null,
  unsub_token uuid,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  attempts    integer not null default 0,
  last_error  text,
  unique (crew_id, kind, day, email)
);
create index trip_mails_pending_idx on private.trip_mails (created_at) where sent_at is null;
comment on table private.trip_mails is 'E-mails du voyage à envoyer aux proches, relevés par le service tracker.';
alter table private.trip_mails enable row level security;
revoke all on private.trip_mails from public, anon, authenticated, tracker;

/** Destinataires des e-mails du voyage : abonnés (e-mails acceptés) et proches invités (non désinscrits). */
create or replace function private.trip_recipients(p_crew uuid)
returns table (email text, unsub_token uuid)
language sql stable security definer
set search_path = ''
as $$
  select distinct on (lower(x.email)) x.email, x.unsub_token from (
    select u.email::text as email, f.unsub_token
    from public.follows f join auth.users u on u.id = f.user_id
    where f.crew_id = p_crew and f.emails and u.email is not null
    union all
    select s.email, s.unsub_token from public.crew_subscribers s
    where s.crew_id = p_crew and s.unsubscribed_at is null
  ) x
  order by lower(x.email);
$$;

/** Ce que les e-mails disent du road trip (nom, départ, destination, voyageurs, dates). */
create or replace function private.trip_mail_payload(p_crew uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', c.name, 'slug', c.slug, 'city', c.city, 'destination', c.destination,
    'starts_on', c.starts_on, 'ends_on', c.ends_on, 'trip_type', c.trip_type,
    'travellers', (select coalesce(jsonb_agg(p.display_name order by m.created_at), '[]'::jsonb)
                     from public.crew_members m join public.profiles p on p.id = m.user_id where m.crew_id = c.id)
  )
  from public.crews c where c.id = p_crew;
$$;

-- ── Inviter des proches par e-mail ───────────────────────────────────────────
-- Au plus 20 adresses par envoi et 50 invitations par road trip et par 24 h (pas d'envoi en masse).
-- Une personne désinscrite n'est jamais réinvitée. Retour : nombre d'invitations envoyées.
create or replace function public.invite_relatives(p_crew uuid, p_emails text[])
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_crew   public.crews;
  v_email  text;
  v_count  integer := 0;
  v_recent integer;
begin
  if not private.can_edit_crew(p_crew) then
    raise exception 'Réservé aux voyageurs du road trip' using errcode = '42501';
  end if;
  select * into v_crew from public.crews where id = p_crew;
  if not v_crew.is_public then
    raise exception 'La page est réservée aux voyageurs : rends-la visible par lien pour inviter des proches' using errcode = 'P0001';
  end if;
  if v_crew.is_demo then
    raise exception 'Pas d''invitation depuis le road trip d''exemple' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_emails, 1), 0) > 20 then
    raise exception 'Vingt adresses au plus à la fois' using errcode = 'P0001';
  end if;
  select count(*) into v_recent from private.trip_mails
   where crew_id = p_crew and kind = 'invite' and created_at > now() - interval '24 hours';

  foreach v_email in array coalesce(p_emails, '{}') loop
    v_email := lower(trim(v_email));
    continue when v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 254;
    if v_recent + v_count >= 50 then
      raise exception 'Trop d''invitations aujourd''hui : réessaie demain' using errcode = 'P0001';
    end if;
    insert into public.crew_subscribers (crew_id, email) values (p_crew, v_email)
    on conflict (crew_id, lower(email)) do nothing;
    continue when not found;
    insert into private.trip_mails (crew_id, kind, email, unsub_token, payload)
    select p_crew, 'invite', v_email, s.unsub_token,
           private.trip_mail_payload(p_crew) || jsonb_build_object('inviter', (select display_name from public.profiles where id = auth.uid()))
    from public.crew_subscribers s where s.crew_id = p_crew and lower(s.email) = v_email
    on conflict do nothing;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── Désinscription en un clic (lien des e-mails, sans compte) ───────────────
create or replace function public.unsubscribe(p_token uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_crew uuid;
begin
  update public.crew_subscribers set unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsub_token = p_token returning crew_id into v_crew;
  if v_crew is null then
    update public.follows set emails = false where unsub_token = p_token returning crew_id into v_crew;
  end if;
  if v_crew is null then return jsonb_build_object('status', 'unknown'); end if;
  delete from private.trip_mails where unsub_token = p_token and sent_at is null;
  return jsonb_build_object('status', 'ok', 'name', (select name from public.crews where id = v_crew));
end;
$$;

-- ── « C'est parti » : au premier lancement du suivi ─────────────────────────
create or replace function private.queue_departure()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.tracking_enabled and not coalesce(old.tracking_enabled, false) and not new.is_demo and new.is_public
     and not exists (select 1 from private.trip_mails where crew_id = new.id and kind = 'departure') then
    insert into private.trip_mails (crew_id, kind, email, unsub_token, payload)
    select new.id, 'departure', r.email, r.unsub_token, private.trip_mail_payload(new.id)
    from private.trip_recipients(new.id) r
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger crews_queue_departure
  after update of tracking_enabled on public.crews
  for each row execute function private.queue_departure();

-- ── Résumé du soir ───────────────────────────────────────────────────────────
-- À partir de 21 h (Paris), pour chaque road trip en route qui a roulé ce jour-là. Sans effet avant 21 h
-- ni une seconde fois le même soir. Retour : nombre d'e-mails ajoutés. p_now : pour les tests.
create or replace function private.queue_evening_digests(p_now timestamptz default now())
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_day   date := (p_now at time zone 'Europe/Paris')::date;
  v_from  timestamptz := v_day::timestamp at time zone 'Europe/Paris';
  v_to    timestamptz := (v_day + 1)::timestamp at time zone 'Europe/Paris';
  v_count integer;
begin
  if extract(hour from p_now at time zone 'Europe/Paris') < 21 then return 0; end if;
  insert into private.trip_mails (crew_id, kind, day, email, unsub_token, payload)
  select c.id, 'evening', v_day, r.email, r.unsub_token,
         private.trip_mail_payload(c.id) || jsonb_build_object(
           'day', v_day,
           'day_number', case when c.starts_on is not null then v_day - c.starts_on + 1 end,
           'total_days', case when c.starts_on is not null and c.ends_on is not null then c.ends_on - c.starts_on + 1 end,
           'distance_km', round((s.km)::numeric, 0),
           'max_altitude_m', round(s.max_alt::numeric),
           'photos', (select count(*) from public.photos ph where ph.crew_id = c.id and ph.taken_at >= v_from and ph.taken_at < v_to),
           'stages', (select coalesce(jsonb_agg(t.name order by t.arrived_at), '[]'::jsonb) from public.trip_stages t
                       where t.crew_id = c.id and t.arrived_at >= v_from and t.arrived_at < v_to),
           'journal', (select jsonb_build_object('title', j.title, 'body', left(j.body, 400)) from public.journal_entries j
                        where j.crew_id = c.id and j.day = v_day and j.published)
         )
  from public.crews c
  cross join lateral (
    select coalesce(sum(p.distance_from_prev_m), 0) / 1000 as km, max(p.altitude) as max_alt, count(*) as n
    from public.positions p where p.crew_id = c.id and p.recorded_at >= v_from and p.recorded_at < v_to
  ) s
  cross join lateral private.trip_recipients(c.id) r
  where c.tracking_enabled and not c.is_demo and c.is_public and s.n > 0
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Fonctions du service tracker ─────────────────────────────────────────────
create or replace function private.pending_trip_mails(p_limit integer default 50)
returns table (id bigint, kind text, email text, unsub_token uuid, payload jsonb)
language sql stable security definer
set search_path = ''
as $$
  select m.id, m.kind, m.email, m.unsub_token, m.payload
  from private.trip_mails m
  where m.sent_at is null and m.attempts < 5 and m.created_at > now() - interval '2 days'
  order by m.created_at
  limit p_limit;
$$;

create or replace function private.trip_mail_done(p_id bigint, p_error text default null)
returns void
language sql security definer
set search_path = ''
as $$
  update private.trip_mails
     set sent_at = case when p_error is null then now() end,
         attempts = attempts + 1,
         last_error = left(p_error, 500)
   where id = p_id;
$$;

revoke execute on function
  private.trip_recipients(uuid), private.trip_mail_payload(uuid), private.queue_departure(),
  private.queue_evening_digests(timestamptz), private.pending_trip_mails(integer), private.trip_mail_done(bigint, text)
from public, anon, authenticated;
grant execute on function private.queue_evening_digests(timestamptz), private.pending_trip_mails(integer), private.trip_mail_done(bigint, text) to tracker;

revoke execute on function public.invite_relatives(uuid, text[]) from public, anon;
grant execute on function public.invite_relatives(uuid, text[]) to authenticated;
revoke execute on function public.unsubscribe(uuid) from public;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;
