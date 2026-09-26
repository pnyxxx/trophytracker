-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — dates de l'édition 2027 (30 ans du 4L Trophy)
--
--  Départ le 17 février 2027 (village départ de Biarritz), fin le 28 février
--  (traversée retour), d'après le site officiel. Elles pilotent le compte à
--  rebours de l'accueil et l'affichage « Sur la route en ce moment ».
--  N'écrase pas des dates déjà réglées depuis l'administration.
-- ═════════════════════════════════════════════════════════════════════════════

insert into public.settings (key, value) values
  ('event_start_date', '2027-02-17'),
  ('event_end_date', '2027-02-28')
on conflict (key) do nothing;
