-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — adresse complète d'un sponsor
--
--  La fiche d'un sponsor (« voir plus » dans l'onglet « Soutenir ») affiche son
--  adresse exacte, pas seulement la ville. Remplie toute seule quand les voyageurs
--  choisissent le lieu du sponsor (et modifiable), 200 caractères au plus.
--  Lecture : comme les sponsors ; écriture : les voyageurs (RLS inchangée).
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.sponsors add column address text check (char_length(address) <= 200);
comment on column public.sponsors.address is 'Adresse complète du sponsor, affichée sur sa fiche.';

grant insert (address) on public.sponsors to authenticated;
grant update (address) on public.sponsors to authenticated;
