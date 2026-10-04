-- ═════════════════════════════════════════════════════════════════════════════
--  Tests des positions à l'arrêt : dérive GPS d'un téléphone garé, point
--  « toujours là » espacé de 30 min, distance non comptée (pgTAP).
--  Transaction annulée à la fin.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

create temp table t_ids as
  with c as (insert into public.crews (slug, name, is_public) values ('garee', 'Garée', true) returning id)
  select id as crew from c;
update public.crews set tracking_enabled = true where id = (select crew from t_ids);

-- Position à 43° N (0,0001° de latitude ≈ 11 m), vitesse en km/h, précision en m.
create function pg_temp.ingest(p_ago interval, p_lat float8, p_speed float8, p_accuracy float8) returns text
language sql as $$
  select private.ingest_position((select crew from t_ids), now() - p_ago, p_lat, -1.0, p_speed, null, null,
                                 p_accuracy, null, 'device', 15, 1800);
$$;

select is(pg_temp.ingest('120 min', 43.0, 0, 5), 'stored', 'la voiture se gare : point enregistré');
select is(pg_temp.ingest('115 min', 43.0004, 0, 30), 'skipped',
  'une dérive de 44 m dans la précision annoncée (30 m) n''est pas stockée');
select is(pg_temp.ingest('100 min', 43.0005, 0, 80), 'skipped',
  'une dérive de 55 m avec une précision de 80 m non plus');
select is(pg_temp.ingest('85 min', 43.0003, 0, 30), 'stored',
  'après 30 min sans point, un point « toujours là » est stocké');
select is((select distance_from_prev_m from public.positions
           where crew_id = (select crew from t_ids) order by recorded_at desc limit 1), 0::float8,
  '… sans compter dans la distance parcourue');
select is(pg_temp.ingest('84 min', 43.0007, 40, 30), 'stored',
  'à 40 km/h, 44 m sont un vrai déplacement même avec une précision de 30 m');
select is(pg_temp.ingest('83 min', 43.0030, 0, 80), 'stored',
  'au-delà de 100 m, le point est stocké quelle que soit la précision');
select is((select count(*)::int from public.positions where crew_id = (select crew from t_ids)), 4,
  'quatre points stockés sur six reçus');
select ok((select total_distance_m between 290 and 310 from public.crews where id = (select crew from t_ids)),
  'seuls les déplacements comptent (~300 m)');

select * from finish();
rollback;
