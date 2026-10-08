# Configuration

Tout se règle dans le fichier `.env` (créé par `sh scripts/init-env.sh`, jamais commité).
Après une modification : `docker compose up -d` (les conteneurs concernés redémarrent).

## Adresses

| Variable | Exemple production | Rôle |
|---|---|---|
| `SITE_URL` | `https://trophytracker.fr` | adresse du site (liens des emails) |
| `SUPABASE_PUBLIC_URL` | idem | Supabase est servi sur la même adresse |
| `API_EXTERNAL_URL` | `https://trophytracker.fr/auth/v1` | base des liens de vérification |
| `ADDITIONAL_REDIRECT_URLS` | `https://trophytracker.fr/**` | redirections autorisées après un clic dans un email |
| `SITE_ADDRESS` | `trophytracker.fr` | adresse écoutée par Caddy (`:80` = HTTP local) |

## Emails (SMTP)

Supabase Auth envoie **tous** les emails, en français (modèles dans `apps/web/src/lib/email-templates.ts`) :

| Email | Déclencheur |
|---|---|
| Confirmation d'inscription | création de compte |
| Lien de connexion (magic link) | « Recevoir un lien de connexion » |
| Mot de passe oublié | page « Mot de passe oublié » |
| Changement d'email | confirmation envoyée à l'ancienne ET à la nouvelle adresse |
| Invitation | un propriétaire invite un coéquipier sans compte |
| Code de confirmation | changement de mot de passe sur une session ancienne |
| Alertes de sécurité | mot de passe / email / téléphone modifié, méthode de connexion ajoutée ou retirée, double authentification activée ou désactivée |

**En local**, Mailpit attrape tout : http://localhost:8025.

**En production**, il faut un vrai SMTP. Offres gratuites suffisantes pour un raid :
Brevo (300 emails/jour), Resend (3 000/mois), Mailjet (200/jour)… Exemple Brevo :

```ini
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre-identifiant@smtp-brevo.com
SMTP_PASS=votre-cle-smtp
SMTP_ADMIN_EMAIL=noreply@trophytracker.fr
SMTP_SENDER_NAME=TrophyTracker
```

Pour ne pas finir en spam, configurez **SPF, DKIM et DMARC** sur votre domaine (le fournisseur SMTP donne les enregistrements DNS à ajouter).

Modifier un email : éditez le fichier HTML correspondant puis `docker compose up -d --build web`.
Les sujets sont dans `infra/supabase.override.yml` (`GOTRUE_MAILER_SUBJECTS_*`).

## Connexion

Uniquement par **code à 6 chiffres envoyé par e-mail** (pas de mot de passe, pas de connexion Google) :
`signInWithOtp` puis `verifyOtp({ type: 'email' })`, voir `apps/web/src/components/auth/EmailCodeSignIn.tsx`.
Le code vaut 10 minutes (`GOTRUE_MAILER_OTP_EXP`, qui vaut aussi pour les liens d'invitation et de changement
d'adresse) ; un nouveau code par minute au plus. Les admins gardent la double authentification (TOTP).
En local, les codes arrivent dans Mailpit (http://localhost:8025).

## Traccar (optionnel)

Voir [GPS.md](GPS.md). Variables : `TRACCAR_URL`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD`, `TRACCAR_POLL_SECONDS`.

## Autres réglages utiles

| Variable | Défaut | Effet |
|---|---|---|
| `DISABLE_SIGNUP` | `false` | `true` ferme les inscriptions |
| `ENABLE_EMAIL_AUTOCONFIRM` | `false` | `true` = pas de confirmation d'email (dev uniquement) |
| `JWT_EXPIRY` | `3600` | durée de validité d'un jeton de session (renouvelé automatiquement) |
| `PGRST_DB_MAX_ROWS` | `1000` | nombre max de lignes par requête REST |

Les réglages de l'**édition** (nom, dates de départ/arrivée, distance totale, parcours) se font dans l'interface `/admin`, pas dans `.env`.

## Configuration publique du site

Le navigateur lit `/config.js`, généré par Caddy à partir de `ANON_KEY` et de la présence d'une clé Stripe.
La clé ANON est **publique par conception** : elle ne donne que les droits du rôle `anon`, strictement limités par la RLS.
