-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de la ville de départ (pgTAP) : seuls les membres la modifient, les
--  coordonnées sont valides et vont par deux, les visiteurs la lisent.
--  Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'other@test.local', '{}', 'authenticated', 'authenticated');

create temp table t_ids as
  with c as (insert into public.crews (slug, name, is_public) values ('depart', 'Départ', true) returning id)
  select id as crew from c;
grant select on t_ids to authenticated, anon;
insert into public.crew_members (crew_id, user_id, role)
  values ((select crew from t_ids), '00000000-0000-0000-0000-0000000000e1', 'owner');

create function pg_temp.crew() returns uuid language sql as $$ select crew from t_ids $$;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
update public.crews set start_city = 'Ailleurs', start_lat = 1, start_lon = 1 where id = pg_temp.crew();
reset role;
select is((select start_city from public.crews where id = pg_temp.crew()), null, 'un inconnu ne change pas la ville de départ');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ update public.crews set start_city = 'Pédernec', start_lat = 48.596, start_lon = -3.27 where id = pg_temp.crew() $$,
  'un membre choisit sa ville de départ');
select throws_ok($$ update public.crews set start_lat = 123 where id = pg_temp.crew() $$, '23514', null,
  'la latitude doit être valide');
select throws_ok($$ update public.crews set start_lat = null where id = pg_temp.crew() $$, '23514', null,
  'latitude et longitude vont par deux');
reset role;

create temp table t_res (start_city text, start_lat double precision);
grant insert on t_res to anon;
set local role anon;
insert into t_res select start_city, start_lat from public.crews where slug = 'depart';
reset role;
select is((select start_city from t_res), 'Pédernec', 'les visiteurs voient la ville de départ');
select is((select start_lat from t_res), 48.596::double precision, '… et sa position');

select * from finish();
rollback;
