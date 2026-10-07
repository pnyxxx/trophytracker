-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de la télémétrie (pgTAP)
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into public.crews (id, slug, name, is_public) values
  ('00000000-0000-0000-0000-00000000e1a1', 'telemetrie-k7qm2x', 'Visible', true),
  ('00000000-0000-0000-0000-00000000e1b1', 'telemetrie-a2b3c4', 'Privé', false);
insert into public.positions (crew_id, recorded_at, lat, lon, speed_kmh, course, altitude, accuracy, battery, distance_from_prev_m, source) values
  ('00000000-0000-0000-0000-00000000e1a1', now() - interval '2 min', 45.1, 6.4, 60, 180, 1400, 5, 81, 0, 'device'),
  ('00000000-0000-0000-0000-00000000e1a1', now() - interval '1 min', 45.09, 6.4, 62, 182, 1450, 4, 80, 1100, 'device'),
  ('00000000-0000-0000-0000-00000000e1b1', now(), 45, 6, 10, 0, 100, 5, 50, 0, 'device');

set local role anon;
select is((public.get_telemetry('00000000-0000-0000-0000-00000000e1a1') ->> 'speed_kmh')::int, 62, 'la dernière vitesse est donnée');
select is((public.get_telemetry('00000000-0000-0000-0000-00000000e1a1') ->> 'battery')::int, 80, 'avec la batterie du téléphone');
select is((public.get_telemetry('00000000-0000-0000-0000-00000000e1a1') -> 'today' ->> 'distance_km')::numeric, 1.1, 'et les kilomètres du jour');
select is(public.get_telemetry('00000000-0000-0000-0000-00000000e1b1'), null, 'rien pour un road trip privé');
reset role;
select is((public.get_telemetry('00000000-0000-0000-0000-00000000e1a1', 'N''importe/Quoi') -> 'today' ->> 'max_altitude')::int, 1450,
  'un fuseau horaire inconnu ne casse rien');

select * from finish();
rollback;
