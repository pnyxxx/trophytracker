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

Au 4L Trophy, chaque étape a son jour : **c'est la date qui choisit l'étape** (J1 = date de départ des
Réglages ; J7 = Boucle 1, J8 = Boucle 2, J9 = départ du marathon…). Le GPS précise seulement où en est
l'équipage dans sa journée, à vol d'oiseau (code : `apps/web/src/lib/stages.ts`) :

- **étape de route** : « En route » tant que la 4L n'est pas passée à moins de 10 km de l'étape, puis
  « Sur place » ;
- **boucle** (sous-étape) : « Au départ » tant que la 4L est au bivouac, « En cours » dès qu'elle s'en
  éloigne de plus de 5 km, « Faite » quand elle revient à moins de 3 km ;
- **sans position GPS** : l'étape du programme (atteinte à partir de son 2e jour), en le signalant.

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

### L'équipage de démo roule en continu

« Route des Grandes Alpes » (`/road-trip/exemple`) est **le road trip d'exemple** (colonne `crews.is_demo`, un seul
possible) : sa page doit toujours vivre. Le service `tracker` lui fait rejouer **en boucle et en temps réel** un vrai
trajet (Thonon-les-Bains → Colombière → Aravis → Roselend → Iseran → Galibier → Izoard → Bonette → Menton, 675 km),
une position toutes les 15 s, par les mêmes fonctions que les vrais téléphones (`apps/tracker/src/demo.ts`) :

- vraies routes et vraies vitesses d'un van en montagne (≤ 80 km/h), pause déjeuner ;
- les nuits sont raccourcies à 20 min ; un tour dure 17 h, puis la trace est effacée et le van repart de Thonon ;
- sa page affiche un badge « road trip d'exemple » ; ses voyageurs (Léa, Sam), étapes, photos (vues aériennes IGN),
  sponsors (« Votre marque ici »), journal et encouragements sont fictifs ; on ne peut pas y laisser de message.

Le trajet est généré une fois et commité : `node scripts/build-demo-route.mjs` (routes OSRM, altitude Open-Meteo)
écrit `apps/tracker/demo/route.json` ; cols et horaires en tête du script. Le contenu est dans
`scripts/lib-demo-crew.mjs` ; `node scripts/demo-refresh.mjs` (production comprise) met de côté les anciennes démos (J4L Club rendu privé,
**rien n'est effacé**, ses photos restent) et
recrée l'exemple à neuf ; le tracker rattrape alors tout le tour en cours dans les 15 secondes.
Le tracker ne peut effacer **que** la trace de l'équipage marqué `is_demo` (fonctions `private.demo_crew` et
`private.demo_restart`).

## Emails aux administrateurs

Chaque admin reçoit un email à chaque **nouveau compte** et à chaque **nouvel abonnement** à un équipage.
- Les événements sont rangés en base (`private.admin_notifications`) par des déclencheurs, puis envoyés toutes les
  30 s par le service `tracker`, avec le même SMTP que les emails du site (`SMTP_*` du `.env`).
- Si le SMTP est indisponible, l'envoi est retenté (5 essais). Sans `SMTP_HOST`, rien n'est envoyé.
- Les destinataires sont tous les comptes au rôle admin : nommer ou retirer un admin suffit.
- Suivi : `docker compose logs tracker | grep "email admin"`.

