-- ═════════════════════════════════════════════════════════════════════════════
--  TrophyTracker — plan du site (référencement Google)
--
--  Le service tracker sert /sitemap.xml. Il n'a le droit de lire que cette
--  fonction : la liste des équipages PUBLICS (adresse + date de mise à jour).
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function private.sitemap_crews()
returns table (slug text, updated_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select c.slug, c.updated_at from public.crews c where c.is_public order by c.slug;
$$;

revoke execute on function private.sitemap_crews() from public, anon, authenticated;
grant execute on function private.sitemap_crews() to tracker;
