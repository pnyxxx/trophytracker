# Brief pour Claude Design : nouvelle identité visuelle de TrophyTracker

Conçois l'identité visuelle complète et les écrans clés de **TrophyTracker**, une application web (responsive, très utilisée
sur téléphone) de **carnet de route en direct** pour les road trips, raids et rallyes.

## Le produit en une phrase

Les voyageurs partagent leur aventure en direct : un téléphone dans le véhicule envoie sa position GPS, et leurs proches et
sponsors suivent sur une belle page la trace qui se dessine, les étapes, les photos et le journal de bord, sans application
à installer.

## Pour qui

- **Les voyageurs** (créateurs) : étudiants en raid solidaire, amis en road trip, van life, voyages à vélo ou à moto,
  expéditions, tours du monde. 18-35 ans surtout, à l'aise sur Instagram et TikTok.
- **Les proches** (lecteurs) : parents, grands-parents, amis. Ils ouvrent un lien et doivent comprendre en une seconde
  où sont les voyageurs et si tout va bien. Lisibilité et réassurance avant tout.
- **Les sponsors** : entreprises locales qui financent un raid et veulent voir leur visibilité.

Positionnement : concurrent de Polarsteps et FindPenguins. Notre différence : le **direct** (vraie position en temps réel),
le **voyage à plusieurs**, les **sponsors** et la **cagnotte** mis en avant, et la mise en scène en **3D satellite**.

## Fonctionnalités, donc écrans à concevoir

### Site public
1. **Accueil** (landing) : promesse « suivez leur aventure en direct », pour qui (proches, sponsors, voyageurs), comment ça
   marche en 3 étapes, une **carte satellite 3D animée** où une trace d'exemple se dessine (col de montagne en lacets, caméra
   type drone), FAQ, charte du voyageur, appel à créer son road trip (prix : paiement unique de 15 à 19 €, gratuit pour les proches).
2. **Page d'un road trip** (la plus importante, souvent ouverte sur téléphone) :
   - en-tête plein écran : photo de couverture, nom, slogan, logo du road trip, badge « En direct » ou « Dernière position il y a
     2 h », boutons Suivre, Partager, Participer à la cagnotte, Instagram, Facebook ;
   - **carte en direct** (2D) : trace complète, position actuelle qui pulse, ville de départ, étapes, photos et sponsors placés
     sur la carte, bouton « Suivre le véhicule », plein écran ;
   - **tableau de bord de télémétrie** (direction « mission control ») : signal, vitesse avec jauge, altitude, cap avec boussole,
     batterie du téléphone, **météo sur place**, bilan du jour (km, temps de route, point culminant) ;
   - **message rassurant** quand plus aucune position n'arrive : « pas de réseau en montagne ou dans le désert, c'est normal » ;
   - statistiques (distance totale, moyenne, jours sur la route, proches qui suivent) ;
   - **profil d'altitude** jour par jour (courbe interactive, dénivelés, point culminant) ;
   - **carnet de route** : frise chronologique jour après jour mêlant les **étapes** (départ, arrêt, nuit, coup de cœur,
     arrivée ; avec note et photos) et les **pages du journal de bord** ;
   - galerie de **photos et photos 360°** ;
   - **sponsors** (logos) ;
   - **« Revivre le road trip en 3D »** : lecteur plein écran qui survole toute la trace en satellite 3D, avec frise, vitesses
     ×1/×2/×4, et export **vidéo** paysage ou **story 9:16** avec titre, date et kilomètres incrustés ;
   - à venir : **mur d'encouragements** (messages des proches que les voyageurs lisent le soir).
3. **Pages légales** (CGU, CGV, confidentialité, mentions) : texte long, très lisible.
4. **Page 404** et **page « service en pause »**.

### Espace voyageur (connecté)
5. **Inscription / connexion** (email, Google, double authentification).
6. **Mon compte** : mes road trips (plusieurs possibles), road trips que je suis, profil, sécurité, achat d'un accès
   (paiement Stripe ou code offert `TT-XXXX-XXXX`).
