# Administration

## Devenir administrateur

Le rôle admin se donne depuis la ligne de commande (jamais depuis le site, par sécurité) :

```bash
make admin email=vous@exemple.fr
```

Ensuite, depuis le site, un admin peut nommer d'autres admins (*Administration → Comptes*).
Activez la **double authentification** sur tous les comptes admin (*Mon compte → Sécurité*).

## Page `/admin`

| Onglet | Usage |
|---|---|
| Vue d'ensemble | comptes, équipages, équipages en direct, positions, abonnements |
| Équipages | associer un équipage à un appareil Traccar ; accès à toutes les pages (même privées) |
| Comptes | recherche, nommer / retirer un admin |
| Parcours | points officiels (départ, étapes, bivouacs, traversée, arrivée) affichés sur toutes les cartes |
| Réglages | nom de l'édition, dates (compte à rebours, « jours de raid »), distance totale |

Un admin peut aussi gérer n'importe quel équipage via son bouton « Gérer ».

## Supabase Studio

Interface complète de la base (tables, requêtes SQL, comptes, fichiers, logs) :
- en local : http://localhost:8000 ;
- en production : via un tunnel SSH (voir DEPLOIEMENT.md).

Identifiants : `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` dans `.env`.

⚠️ Studio utilise des droits complets qui **contournent la RLS** : à manier avec précaution,
et préférez une migration SQL versionnée pour toute modification de structure.

## Opérations courantes (SQL)

```sql
-- Supprimer le compte d'un utilisateur
delete from auth.users where email = 'x@exemple.fr';

-- Rendre un équipage privé
update public.crews set is_public = false where slug = 'nom-equipage';

-- Nettoyer la trace d'un équipage (ex. essais avant le départ), puis remettre ses compteurs à zéro
delete from public.positions where crew_id = (select id from public.crews where slug = 'nom-equipage');
update public.crews set total_distance_m = 0, last_lat = null, last_lon = null, last_speed_kmh = null, last_fix_at = null
where slug = 'nom-equipage';
```

`make psql` ouvre une console SQL.

## Données de démonstration

`make seed` crée trois équipages d'exemple, chacun avec son compte (un compte ne peut faire partie que d'un seul équipage) : `demo@trophytracker.local` pour « J4L Club », `demo-<slug>@trophytracker.local` pour les autres.
**À ne pas lancer en production.**

## Emails aux administrateurs

Chaque admin reçoit un email à chaque **nouveau compte** et à chaque **nouvel abonnement** à un équipage.
- Les événements sont rangés en base (`private.admin_notifications`) par des déclencheurs, puis envoyés toutes les
  30 s par le service `tracker`, avec le même SMTP que les emails du site (`SMTP_*` du `.env`).
- Si le SMTP est indisponible, l'envoi est retenté (5 essais). Sans `SMTP_HOST`, rien n'est envoyé.
- Les destinataires sont tous les comptes au rôle admin : nommer ou retirer un admin suffit.
- Suivi : `docker compose logs tracker | grep "email admin"`.

