-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du lien de cagnotte (pgTAP) : seuls les membres le modifient, et ce
--  doit être un lien web. Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'other@test.local', '{}', 'authenticated', 'authenticated');

create temp table t_ids as
  with c as (insert into public.crews (slug, name, is_public) values ('cagnotte', 'Cagnotte', true) returning id)
  select id as crew from c;
grant select on t_ids to anon, authenticated;
insert into public.crew_members (crew_id, user_id, role)
  values ((select crew from t_ids), '00000000-0000-0000-0000-0000000000e1', 'owner');

create function pg_temp.crew() returns uuid language sql as $$ select crew from t_ids $$;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
update public.crews set fundraiser_url = 'https://pirate.example/cagnotte' where id = pg_temp.crew();
reset role;
select is((select fundraiser_url from public.crews where id = pg_temp.crew()), null, 'un inconnu ne change pas la cagnotte');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ update public.crews set fundraiser_url = 'https://www.leetchi.com/fr/c/cagnotte-4l' where id = pg_temp.crew() $$,
  'un membre ajoute le lien de sa cagnotte');
select throws_ok($$ update public.crews set fundraiser_url = 'javascript:alert(1)' where id = pg_temp.crew() $$, '23514', null,
  'le lien doit être une adresse web');
reset role;
select is((select fundraiser_url from public.crews where id = pg_temp.crew()), 'https://www.leetchi.com/fr/c/cagnotte-4l',
  'le lien est enregistré');

-- Un visiteur anonyme voit le lien d'une page publique.
set local role anon;
select is((select fundraiser_url from public.crews where id = pg_temp.crew()), 'https://www.leetchi.com/fr/c/cagnotte-4l',
  'un visiteur voit le lien de la cagnotte');
reset role;

select * from finish();
rollback;
