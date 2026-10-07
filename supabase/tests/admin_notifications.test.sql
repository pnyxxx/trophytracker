-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de la file des emails aux admins (pgTAP)
--  Tout s'exécute dans une transaction annulée à la fin : la base reste intacte.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

grant tracker to postgres;  -- permet au test d'endosser le rôle (annulé au rollback)

-- La base de test peut déjà contenir des notifications : on repart d'une file vide.
delete from private.admin_notifications;
update public.profiles set role = 'user' where role = 'admin';

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'fanny@test.local', '{"display_name":"Fanny"}', 'authenticated', 'authenticated');

select is((select count(*)::int from private.admin_notifications where kind = 'new_account'), 1,
  'un nouveau compte crée une notification');
select is((select payload ->> 'email' from private.admin_notifications where kind = 'new_account'), 'fanny@test.local',
  'la notification contient l''email du compte');

-- Le rôle tracker n'a pas accès à pgTAP : il écrit ses résultats ici, vérifiés ensuite.
create temp table t_res (label text, n int, arr text[]);
grant insert on t_res to tracker;

-- Sans admin, rien à envoyer
set local role tracker;
insert into t_res select 'sans admin', count(*)::int, null from private.pending_admin_notifications();
reset role;
select is((select n from t_res where label = 'sans admin'), 0, 'sans admin, aucune notification à envoyer');

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', '{}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

-- Un abonnement
insert into public.crews (id, slug, name) values ('00000000-0000-0000-0000-00000000c0e1', 'equipage-test', 'Équipage Test');
insert into public.follows (user_id, crew_id) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000c0e1');
select is((select payload ->> 'crew_name' from private.admin_notifications where kind = 'new_follow'), 'Équipage Test',
  'un abonnement crée une notification avec l''équipage');
select is((select (payload ->> 'followers')::int from private.admin_notifications where kind = 'new_follow'), 1,
  'le nombre d''abonnés est déjà à jour');

-- Le service tracker relève la file
create temp table t_ids as select min(id) as first_id, max(id) as last_id from private.admin_notifications;
grant select on t_ids to tracker;
set local role tracker;
insert into t_res select 'à envoyer', count(*)::int, null from private.pending_admin_notifications();
insert into t_res select 'destinataires', null, recipients from private.pending_admin_notifications() limit 1;
insert into t_res select 'envoyée', 1, null from (select private.admin_notification_done((select first_id from t_ids), null)) x;
insert into t_res select 'échec', 1, null from (select private.admin_notification_done((select last_id from t_ids), 'SMTP indisponible')) x;
insert into t_res select 'après', count(*)::int, null from private.pending_admin_notifications();
reset role;
select is((select n from t_res where label = 'à envoyer'), 3, 'le tracker voit les 3 notifications à envoyer');
select is((select arr from t_res where label = 'destinataires'), array['admin@test.local'], 'destinataires : les admins');
select is((select sent_at is not null from private.admin_notifications where id = (select first_id from t_ids)), true,
  'le tracker marque une notification envoyée');
select is((select last_error from private.admin_notifications where id = (select last_id from t_ids)), 'SMTP indisponible',
  'le tracker note un échec');
select is((select n from t_res where label = 'après'), 2, 'l''envoyée sort de la file, l''échouée y reste');
select ok(not has_table_privilege('tracker', 'private.admin_notifications', 'select'), 'le tracker ne lit pas la table directement');

-- Accès équipage : paiement Stripe (une seule fois, même si Stripe renvoie l'événement), code, offert par un admin
delete from private.admin_notifications;
insert into public.crew_purchases (id, user_id, customer_email, source, amount_cents, stripe_session_id)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'fanny@test.local', 'stripe', 1500, 'cs_test_notif');
select is((select count(*)::int from private.admin_notifications), 0, 'un achat commencé ne notifie pas');
select is(public.purchase_paid('cs_test_notif', 'pi_test_notif', 1500, 'fanny@stripe.local'), 'paid', 'Stripe confirme le paiement');
select is(public.purchase_paid('cs_test_notif', 'pi_test_notif', 1500, 'fanny@stripe.local'), 'already', 'Stripe renvoie l''événement');
select is((select count(*)::int from private.admin_notifications where kind = 'new_purchase'), 1,
  'un paiement confirmé notifie une seule fois');
select is((select payload ->> 'amount_cents' || ' ' || (payload ->> 'email') || ' ' || (payload ->> 'name') from private.admin_notifications where kind = 'new_purchase'),
  '1500 fanny@stripe.local Fanny', 'la notification contient le montant, l''email Stripe et le nom');

insert into public.access_codes (id, code, note) values ('00000000-0000-0000-0000-0000000000c1', 'TT-TEST-NOTI', 'Partenaire');
insert into public.crew_purchases (user_id, customer_email, source, status, amount_cents, paid_at, access_code_id)
values ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', 'code', 'paid', 0, now(), '00000000-0000-0000-0000-0000000000c1');
select is((select payload ->> 'code' || ' ' || (payload ->> 'code_note') from private.admin_notifications where payload ->> 'source' = 'code'),
  'TT-TEST-NOTI Partenaire', 'un code utilisé notifie avec le code et sa note');

insert into public.crew_purchases (user_id, customer_email, source, status, amount_cents, paid_at)
values ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', 'admin', 'paid', 0, now());
select is((select count(*)::int from private.admin_notifications where kind = 'new_purchase'), 2,
  'un accès offert par un admin ne notifie pas');

-- Personne d'autre n'y a accès
select ok(not has_function_privilege('authenticated', 'private.pending_admin_notifications(integer)', 'execute'),
  'même un admin connecté au site ne peut pas lire la file');

select * from finish();
rollback;
