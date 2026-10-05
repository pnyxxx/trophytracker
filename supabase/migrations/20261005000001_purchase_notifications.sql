-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — email aux admins à chaque accès équipage obtenu
--
--  Même file d'attente que les nouveaux comptes et abonnés
--  (20260927000003_admin_notifications.sql) : un paiement Stripe confirmé ou un
--  code d'accès utilisé ajoute une notification « new_purchase ». Les accès
--  offerts directement par un admin (source 'admin') n'en créent pas : c'est
--  lui qui vient de le faire.
-- ═════════════════════════════════════════════════════════════════════════════

alter table private.admin_notifications drop constraint admin_notifications_kind_check;
alter table private.admin_notifications add constraint admin_notifications_kind_check
  check (kind in ('new_account', 'new_follow', 'new_purchase'));

create or replace function private.notify_new_purchase()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Seulement au passage à « payé » : Stripe peut renvoyer un événement, purchase_paid ne repasse pas un achat déjà payé.
  if new.status <> 'paid' or new.source = 'admin' then return null; end if;
  if tg_op = 'UPDATE' and old.status = 'paid' then return null; end if;

  insert into private.admin_notifications (kind, payload)
  select 'new_purchase', jsonb_build_object(
           'name', p.display_name,
           'email', coalesce(new.customer_email, u.email),
           'source', new.source,
           'amount_cents', new.amount_cents,
           'currency', new.currency,
           'code', c.code,
           'code_note', c.note,
           'paid_count', (select count(*) from public.crew_purchases where status = 'paid' and source = new.source))
  from (select 1) x
  left join public.profiles p on p.id = new.user_id
  left join auth.users u on u.id = new.user_id
  left join public.access_codes c on c.id = new.access_code_id;
  return null;
end;
$$;

create trigger crew_purchases_notify_admin
  after insert or update of status on public.crew_purchases
  for each row execute function private.notify_new_purchase();

revoke execute on function private.notify_new_purchase() from public, anon, authenticated;
