-- ═════════════════════════════════════════════════════════════════════════════
--  Tests des réseaux sociaux des sponsors (pgTAP) : seuls les voyageurs les
--  modifient, et ce doivent être des liens web. Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'other@test.local', '{}', 'authenticated', 'authenticated');

create temp table t_ids as
  with c as (insert into public.crews (slug, name, is_public) values ('sponsors-reseaux', 'Sponsors réseaux', true) returning id),
       s as (insert into public.sponsors (crew_id, name) select id, 'Boulangerie Martin' from c returning id)
  select (select id from c) as crew, (select id from s) as sponsor;
grant select on t_ids to authenticated;
insert into public.crew_members (crew_id, user_id, role)
  values ((select crew from t_ids), '00000000-0000-0000-0000-0000000000e1', 'owner');

create function pg_temp.sponsor() returns uuid language sql as $$ select sponsor from t_ids $$;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
update public.sponsors set instagram_url = 'https://instagram.com/pirate' where id = pg_temp.sponsor();
reset role;
select is((select instagram_url from public.sponsors where id = pg_temp.sponsor()), null,
  'un inconnu ne change pas le compte Instagram d’un sponsor');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ update public.sponsors set instagram_url = 'https://www.instagram.com/boulangerie.martin',
  facebook_url = 'https://www.facebook.com/boulangeriemartin' where id = pg_temp.sponsor() $$,
  'un voyageur ajoute les réseaux de son sponsor');
select throws_ok($$ update public.sponsors set facebook_url = 'javascript:alert(1)' where id = pg_temp.sponsor() $$, '23514', null,
  'le lien Facebook doit être une adresse web');
select lives_ok($$ insert into public.sponsors (crew_id, name, instagram_url)
  values ((select crew from t_ids), 'Garage Dupont', 'https://www.instagram.com/garage.dupont') $$,
  'un sponsor peut être créé avec son seul compte Instagram');
reset role;
select is((select facebook_url from public.sponsors where id = pg_temp.sponsor()), 'https://www.facebook.com/boulangeriemartin',
  'le lien Facebook est enregistré');

select * from finish();
rollback;
