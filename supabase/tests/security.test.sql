-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de sécurité et de logique métier (pgTAP)
--  Lancer :  npm run test:db
--
--  Chaque test « se fait passer » pour un visiteur, un membre ou un admin en
--  changeant de rôle Postgres et de JWT, exactement comme le fait l'API Supabase.
--  Tout s'exécute dans une transaction annulée à la fin : la base reste intacte.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(51);

-- ─── Préparation : 3 comptes (alice propriétaire, bob inconnu, admin) ───────
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.local', '{"display_name":"Alice"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.local',   '{"display_name":"Bob"}',   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', '{}',                       'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'Alice',
  'le profil est créé automatiquement à l''inscription');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000ad'), 'admin',
  'sans nom fourni, le début de l''email sert de nom');

-- Helpers pour changer d'identité
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
$$;

-- ─── Création d'équipage ────────────────────────────────────────────────────
select pg_temp.as_anon();
select throws_ok($$ select public.create_crew('Pirates') $$, '42501', null,
  'un visiteur ne peut pas créer d''équipage');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.create_crew('Les Écureuils du Désert', '1234') $$, 'alice crée un équipage');
select is((select slug from public.crews where name = 'Les Écureuils du Désert'), 'les-ecureuils-du-desert',
  'le slug est généré sans accents');
select is((select role from public.crew_members where user_id = '00000000-0000-0000-0000-00000000000a'), 'owner',
  'la créatrice devient propriétaire');
select lives_ok($$ select public.create_crew('Les Écureuils du Désert') $$, 'un nom en double est accepté…');
select ok(exists(select 1 from public.crews where slug = 'les-ecureuils-du-desert-2'), '… avec un slug unique');
select lives_ok($$ select public.create_crew('Troisième') $$, 'troisième équipage');
select throws_ok($$ select public.create_crew('Quatrième') $$, 'P0001', null, 'limite de 3 équipages par personne');

reset role;
create temp table t_ids as select id from public.crews where slug = 'les-ecureuils-du-desert';
grant select on t_ids to anon, authenticated;
create function pg_temp.crew() returns uuid language sql as $$ select id from t_ids $$;

-- ─── Visibilité ─────────────────────────────────────────────────────────────
select pg_temp.as_anon();
select is((select count(*)::int from public.crews where id = pg_temp.crew()), 1, 'un visiteur voit un équipage public');
select throws_ok($$ select * from public.crew_devices $$, '42501', null,
  'un visiteur ne peut pas lire les clés GPS');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.crews set is_public = false where id = pg_temp.crew();
select is((select count(*)::int from public.crews where id = pg_temp.crew()), 1, 'un membre voit son équipage privé');
select throws_ok($$ select * from public.crew_devices $$, '42501', null,
  'même un membre ne peut pas lire crew_devices directement');

select pg_temp.as_anon();
select is((select count(*)::int from public.crews where id = pg_temp.crew()), 0, 'un visiteur ne voit pas un équipage privé');
select is(public.get_track(pg_temp.crew()), '[]'::jsonb, 'ni sa trace GPS');
select is(public.get_crew_stats(pg_temp.crew()), null, 'ni ses statistiques');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select is((select count(*)::int from public.crews where id = pg_temp.crew()), 1, 'un admin voit un équipage privé');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.crews set is_public = true where id = pg_temp.crew();

-- ─── Modifications ──────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
update public.crews set name = 'Piraté !' where id = pg_temp.crew();
select is((select name from public.crews where id = pg_temp.crew()), 'Les Écureuils du Désert',
  'bob ne peut pas modifier l''équipage d''alice');
select throws_ok($$ delete from public.crew_members where crew_id = pg_temp.crew() $$, '42501', null,
  'bob ne peut pas supprimer les membres');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ update public.crews set total_distance_m = 99999 where id = pg_temp.crew() $$, '42501', null,
  'même un membre ne peut pas truquer la distance parcourue');
select throws_ok($$ update public.crews set slug = 'autre' where id = pg_temp.crew() $$, '42501', null,
  'ni changer le slug');
select throws_ok($$ update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'personne ne peut se nommer admin soi-même');
select lives_ok($$ update public.crews set tagline = 'On roule !' , current_rank = 42 where id = pg_temp.crew() $$,
  'un membre modifie les champs éditoriaux');
select throws_ok($$ update public.crews set avatar_path = 'autre-dossier/x.webp' where id = pg_temp.crew() $$,
  '23514', null, 'une image doit être dans le dossier de l''équipage');

-- ─── Photos & stockage ──────────────────────────────────────────────────────
select throws_ok(
  $$ insert into public.photos (crew_id, kind, title, storage_path) values (pg_temp.crew(), 'classic', 'x', 'ailleurs/x.webp') $$,
  '23514', null, 'une photo hors du dossier de l''équipage est refusée');
select lives_ok(
  $$ insert into public.photos (crew_id, kind, title, storage_path) values (pg_temp.crew(), 'classic', 'Dunes', pg_temp.crew() || '/photos/a.webp') $$,
  'un membre ajoute une photo');
