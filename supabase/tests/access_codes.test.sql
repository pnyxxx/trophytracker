-- ═════════════════════════════════════════════════════════════════════════════
--  Tests des codes d'accès offerts (pgTAP)
--  Tout s'exécute dans une transaction annulée à la fin : la base reste intacte.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'anna@test.local', '{"display_name":"Anna"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'bob@test.local',  '{"display_name":"Bob"}',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c1', 'carl@test.local', '{"display_name":"Carl"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', '{}',                     'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- ─── Seul un admin gère les codes ───────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select public.admin_create_access_code('pour moi') $$, '42501', null, 'anna ne peut pas créer de code');
select throws_ok($$ select public.admin_list_access_codes() $$, '42501', null, 'anna ne peut pas lister les codes');
select throws_ok($$ select * from public.access_codes $$, '42501', null, 'anna ne peut pas lire la table des codes');
select throws_ok($$ select public.admin_revoke_access_code(gen_random_uuid()) $$, '42501', null, 'anna ne peut pas désactiver un code');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
create temp table t_codes (name text, code text);
grant all on t_codes to authenticated;
insert into t_codes values ('solo', public.admin_create_access_code('Sponsor X'));
insert into t_codes values ('duo', public.admin_create_access_code('Deux équipages', 2));
select matches((select code from t_codes where name = 'solo'), '^TT-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$',
  'le code est lisible : TT-XXXX-XXXX sans caractère ambigu');
select throws_ok($$ select public.admin_create_access_code('trop tard', 1, now() - interval '1 day') $$, 'P0001', null,
  'pas de date limite dans le passé');
select is((select count(*)::int from public.admin_list_access_codes() l join t_codes t on t.code = l.code), 2, 'l''admin voit ses codes');
reset role;

-- ─── Utiliser un code ───────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is(public.redeem_access_code('TT-ZZZZ-ZZZZ'), 'invalid', 'un code inconnu est refusé');
select throws_ok($$ select public.create_crew('Anna Team') $$, 'P0001', null, 'sans code valable, pas d''équipage');
-- Saisie « à la main » : minuscules, espaces, sans le préfixe TT.
select is(public.redeem_access_code(lower(replace(substr((select code from t_codes where name = 'solo'), 4), '-', ' '))), 'ok',
  'anna utilise le code, même saisi en minuscules et sans « TT- »');
select is((select source || '/' || status || '/' || amount_cents from public.crew_purchases), 'code/paid/0',
  'anna reçoit un accès offert à 0 €');
select throws_ok(format('select public.redeem_access_code(%L)', (select code from t_codes where name = 'duo')), 'P0001', null,
  'pas de second code tant que l''accès n''est pas utilisé');
select lives_ok($$ select public.create_crew('Anna Team') $$, 'avec le code, anna crée son équipage');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select is(public.redeem_access_code((select code from t_codes where name = 'solo')), 'exhausted', 'un code à usage unique ne sert qu''une fois');
select is(public.redeem_access_code((select code from t_codes where name = 'duo')), 'ok', 'bob utilise le code à 2 utilisations');
reset role;

-- Un ancien code « 4L- » déjà distribué reste valable, même saisi sans préfixe.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'dina@test.local', '{"display_name":"Dina"}', 'authenticated', 'authenticated');
insert into public.access_codes (code, note) values ('4L-OLDC-ODE2', 'Ancien format');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(public.redeem_access_code('oldc ode2'), 'ok', 'un ancien code 4L- marche encore');
reset role;

-- ─── Désactivation, expiration, essais répétés ──────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select public.admin_revoke_access_code((select id from public.admin_list_access_codes() where note = 'Deux équipages'));
insert into t_codes values ('court', public.admin_create_access_code('Expire vite', 1, now() + interval '1 hour'));
select is((select uses from public.admin_list_access_codes() where note = 'Deux équipages'), 1, 'le compteur d''utilisations suit');
select is((select used_by from public.admin_list_access_codes() where note = 'Sponsor X'), array['Anna Team'],
  'l''admin voit quel équipage a utilisé le code');
reset role;
update public.access_codes set expires_at = now() - interval '1 minute' where note = 'Expire vite';

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(public.redeem_access_code((select code from t_codes where name = 'duo')), 'invalid', 'un code désactivé est refusé');
select is(public.redeem_access_code((select code from t_codes where name = 'court')), 'expired', 'un code expiré est refusé');
select is((select count(*)::int from public.crew_purchases), 0, 'carl n''a reçu aucun accès');
select throws_ok($$ insert into public.crew_purchases (user_id, source, status, amount_cents) values (auth.uid(), 'code', 'paid', 0) $$,
  '42501', null, 'carl ne peut pas s''inscrire un faux accès « code »');
reset role;
insert into private.access_code_failures (user_id) select '00000000-0000-0000-0000-0000000000c1' from generate_series(1, 8);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(public.redeem_access_code((select code from t_codes where name = 'solo')), 'exhausted',
  'en dessous de 10 essais ratés, on peut encore essayer');
select is(public.redeem_access_code('4L-AAAA-AAAA'), 'invalid', '10e essai raté');
select is(public.redeem_access_code((select code from t_codes where name = 'solo')), 'too_many',
  'après 10 essais ratés en une heure, les essais sont bloqués');
reset role;

-- ─── Les achats de l'admin indiquent le code ────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select is((select access_code from public.admin_list_purchases() where crew_name = 'Anna Team'), (select code from t_codes where name = 'solo'),
  'la liste des paiements indique le code utilisé');
reset role;

select * from finish();
rollback;
