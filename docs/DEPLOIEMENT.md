# Mise en production

Objectif : le site sur `https://votre-domaine.fr`, HTTPS automatique, sauvegardes quotidiennes.

## 1. Le serveur

- Un VPS Linux (Debian 12 / Ubuntu 24.04), **4 Go de RAM minimum** (Supabase complet ≈ 2,5 Go), 2 vCPU, 40 Go de disque.
  Ordre de grandeur : 6 à 12 €/mois (Hetzner, OVH, Scaleway…).
- Un nom de domaine dont l'enregistrement **A** (et AAAA si IPv6) pointe vers l'IP du serveur.

```bash
# Sur le serveur, en root :
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
adduser deploy && usermod -aG docker deploy
# Pare-feu : seuls SSH, HTTP et HTTPS
apt install -y ufw && ufw allow OpenSSH && ufw allow 80 && ufw allow 443/tcp && ufw allow 443/udp && ufw enable
```

> Les ports internes de Supabase (8000, 5432…) sont publiés uniquement sur `127.0.0.1`
> (voir `infra/supabase.override.yml`) : ils ne sont pas accessibles depuis Internet,
> même si Docker contourne ufw.

## 2. Installation

```bash
su - deploy
git clone git@github.com:pnyxxx/trophystracker.git && cd trophystracker
sh scripts/init-env.sh        # génère des secrets uniques pour CE serveur
nano .env
```

Dans `.env`, adaptez :

```ini
SITE_URL=https://votre-domaine.fr
SUPABASE_PUBLIC_URL=https://votre-domaine.fr
API_EXTERNAL_URL=https://votre-domaine.fr/auth/v1
ADDITIONAL_REDIRECT_URLS=https://votre-domaine.fr/**
SITE_ADDRESS=votre-domaine.fr
WEB_HTTP_PORT=80
WEB_HTTPS_PORT=443
ENABLE_EMAIL_AUTOCONFIRM=false
# + un vrai serveur SMTP : voir CONFIGURATION.md
```

Node.js n'est pas nécessaire sur le serveur (sauf pour les scripts `make admin` / `make seed`).

```bash
docker compose up -d --build     # PAS de --profile dev en production (pas de Mailpit)
docker compose ps                # tout doit être « healthy »
```

Caddy obtient le certificat HTTPS tout seul en quelques secondes.

## 3. Premier administrateur

Inscrivez-vous sur le site, confirmez l'email, puis sur le serveur :

```bash
docker compose exec db psql -U postgres -c \
  "update public.profiles set role='admin' where id=(select id from auth.users where email='vous@exemple.fr');"
```

(ou `make admin email=…` si Node est installé).

## 4. Sauvegardes automatiques

```bash
crontab -e
# Tous les jours à 3h :
0 3 * * * cd /home/deploy/trophystracker && sh scripts/backup.sh >> backups/backup.log 2>&1
```

**Copiez les sauvegardes hors du serveur** (autre machine, stockage objet…) : voir MAINTENANCE.md.

## 5. Accéder à Supabase Studio

Studio n'est pas exposé sur Internet. Depuis votre PC :

```bash
ssh -L 8000:localhost:8000 deploy@votre-serveur
# puis http://localhost:8000 (identifiants DASHBOARD_USERNAME / DASHBOARD_PASSWORD du .env)
```

## 6. Mettre à jour le site

```bash
git pull
docker compose up -d --build     # reconstruit, applique les nouvelles migrations, redémarre
```

## Checklist avant le jour J

- [ ] SMTP réel configuré et testé (inscription + mot de passe oublié)
- [ ] `ENABLE_EMAIL_AUTOCONFIRM=false`
- [ ] Sauvegarde nocturne + copie externe + **restauration testée une fois**
- [ ] Dates et parcours de l'édition renseignés dans `/admin`
- [ ] Un équipage test a envoyé des positions depuis un vrai téléphone en 4G
- [ ] Double authentification activée sur les comptes admin