select ok(private.can_edit_crew_path(pg_temp.crew() || '/photos/a.webp'), 'alice peut écrire dans le dossier de son équipage');
select ok(not private.can_edit_crew_path('../etc/passwd'), 'un chemin non conforme est refusé');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select ok(not private.can_edit_crew_path(pg_temp.crew() || '/photos/b.webp'), 'bob ne peut pas écrire dans ce dossier');
select throws_ok(
  $$ insert into public.photos (crew_id, kind, title, storage_path) values (pg_temp.crew(), 'classic', 'Spam', pg_temp.crew() || '/photos/b.webp') $$,
  '42501', null, 'bob ne peut pas ajouter de photo');

-- ─── Abonnements ────────────────────────────────────────────────────────────
select lives_ok($$ insert into public.follows (crew_id) values (pg_temp.crew()) $$, 'bob suit l''équipage');
select is((select followers_count from public.crews where id = pg_temp.crew()), 1, 'le compteur d''abonnés augmente');
select throws_ok(
  $$ insert into public.follows (user_id, crew_id) values ('00000000-0000-0000-0000-00000000000a', pg_temp.crew()) $$,
  '42501', null, 'bob ne peut pas abonner quelqu''un d''autre');

-- ─── Clé d'appareil GPS ─────────────────────────────────────────────────────
select throws_ok($$ select public.regenerate_device_key(pg_temp.crew()) $$, '42501', null,
  'bob ne peut pas générer la clé GPS de l''équipage');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table t_key as select public.regenerate_device_key(pg_temp.crew()) as k;
reset role;
select is(private.crew_for_device_key((select k from t_key)), pg_temp.crew(), 'la clé générée identifie l''équipage');
select is((select device_key_hash from public.crew_devices where crew_id = pg_temp.crew()),
  private.sha256_hex((select k from t_key)), 'seul le hash de la clé est stocké');

-- ─── Ingestion GPS (rôle tracker) ───────────────────────────────────────────
grant tracker to postgres;  -- permet au test d'endosser le rôle (annulé au rollback)
create temp table t_ingest (n int, result text);
grant insert on t_ingest to tracker;
grant select on t_ids to tracker;
set local role tracker;
insert into t_ingest values
  (1, private.ingest_position(pg_temp.crew(), now() - interval '10 min', 43.0, -1.0, 50, null, null, null, null, 'device')),
  (2, private.ingest_position(pg_temp.crew(), now() - interval '10 min', 43.0, -1.0, 50, null, null, null, null, 'device')),
  (3, private.ingest_position(pg_temp.crew(), now() - interval '9 min', 43.00001, -1.0, 0, null, null, null, null, 'device')),
  (4, private.ingest_position(pg_temp.crew(), now() - interval '8 min', 43.01, -1.0, 60, null, null, null, null, 'device')),
  (5, private.ingest_position(pg_temp.crew(), now() - interval '7 min', 48.0, 2.0, 60, null, null, null, null, 'device')),
  (6, private.ingest_position(pg_temp.crew(), now(), 0, 0, null, null, null, null, null, 'device'));
reset role;
select is((select result from t_ingest where n = 1), 'stored', 'premier point enregistré');
select is((select result from t_ingest where n = 2), 'stale', 'le même point n''est pas enregistré deux fois');
select is((select result from t_ingest where n = 3), 'skipped', 'une micro-dérive à l''arrêt n''est pas stockée');
select is((select result from t_ingest where n = 4), 'stored', 'un vrai déplacement est enregistré');
select is((select result from t_ingest where n = 5), 'glitch', 'un saut de 600 km en 1 minute est rejeté');
select is((select result from t_ingest where n = 6), 'invalid', 'la position (0,0) est rejetée');
select ok(not has_table_privilege('tracker', 'public.positions', 'select')
       and not has_table_privilege('tracker', 'public.crews', 'update'),
  'le tracker ne peut ni lire ni modifier les tables directement');

reset role;
select ok((select total_distance_m between 1100 and 1125 from public.crews where id = pg_temp.crew()),
  'la distance cumulée est correcte (~1,1 km)');

-- ─── Compte & administration ────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select public.delete_my_account() $$, 'P0001', null,
  'impossible de supprimer son compte en étant seul propriétaire d''un équipage');
select throws_ok($$ select * from public.admin_list_users() $$, '42501', null, 'un non-admin ne liste pas les comptes');

-- ─── Double authentification ────────────────────────────────────────────────
reset role;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'test', 'totp', 'verified', now(), now());

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated', 'aal', 'aal1')::text, true);
set local role authenticated;
update public.crews set tagline = 'sans code' where id = pg_temp.crew();
select isnt((select tagline from public.crews where id = pg_temp.crew()), 'sans code',
  'MFA activée : sans le code (aal1), alice ne peut plus modifier son équipage');
select throws_ok($$ select public.create_crew('Sans code') $$, '42501', null, 'MFA activée : ni créer d''équipage sans le code');
select is(private.mfa_ok(), false, 'mfa_ok() est faux en aal1');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated', 'aal', 'aal2')::text, true);
update public.crews set tagline = 'avec code' where id = pg_temp.crew();
select is((select tagline from public.crews where id = pg_temp.crew()), 'avec code',
  'avec le code (aal2), alice retrouve ses droits');

select * from finish();
rollback;
