-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du suivi GPS lancé / arrêté (mode essai), de l'effacement de la trace
--  et de la position des photos (pgTAP). Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@test.local',  '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f2', 'member@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f3', 'other@test.local',  '{}', 'authenticated', 'authenticated');

create temp table t_ids as
  with c1 as (insert into public.crews (slug, name, is_public) values ('essai-gps', 'Essai GPS', true) returning id),
       c2 as (insert into public.crews (slug, name, is_public) values ('oubli-gps', 'Oubli GPS', true) returning id)
  select (select id from c1) as crew, (select id from c2) as crew2;
grant select on t_ids to authenticated;
insert into public.crew_members (crew_id, user_id, role) values
  ((select crew from t_ids), '00000000-0000-0000-0000-0000000000f1', 'owner'),
  ((select crew from t_ids), '00000000-0000-0000-0000-0000000000f2', 'member');

create function pg_temp.crew() returns uuid language sql as $$ select crew from t_ids $$;
create function pg_temp.crew2() returns uuid language sql as $$ select crew2 from t_ids $$;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;
create function pg_temp.ingest(p_crew uuid, p_ago interval, p_lat float8) returns text language sql as $$
  select private.ingest_position(p_crew, now() - p_ago, p_lat, -1.0, 40, null, null, null, null, 'device');
$$;

-- Départ prévu dans un mois : on est avant le road trip.
update public.crews set starts_on = current_date + 30 where id in (pg_temp.crew(), pg_temp.crew2());

-- ─── Mode essai ─────────────────────────────────────────────────────────────
select is((select tracking_enabled from public.crews where id = pg_temp.crew()), false, 'un nouvel équipage démarre avec le suivi arrêté');
select is(pg_temp.ingest(pg_temp.crew(), '5 min', 43.0), 'test', 'suivi arrêté : la position est reçue comme essai');
select is((select count(*)::int from public.positions where crew_id = pg_temp.crew()), 0, 'elle n''entre pas dans la trace');
select is((select last_fix_at from public.crews where id = pg_temp.crew()), null, 'ni dans la dernière position publique');
select is((select lat from public.gps_test_fixes where crew_id = pg_temp.crew()), 43.0::float8, 'elle est gardée comme position d''essai');
select is(pg_temp.ingest(pg_temp.crew(), '10 min', 44.0), 'test', 'un essai plus ancien est reçu…');
select is((select lat from public.gps_test_fixes where crew_id = pg_temp.crew()), 43.0::float8, '… sans remplacer le plus récent');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select is((select count(*)::int from public.gps_test_fixes where crew_id = pg_temp.crew()), 1, 'un membre voit la position d''essai');
select throws_ok($$ update public.crews set tracking_enabled = true where id = pg_temp.crew() $$, '42501', null,
  'le suivi ne se change pas en modifiant la table directement');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f3');
select is((select count(*)::int from public.gps_test_fixes where crew_id = pg_temp.crew()), 0, 'un inconnu ne la voit pas');
select throws_ok($$ select public.set_tracking(pg_temp.crew(), true) $$, '42501', null, 'un inconnu ne peut pas lancer le suivi');
reset role;
select ok(not has_table_privilege('anon', 'public.gps_test_fixes', 'select'), 'les visiteurs n''ont aucun accès aux essais');

-- ─── Lancer le suivi ────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select lives_ok($$ select public.set_tracking(pg_temp.crew(), true) $$, 'un membre lance le suivi');
reset role;
select is((select count(*)::int from public.gps_test_fixes where crew_id = pg_temp.crew()), 0, 'la position d''essai est effacée au lancement');
select is(pg_temp.ingest(pg_temp.crew(), '4 min', 43.0), 'stored', 'suivi lancé : la position entre dans la trace');
select is(pg_temp.ingest(pg_temp.crew(), '3 min', 43.01), 'stored', 'et les suivantes aussi');
select ok((select total_distance_m > 1000 from public.crews where id = pg_temp.crew()), 'les kilomètres sont comptés');

-- ─── Effacer la trace ───────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select throws_ok($$ select public.reset_track(pg_temp.crew()) $$, '42501', null, 'un simple membre ne peut pas effacer la trace');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select lives_ok($$ select public.reset_track(pg_temp.crew()) $$, 'le propriétaire efface la trace');
reset role;
select is((select count(*)::int from public.positions where crew_id = pg_temp.crew()), 0, 'plus aucun point');
select ok((select last_fix_at is null and last_lat is null and total_distance_m = 0 from public.crews where id = pg_temp.crew()),
  'dernière position et kilomètres remis à zéro');

-- ─── Lancement automatique le jour du départ ────────────────────────────────
update public.crews set starts_on = current_date - 1 where id in (pg_temp.crew(), pg_temp.crew2());
select is(pg_temp.ingest(pg_temp.crew2(), '2 min', 31.0), 'stored', 'un suivi oublié se lance tout seul le jour du départ prévu');
select is((select tracking_enabled from public.crews where id = pg_temp.crew2()), true, 'et reste lancé');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.set_tracking(pg_temp.crew(), false);
reset role;
select is(pg_temp.ingest(pg_temp.crew(), '1 min', 31.0), 'test', 'un suivi arrêté exprès pendant le raid n''est pas relancé');

-- ─── Position des photos ────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select lives_ok($$ insert into public.photos (crew_id, kind, title, storage_path, lat, lon, taken_at)
  values (pg_temp.crew(), 'classic', 'Dunes', pg_temp.crew() || '/photos/a.webp', 31.08, -4.01, now()) $$,
  'un membre publie une photo placée sur la carte');
select throws_ok($$ insert into public.photos (crew_id, kind, title, storage_path, lat)
  values (pg_temp.crew(), 'classic', 'Moitié', pg_temp.crew() || '/photos/b.webp', 31.08) $$, '23514', null,
  'une latitude sans longitude est refusée');
reset role;

select * from finish();
rollback;
