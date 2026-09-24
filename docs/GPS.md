# Suivi GPS

Deux façons d'alimenter la carte d'un équipage, utilisables séparément ou ensemble.

## Option 1 — Un téléphone dans la 4L (recommandé, rien à héberger)

L'équipage installe l'application gratuite **Traccar Client** (Android / iOS) et la configure depuis
son espace : *Mon compte → Gérer → onglet GPS*.

| Réglage de l'appli | Valeur |
|---|---|
| URL du serveur | `https://votre-domaine.fr/ingest/osmand` |
| Identifiant de l'appareil | la clé `tt_…` générée dans l'onglet GPS (affichée une seule fois) |
| Fréquence | 30 s (bon compromis batterie / précision) |
| Précision | élevée |
| Mise en mémoire hors ligne | activée (indispensable dans le désert) |

Sans réseau, l'appli stocke les positions et les envoie dès que la 4G revient : la trace se complète toute seule.

**Sécurité de la clé** : seul son hash SHA-256 est stocké. Elle permet uniquement d'*envoyer* des positions
pour cet équipage. En cas de fuite : « Générer une nouvelle clé » (l'ancienne cesse immédiatement de fonctionner).

**Formats acceptés** par `/ingest/osmand` :
- protocole OsmAnd : `GET/POST ?id=…&lat=…&lon=…&timestamp=…&speed=…` (vitesse en **nœuds**) ;
- JSON de Traccar Client ≥ 9 : `{ device_id, location: { timestamp, coords: {…}, battery } }` (vitesse en m/s).

Limite : 120 requêtes/minute par adresse IP.

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
| saut impossible (> 400 km/h) | ignorée (`glitch`) : bug GPS classique |
| moins de 15 m depuis le dernier point et moins de 5 min écoulées | non stockée (`skipped`) mais « dernière position » mise à jour |
| sinon | stockée (`stored`), distance cumulée |

Résultat : une trace propre, pas de milliers de points quand la voiture est garée, et une distance
parcourue qui ne gonfle pas avec la dérive GPS à l'arrêt.
Réglables via `TRACK_MIN_DISTANCE_M` et `TRACK_MAX_SILENCE_S` (variables du conteneur `tracker`).

Un équipage est affiché **« En direct »** si sa dernière position a moins de 10 minutes.
