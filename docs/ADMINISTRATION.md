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
| Parcours | points officiels (départ, étapes, bivouacs, traversée, arrivée) affichés sur toutes les cartes, avec leurs jours (J1…) et leurs sous-étapes (boucles) |
| Réglages | nom de l'édition, dates (compte à rebours, jour du raid J1…J12), distance totale |

Un admin peut aussi gérer n'importe quel équipage via son bouton « Gérer ».

### Comment l'étape en cours d'un équipage est décidée

Dans « La route » de chaque équipage, l'étape en cours combine (code : `apps/web/src/lib/stages.ts`) :

1. **la position GPS**, recalée sur la route de référence (celle de l'accueil, sans les boucles) :
   le kilomètre atteint sur le parcours, qui ne recule jamais. À moins de 10 km d'une étape, l'équipage
   y est (« Sur place ») ; au-delà, il est « En route » vers la suivante ;
2. **le calendrier** : les jours des étapes (J1 = date de départ des Réglages). Tant que le programme dit
   qu'un équipage est à une étape et qu'il reste à moins de 150 km sur la route, l'étape reste « Sur place » — c'est ce
   qui garde Merzouga en cours pendant les boucles J7-J8 (~100 km chacune, retour au bivouac). Les
   sous-étapes (Boucle 1, Boucle 2) passent « En cours » puis « Faite » selon leur jour ;
3. **sans position GPS** pendant le raid, on affiche l'étape du programme du jour, en le signalant.

Il n'y a pas de statut manuel. Une **sous-étape** se crée dans *Parcours* avec « Sous-étape de » :
elle n'apparaît pas sur les cartes (même lieu que son étape), seulement dans le roadbook.

Le **profil d'élévation** (D+ / D− par jour et par étape) vient de l'altitude que le téléphone envoie
avec chaque position (Traccar Client). Si un équipage n'a aucune position avec altitude, la section
n'apparaît pas (c'est le cas de la trace de démo de J4L Club, simulée sans altitude).

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

