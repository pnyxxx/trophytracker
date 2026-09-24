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

`make seed` crée un compte `demo@trophystracker.local` et trois équipages d'exemple (dont « J4L Club »).
**À ne pas lancer en production.**
