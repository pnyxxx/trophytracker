# Idées & feuille de route

Classées par priorité. ✅ = déjà fait dans cette version.

## ✅ Socle (v2)
- ✅ Plateforme multi-équipages, page d'accueil qui explique le projet (proches, sponsors, équipages)
- ✅ Comptes, favoris, espace équipage multi-membres, invitations par email
- ✅ GPS par téléphone (Traccar Client) sans serveur Traccar, ou via Traccar
- ✅ Carte en temps réel (Realtime), trace complète, statistiques, route illustrée
- ✅ Photos et 360°, sponsors géolocalisés sur la carte
- ✅ Double authentification, emails d'alerte, RGPD (suppression de compte)
- ✅ Tout auto-hébergé, tests automatiques, CI

## 🔥 Avant le prochain raid (fort impact)
- **Notifications aux abonnés** : « Votre équipage a franchi la frontière / est arrivé au bivouac / a passé Marrakech ».
  Web Push (gratuit, sans app) + email récapitulatif du soir. Déclencheur : entrée dans un rayon autour d'un point du parcours.
- **Journal de bord** : l'équipage publie de courts messages (texte + photo) depuis son téléphone,
  affichés en fil d'actualité sur sa page et épinglés sur la carte à la position du moment.
- **Page « suivi en famille » ultra simple** : un lien court + QR code imprimable pour les grands-parents,
  avec uniquement la carte et le dernier message, lisible en gros caractères.
- **Délai de confidentialité** : option pour afficher la position avec 30 min ou 2 h de retard (sécurité des bivouacs).
- **Mode hors-ligne / faible réseau** : PWA installable, trace mise en cache, reprise automatique.
- **Import d'une trace GPX** (pour les équipages qui ont enregistré sans réseau) et **export GPX** souvenir.

## 🤝 Pour les sponsors
- **Page sponsor** : un sponsor voit tous les équipages qu'il soutient sur une seule carte.
- **Statistiques de visibilité** pour l'équipage (vues de la page, clics sur les logos) à montrer aux sponsors — sans traceur tiers.
- **Kit de partage** : visuels générés automatiquement (« Nous sommes à 1 234 km de Marrakech ! ») pour Instagram/Facebook.
- **Dossier de sponsoring** hébergé sur la page de l'équipage (PDF).

## 🏁 Pour la course
- **Classement / comparaison** entre équipages suivis (distance, étape atteinte) — « course » amicale entre amis.
- **Étapes franchies automatiquement** : détection du passage aux points du parcours (au lieu de la saisie manuelle).
- **Carte de tous les équipages en direct** en plein écran pour le soir au bivouac ou l'école (mode TV).
- **Altitude et vitesse** en graphique sur la trace (les données sont déjà stockées).
- **Météo** sur la position actuelle (Open-Meteo, gratuit sans clé).
- **Rejouer le raid** : animation de la trace complète, jour par jour, après l'arrivée.

## 🧰 Technique
- **Tuiles de carte auto-hébergées** (Protomaps / PMTiles de l'Espagne + du Maroc) : zéro dépendance externe.
- **Supervision** : Uptime Kuma (auto-hébergé) + alertes si un service tombe pendant le raid.
- **Sauvegarde externe automatique** chiffrée (restic/rclone) vers un stockage objet.
- **Nettoyage des fichiers orphelins** du stockage (tâche planifiée).
- **Tests d'interface automatisés** (Playwright déjà installé) dans la CI.
- **Multi-éditions** : archiver l'édition précédente et repartir d'une carte vierge chaque année.
- **Multi-événements** : ouvrir la plateforme à d'autres raids étudiants (Europ'Raid, Rallye des Gazelles…).
- **Internationalisation** (espagnol pour les équipages étrangers).

## 💡 Bonus
- Badge « équipage vérifié » (numéro officiel confirmé par un admin).
- Livre d'or : les proches laissent des messages d'encouragement (modérés par l'équipage).
- Cagnotte / lien de don vers l'association partenaire de l'équipage.
- Mettre automatiquement le classement a jour en allant voir sur https://podium.desertours.com/R4L2026
