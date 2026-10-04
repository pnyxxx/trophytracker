# Développement

## Mise en route

```bash
make setup     # npm install + .env avec secrets aléatoires
make up        # toute la stack Docker (profil dev = avec Mailpit)
make seed      # données de démo (affiche l'identifiant/mot de passe du compte démo)
make dev       # site avec rechargement à chaud sur http://localhost:5173
```

En mode `make dev`, Vite relaie `/auth`, `/rest`, `/storage`, `/realtime` et `/functions` vers Supabase (`127.0.0.1:8000`) : le comportement est identique à la production.

Ports déjà pris sur votre machine ? Modifiez dans `.env` : `WEB_HTTP_PORT`, `POOLER_HOST_PORT` (Postgres), `MAILPIT_UI_PORT`, `API_GW_HTTP_PORT`.

## Outils installés

| Outil | Usage |
|---|---|
| **Supabase CLI** (`npx supabase`) | génération des types TypeScript, commandes base de données |
| **Playwright** (`npx playwright`) | navigateur automatisé pour tester le site |
| **Vitest** | tests unitaires du service tracker |
| **pgTAP** (dans l'image Postgres) | tests SQL de la sécurité |

## Modifier la base de données

1. Créez un **nouveau** fichier dans `supabase/migrations/`, nommé `AAAAMMJJHHMMSS_description.sql`
   (ne modifiez jamais une migration déjà appliquée en production).
2. `make migrate` l'applique (dans une transaction : tout ou rien).
3. `make types` régénère `apps/web/src/lib/database.types.ts`.
4. Ajoutez des tests dans `supabase/tests/` et lancez `make test`.

⚠️ **Toute nouvelle table** doit avoir la RLS activée et des droits explicites
(voir `…_security.sql`) : Supabase donne par défaut tous les droits sur les nouvelles tables.
Pensez aussi à `revoke execute … from public, anon` pour les nouvelles fonctions.

Pour repartir d'une base vide : `make down`, supprimez `infra/supabase/volumes/db/data` et
`infra/supabase/volumes/storage`, puis `make up`.

## Tests

```bash
npm test                  # tests unitaires (tracker)
npm run test:db           # sécurité & logique SQL (pgTAP) — la stack doit tourner
npm run test:e2e          # bout en bout sur la stack réelle (comptes, emails, GPS, temps réel…)
make check                # types + lint + unitaires (rapide, avant chaque commit)
```

## Conventions

- TypeScript **strict** partout ; les types de la base sont générés, pas écrits à la main.
- Textes de l'interface et commentaires en **français**.
- Accès aux données : hooks React Query dans `src/hooks/queries.ts` ; erreurs affichées via `toastError`.
- Aucun secret dans le code : tout passe par `.env` (jamais commité).
- Emails : une seule mise en page « roadbook » dans `apps/web/src/lib/email-templates.ts`, écrite dans `dist/email-templates/` à la compilation (`email-plugin.ts`) ; variables Go : `{{ .ConfirmationURL }}`… Les emails admin (`apps/tracker/src/email-layout.ts`) en gardent une copie, vérifiée par un test.

## Edge Functions

Dans `supabase/functions/<nom>/index.ts` (Deno). Elles sont montées dans le conteneur `functions`
et accessibles sur `/functions/v1/<nom>`. Après modification : `docker compose restart functions`.
N'utilisez la clé `SUPABASE_SERVICE_ROLE_KEY` qu'**après** avoir vérifié les droits de l'appelant.
