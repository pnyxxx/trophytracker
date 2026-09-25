# TrophyTracker

**Suivez les équipages du 4L Trophy en direct.**
Proches, amis et sponsors retrouvent la position en temps réel, la trace GPS complète, les photos (dont 360°) et les sponsors de l'équipage qu'ils soutiennent. Les équipages créent leur page gratuitement en quelques minutes.

- 🗺️ Carte en temps réel : la 4L avance sans recharger la page (Supabase Realtime)
- 📱 GPS avec un simple téléphone (appli gratuite Traccar Client) ou un serveur Traccar
- 👥 Comptes, équipages favoris, espace équipage multi-membres, invitations par email
- 🔐 Sécurité dans la base (RLS), double authentification, emails d'alerte
- 🐳 100 % auto-hébergé, sans abonnement : Supabase + Caddy dans Docker

---

## Démarrage rapide (local)

Prérequis : **Docker** (avec Compose v2.24+), **Node.js 22**, **openssl**.

```bash
make setup        # installe les dépendances et crée .env avec des secrets aléatoires
make up           # démarre toute la stack (≈ 1 min au premier lancement)
make seed         # optionnel : équipages de démonstration
```

| Adresse | Quoi |
|---|---|
| http://localhost:8088 | le site |
| http://localhost:8025 | Mailpit : tous les emails envoyés en local |
| http://localhost:8000 | Supabase Studio (identifiants affichés par `make setup`) |

Créez un compte sur le site, confirmez-le via Mailpit, puis donnez-vous les droits admin :

```bash
make admin email=vous@exemple.fr
```

Pour développer le site avec rechargement à chaud : `make dev` → http://localhost:5173 (la stack Docker doit tourner).
`make` seul affiche toutes les commandes.

## Architecture en un coup d'œil

```
                 Internet
                    │  HTTPS (Let's Encrypt automatique)
             ┌──────▼──────┐
             │  web (Caddy) │  site React + reverse proxy + en-têtes de sécurité
             └──┬───────┬───┘
 /auth /rest /storage   │ /ingest
 /realtime /functions   │
       ┌────────▼───┐ ┌─▼────────┐   ┌──────────────┐
       │  Supabase  │ │ tracker  │◄──┤ Traccar (opt.)│
       │ (gateway,  │ │ (Node)   │   └──────────────┘
       │ auth, rest,│ └────┬─────┘
       │ realtime,  │      │ rôle Postgres limité
       │ storage…)  │      │
       └─────┬──────┘      │
             └──► PostgreSQL ◄┘   ← toute la sécurité (RLS) est ici
```

Détails : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Structure du dépôt

```
apps/web/            Site (React, Vite, Tailwind, Leaflet + MapLibre) + Caddyfile
apps/tracker/        Service GPS (Node/TypeScript) : réception téléphones + synchro Traccar
supabase/migrations/ Schéma SQL, fonctions, règles de sécurité (RLS), stockage
supabase/functions/  Edge Functions (invitation de coéquipiers)
supabase/tests/      Tests pgTAP de la base (sécurité, ingestion GPS, MFA)
infra/supabase/      Stack Supabase officielle, NON modifiée (voir UPSTREAM.md)
infra/supabase.override.yml   Nos adaptations de Supabase (ports, emails FR, MFA…)
scripts/             Installation, migrations, sauvegardes, démo, tests de bout en bout
docs/                Documentation
```

## Documentation

| Guide | Contenu |
|---|---|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Composants, flux de données, choix techniques |
| [DEVELOPPEMENT](docs/DEVELOPPEMENT.md) | Travailler sur le code, migrations, types, tests |
| [DEPLOIEMENT](docs/DEPLOIEMENT.md) | Mise en production sur un serveur (VPS) pas à pas |
| [CONFIGURATION](docs/CONFIGURATION.md) | Domaine, emails (SMTP), connexion Google, Traccar |
| [GPS](docs/GPS.md) | Suivi par téléphone ou par Traccar, règles d'enregistrement |
| [SECURITE](docs/SECURITE.md) | Modèle de sécurité, RLS, secrets, RGPD |
| [MAINTENANCE](docs/MAINTENANCE.md) | Sauvegardes, restauration, mises à jour |
| [ADMINISTRATION](docs/ADMINISTRATION.md) | Rôle admin, Supabase Studio, opérations courantes |
| [IDEES](docs/IDEES.md) | Feuille de route et idées pour la suite |

## Tests

```bash
make test   # unitaires (tracker) + base de données (pgTAP) + bout en bout (stack réelle)
```

Les tests de bout en bout créent de vrais comptes (confirmés via Mailpit), un équipage, des photos, des positions GPS, vérifient le temps réel, les invitations, la double authentification… et tentent des actions interdites. Ils tournent aussi dans la CI GitHub à chaque push.

## Licence & crédits

Projet indépendant, non affilié à l'organisation du 4L Trophy.
Fonds de carte : © [OpenFreeMap](https://openfreemap.org), © OpenMapTiles, © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright).
