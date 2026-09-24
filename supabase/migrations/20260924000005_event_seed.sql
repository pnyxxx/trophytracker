-- ═════════════════════════════════════════════════════════════════════════════
--  TrophysTracker — 5/5 : données initiales de l'événement
--
--  Parcours de l'édition 2026 à titre d'exemple : à mettre à jour depuis
--  l'administration du site (ou Supabase Studio) dès que le parcours officiel
--  de la nouvelle édition est connu.
-- ═════════════════════════════════════════════════════════════════════════════

insert into public.settings (key, value) values
  ('event_name', '4L Trophy'),
  ('event_total_km', '6000')
on conflict (key) do nothing;

insert into public.waypoints (kind, name, description, country, lat, lon, sort_order)
select * from (values
  ('start',   'Biarritz',            'Village départ',            'France',  43.46395, -1.53631, 10),
  ('night',   'Salamanque',          'Étape de nuit',             'Espagne', 40.96821, -5.66642, 20),
  ('boat',    'Algésiras',           'Traversée vers le Maroc',   'Espagne', 36.12934, -5.44355, 30),
  ('bivouac', 'Bivouac du Moyen Atlas', null,                     'Maroc',   32.88295, -4.95901, 40),
  ('bivouac', 'Bivouac de Merzouga', 'Dunes de l''Erg Chebbi',    'Maroc',   31.08505, -4.02298, 50),
  ('finish',  'Marrakech',           'Arrivée',                   'Maroc',   31.58108, -7.98231, 60)
) as v(kind, name, description, country, lat, lon, sort_order)
where not exists (select 1 from public.waypoints);
