-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du tableau de bord de l'administration (pgTAP) : réservé aux admins,
--  chiffres et liste des road trips cohérents. Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'capitaine@test.local', '{"display_name":"Léa"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'chef@test.local', '{}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d2';
insert into public.crews (id, slug, name, starts_on) values ('00000000-0000-0000-0000-00000000d0e1', 'tableau-test', 'Tableau Test', current_date + 1);
insert into public.crew_members (crew_id, user_id, role) values ('00000000-0000-0000-0000-00000000d0e1', '00000000-0000-0000-0000-0000000000d1', 'owner');
insert into public.crew_devices (crew_id) values ('00000000-0000-0000-0000-00000000d0e1') on conflict do nothing;

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$ select public.admin_dashboard() $$, '42501', null, 'un voyageur ne voit pas le tableau de bord');
select throws_ok($$ select * from public.admin_list_trips() $$, '42501', null, '… ni la liste des road trips');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
create temp table t_dash as select public.admin_dashboard() as d;
create temp table t_trips as select * from public.admin_list_trips();
reset role;

select is(jsonb_array_length((select d -> 'hourly' from t_dash)), 24, '24 heures de points GPS');
select ok((select (d ->> 'crews')::int >= 1 from t_dash), 'le road trip est compté');
select ok((select d -> 'todo' @> '[{"kind":"no_gps","slug":"tableau-test"}]' from t_dash), 'départ demain sans GPS : à traiter');
select is((select owner_name from t_trips where slug = 'tableau-test'), 'Léa', 'le propriétaire est affiché');
select is((select owner_email from t_trips where slug = 'tableau-test'), 'capitaine@test.local', '… avec son e-mail');
select is((select has_device_key from t_trips where slug = 'tableau-test'), false, 'pas encore de téléphone relié');

select * from finish();
rollback;
