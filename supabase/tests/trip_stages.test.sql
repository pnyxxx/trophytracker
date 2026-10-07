-- ═════════════════════════════════════════════════════════════════════════════
--  Tests des étapes d'un road trip (pgTAP)
--  Tout s'exécute dans une transaction annulée à la fin : la base reste intacte.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-00000000a5a1', 'ana@test.local', '{"display_name":"Ana"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000a5b1', 'ben@test.local', '{"display_name":"Ben"}', 'authenticated', 'authenticated');
insert into public.crews (id, slug, name, is_public) values
  ('00000000-0000-0000-0000-00000000c5a1', 'alpes-test-k7qm2x', 'Les Alpes', true),
  ('00000000-0000-0000-0000-00000000c5b1', 'secret-test-a2b3c4', 'Secret', false);
insert into public.crew_members (crew_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000c5a1', '00000000-0000-0000-0000-00000000a5a1', 'owner'),
  ('00000000-0000-0000-0000-00000000c5b1', '00000000-0000-0000-0000-00000000a5a1', 'owner');
insert into public.trip_stages (crew_id, name, lat, lon) values
  ('00000000-0000-0000-0000-00000000c5b1', 'Étape cachée', 45.9, 6.1);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- Un voyageur ajoute, modifie et supprime ses étapes.
select pg_temp.as_user('00000000-0000-0000-0000-00000000a5a1');
select lives_ok($$ insert into public.trip_stages (crew_id, kind, name, lat, lon, source)
                   values ('00000000-0000-0000-0000-00000000c5a1', 'night', 'Chamonix', 45.92, 6.87, 'detected') $$,
  'un voyageur ajoute une étape');
select is((select created_by from public.trip_stages where name = 'Chamonix'), '00000000-0000-0000-0000-00000000a5a1'::uuid,
  'l''auteur est enregistré');
select lives_ok($$ update public.trip_stages set note = 'Nuit au camping' where name = 'Chamonix' $$, 'il la modifie');
select throws_ok($$ insert into public.trip_stages (crew_id, name, lat, lon) values ('00000000-0000-0000-0000-00000000c5a1', 'Nulle part', 120, 0) $$,
  '23514', null, 'une position impossible est refusée');
reset role;

-- Un inconnu voit les étapes d'un road trip visible, jamais celles d'un road trip privé, et ne peut rien écrire.
select pg_temp.as_user('00000000-0000-0000-0000-00000000a5b1');
select is((select count(*)::int from public.trip_stages where crew_id = '00000000-0000-0000-0000-00000000c5a1'), 1,
  'ben voit l''étape d''un road trip visible');
select is((select count(*)::int from public.trip_stages where crew_id = '00000000-0000-0000-0000-00000000c5b1'), 0,
  'ben ne voit pas les étapes d''un road trip privé');
select throws_ok($$ insert into public.trip_stages (crew_id, name, lat, lon) values ('00000000-0000-0000-0000-00000000c5a1', 'Intrus', 45, 6) $$,
  '42501', null, 'ben ne peut pas ajouter d''étape');
update public.trip_stages set name = 'Piraté' where name = 'Chamonix';
reset role;
select is((select count(*)::int from public.trip_stages where name = 'Piraté'), 0, 'ben ne peut pas modifier une étape');

-- Visiteur anonyme.
set local role anon;
select is((select count(*)::int from public.trip_stages), 1, 'un visiteur anonyme ne voit que les étapes visibles');
reset role;

select * from finish();
rollback;
