-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du cadrage de la couverture (pgTAP) : seuls les membres le règlent,
--  et seulement entre 0 et 100 %. Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'other@test.local', '{}', 'authenticated', 'authenticated');

create temp table t_ids as
  with c as (insert into public.crews (slug, name, is_public) values ('cadrage', 'Cadrage', true) returning id)
  select id as crew from c;
grant select on t_ids to authenticated;
insert into public.crew_members (crew_id, user_id, role)
  values ((select crew from t_ids), '00000000-0000-0000-0000-0000000000c1', 'owner');

create function pg_temp.crew() returns uuid language sql as $$ select crew from t_ids $$;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select is((select cover_focus_x || ' ' || cover_focus_y from public.crews where id = pg_temp.crew()), '50 50',
  'par défaut, la couverture est centrée');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
update public.crews set cover_focus_y = 10 where id = pg_temp.crew();
reset role;
select is((select cover_focus_y::int from public.crews where id = pg_temp.crew()), 50,
  'un inconnu ne change pas le cadrage');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$ update public.crews set cover_focus_x = 20, cover_focus_y = 0 where id = pg_temp.crew() $$,
  'un membre règle le cadrage');
select throws_ok($$ update public.crews set cover_focus_y = 101 where id = pg_temp.crew() $$, '23514', null,
  'le cadrage reste entre 0 et 100 %');
reset role;
select is((select cover_focus_x || ' ' || cover_focus_y from public.crews where id = pg_temp.crew()), '20 0',
  'le cadrage est enregistré');

select * from finish();
rollback;
