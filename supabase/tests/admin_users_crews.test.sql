-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de la liste des comptes de l'administration (pgTAP) : réservée aux
--  admins, avec les road trips de chaque compte. Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(3);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'voyageur-liste@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'chef-liste@test.local', '{}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a2';
insert into public.crews (id, slug, name) values ('00000000-0000-0000-0000-00000000a0e1', 'liste-test', 'Liste Test');
insert into public.crew_members (crew_id, user_id, role) values ('00000000-0000-0000-0000-00000000a0e1', '00000000-0000-0000-0000-0000000000a1', 'owner');

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select * from public.admin_list_users('liste') $$, '42501', null, 'un voyageur ne voit pas la liste des comptes');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
create temp table t_users as select * from public.admin_list_users('liste');
reset role;
select is((select crews -> 0 ->> 'slug' from t_users where email = 'voyageur-liste@test.local'), 'liste-test', 'le road trip du compte est listé');
select is((select jsonb_array_length(crews) from t_users where email = 'chef-liste@test.local'), 0, 'un compte sans road trip a une liste vide');

select * from finish();
rollback;
