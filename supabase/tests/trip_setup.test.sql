-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du type de voyage et de la destination (pgTAP) : seuls les membres les
--  modifient, les valeurs sont contrôlées, les visiteurs les lisent.
--  Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f2', 'other@test.local', '{}', 'authenticated', 'authenticated');

create temp table t_ids as
  with c as (insert into public.crews (slug, name, is_public) values ('vers-lofoten', 'Vers les Lofoten', true) returning id)
  select id as crew from c;
grant select on t_ids to authenticated, anon;
insert into public.crew_members (crew_id, user_id, role)
  values ((select crew from t_ids), '00000000-0000-0000-0000-0000000000f1', 'owner');

create function pg_temp.crew() returns uuid language sql as $$ select crew from t_ids $$;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
update public.crews set trip_type = 'moto', destination = 'Ailleurs' where id = pg_temp.crew();
reset role;
select is((select destination from public.crews where id = pg_temp.crew()), null, 'un inconnu ne change pas la destination');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select lives_ok($$ update public.crews set trip_type = 'van', destination = 'Lofoten' where id = pg_temp.crew() $$,
  'un membre choisit le type de voyage et la destination');
select throws_ok($$ update public.crews set trip_type = 'fusée' where id = pg_temp.crew() $$, '23514', null,
  'un type de voyage inconnu est refusé');
select throws_ok($$ update public.crews set destination = '   ' where id = pg_temp.crew() $$, '23514', null,
  'une destination vide est refusée');
reset role;

set local role anon;
select is((select trip_type from public.crews where id = pg_temp.crew()), 'van', 'un visiteur lit le type de voyage');
select is((select destination from public.crews where id = pg_temp.crew()), 'Lofoten', '… et la destination');
reset role;

select * from finish();
rollback;
