-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du lien Facebook (pgTAP) : seuls les membres le modifient, et ce doit
--  être un lien web. Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(4);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'owner@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'other@test.local', '{}', 'authenticated', 'authenticated');

create temp table t_ids as
  with c as (insert into public.crews (slug, name, is_public) values ('reseaux', 'Réseaux', true) returning id)
  select id as crew from c;
grant select on t_ids to authenticated;
insert into public.crew_members (crew_id, user_id, role)
  values ((select crew from t_ids), '00000000-0000-0000-0000-0000000000d1', 'owner');

create function pg_temp.crew() returns uuid language sql as $$ select crew from t_ids $$;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
update public.crews set facebook_url = 'https://facebook.com/pirate' where id = pg_temp.crew();
reset role;
select is((select facebook_url from public.crews where id = pg_temp.crew()), null, 'un inconnu ne change pas le lien Facebook');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$ update public.crews set facebook_url = 'https://www.facebook.com/reseaux4l' where id = pg_temp.crew() $$,
  'un membre ajoute son lien Facebook');
select throws_ok($$ update public.crews set facebook_url = 'javascript:alert(1)' where id = pg_temp.crew() $$, '23514', null,
  'le lien doit être une adresse web');
reset role;
select is((select facebook_url from public.crews where id = pg_temp.crew()), 'https://www.facebook.com/reseaux4l',
  'le lien est enregistré');

select * from finish();
rollback;
