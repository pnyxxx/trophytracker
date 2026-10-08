-- ═════════════════════════════════════════════════════════════════════════════
--  Tests des e-mails aux proches (pgTAP) : invitations (droits, limites, doublons),
--  désinscription sans compte, « C'est parti » au premier lancement du suivi,
--  résumé du soir après 21 h. Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);
grant tracker to postgres;

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'lea@test.local', '{"display_name":"Léa"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'inconnu@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e3', 'abonne@test.local', '{}', 'authenticated', 'authenticated');
insert into public.crews (id, slug, name, is_public, starts_on) values
  ('00000000-0000-0000-0000-00000000e0e1', 'mails-test', 'Mails Test', true, current_date - 2),
  ('00000000-0000-0000-0000-00000000e0e2', 'mails-prive', 'Mails Privé', false, null);
insert into public.crew_members (crew_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000e0e1', '00000000-0000-0000-0000-0000000000e1', 'owner'),
  ('00000000-0000-0000-0000-00000000e0e2', '00000000-0000-0000-0000-0000000000e1', 'owner');
insert into public.follows (user_id, crew_id) values ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-00000000e0e1');

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;
create temp table t_res (label text, n int);
grant insert, select on t_res to authenticated, anon, tracker;

-- Invitations
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
select throws_ok($$ select public.invite_relatives('00000000-0000-0000-0000-00000000e0e1', array['mamie@test.local']) $$, '42501', null,
  'un inconnu ne peut pas inviter');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
insert into t_res values ('invite', public.invite_relatives('00000000-0000-0000-0000-00000000e0e1', array['Mamie@Test.local ', 'pas-une-adresse', 'papi@test.local']));
insert into t_res values ('reinvite', public.invite_relatives('00000000-0000-0000-0000-00000000e0e1', array['mamie@test.local']));
select throws_ok($$ select public.invite_relatives('00000000-0000-0000-0000-00000000e0e2', array['x@test.local']) $$, 'P0001', null,
  'page réservée aux voyageurs : pas d''invitation');
insert into t_res select 'voit', count(*)::int from public.crew_subscribers where crew_id = '00000000-0000-0000-0000-00000000e0e1';
reset role;
select is((select n from t_res where label = 'invite'), 2, 'deux adresses valides invitées (la troisième est ignorée)');
select is((select n from t_res where label = 'reinvite'), 0, 'une même adresse n''est pas réinvitée');
select is((select n from t_res where label = 'voit'), 2, 'les voyageurs voient leurs proches invités');
select is((select count(*)::int from private.trip_mails where kind = 'invite' and crew_id = '00000000-0000-0000-0000-00000000e0e1'), 2,
  'deux e-mails d''invitation en file');
select is((select payload ->> 'inviter' from private.trip_mails where kind = 'invite' and email = 'mamie@test.local'), 'Léa',
  'l''invitation dit qui invite');

-- Désinscription sans compte
create temp table t_tok as select unsub_token as t from public.crew_subscribers where email = 'papi@test.local';
grant select on t_tok to anon;
set local role anon;
insert into t_res select 'unsub', 1 where public.unsubscribe((select t from t_tok)) ->> 'status' = 'ok';
insert into t_res select 'unknown', 1 where public.unsubscribe(gen_random_uuid()) ->> 'status' = 'unknown';
reset role;
select is((select n from t_res where label = 'unsub'), 1, 'un proche se désinscrit en un clic, sans compte');
select is((select n from t_res where label = 'unknown'), 1, 'un jeton inconnu ne fait rien');
select is((select count(*)::int from private.trip_mails where email = 'papi@test.local' and sent_at is null), 0,
  'les e-mails en attente du désinscrit sont retirés');

-- « C'est parti »
update public.crews set tracking_enabled = true where id = '00000000-0000-0000-0000-00000000e0e1';
select is((select array_agg(email order by email) from private.trip_mails where kind = 'departure'),
  array['abonne@test.local', 'mamie@test.local'], '« C''est parti » à l''abonné et au proche encore inscrit');
update public.crews set tracking_enabled = false where id = '00000000-0000-0000-0000-00000000e0e1';
update public.crews set tracking_enabled = true where id = '00000000-0000-0000-0000-00000000e0e1';
select is((select count(*)::int from private.trip_mails where kind = 'departure'), 2, 'un seul « C''est parti » par road trip');

-- Résumé du soir
insert into public.positions (crew_id, recorded_at, lat, lon, altitude, distance_from_prev_m, source) values
  ('00000000-0000-0000-0000-00000000e0e1', (current_date::timestamp + interval '10 hours') at time zone 'Europe/Paris', 45.1, 6.4, 1400, 0, 'device'),
  ('00000000-0000-0000-0000-00000000e0e1', (current_date::timestamp + interval '11 hours') at time zone 'Europe/Paris', 45.06, 6.41, 2642, 18000, 'device');
set local role tracker;
insert into t_res values ('soir-tot', private.queue_evening_digests((current_date::timestamp + interval '18 hours') at time zone 'Europe/Paris'));
insert into t_res values ('soir', private.queue_evening_digests((current_date::timestamp + interval '21 hours 30 minutes') at time zone 'Europe/Paris'));
insert into t_res values ('soir-bis', private.queue_evening_digests((current_date::timestamp + interval '22 hours') at time zone 'Europe/Paris'));
insert into t_res select 'file', count(*)::int from private.pending_trip_mails(50);
reset role;
select is((select n from t_res where label = 'soir-tot'), 0, 'pas de résumé avant 21 h');
select is((select n from t_res where label = 'soir'), 2, 'résumé du soir aux deux destinataires');
select is((select n from t_res where label = 'soir-bis'), 0, 'un seul résumé par soir');
select is((select (payload ->> 'distance_km')::int from private.trip_mails where kind = 'evening' limit 1), 18, 'le résumé compte les kilomètres du jour');

select * from finish();
rollback;
