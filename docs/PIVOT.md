# Octobre 2026 : pause et passage à une appli généraliste

> Document de référence des événements du 7 octobre 2026 et des décisions qui en découlent.
> **Ce n'est pas un avis d'avocat** : c'est un état des lieux, sources à l'appui.

---

## 1. Ce qui s'est passé (7 octobre 2026)

1. **Alerte d'une ambassadrice du 4L Trophy** (Instagram) : « nous n'avons pas le droit de relever l'ensemble des
   données GPS, nous sommes très souvent sur des terrains militaires au Maroc ». Elle a ensuite transmis l'adresse
   d'un contact de l'organisation.
2. **Lecture du règlement 2026** et des documents officiels (voir § 2). Premier mail à l'organisation : proposition
   d'un cadre (suivi jusqu'à Merzouga, « mode désert » flou ensuite, charte fair-play).
3. **Appel de l'organisation** (avec le PC Course) : demande de rendre le site inaccessible sous une semaine environ,
   sans avocat ni menace, ton ouvert ; ils ont trouvé le projet beau et avancé, et développeront en interne s'il y a
   un outil à faire. Reproches : nom « 4L Trophy » / propriété intellectuelle, mise en avant de leur tracé et des
   étapes, triche, voir les autres équipages, sécurité des positions publiques, familles inquiètes qui appellent
   l'organisation, police jugée trop proche de la leur.
4. **Mise en pause** du site le jour même (§ 4), puis **mail de réponse point par point** : présentation de Julien
   (développeur web, mobile et IA, Epitech Lille), tout ce qui a été construit, proposition de contribuer à leur
   projet, et annonce transparente d'une appli généraliste de carnet de voyage sans lien avec le 4L Trophy.
5. L'unique équipage qui avait payé est contacté par Julien (remboursement complet proposé).

## 2. Ce que disent les textes

### Règlement général et sportif 2026 (réservé à l'espace participant)
- **Art. 7.4** : « tout équipement relié à un système GPS (système de géolocalisation (tracking), Data logger, suivi
  de flotte etc…) est strictement interdit. Tout contrevenant sera immédiatement exclu. » Même chose dans la liste
  « INTERDITS SUR LE 4L TROPHY » (p. 14 : « tracker », « suivi d'équipage »).
- **Art. 7.3** : le Tripy permet « à l'organisation et seulement à l'organisation » de localiser les équipages.
- **Art. 1.2** : « Tout ce qui n'est pas expressément autorisé par le présent Règlement est interdit. »
- **Art. 21** : parcours secret jusqu'à la remise des roadbooks, pistes soumises à l'autorisation des autorités
  marocaines, roadbooks restitués, reproduction interdite.
- **Art. 11** : trajet France / Espagne libre ; le Tripy ne fonctionne qu'à partir de l'entrée au Maroc (art. 5.6).
- **Art. 17** : marque et logo propriété de Désertours ; usage commercial de la marque interdit aux participants.
- **Art. 5.8** : l'organisation gère sa propre « course en direct » sur Internet.
- Aucune mention de zones militaires dans le règlement, le Carnet de route ni le Guide Village Départ.

### Droit
- **Marque** : citer « 4L Trophy » pour désigner l'événement est permis (art. L.713-6 du Code de la propriété
  intellectuelle), mais un service payant entièrement construit autour de l'événement s'expose au parasitisme.
- **Maroc** : l'art. 193 du code pénal vise les « levés ou opérations topographiques » dans les zones d'interdiction
  fixées par l'armée. Aucune liste officielle publique ; OpenStreetMap montre une trentaine de zones militaires à
  l'est de l'Erg Chebbi, vers la frontière algérienne. D'autres rallyes au Maroc ont un suivi public organisé par
  eux-mêmes (Rallye du Maroc, Aïcha des Gazelles, Marathon des Sables, Africa Eco Race).
- **Usage réel** : de nombreux carnets Polarsteps publics « 4L Trophy » existent depuis 2019 ; les équipages
  partagent aussi leur position WhatsApp.

### Conclusion
Sur le 4L Trophy, c'est l'organisation qui décide (elle écrit le règlement et peut exclure les équipages). Un
produit centré sur cet événement sans son accord n'est pas viable, même s'il est en partie légal.

## 3. Décisions

- Le site devient une **appli généraliste de carnet de route en direct**, dans l'esprit de Polarsteps, utilisable par
  tout road trip ou rallye. Différenciateur : suivi en direct pour les proches, sponsors, cagnotte, voyage à plusieurs.
