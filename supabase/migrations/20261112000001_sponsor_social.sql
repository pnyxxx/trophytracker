-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — réseaux sociaux des sponsors
--
--  Certains sponsors n'ont pas de site internet mais sont très actifs sur
--  Instagram ou Facebook : on peut maintenant indiquer leurs comptes, affichés
--  en petits logos sous le sponsor (onglet « Soutenir » de la page du road trip).
--  Mêmes règles que le site du sponsor : une adresse web, 300 caractères au plus.
--  Lecture : comme les sponsors ; écriture : les voyageurs (RLS inchangée).
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.sponsors
  add column instagram_url text check (instagram_url ~* '^https?://' and char_length(instagram_url) <= 300),
  add column facebook_url  text check (facebook_url ~* '^https?://' and char_length(facebook_url) <= 300);

comment on column public.sponsors.instagram_url is 'Compte Instagram du sponsor (lien web), affiché sous son logo.';
comment on column public.sponsors.facebook_url is 'Page Facebook du sponsor (lien web), affichée sous son logo.';

grant insert (instagram_url, facebook_url) on public.sponsors to authenticated;
grant update (instagram_url, facebook_url) on public.sponsors to authenticated;
