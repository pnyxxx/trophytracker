-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de l'inscription payante des équipages (pgTAP)
--  Tout s'exécute dans une transaction annulée à la fin : la base reste intacte.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'dora@test.local', '{"display_name":"Dora"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e1', 'eve@test.local',  '{"display_name":"Eve"}',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', '{}',                     'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f7', 'fred@test.local', '{"display_name":"Fred"}',  'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;
create function pg_temp.as_service() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"service_role"}', true);
  set local role service_role;
$$;

-- ─── Tarif ──────────────────────────────────────────────────────────────────
select is(private.crew_price_at('2026-10-15 12:00 Europe/Paris'), 1500, 'tarif de lancement : 15 € en octobre');
select is(private.crew_price_at('2026-11-30 23:59 Europe/Paris'), 1500, 'toujours 15 € le 30 novembre à 23 h 59 (Paris)');
select is(private.crew_price_at('2026-12-01 00:00 Europe/Paris'), 1900, '19 € à partir du 1er décembre');
select is((select regular_cents from public.crew_price()), 1900, 'le tarif normal est public');

-- ─── Sans paiement, pas d'équipage ──────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$ select public.create_crew('Dora Team') $$, 'P0001', 'Paiement requis pour créer la page d''un équipage',
  'dora ne peut pas créer d''équipage sans avoir payé');

-- Le navigateur ne peut ni écrire un achat, ni appeler les fonctions réservées à Stripe.
select throws_ok($$ insert into public.crew_purchases (user_id, source, status, amount_cents) values (auth.uid(), 'stripe', 'paid', 0) $$,
  '42501', null, 'dora ne peut pas s''inscrire un faux achat');
select throws_ok($$ select public.purchase_start(auth.uid(), 'dora@test.local') $$, '42501', null,
  'dora ne peut pas démarrer un achat sans passer par le serveur');
select throws_ok($$ select public.purchase_paid('cs_x', 'pi_x', 1500, null) $$, '42501', null,
  'dora ne peut pas marquer un achat comme payé');
select throws_ok($$ select public.admin_grant_crew_access('dora@test.local') $$, '42501', null,
  'dora ne peut pas s''offrir un accès');

-- ─── Parcours Stripe (clé service) ──────────────────────────────────────────
reset role;
select pg_temp.as_service();
create temp table t_p as select * from public.purchase_start('00000000-0000-0000-0000-0000000000d1', 'dora@test.local');
select is((select amount_cents from t_p), (select amount_cents from public.crew_price()), 'l''achat est créé au tarif du jour');
select lives_ok($$ select public.purchase_attach_session((select purchase_id from t_p), 'cs_test_dora') $$, 'la session Stripe est rattachée');
select is(public.purchase_paid('cs_test_dora', 'pi_test_dora', 1500, 'dora@test.local'), 'paid', 'Stripe confirme le paiement');
select is(public.purchase_paid('cs_test_dora', 'pi_test_dora', 1500, 'dora@test.local'), 'already',
  'un événement Stripe reçu deux fois n''est compté qu''une fois');
select is(public.purchase_paid('cs_inconnue', 'pi_x', 1500, null), 'unknown', 'une session inconnue est ignorée');
select throws_ok($$ select public.purchase_start('00000000-0000-0000-0000-0000000000d1', 'dora@test.local') $$, 'P0001', null,
  'pas de second achat tant que l''accès payé n''est pas utilisé');
reset role;

-- ─── Création de l'équipage avec l'accès payé ───────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from public.crew_purchases), 1, 'dora voit son achat');
select lives_ok($$ select public.create_crew('Dora Team') $$, 'avec un accès payé, dora crée son équipage');
reset role;
select is((select c.slug from public.crew_purchases p join public.crews c on c.id = p.crew_id
           where p.stripe_session_id = 'cs_test_dora'), 'dora-team', 'l''accès est consommé par cet équipage');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select is((select count(*)::int from public.crew_purchases), 0, 'eve ne voit pas les achats de dora');

-- ─── Remboursement ──────────────────────────────────────────────────────────
reset role;
update public.crews set is_public = true where slug = 'dora-team';
update public.crew_devices set device_key_hash = 'x' where crew_id = (select id from public.crews where slug = 'dora-team');
select pg_temp.as_service();
select is(public.purchase_refunded('pi_test_dora', 500), 'partial', 'un remboursement partiel est seulement noté');
select is(public.purchase_refunded('pi_test_dora', 1500), 'refunded', 'un remboursement total met fin à l''accès');
reset role;
select ok(not (select is_public from public.crews where slug = 'dora-team'), 'après remboursement total, la page est dépubliée');
select is((select device_key_hash from public.crew_devices where crew_id = (select id from public.crews where slug = 'dora-team')),
  null, 'après remboursement total, la clé GPS est désactivée');

-- ─── Admin : offrir un accès ────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select lives_ok($$ select public.admin_grant_crew_access('EVE@test.local') $$, 'un admin offre un accès à eve');
reset role;

-- ─── Code promo à 100 % : commande à 0 €, sans PaymentIntent ────────────────
select pg_temp.as_service();
create temp table t_promo as select * from public.purchase_start('00000000-0000-0000-0000-0000000000f7', 'fred@test.local');
select public.purchase_attach_session((select purchase_id from t_promo), 'cs_test_promo');
select is(public.purchase_paid('cs_test_promo', null, 0, 'fred@test.local'), 'paid', 'une commande gratuite (code promo) débloque l''accès');
select is((select amount_cents from public.crew_purchases where stripe_session_id = 'cs_test_promo'), 0, 'et elle est notée à 0 €');
reset role;

select * from finish();
rollback;
