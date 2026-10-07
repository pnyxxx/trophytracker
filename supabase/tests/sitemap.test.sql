-- ═════════════════════════════════════════════════════════════════════════════
--  Tests du plan du site (pgTAP) : seuls les équipages publics y figurent.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

grant tracker to postgres;  -- permet au test d'endosser le rôle (annulé au rollback)

insert into public.crews (slug, name, is_public, is_listed) values
  ('sitemap-public', 'Public', true, true),
  ('sitemap-lien', 'Par lien', true, false),
  ('sitemap-prive', 'Privé', false, false);

create temp table t_res (slugs text[]);
grant insert on t_res to tracker;

set local role tracker;
insert into t_res select array_agg(slug) from private.sitemap_crews();
reset role;

select ok((select slugs from t_res) @> array['sitemap-public'], 'un road trip public est dans le plan du site');
select ok(not ((select slugs from t_res) @> array['sitemap-lien']), 'un road trip « par lien » n''y est pas');
select ok(not ((select slugs from t_res) @> array['sitemap-prive']), 'un road trip privé non plus');
select ok(not has_function_privilege('anon', 'private.sitemap_crews()', 'execute'), 'les visiteurs ne peuvent pas l''appeler');
select ok(not has_function_privilege('authenticated', 'private.sitemap_crews()', 'execute'), 'les comptes connectés non plus');
select ok(not has_table_privilege('tracker', 'public.crews', 'select'), 'le tracker ne lit toujours pas la table directement');

select * from finish();
rollback;
