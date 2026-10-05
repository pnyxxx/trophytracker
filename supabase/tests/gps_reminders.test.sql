-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de la relance « configurez votre GPS » (pgTAP)
--  Tout s'exécute dans une transaction annulée à la fin : la base reste intacte.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

grant tracker to postgres;  -- permet au test d'endosser le rôle (annulé au rollback)

-- Les autres équipages de la base de test ne gênent pas : on ne regarde que les nôtres.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'muet@test.local', '{"display_name":"Muet"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'bavard@test.local', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'neuf@test.local', '{}', 'authenticated', 'authenticated');

insert into public.crews (id, slug, name, created_at) values
  ('00000000-0000-0000-0000-00000000aa01', 'sans-gps', 'Sans GPS', now() - interval '4 days'),
  ('00000000-0000-0000-0000-00000000aa02', 'avec-essai', 'Avec essai', now() - interval '4 days'),
  ('00000000-0000-0000-0000-00000000aa03', 'tout-neuf', 'Tout neuf', now() - interval '1 day');
insert into public.crew_members (crew_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000a2', 'owner'),
  ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-0000000000a3', 'owner');

-- « Avec essai » a réglé son téléphone : un essai suffit, même effacé ensuite.
insert into public.gps_test_fixes (crew_id, lat, lon, recorded_at) values ('00000000-0000-0000-0000-00000000aa02', 48.6, -3.3, now());
delete from public.gps_test_fixes where crew_id = '00000000-0000-0000-0000-00000000aa02';
select is((select status from private.gps_reminders where crew_id = '00000000-0000-0000-0000-00000000aa02'), 'not_needed',
  'un premier essai GPS rend la relance inutile');

-- Aujourd'hui à telle heure de Paris : la relance ne part qu'entre 9 h et 20 h.
create function pg_temp.paris_today(p_hour int) returns timestamptz language sql as $$
  select (date_trunc('day', now() at time zone 'Europe/Paris') + make_interval(hours => p_hour)) at time zone 'Europe/Paris'
$$;
grant execute on function pg_temp.paris_today(int) to tracker;

-- Le rôle tracker n'a pas accès à pgTAP : il écrit ses résultats ici, vérifiés ensuite.
create temp table t_res (label text, crew uuid, arr text[]);
grant insert on t_res to tracker;

set local role tracker;
insert into t_res select 'midi', crew_id, recipients from private.pending_gps_reminders(50, pg_temp.paris_today(12))
  where crew_id::text like '00000000-0000-0000-0000-00000000aa0%';
insert into t_res select 'nuit', crew_id, null from private.pending_gps_reminders(50, pg_temp.paris_today(3))
  where crew_id::text like '00000000-0000-0000-0000-00000000aa0%';
reset role;

select is((select array_agg(crew) from t_res where label = 'midi'), array['00000000-0000-0000-0000-00000000aa01'::uuid],
  'seul l''équipage sans aucune position depuis plus de 3 jours est relancé');
select is((select arr from t_res where label = 'midi'), array['muet@test.local'], 'destinataires : les membres de l''équipage');
select is((select count(*)::int from t_res where label = 'nuit'), 0, 'pas de relance la nuit');

-- Envoi raté puis réussi
delete from private.admin_notifications;
set local role tracker;
insert into t_res select 'échec', null, null from (select private.gps_reminder_done('00000000-0000-0000-0000-00000000aa01', 'SMTP indisponible')) x;
reset role;
select is((select attempts from private.gps_reminders where crew_id = '00000000-0000-0000-0000-00000000aa01'), 1, 'un échec est compté');
select is((select count(*)::int from private.admin_notifications), 0, 'un échec ne prévient pas les admins');

set local role tracker;
insert into t_res select 'envoyé', null, null from (select private.gps_reminder_done('00000000-0000-0000-0000-00000000aa01', null)) x;
insert into t_res select 'après', crew_id, null from private.pending_gps_reminders(50, pg_temp.paris_today(12))
  where crew_id::text like '00000000-0000-0000-0000-00000000aa0%';
reset role;
select is((select status from private.gps_reminders where crew_id = '00000000-0000-0000-0000-00000000aa01'), 'sent', 'la relance est notée envoyée');
select is((select count(*)::int from t_res where label = 'après'), 0, 'une seule relance par équipage');
select is((select payload ->> 'crew_name' from private.admin_notifications where kind = 'gps_reminder'), 'Sans GPS',
  'les admins sont prévenus de la relance');
select ok((select payload ->> 'members' from private.admin_notifications where kind = 'gps_reminder') like '%muet@test.local%',
  '… avec les membres de l''équipage');

-- Personne d'autre n'y a accès
select ok(not has_function_privilege('authenticated', 'private.pending_gps_reminders(integer, timestamptz)', 'execute'),
  'un compte connecté ne peut pas lire les relances');
select ok(not has_table_privilege('tracker', 'private.gps_reminders', 'select'), 'le tracker ne lit pas la table directement');

select * from finish();
rollback;
