# Architecture

## Les conteneurs

`docker compose up` démarre une quinzaine de conteneurs. Seul **`web`** est exposé sur Internet ; tous les autres ne sont joignables que sur le réseau Docker interne (ou sur `127.0.0.1` pour l'administration).

| Service | Rôle | Image |
|---|---|---|
| `web` | Caddy : sert le site, HTTPS automatique, relaie vers Supabase et `tracker`, en-têtes de sécurité (CSP…) | construite depuis `apps/web` |
| `tracker` | Reçoit les positions des téléphones (`/ingest/osmand`), interroge Traccar et fait rouler l'équipage de démo | construite depuis `apps/tracker` |
| `migrate` | Applique les migrations SQL au démarrage puis s'arrête | `postgres:17-alpine` |
| `db` | PostgreSQL 17 (image Supabase) | Supabase |
| `api-gw` | Passerelle API Supabase (Envoy) : vérifie les clés, route vers les services | Supabase |
| `auth` | Supabase Auth (GoTrue) : comptes, sessions, emails, Google, MFA | Supabase |
| `rest` | PostgREST : l'API REST générée depuis le schéma | Supabase |
| `realtime` | WebSocket : pousse les changements de la base au navigateur | Supabase |
| `storage` + `imgproxy` | Fichiers (photos, logos) + miniatures à la volée | Supabase |
| `functions` | Edge Functions (Deno) : `invite-member` | Supabase |
| `studio` + `meta` | Interface d'administration de la base | Supabase |
| `supavisor` | Pooler de connexions Postgres (accès depuis la machine hôte) | Supabase |
| `mailpit` | Boîte mail de test (profil `dev` uniquement) | Mailpit |

La stack Supabase est la **copie officielle** (`infra/supabase/`), jamais modifiée : nos adaptations sont dans `infra/supabase.override.yml`, fusionné par `docker-compose.yml`. Mettre à jour Supabase revient à remplacer ce dossier.

## Une seule origine

Le navigateur ne parle qu'à une adresse (ex. `https://trophytracker.fr`). Caddy aiguille :

| Chemin | Destination |
|---|---|
| `/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1`, `/functions/v1` | Supabase (`api-gw`) |
| `/ingest/*` | `tracker` |
| `/config.js` | configuration publique générée par Caddy (clé ANON) |
| tout le reste | le site React (`index.html` pour les routes inconnues) |

Avantages : pas de CORS, cookies/sessions simples, un seul certificat HTTPS, et **l'image Docker du site ne contient aucune configuration** (la clé est injectée au démarrage via `/config.js`).

## Où est la logique ?

**Dans la base de données.** Le site utilise directement l'API Supabase ; la sécurité ne dépend donc pas du code du navigateur (qu'un utilisateur peut modifier) mais des règles PostgreSQL :

- **Row Level Security (RLS)** : chaque table dit qui peut lire/écrire quelles lignes (`supabase/migrations/…_security.sql`) ;
- **droits par colonne** : un membre peut modifier le slogan de son équipage, mais jamais sa distance parcourue ;
- **fonctions SQL** (`…_functions.sql`) pour les opérations sensibles ou composées : créer un équipage, générer une clé GPS, ajouter un membre, statistiques, trace, administration.

Le service `tracker` se connecte avec un rôle Postgres dédié qui ne peut **qu'**appeler quelques fonctions (`private.ingest_position`, `private.crew_for_device_key`, `private.traccar_links`, les files d'emails, le plan du site, et `private.demo_crew` / `private.demo_restart` qui ne touchent que l'équipage de démo).

## Modèle de données

```
auth.users (Supabase) ──1:1── profiles (nom, rôle user/admin)
      │
      ├── crew_members (owner / member) ──► crews (page, derniers état GPS, compteurs)
      │                                       ├── crew_devices (clé GPS hashée, appareil Traccar) — jamais lisible
      │                                       ├── positions (trace)
      │                                       ├── photos (classiques / 360°)
      │                                       └── sponsors
      └── follows (équipages suivis)

waypoints (parcours officiel) · settings (nom de l'édition, dates…)
```

`crews` contient une copie du **dernier état** (`last_lat`, `last_fix_at`, `total_distance_m`, `followers_count`…) : la liste des équipages et les statistiques ne nécessitent aucun calcul coûteux.

## Flux d'une position GPS

1. Le téléphone (Traccar Client) envoie `GET /ingest/osmand?id=<clé>&lat=…&lon=…` → Caddy → `tracker`.
2. `tracker` valide et convertit (vitesse en nœuds → km/h), retrouve l'équipage via le hash de la clé.
3. `private.ingest_position()` verrouille l'équipage, filtre (doublon, glitch > 400 km/h, dérive à l'arrêt), enregistre et cumule la distance, met à jour `crews.last_*`.
4. La mise à jour de `crews` est publiée par **Supabase Realtime** → la voiture bouge sur toutes les pages ouvertes, qui téléchargent uniquement les nouveaux points.

## Site web (`apps/web`)

React 18 + Vite 8 + TypeScript strict + Tailwind + shadcn/ui.
- **Données** : React Query (`src/hooks/queries.ts`), temps réel dans `src/hooks/useLiveTrack.ts`.
- **Auth** : `src/hooks/auth.tsx` (session, profil, niveau MFA).
- **Cartes** : Leaflet + fond vectoriel OpenFreeMap rendu par MapLibre GL (gratuit, sans clé).
- **Images** : compressées en WebP dans le navigateur avant l'envoi (EXIF/GPS supprimés), miniatures générées par imgproxy.
- Pages chargées à la demande (code splitting) : l'accueil reste léger.

## Choix techniques (et pourquoi)

| Choix | Pourquoi |
|---|---|
| Supabase auto-hébergé | Auth complète (emails, Google, MFA), temps réel, stockage, Studio — sans abonnement |
| Sécurité en RLS | Une seule source de vérité, impossible à contourner depuis le navigateur |
| Caddy | HTTPS automatique, config lisible, très léger |
| Service `tracker` séparé | Les téléphones n'ont pas de compte : il faut un point d'entrée dédié, limité en débit et en droits |
| OpenFreeMap | Les tuiles CARTO utilisées avant exigent désormais une clé payante |
| Migrations SQL « maison » compatibles CLI | Appliquées automatiquement au démarrage, pas d'outil supplémentaire en production |
