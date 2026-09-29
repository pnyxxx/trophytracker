-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — parcours de l'édition 2027, étape par étape
--
--  Remplace les étapes d'exemple (approximatives) par celles du vrai parcours,
--  d'après 4ltrophy.com et un ancien participant : Salamanque (1re nuit),
--  Algésiras (bivouac), Tanger Med, Boulajoul, Merzouga (arrivée puis deux jours de
--  boucles dans le désert), puis Marrakech d'une traite (étape marathon, 2 jours).
--  Les coordonnées sont celles du tracé de l'accueil (road-path.json), ce qui
--  permet au roadbook des équipages d'afficher les vrais kilomètres.
--
--  Ne touche à rien si les étapes ont déjà été modifiées depuis l'administration.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
begin
  if (select coalesce(array_agg(name order by sort_order), '{}') from public.waypoints)
     = array['Biarritz', 'Salamanque', 'Algésiras', 'Bivouac du Moyen Atlas', 'Bivouac de Merzouga', 'Marrakech'] then
    delete from public.waypoints;
    insert into public.waypoints (kind, name, description, country, lat, lon, sort_order) values
      ('start',   'Biarritz',   'J1-2 : village départ',                                 'France',  43.46484, -1.53571, 10),
      ('night',   'Salamanque', 'J3 : première nuit',                                    'Espagne', 40.96821, -5.66642, 20),
      ('bivouac', 'Algésiras',  'J4 : bivouac avant la traversée',                       'Espagne', 36.21315, -5.41098, 30),
      ('boat',    'Tanger Med', 'J5 : arrivée au Maroc',                                 'Maroc',   35.87604, -5.51333, 40),
      ('bivouac', 'Boulajoul',  'J5 : bivouac du Moyen Atlas',                           'Maroc',   32.88438, -4.98768, 50),
      ('bivouac', 'Merzouga',   'J6 : arrivée ; J7-8 : boucles dans le désert',          'Maroc',   31.21516, -3.99763, 60),
      ('finish',  'Marrakech',  'J9-10 : étape marathon, puis arrivée ; J11 : remise des prix ; J12 : retour', 'Maroc', 31.58108, -7.98231, 70);
  end if;
end $$;

-- 6 000 km est la distance officielle aller-retour ; de Biarritz à Marrakech, boucles de Merzouga
-- comprises, la route en fait ~2 700.
update public.settings set value = '2700' where key = 'event_total_km' and value = '6000';
