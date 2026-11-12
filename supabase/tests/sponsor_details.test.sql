-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de la fiche d'un sponsor (pgTAP) : plusieurs liens, téléphone, e-mail ;
--  seuls les voyageurs les modifient, et les valeurs sont contrôlées.
--  Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner-fiche@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'other-fiche@test.local', '{}', 'authenticated', 'authenticated');

create temp table t_ids as
  with c as (insert into public.crews (slug, name, is_public) values ('fiche-sponsor', 'Fiche sponsor', true) returning id),
       s as (insert into public.sponsors (crew_id, name) select id, 'Garage Dupont' from c returning id)
  select (select id from c) as crew, (select id from s) as sponsor;
grant select on t_ids to authenticated;
insert into public.crew_members (crew_id, user_id, role)
  values ((select crew from t_ids), '00000000-0000-0000-0000-0000000000c1', 'owner');

create function pg_temp.sponsor() returns uuid language sql as $$ select sponsor from t_ids $$;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
update public.sponsors set phone = '0600000000' where id = pg_temp.sponsor();
reset role;
select is((select phone from public.sponsors where id = pg_temp.sponsor()), null, 'un inconnu ne modifie pas la fiche');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$ update public.sponsors set
    description = 'Garage familial depuis 1982', phone = '+33 3 23 00 00 00', email = 'contact@garage-dupont.fr',
    links = '["https://garage-dupont.fr", "https://www.instagram.com/garagedupont", "https://www.tiktok.com/@garagedupont"]'
  where id = pg_temp.sponsor() $$, 'un voyageur remplit la fiche, avec plusieurs liens');
select throws_ok($$ update public.sponsors set links = '["javascript:alert(1)"]' where id = pg_temp.sponsor() $$, '23514', null,
  'un lien doit être une adresse web');
select throws_ok($$ update public.sponsors set links = '"https://un-seul.fr"' where id = pg_temp.sponsor() $$, '23514', null,
  'les liens sont une liste');
select throws_ok($$ update public.sponsors set links = (select jsonb_agg('https://site' || i || '.fr') from generate_series(1, 9) i) where id = pg_temp.sponsor() $$, '23514', null,
  '8 liens au plus');
select throws_ok($$ update public.sponsors set email = 'pas-un-email' where id = pg_temp.sponsor() $$, '23514', null,
  'l’e-mail est contrôlé');
select throws_ok($$ update public.sponsors set phone = 'appelle-moi' where id = pg_temp.sponsor() $$, '23514', null,
  'le téléphone est contrôlé');
reset role;
select is((select jsonb_array_length(links) from public.sponsors where id = pg_temp.sponsor()), 3, 'les trois liens sont enregistrés');

select * from finish();
rollback;
