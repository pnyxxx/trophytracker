-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du mur d'encouragements et des visites (pgTAP) : qui écrit, qui lit, qui retire ;
--  limites anti-abus ; visites anonymes comptées sans les voyageurs. Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'voyageuse@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'proche@test.local', '{}', 'authenticated', 'authenticated');
insert into public.crews (id, slug, name, is_public) values
  ('00000000-0000-0000-0000-00000000c0c1', 'mur-test', 'Mur Test', true),
  ('00000000-0000-0000-0000-00000000c0c2', 'mur-prive', 'Mur Privé', false);
insert into public.crew_members (crew_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000c0c1', '00000000-0000-0000-0000-0000000000c1', 'owner'),
  ('00000000-0000-0000-0000-00000000c0c2', '00000000-0000-0000-0000-0000000000c1', 'owner');

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;
create temp table t_res (label text, n int);
grant insert, select on t_res to anon, authenticated;

-- Un visiteur sans compte laisse un mot
set local role anon;
select lives_ok($$ select public.post_cheer('00000000-0000-0000-0000-00000000c0c1', '  Mamie ', 'Courage pour le col !') $$,
  'un proche sans compte laisse un mot');
select throws_ok($$ select public.post_cheer('00000000-0000-0000-0000-00000000c0c1', 'Spam', 'Gagnez https://arnaque.example') $$, 'P0001', null,
  'les liens sont refusés');
select throws_ok($$ select public.post_cheer('00000000-0000-0000-0000-00000000c0c2', 'X', 'coucou') $$, '42501', null,
  'pas de mot sur une page réservée aux voyageurs');
select throws_ok($$ select public.post_cheer('00000000-0000-0000-0000-00000000c0c1', '', '   ') $$, 'P0001', null,
  'un message vide est refusé');
select throws_ok($$ insert into public.cheers (crew_id, author_name, message) values ('00000000-0000-0000-0000-00000000c0c1', 'A', 'B') $$, '42501', null,
  'on n''écrit pas directement dans la table');
insert into t_res select 'lit', count(*)::int from public.cheers where crew_id = '00000000-0000-0000-0000-00000000c0c1';
select public.count_page_view('00000000-0000-0000-0000-00000000c0c1');
select public.count_page_view('00000000-0000-0000-0000-00000000c0c1');
select public.count_page_view('00000000-0000-0000-0000-00000000c0c2');
reset role;
select is((select n from t_res where label = 'lit'), 1, 'tout le monde lit le mur d''une page visible');
select is((select author_name from public.cheers where crew_id = '00000000-0000-0000-0000-00000000c0c1'), 'Mamie', 'le prénom est nettoyé');
select is((select views from public.crew_page_views where crew_id = '00000000-0000-0000-0000-00000000c0c1'), 2, 'deux visites comptées');
select is((select count(*)::int from public.crew_page_views where crew_id = '00000000-0000-0000-0000-00000000c0c2'), 0, 'une page qu''on ne voit pas n''est pas comptée');

-- Un proche connecté : une minute entre deux messages
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select lives_ok($$ select public.post_cheer('00000000-0000-0000-0000-00000000c0c1', 'Paul', 'Bonne route') $$, 'un proche connecté laisse un mot');
select throws_ok($$ select public.post_cheer('00000000-0000-0000-0000-00000000c0c1', 'Paul', 'Encore') $$, 'P0001', null,
  'pas deux messages dans la même minute');
reset role;

-- La voyageuse : retire un message, n'est pas comptée dans les visites, lit ses visites
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
delete from public.cheers where author_name = 'Paul';
select public.count_page_view('00000000-0000-0000-0000-00000000c0c1');
insert into t_res select 'visites', views from public.crew_page_views where crew_id = '00000000-0000-0000-0000-00000000c0c1';
reset role;
select is((select count(*)::int from public.cheers where author_name = 'Paul'), 0, 'les voyageurs retirent un message');
select is((select n from t_res where label = 'visites'), 2, 'les voyageurs lisent leurs visites, sans être comptés eux-mêmes');

select * from finish();
rollback;
