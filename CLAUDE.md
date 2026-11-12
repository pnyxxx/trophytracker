# TrophyTracker — notes pour les sessions de développement

Plateforme de suivi en direct des équipages du 4L Trophy. Tout en français (UI, commentaires, docs).

- Stack : Supabase auto-hébergé (`infra/supabase/` = copie officielle NON modifiée, adaptations dans
  `infra/supabase.override.yml`), site React/Vite dans `apps/web` servi par Caddy, service GPS Node dans `apps/tracker`.
- La sécurité est dans la base : toute nouvelle table/fonction → RLS + droits explicites + tests pgTAP
  (`supabase/tests/`). Nouvelle migration = nouveau fichier daté, jamais modifier une migration existante.
- Après un changement de schéma : `make migrate && make types`.
- Vérifier : `make check` (types, lint, unitaires) puis `make test` (pgTAP + bout en bout, stack lancée).
- Jamais de secret dans le code ; la clé ANON est injectée via `/config.js`.
- Le road trip d'exemple est J4L Club (`/road-trip/exemple`, `scripts/lib-demo-crew.mjs`, depuis le 2026-11-12 ; ses 12
  vraies photos ne doivent jamais être effacées) : partie Maroc du raid rejouée en boucle ;
  pas de mention du 4L Trophy (pivot généraliste, `docs/PIVOT.md`), SAUF le modèle d'itinéraire « 4L Trophy »
  proposé aux road trips de type raid (`apps/web/src/lib/route-presets.ts`, choix de Julien du 2026-11-12).
