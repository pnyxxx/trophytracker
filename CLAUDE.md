# TrophysTracker — notes pour les sessions de développement

Plateforme de suivi en direct des équipages du 4L Trophy. Tout en français (UI, commentaires, docs).

- Stack : Supabase auto-hébergé (`infra/supabase/` = copie officielle NON modifiée, adaptations dans
  `infra/supabase.override.yml`), site React/Vite dans `apps/web` servi par Caddy, service GPS Node dans `apps/tracker`.
- La sécurité est dans la base : toute nouvelle table/fonction → RLS + droits explicites + tests pgTAP
  (`supabase/tests/`). Nouvelle migration = nouveau fichier daté, jamais modifier une migration existante.
- Après un changement de schéma : `make migrate && make types`.
- Vérifier : `make check` (types, lint, unitaires) puis `make test` (pgTAP + bout en bout, stack lancée).
- Jamais de secret dans le code ; la clé ANON est injectée via `/config.js`.
- J4L Club n'existe que comme équipage d'exemple (`scripts/seed-demo.mjs`).
