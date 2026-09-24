# Sécurité

## Ce qui a été corrigé par rapport à l'ancien site

| Ancien site | Problème | Maintenant |
|---|---|---|
| Mot de passe Traccar écrit dans le code du navigateur | lisible par n'importe quel visiteur | aucun secret côté navigateur ; Traccar n'est contacté que par le serveur |
| Mot de passe admin `j4l2026admin` dans le code du navigateur | n'importe qui pouvait devenir admin | vrais comptes Supabase Auth + rôle admin vérifié par la base |
| Règles Supabase `USING (true)` sur photos / classements / stockage | n'importe qui pouvait modifier ou supprimer | RLS stricte par équipage (voir ci-dessous) |
| Historique git contenant ces secrets | secrets récupérables | nouveau dépôt, historique vierge |

⚠️ **À faire de votre côté** : l'ancien site public exposait le mot de passe du compte Traccar
`j4lclub@gmail.com`. **Changez ce mot de passe** (et partout où il aurait été réutilisé).

## Défense en profondeur

1. **Réseau** : seul Caddy (80/443) est public. Postgres, Studio, la passerelle Supabase n'écoutent que sur `127.0.0.1`.
2. **HTTPS** automatique, HSTS, et en-têtes stricts : `Content-Security-Policy` (aucun script externe),
   `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
3. **Authentification** Supabase Auth : mots de passe hachés (bcrypt), 10 caractères minimum,
   confirmation d'email, flux PKCE, jetons à durée courte renouvelés, limites anti-bruteforce intégrées,
   code par email pour changer de mot de passe, **double authentification** (TOTP) optionnelle,
   emails d'alerte à chaque changement sensible.
4. **Autorisations dans la base** (`supabase/migrations/…_security.sql`) :
   - tout est révoqué par défaut, puis accordé table par table et **colonne par colonne** ;
   - RLS sur toutes les tables (un visiteur ne voit un équipage privé ni dans la liste, ni sa trace, ni ses photos) ;
   - un membre ne peut jamais modifier les compteurs (distance, abonnés, position) ni se nommer admin ;
   - si la double authentification est activée, les droits d'écriture exigent une session vérifiée (aal2) ;
   - fonctions `SECURITY DEFINER` avec `search_path` vide et vérification explicite de l'appelant.
5. **Stockage** : un membre n'écrit que dans le dossier de SON équipage ; seuls WebP/JPEG/PNG ≤ 15 Mo sont acceptés ;
   les images sont ré-encodées dans le navigateur (métadonnées EXIF/GPS supprimées).
6. **Service GPS** : rôle Postgres qui ne peut appeler que 3 fonctions, clés d'appareil hashées, limite de débit,
   validation stricte des entrées, conteneur non-root.
7. **Redirections** : les paramètres `?next=` sont filtrés (pas de redirection vers un autre site).

Toutes ces règles sont **testées automatiquement** (`supabase/tests/security.test.sql`, `scripts/e2e/smoke.mjs`) :
tentatives de modification par un autre compte, d'envoi de fichier ailleurs, de fausse clé GPS, de réutilisation
d'un lien d'invitation, d'action sans code MFA…

## Secrets

| Secret | Où | Si fuite |
|---|---|---|
| `SERVICE_ROLE_KEY`, `JWT_SECRET` | `.env` du serveur uniquement | accès total → régénérer (`init-env.sh --force` sur une nouvelle install, sinon rotation manuelle) |
| `POSTGRES_PASSWORD`, `TRACKER_DB_PASSWORD` | `.env` | changer le mot de passe du rôle concerné |
| `ANON_KEY` | publique (dans `/config.js`) | aucun risque : droits limités par la RLS |
| Clé GPS `tt_…` | téléphone de l'équipage | régénérer dans l'onglet GPS |

## Données personnelles (RGPD)

- Données minimales : email, nom affiché, abonnements ; positions uniquement quand l'équipage active le suivi.
- Page de confidentialité : `/confidentialite`.
- Droit à l'effacement : « Supprimer mon compte » efface immédiatement le compte et ses données.
- Équipage privé : invisible pour tous sauf ses membres.
- Aucun traceur publicitaire (l'ancien script ContentSquare a été retiré).

## Signaler une faille

Contactez le mainteneur en privé plutôt que d'ouvrir une issue publique.
