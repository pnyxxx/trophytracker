-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du journal de bord (pgTAP)
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-00000000f0a1', 'lea@test.local', '{"display_name":"Léa"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000f0b1', 'tom@test.local', '{"display_name":"Tom"}', 'authenticated', 'authenticated');
insert into public.crews (id, slug, name, is_public, starts_on) values
  ('00000000-0000-0000-0000-00000000f0c1', 'journal-test-k7qm2x', 'Les Alpes', true, '2027-07-01');
insert into public.crew_members (crew_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000f0c1', '00000000-0000-0000-0000-00000000f0a1', 'owner');
insert into public.positions (crew_id, recorded_at, lat, lon, speed_kmh, altitude, distance_from_prev_m, source) values
  ('00000000-0000-0000-0000-00000000f0c1', '2027-07-02 09:00 Europe/Paris', 45.1, 6.4, 50, 1400, 0, 'device'),
  ('00000000-0000-0000-0000-00000000f0c1', '2027-07-02 11:00 Europe/Paris', 45.06, 6.41, 30, 2642, 12500, 'device');

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000f0a1');
select is((public.get_day_summary('00000000-0000-0000-0000-00000000f0c1', '2027-07-02') ->> 'distance_km')::numeric, 12.5,
  'le résumé du jour donne les kilomètres');
select is((public.get_day_summary('00000000-0000-0000-0000-00000000f0c1', '2027-07-02') ->> 'day_number')::int, 2, 'et le numéro du jour');
select lives_ok($$ insert into public.journal_entries (crew_id, day, title, body, ai_generated, published)
                   values ('00000000-0000-0000-0000-00000000f0c1', '2027-07-02', 'Le Galibier', 'Quelle montée !', true, false) $$,
  'léa enregistre un brouillon');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000f0b1');
select throws_ok($$ select public.get_day_summary('00000000-0000-0000-0000-00000000f0c1', '2027-07-02') $$, '42501', null,
  'tom ne peut pas lire le résumé d''un road trip qui n''est pas le sien');
select is((select count(*)::int from public.journal_entries), 0, 'tom ne voit pas un brouillon non publié');
select throws_ok($$ insert into public.journal_entries (crew_id, day, title, body) values ('00000000-0000-0000-0000-00000000f0c1', '2027-07-03', 'x', 'y') $$,
  '42501', null, 'tom ne peut pas écrire dans le journal');
reset role;

update public.journal_entries set published = true;
set local role anon;
select is((select title from public.journal_entries), 'Le Galibier', 'une fois publiée, la page est visible avec le lien');
select ok(not has_function_privilege('anon', 'public.get_day_summary(uuid, date, text)', 'execute'), 'le résumé est fermé aux visiteurs');
reset role;

select * from finish();
rollback;
