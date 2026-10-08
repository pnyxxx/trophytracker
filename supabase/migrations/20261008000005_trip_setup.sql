-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — parcours de création « /creer »
--
--  Deux informations demandées à la création d'un road trip, en plus de la ville
--  de départ (crews.city) et des dates (starts_on / ends_on) qui existent déjà :
--   - trip_type   : comment on part (van, voiture, moto, raid, entre amis, tour du monde) ;
--                   adapte les conseils du guide « Prêt au départ » ;
--   - destination : où l'on va, en texte libre (« Lofoten »), affiché « départ → destination ».
--  Lecture : comme le road trip (droits existants sur crews) ; écriture : ses voyageurs.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.crews
  add column trip_type text check (trip_type in ('van', 'voiture', 'moto', 'raid', 'groupe', 'monde')),
  add column destination text check (char_length(trim(destination)) between 1 and 80);

comment on column public.crews.trip_type is 'Type de voyage choisi à la création : van, voiture, moto, raid, groupe (entre amis), monde (tour du monde).';
comment on column public.crews.destination is 'Destination du road trip, en texte libre (la ville de départ est dans city).';

grant update (trip_type, destination) on public.crews to authenticated;
