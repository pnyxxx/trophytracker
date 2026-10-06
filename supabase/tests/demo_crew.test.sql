-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de l'équipage de démonstration (trace rejouée par le tracker) (pgTAP)
--  Transaction annulée à la fin : la base reste intacte.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

grant tracker to postgres;  -- permet au test d'endosser le rôle (annulé au rollback)

-- La base locale a peut-être déjà son équipage de démo : on le met de côté le temps du test.
update public.crews set is_demo = false where is_demo;

insert into public.crews (id, slug, name, is_public, tracking_enabled) values
  ('00000000-0000-0000-0000-00000000de01', 'demo-test', 'Démo test', true, false),
  ('00000000-0000-0000-0000-00000000de02', 'vrai-test', 'Vrai test', true, true);

select ok(not (select is_demo from public.crews where id = '00000000-0000-0000-0000-00000000de02'),
  'un équipage n''est pas un équipage de démo par défaut');
update public.crews set is_demo = true where id = '00000000-0000-0000-0000-00000000de01';
select throws_ok($$ update public.crews set is_demo = true where id = '00000000-0000-0000-0000-00000000de02' $$,
  '23505', null, 'un seul équipage de démo possible');
select ok(not has_column_privilege('authenticated', 'public.crews', 'is_demo', 'update'),
  'un équipage ne peut pas se déclarer équipage de démo');

-- Une trace pour chacun.
\o /dev/null
select private.ingest_position('00000000-0000-0000-0000-00000000de02', now() - interval '10 min', 43.0, -1.0, 50, null, null, 5, null, 'device', 15, 1800);
select private.ingest_position('00000000-0000-0000-0000-00000000de02', now() - interval '9 min', 43.01, -1.0, 50, null, null, 5, null, 'device', 15, 1800);
update public.crews set tracking_enabled = true where id = '00000000-0000-0000-0000-00000000de01';
select private.ingest_position('00000000-0000-0000-0000-00000000de01', now() - interval '5 min', 44.0, -1.0, 50, null, null, 5, null, 'device', 15, 1800);
select private.ingest_position('00000000-0000-0000-0000-00000000de01', now() - interval '4 min', 44.01, -1.0, 50, null, null, 5, null, 'device', 15, 1800);
update public.crews set tracking_enabled = false where id = '00000000-0000-0000-0000-00000000de01';
\o

-- Le rôle tracker n'a pas accès à pgTAP : il écrit ses résultats ici, vérifiés ensuite.
create temp table t_res (crew uuid, last_fix timestamptz);
grant insert on t_res to tracker;

set local role tracker;
insert into t_res select * from private.demo_crew();
select private.demo_restart();
reset role;

select is((select array_agg(crew) from t_res), array['00000000-0000-0000-0000-00000000de01'::uuid],
  'le tracker trouve l''équipage de démo, et lui seul');
select ok((select last_fix is not null from t_res), '… avec l''heure de sa dernière position');
select is((select count(*)::int from public.positions where crew_id = '00000000-0000-0000-0000-00000000de01'), 0,
  'un nouveau tour efface la trace de démo');
select ok((select total_distance_m = 0 and last_fix_at is null and tracking_enabled
           from public.crews where id = '00000000-0000-0000-0000-00000000de01'),
  '… remet ses compteurs à zéro et lance son suivi');
select is((select count(*)::int from public.positions where crew_id = '00000000-0000-0000-0000-00000000de02'), 2,
  'la trace d''un vrai équipage n''est jamais touchée');

select ok(not has_function_privilege('authenticated', 'private.demo_restart()', 'execute'),
  'un compte connecté ne peut pas effacer la trace de démo');
select ok(not has_function_privilege('anon', 'private.demo_crew()', 'execute'), 'un visiteur non plus');

select * from finish();
rollback;