- **Plus aucune mention du 4L Trophy** ni de « trophyste ».
- **Plus d'étapes ni de parcours prédéfinis** : chaque voyage crée ses propres étapes.
- **Plus de carte commune ni d'annuaire public** ; pages **privées par défaut** (visibles par lien), **non
  référencées** ; lieux d'arrêt de nuit floutés ; message clair « pas de position = pas de réseau, contactez le
  voyageur ».
- Le **suivi GPS** du voyageur reste le cœur du produit.
- Vocabulaire : un compte crée des **voyages** (plusieurs par compte), chacun avec ses voyageurs. Chaque voyage
  garde **sa** trace GPS sur **sa** page ; plus jamais de carte qui mélange les traces de plusieurs voyages.
- Nom **TrophyTracker gardé pour l'instant** (« trophy » est un mot générique), identité visuelle et nom à revoir ;
  aucun dépôt INPI avant. Protéger le code par une enveloppe Soleau avant de montrer des détails techniques.

## 4. La pause et comment revenir en arrière

- **Interrupteur** : `SITE_PAUSED=true` dans le `.env` du serveur (`~/services/trophytracker`). Toute visite venue
  d'Internet voit `apps/web/public/pause.html` (API et réception GPS comprises) ; le tracker ne lance ni démo, ni
  synchronisation Traccar, ni emails. L'accès direct au serveur (tunnel SSH) montre toujours le vrai site.
- **Rouvrir** : `SITE_PAUSED=false`, puis `docker compose up -d web tracker`.
- **État complet d'avant** : tag Git `etat-avant-pause-2026-10-07` (commit `2d3897a`).
- **Sauvegarde** : `backups/trophytracker-20261007-153115.tar.gz` sur le serveur (base + fichiers).
- ⚠️ Revenir au **code** d'avant est immédiat (tag). Revenir à la **base de données** d'avant suppose que les
  migrations du pivot soient **additives** (on ajoute, on ne supprime rien) ; sinon il faut restaurer la sauvegarde,
  et les données saisies entre-temps seraient perdues.

## 5. Plan de transformation

Travail sur la branche `generaliste` ; `main` reste l'état en pause jusqu'au feu vert. Ordre proposé :

1. **Nettoyage 4L Trophy** : textes, SEO, emails, CGU/CGV/mentions, admin, tests ; retrait du tracé de référence
   (`road-path.json`, `journey.ts`), des étapes datées (`stages.ts`, tables d'étapes et `parcours_2027`), de la carte
   commune et de l'annuaire, de la démo du trajet 2026.
2. **Étapes créées par le voyageur** : ajout, modification, ordre, dates facultatives, placement sur la carte.
3. **Confidentialité** : privé par défaut avec lien de partage, option public, noindex, sitemap vide des pages
   privées, floutage des arrêts de nuit, message « pas de réseau ».
4. **Vocabulaire et modèle** : « équipage » → « voyage » (avec voyageurs), plusieurs voyages par compte.
5. **Accueil et identité** : nouvelle page d'accueil généraliste, nouveau voyage de démonstration, nouvelle
   identité (nom, logo sans 4L, polices).
6. **Réouverture** quand tout est prêt.

Reste à faire repéré pendant l'étape 1 : codes d'accès offerts au format `4L-XXXX-XXXX` (contrainte, génération et
saisie dans `access_codes`) → passer à `TT-` par une nouvelle migration qui accepte encore les anciens codes ; la démo
(trajet 2026, `apps/tracker/demo/`) à remplacer à l'étape 5 ; l'« événement » de l'administration (date de départ
commune, lancement auto du GPS) à remplacer par les dates de chaque voyage à l'étape 2.

## 6. Choix du 7 octobre au soir : « road trip » et « Mission control »

- **Vocabulaire** : « road trip » (site en français). Adresses `/road-trip/<nom>` ; les anciennes `/equipages/<nom>`
  redirigent (QR codes déjà imprimés).
- **Style « Mission control »** : sombre, satellite et 3D, télémétrie façon tableau de bord, nouveau logo sans 4L,
  nouvelles polices.
- **Fonctionnalités, dans l'ordre** :
  - **A. Fondations** : vocabulaire, adresses, plusieurs road trips par compte.
  - **B. Identité** « Mission control » sur tout le site et les emails.
  - **C. Guidage et étapes** : checklist « Prêt au départ » ; étapes créées par le voyageur ; détection automatique
    des nuits et arrêts proposée en un clic.
  - **D. Télémétrie et météo** en direct (vitesse, altitude, cap, batterie, réseau, météo à la position).
  - **E. Replay 3D** exportable en vidéo et **journal de bord IA** du soir (relu et publié par le voyageur).
  - **F. Sponsors** (statistiques de visibilité, rapport PDF de fin de voyage) et **mur d'encouragements** des proches.
- Codes offerts : `TT-XXXX-XXXX` (fait, les anciens `4L-` restent valables).
