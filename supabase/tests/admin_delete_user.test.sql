-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de la suppression d'un compte par l'administration (pgTAP) : réservée
--  aux admins, emporte les road trips dont le compte est seul propriétaire,
--  garde ceux qui ont un autre propriétaire, et refuse les cas dangereux.
--  Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'test@test.local', '{"display_name":"Test"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f2', 'chef@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f3', 'ami@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f4', 'autre-admin@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f5', 'demo@test.local', '{}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id in ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f4');

insert into public.crews (id, slug, name) values
  ('00000000-0000-0000-0000-00000000f0e1', 'seul-proprio', 'Seul propriétaire'),
  ('00000000-0000-0000-0000-00000000f0e2', 'deux-proprios', 'Deux propriétaires');
-- Un seul road trip d'exemple possible : on met de côté celui de la base le temps du test (tout est annulé à la fin).
update public.crews set is_demo = false where is_demo;
insert into public.crews (id, slug, name, is_demo) values ('00000000-0000-0000-0000-00000000f0e3', 'demo-test', 'Démo', true);
insert into public.crew_members (crew_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000f0e1', '00000000-0000-0000-0000-0000000000f1', 'owner'),
  ('00000000-0000-0000-0000-00000000f0e2', '00000000-0000-0000-0000-0000000000f1', 'owner'),
  ('00000000-0000-0000-0000-00000000f0e2', '00000000-0000-0000-0000-0000000000f3', 'owner'),
  ('00000000-0000-0000-0000-00000000f0e3', '00000000-0000-0000-0000-0000000000f5', 'owner');
insert into public.trip_stages (crew_id, name, lat, lon) values ('00000000-0000-0000-0000-00000000f0e1', 'Étape', 45, 5);

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  set local role authenticated;
$$;

-- Un voyageur ne peut rien faire.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f3');
select throws_ok($$ select * from public.admin_user_crews('00000000-0000-0000-0000-0000000000f1') $$, '42501', null,
  'un voyageur ne voit pas les road trips d’un autre compte');
select throws_ok($$ select public.admin_delete_user('00000000-0000-0000-0000-0000000000f1') $$, '42501', null,
  'un voyageur ne supprime pas un compte');
reset role;

-- L'administrateur.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select results_eq($$ select slug from public.admin_user_crews('00000000-0000-0000-0000-0000000000f1') $$,
  $$ values ('seul-proprio'::text) $$, 'seul le road trip sans autre propriétaire partira avec le compte');
select throws_ok($$ select public.admin_delete_user('00000000-0000-0000-0000-0000000000f2') $$, '42501', null,
  'pas son propre compte');
select throws_ok($$ select public.admin_delete_user('00000000-0000-0000-0000-0000000000f4') $$, '42501', null,
  'pas un autre administrateur');
select throws_ok($$ select public.admin_delete_user('00000000-0000-0000-0000-0000000000f5') $$, '42501', null,
  'pas le compte du road trip d’exemple');
select throws_ok($$ select public.admin_delete_user('00000000-0000-0000-0000-0000000000ff') $$, 'P0002', null,
  'un compte inconnu est signalé');
select is(public.admin_delete_user('00000000-0000-0000-0000-0000000000f1'), 1, 'le compte est supprimé avec son road trip');
reset role;

select ok(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000f1'), 'le compte n’existe plus');
select ok(not exists (select 1 from public.crews where slug = 'seul-proprio'), 'son road trip non plus');
select ok(not exists (select 1 from public.trip_stages where crew_id = '00000000-0000-0000-0000-00000000f0e1'), '… ni ses étapes');
select ok(exists (select 1 from public.crews where slug = 'deux-proprios'), 'le road trip qui a un autre propriétaire est gardé');

select * from finish();
rollback;
