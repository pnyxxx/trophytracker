-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — aperçu des pages équipage (référencement, partage)
--
--  Le service tracker écrit le nom, la description et la photo d'un équipage
--  dans le HTML de sa page, pour Google et les aperçus WhatsApp / Facebook.
--  Il n'a le droit de lire que cette fonction : ces quatre champs, et seulement
--  pour un équipage PUBLIC (ils sont déjà affichés à tous sur sa page).
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function private.crew_page_meta(p_slug text)
returns table (name text, tagline text, cover_path text, avatar_path text)
language sql stable security definer
set search_path = ''
as $$
  select c.name, c.tagline, c.cover_path, c.avatar_path
  from public.crews c
  where c.slug = p_slug and c.is_public;
$$;

revoke execute on function private.crew_page_meta(text) from public, anon, authenticated;
grant execute on function private.crew_page_meta(text) to tracker;
