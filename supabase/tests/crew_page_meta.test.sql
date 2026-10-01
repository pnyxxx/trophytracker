-- ═════════════════════════════════════════════════════════════════════════════
--  Tests de l'aperçu des pages équipage (pgTAP) : seuls les équipages publics
--  sont décrits, et seul le service tracker peut le demander.
-- ═════════════════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

grant tracker to postgres;  -- permet au test d'endosser le rôle (annulé au rollback)

insert into public.crews (slug, name, tagline, is_public) values
  ('apercu-public', 'Public', 'Une accroche', true),
  ('apercu-prive', 'Privé', 'Secret', false);

create temp table t_res (slug text, name text, tagline text);
grant insert on t_res to tracker;

set local role tracker;
insert into t_res select 'apercu-public', name, tagline from private.crew_page_meta('apercu-public');
insert into t_res select 'apercu-prive', name, tagline from private.crew_page_meta('apercu-prive');
reset role;

select is((select name || ' / ' || tagline from t_res where slug = 'apercu-public'), 'Public / Une accroche', 'un équipage public est décrit');
select is((select count(*)::int from t_res where slug = 'apercu-prive'), 0, 'un équipage privé ne l''est pas');
select ok(not has_function_privilege('anon', 'private.crew_page_meta(text)', 'execute'), 'les visiteurs ne peuvent pas l''appeler');
select ok(not has_function_privilege('authenticated', 'private.crew_page_meta(text)', 'execute'), 'les comptes connectés non plus');
select ok(not has_table_privilege('tracker', 'public.crews', 'select'), 'le tracker ne lit toujours pas la table directement');

select * from finish();
rollback;
