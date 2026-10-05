-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — relance « configurez votre GPS »
--
--  Trois jours après la création de sa page, un équipage qui n'a jamais envoyé
--  la moindre position (pas même un essai) reçoit UN email de rappel (tous ses
--  membres), entre 9 h et 20 h, heure de Paris. Les admins en sont prévenus
--  (file private.admin_notifications, type « gps_reminder »).
--
--  private.gps_reminders retient une ligne par équipage :
--    - 'not_needed' dès la première position ou le premier essai reçu (même si
--      la trace est effacée ensuite, l'équipage a bien réglé son téléphone) ;
--    - 'sent' une fois le rappel envoyé ;
--    - 'failed' si l'envoi échoue (retenté, 5 essais au plus).
--  Le service tracker relève les rappels dus en même temps que les emails admin.
-- ═════════════════════════════════════════════════════════════════════════════

create table private.gps_reminders (
  crew_id    uuid primary key references public.crews (id) on delete cascade,
  status     text not null check (status in ('not_needed', 'sent', 'failed')),
  attempts   integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);
comment on table private.gps_reminders is
  'Relance « configurez votre GPS » : déjà inutile (position reçue), envoyée, ou en échec. Relevée par le service tracker.';

alter table private.gps_reminders enable row level security;
revoke all on private.gps_reminders from public, anon, authenticated, tracker;

-- Équipages qui ont déjà envoyé une position ou un essai : jamais de rappel.
insert into private.gps_reminders (crew_id, status)
select c.id, 'not_needed' from public.crews c
where c.last_fix_at is not null
   or exists (select 1 from public.positions p where p.crew_id = c.id)
   or exists (select 1 from public.gps_test_fixes t where t.crew_id = c.id);

-- ── Première position ou premier essai : le rappel devient inutile ──────────
create or replace function private.gps_reminder_not_needed()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into private.gps_reminders (crew_id, status) values (new.crew_id, 'not_needed')
  on conflict (crew_id) do update set status = 'not_needed', updated_at = now()
    where private.gps_reminders.status = 'failed';
  return null;
end;
$$;

create trigger positions_gps_reminder
  after insert on public.positions
  for each row execute function private.gps_reminder_not_needed();

create trigger gps_test_fixes_gps_reminder
  after insert on public.gps_test_fixes
  for each row execute function private.gps_reminder_not_needed();

-- ── Fonctions du service tracker ─────────────────────────────────────────────
-- Rappels à envoyer maintenant : page créée il y a plus de 3 jours, aucune position,
-- pas encore relancé, entre 9 h et 20 h à Paris. Avec les emails des membres
-- (destinataires) et des admins (pour « répondre à »). p_now : pour les tests.
create or replace function private.pending_gps_reminders(p_limit integer default 10, p_now timestamptz default now())
returns table (crew_id uuid, crew_name text, crew_slug text, crew_created_at timestamptz, recipients text[], reply_to text[])
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.name, c.slug, c.created_at,
         (select array_agg(u.email order by u.email)
            from public.crew_members m join auth.users u on u.id = m.user_id
           where m.crew_id = c.id and u.email is not null),
         (select array_agg(u.email order by u.email)
            from public.profiles p join auth.users u on u.id = p.id
           where p.role = 'admin' and u.email is not null)
  from public.crews c
  left join private.gps_reminders r on r.crew_id = c.id
  where c.created_at < p_now - interval '3 days'
    and c.last_fix_at is null
    and (r.crew_id is null or (r.status = 'failed' and r.attempts < 5))
    and extract(hour from p_now at time zone 'Europe/Paris') between 9 and 19
    and exists (select 1 from public.crew_members m where m.crew_id = c.id)
  order by c.created_at
  limit p_limit;
$$;

-- Résultat d'un envoi : p_error null = envoyé, et les admins sont prévenus.
create or replace function private.gps_reminder_done(p_crew uuid, p_error text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_error is not null then
    insert into private.gps_reminders (crew_id, status, attempts, last_error) values (p_crew, 'failed', 1, left(p_error, 500))
    on conflict (crew_id) do update
      set attempts = private.gps_reminders.attempts + 1, last_error = excluded.last_error, updated_at = now()
      where private.gps_reminders.status = 'failed';
    return;
  end if;

  insert into private.gps_reminders (crew_id, status) values (p_crew, 'sent')
  on conflict (crew_id) do update set status = 'sent', last_error = null, updated_at = now();

  insert into private.admin_notifications (kind, payload)
  select 'gps_reminder', jsonb_build_object(
           'crew_name', c.name,
           'crew_slug', c.slug,
           'crew_created_at', c.created_at,
           'members', (select string_agg(coalesce(nullif(p.display_name, ''), u.email) || ' (' || u.email || ')', ', ' order by u.email)
                         from public.crew_members m
                         join auth.users u on u.id = m.user_id
                         left join public.profiles p on p.id = m.user_id
                        where m.crew_id = c.id))
  from public.crews c where c.id = p_crew;
end;
$$;

alter table private.admin_notifications drop constraint admin_notifications_kind_check;
alter table private.admin_notifications add constraint admin_notifications_kind_check
  check (kind in ('new_account', 'new_follow', 'new_purchase', 'gps_reminder'));

revoke execute on function
  private.gps_reminder_not_needed(),
  private.pending_gps_reminders(integer, timestamptz),
  private.gps_reminder_done(uuid, text)
from public, anon, authenticated;

grant execute on function
  private.pending_gps_reminders(integer, timestamptz),
  private.gps_reminder_done(uuid, text)
to tracker;