7. **Espace de gestion d'un road trip**, avec en haut le **guide « Prêt au départ »** : 8 cases qui se cochent toutes seules
   (couverture, date de départ, compagnons de route, GPS branché, essai réussi, premières étapes, sponsors ou cagnotte,
   lien partagé), barre de progression « Prêts à 62 % », prochaine étape mise en avant. Onglets :
   - **Infos** : textes, images (couverture avec point de cadrage), dates, ville de départ, réseaux, cagnotte, visibilité
     (privé / par lien / public) ;
   - **GPS** : parcours guidé en 3 étapes (installer l'appli gratuite Traccar Client, accepter la charte, scanner un QR code),
     mode essai, suivi lancé/arrêté, effacer la trace ;
   - **Étapes** : liste éditable et **suggestions intelligentes** (« Le GPS a repéré une nuit à Chamonix : ajouter ? ») ;
   - **Journal** : une page par jour, bouton **« Rédiger »** qui propose un brouillon écrit par l'IA à relire puis publier ;
   - **Photos** (placement automatique sur la carte), **Sponsors**, **Membres** (invitations), **QR code** (autocollant pour
     le véhicule et visuel story Instagram), **Suppression** ;
   - à venir : **espace sponsors** (vues de la page, clics sur chaque logo, rapport PDF de fin de voyage à leur envoyer).
8. **Administration** (usage interne, sobre) : comptes, road trips, paiements, codes offerts.

### Supports hors site
9. **Emails** (confirmation, invitation, relance « votre GPS n'envoie rien », alertes de sécurité).
10. **Visuels générés** : autocollant QR code carré, story 9:16 avec QR code, image de partage (Open Graph).

## Direction artistique souhaitée

- Direction **« Mission control »** : on suit une expédition comme une mission. Fond plutôt sombre, imagerie satellite
  et 3D, données de télémétrie présentées avec élégance (chiffres en grand, petites étiquettes techniques), touches
  lumineuses pour le direct. Mais **chaleureux et humain**, pas froid ni militaire : c'est une aventure entre amis
  suivie par la famille.
- Les pages de lecture (carnet de route, journal, pages légales) doivent rester **très lisibles**, y compris pour des
  grands-parents sur téléphone : contraste élevé, grandes tailles de texte.
- Propose **2 ou 3 pistes** contrastées avant d'en développer une.

## Contraintes

- **Aucune référence au 4L Trophy** ni à la Renault 4L : pas de silhouette de 4L, pas d'univers « roadbook de rallye
  du désert ». Le logo **peut contenir un véhicule**, mais générique (ou une trace, une boussole, un point qui pulse…).
- **Polices à éviter** : Big Shoulders, Hubot Sans, Onest et Inter. Choisis des polices libres (Google Fonts ou
  Fontsource) qu'on pourra héberger nous-mêmes.
- Le nom « TrophyTracker » est provisoire : le logo doit fonctionner avec un autre nom, propose éventuellement des idées
  de nom.
- Les cartes utilisent OpenStreetMap (2D) et des orthophotos satellite (3D) : prévoir des couleurs de trace, de marqueurs
  et d'étiquettes lisibles sur les deux fonds.
- Accessibilité : contrastes WCAG AA, états de focus visibles, pas d'information portée par la couleur seule.
- Site entièrement en **français**.

## Livrables attendus

1. Logo (version complète, symbole seul, favicon, avatar de réseau social), sur fond clair et foncé.
2. Palette avec rôles (fond, texte, accent, direct/en ligne, alerte, couleurs des types d'étapes) en clair et en sombre.
3. Typographie (titres, texte, chiffres de télémétrie) et échelle de tailles.
4. Composants : boutons, champs, onglets, cartes, badges (En direct, Privé, Brouillon), tuiles de télémétrie, jauge,
   boussole, frise du carnet de route, case du guide de départ, marqueurs de carte.
5. Maquettes **téléphone et ordinateur** de : l'accueil, la page d'un road trip (en direct et hors réseau), le lecteur
   « Revivre en 3D », Mon compte, l'espace de gestion avec le guide « Prêt au départ » et les onglets GPS, Étapes et Journal.
6. Un email type, l'autocollant QR code et le visuel story.
