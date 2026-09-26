-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — emails aux administrateurs : nouveau compte, nouvel abonnement
--
--  Des déclencheurs rangent chaque événement dans une file d'attente
--  (private.admin_notifications). Le service tracker, qui tourne en permanence,
--  la relève toutes les 30 s et envoie un email à chaque admin par le SMTP du
--  site (apps/tracker/src/notifier.ts). Si l'envoi échoue, il est retenté
--  (5 essais au plus). Les notifications envoyées sont effacées après 30 jours.
-- ═════════════════════════════════════════════════════════════════════════════

create table private.admin_notifications (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('new_account', 'new_follow')),
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  attempts   integer not null default 0,
  last_error text
);
comment on table private.admin_notifications is
  'File d''attente des emails aux admins (nouveau compte, nouvel abonnement). Relevée par le service tracker.';
create index admin_notifications_pending_idx on private.admin_notifications (id) where sent_at is null;

alter table private.admin_notifications enable row level security;
revoke all on private.admin_notifications from public, anon, authenticated, tracker;

-- ── Déclencheurs ─────────────────────────────────────────────────────────────
-- Nouveau compte : le profil est créé à l'inscription (ou à l'invitation d'un coéquipier).
create or replace function private.notify_new_account()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into private.admin_notifications (kind, payload)
  select 'new_account', jsonb_build_object(
           'name', new.display_name,
           'email', u.email,
           'invited_to_crew', u.raw_user_meta_data ->> 'invited_to_crew',
           'provider', u.raw_app_meta_data ->> 'provider')
  from auth.users u where u.id = new.id;
  return null;
end;
$$;

create trigger profiles_notify_admin
  after insert on public.profiles
  for each row execute function private.notify_new_account();

-- Nouvel abonnement : quelqu'un suit un équipage.
create or replace function private.notify_new_follow()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into private.admin_notifications (kind, payload)
  select 'new_follow', jsonb_build_object(
           'name', p.display_name,
           'email', u.email,
           'crew_name', c.name,
           'crew_slug', c.slug,
           'followers', c.followers_count)
  from public.crews c
  left join public.profiles p on p.id = new.user_id
  left join auth.users u on u.id = new.user_id
  where c.id = new.crew_id;
  return null;
end;
$$;

-- Nommé pour passer après « follows_count » (ordre alphabétique) : le compteur est déjà à jour.
create trigger follows_notify_admin
  after insert on public.follows
  for each row execute function private.notify_new_follow();

-- ── Fonctions du service tracker ─────────────────────────────────────────────
-- Notifications à envoyer, avec les emails des admins. Rien tant qu'il n'y a aucun admin.
create or replace function private.pending_admin_notifications(p_limit integer default 20)
returns table (id bigint, kind text, payload jsonb, created_at timestamptz, recipients text[])
language sql stable security definer
set search_path = ''
as $$
  with admins as (
    select array_agg(u.email order by u.email) as emails
    from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'admin' and u.email is not null
  )
  select n.id, n.kind, n.payload, n.created_at, a.emails
  from private.admin_notifications n, admins a
  where n.sent_at is null and n.attempts < 5 and a.emails is not null
  order by n.id
  limit p_limit;
$$;

-- Résultat d'un envoi : p_error null = envoyé. Nettoie au passage les vieilles notifications.
create or replace function private.admin_notification_done(p_id bigint, p_error text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_error is null then
    update private.admin_notifications set sent_at = now(), last_error = null where id = p_id;
  else
    update private.admin_notifications
       set attempts = attempts + 1, last_error = left(p_error, 500)
     where id = p_id;
  end if;
  delete from private.admin_notifications
   where created_at < now() - interval '30 days' and (sent_at is not null or attempts >= 5);
end;
$$;

revoke execute on function
  private.notify_new_account(),
  private.notify_new_follow(),
  private.pending_admin_notifications(integer),
  private.admin_notification_done(bigint, text)
from public, anon, authenticated;

grant execute on function
  private.pending_admin_notifications(integer),
  private.admin_notification_done(bigint, text)
to tracker;
