# Suivi GPS

Deux façons d'alimenter la carte d'un équipage, utilisables séparément ou ensemble.

## Option 1 — Un téléphone dans la 4L (recommandé, rien à héberger)

L'équipage installe l'application gratuite **Traccar Client** (Android / iOS, version 10) et la configure depuis
son espace : *Mon compte → Gérer → onglet GPS*, qui guide pas à pas.

**Configuration express** : quand l'équipage génère sa clé, l'onglet GPS affiche un QR code. Dans l'appli,
*Settings* → icône QR en haut à droite → scanner : tous les réglages ci-dessous sont appliqués d'un coup.
Le QR code contient `https://votre-domaine.fr/ingest/osmand?id=<clé>&accuracy=high&distance=50&heartbeat=300&buffer=true&stop_detection=false`
(l'appli prend l'adresse sans ses paramètres comme *Server URL*). Il contient la clé : ne pas le partager.

| Réglage de l'appli (en anglais) | Valeur | Défaut de l'appli |
|---|---|---|
| Device identifier | la clé `tt_…` générée dans l'onglet GPS (affichée une seule fois) | numéro aléatoire → **à changer** |
| Server URL | `https://votre-domaine.fr/ingest/osmand` | serveur de démo Traccar → **à changer** |
| Location accuracy | High (*Highest* ignore la distance et vide la batterie) | Medium → **à changer** |
| Distance | 50 m (une position toutes les ~2 s à 90 km/h : trace qui suit les virages) | 75 |
| Stationary heartbeat | 300 s (le site affiche « En direct » jusqu'à 10 min sans nouvelles) | 0 = désactivé → **à changer** |
| Advanced → Offline buffering | activé (indispensable dans le désert) | activé |
| Advanced → Stop detection | **désactivé** : activé, l'appli coupe le GPS à l'arrêt et compte sur iOS pour la réveiller au départ, ce qui échoue parfois (trace perdue pendant des heures, vu le 2026-10-03). Le serveur écarte lui-même les points à l'arrêt | activé → **à changer** |
| Advanced → Password | facultatif : verrou local de l'interrupteur de suivi et des réglages, jamais envoyé, non transmis par QR code | vide |

**En local**, `localhost` ne fonctionne pas depuis un téléphone : l'onglet GPS affiche l'IP du PC sur le Wi-Fi
(détectée par `make up` / `make dev`) avec le port de Caddy, par ex. `http://192.168.1.70:8088/ingest/osmand`.
Le téléphone doit être sur le même Wi-Fi ; si rien n'arrive, ouvrir le port dans le pare-feu (`sudo ufw allow 8088/tcp`).

Sans réseau, l'appli stocke les positions et les envoie dès que la 4G revient : la trace se complète toute seule.

**Sécurité de la clé** : seul son hash SHA-256 est stocké. Elle permet uniquement d'*envoyer* des positions
pour cet équipage. En cas de fuite : « Générer une nouvelle clé » (l'ancienne cesse immédiatement de fonctionner).

**Formats acceptés** par `/ingest/osmand` :
- protocole OsmAnd : `GET/POST ?id=…&lat=…&lon=…&timestamp=…&speed=…` (vitesse en **nœuds**), en paramètres d'URL
  ou en formulaire `application/x-www-form-urlencoded` — c'est ce qu'envoie Traccar Client 10 (+ `charge`, `alarm`, ignorés) ;
- JSON des anciennes versions 9.x : `{ device_id, location: { timestamp, coords: {…}, battery } }` (vitesse en m/s).

Limite : 300 requêtes/minute par adresse IP (un téléphone en envoie ~30 à 90 km/h ; la marge couvre le renvoi
des positions gardées hors réseau et plusieurs équipages derrière la même IP d'opérateur mobile).

## Option 2 — Un serveur Traccar existant

Si vous avez un serveur [Traccar](https://www.traccar.org) (boîtiers GPS, nombreux appareils…) :

```ini
TRACCAR_URL=https://gps.exemple.fr
TRACCAR_EMAIL=compte-lecture@exemple.fr   # un compte Traccar dédié, en lecture seule
TRACCAR_PASSWORD=…
TRACCAR_POLL_SECONDS=10
```

Puis, dans `/admin` → Équipages, associez chaque équipage à son appareil (identifiant unique, id numérique ou nom Traccar).
Le service `tracker` interroge Traccar toutes les `TRACCAR_POLL_SECONDS` secondes ; si Traccar ne répond pas,
il espace ses tentatives (jusqu'à 5 min) puis reprend normalement.

> Correction par rapport à l'ancien site : Traccar exprime la vitesse en **nœuds**, pas en m/s.
> Les vitesses affichées auparavant étaient fausses (×1,94).

## Ce qui est enregistré

Chaque position passe par `private.ingest_position()` (dans la base) :

| Cas | Résultat |
|---|---|
| coordonnées hors bornes, (0, 0), date > 5 min dans le futur | ignorée (`invalid`) |
| plus ancienne que la dernière position stockée, ou doublon | ignorée (`stale`) |
| saut impossible (> 400 km/h) | ignorée (`glitch`) : bug GPS classique — mais gardée en attente |
| saut **confirmé** par le point suivant au même endroit | stockée : vrai changement de lieu (clé reprise sur un autre téléphone, trace de test…), sans compter le saut dans la distance |
| **à l'arrêt** — moins de 15 m du dernier point stocké, ou dérive GPS (moins de 2 × la précision annoncée, 100 m au plus, à moins de 10 km/h) — et moins de 30 min écoulées | non stockée (`skipped`) mais « dernière position » mise à jour |
| à l'arrêt depuis 30 min | stockée (point « toujours là »), hors distance parcourue |
| sinon | stockée (`stored`), distance cumulée |

Résultat : une trace propre, pas de milliers de points quand la voiture est garée, et une distance
parcourue qui ne gonfle pas avec la dérive GPS à l'arrêt.
Réglables via `TRACK_MIN_DISTANCE_M` et `TRACK_MAX_SILENCE_S` (variables du conteneur `tracker`).

Un équipage est affiché **« En direct »** si sa dernière position a moins de 10 minutes.

**Dépannage** : le service `tracker` journalise chaque position refusée ou écartée (clé inconnue, format invalide,
saut impossible), avec l'IP d'origine — jamais la clé complète ni les coordonnées :
`docker compose logs -f tracker`.
