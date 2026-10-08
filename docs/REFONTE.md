# Refonte « Balise » : plan de reprise

Maquette Claude Design : `~/Downloads/Redesign 4L Trophy immersif-handoff(2)/redesign-4l-trophy-immersif/project/`
(lire chaque `.dc.html` en entier : HTML + script `data-dc-script` en bas = données et logique d'exemple).
Branche : `generaliste`. Le site en ligne reste en pause tant que Julien ne valide pas.

## Décisions de Julien (8 octobre 2026)

- **Garder le payant** (15 € puis 19 €, Stripe + codes `TT-`) : ajouter une étape « Accès » dans le parcours de création,
  retirer les « gratuit » de la maquette sauf « gratuit pour les proches ».
- **Un seul véhicule** pour l'instant (multi-véhicules plus tard) : afficher « 1 véhicule », pas de 2ᵉ trace.
- **Connexion UNIQUEMENT par code à 6 chiffres envoyé par e-mail** : plus de mot de passe, plus de Google, pas d'Apple.
  Supabase : `signInWithOtp({ email, options: { shouldCreateUser, data: { display_name } } })` puis
  `verifyOtp({ email, token, type: 'email' })` ; modèles d'e-mail GoTrue avec `{{ .Token }}` ; supprimer les pages
  mot de passe oublié / nouveau mot de passe / composant password-input ; la double authentification (TOTP) des admins reste.
- **Cagnotte = juste le lien** (bouton « Participer »), sans montant ni barre de progression.
- Adresse publique d'un road trip : `/t/<slug>` comme la maquette (remplace `/t/<slug>`, sans redirection).
  Domaine : garder trophytracker.fr (la maquette dit .app).

## Fait

- [x] Fondations (commit b875094) : polices, palette Tailwind (`ink`, `cream`, `signal`, `live`, `gold`, `dust`…),
  variables shadcn, logo balise (`components/common/Logo.tsx`, `logo-svg.ts`), favicon, icône, logo e-mail, image de partage,
  boutons pilule 48 px (`ui/button.tsx`), champs (`ui/input.tsx`), `Brand.tsx` (Kicker, SectionTitle, PageHero, Container),
  conversion automatique des titres (plus de capitales ni de police pochoir).
- [x] En-tête et pied de page : `PageShell header="floating"` (accueil, pilule floutée) ou collant par défaut ;
  `headerActions` = boutons propres à la page (à utiliser pour Suivre / Partager à l'étape 5). Ancre `/#exemple`.
  Route provisoire `/creer` → `/inscription` (dans `App.tsx`, à remplacer à l'étape 4).
- [x] Connexion par code e-mail : `components/auth/EmailCodeSignIn.tsx` (e-mail → code → prénom si absent ; prop
  `onHold` pour que la page n'aille pas plus loin avant la fin), à réutiliser dans `/creer`. Code valable 10 min
  (`GOTRUE_MAILER_OTP_EXP=600`, vaut aussi pour le lien d'invitation : expiré, l'invité se connecte par code).
  Plus de mot de passe ni de Google ; TOTP des admins gardé. E-mails : code seulement (nouveau gabarit à l'étape 8).
  Écrans de connexion au « tu » comme la maquette du parcours (l'espace voyageur et les e-mails de la maquette sont au
  « vous » : à trancher avec Julien).
- [x] Accueil : récit défilant `components/landing/story.ts` (images-clés, chapitres, photos) + `StoryMap.tsx` (carte
  IGN 3D pilotée par `prog`), HUD avec altitude réelle lue dans le relief, passage hors réseau, photos = vues aériennes
  IGN du col (`public/accueil/`), carte du lien vers `EXAMPLE_PATH` (`lib/example.ts` = `/t/exemple`, à créer par la
  démo neutre). Téléphone / animations réduites : vue fixe + chapitres en cartes. « Ce qui change de Polarsteps »
  devenu « Ce qui change vraiment » (pas de nom de concurrent : publicité comparative encadrée). Plus de « gratuit »
  sauf pour les proches ; prix affiché dans le bloc rouge et la FAQ. « 1 carte, tous les véhicules » remplacé par
  « Toute la bande » (1 véhicule), cagnotte « 1 lien » (pas de pourcentage).
- [x] Parcours `/creer` (`pages/CreateTripPage.tsx`) : 9 écrans (compte, code, type, d'où à où, quand + durée, équipage
  avec e-mails d'invitation, nom + couverture + privé, accès, lien prêt), aperçu en direct à droite / compact + bouton
  collant sur téléphone, brouillon en localStorage (couverture compressée en data URL, survit à Stripe). Migration
  `20261008000005_trip_setup` : `crews.trip_type` et `crews.destination` (le départ = `city` + position géocodée).
  Stripe revient sur `/creer?paiement=ok` (`returnTo: 'creer'` dans create-checkout). Adresses publiques `/t/<slug>`
  partout (site, Caddy, tracker, e-mails, plan du site), sans redirection. Bloc d'achat `CrewAccessPurchase` au style
  Balise. « Voyage privé » = visibilité « par lien » ; décoché = public.
- [x] Page road trip `/t/:slug` (`pages/CrewPage.tsx`) : en-tête collant avec Suivre / Partager (+ Gérer), pastilles
  (direct / hors réseau / pas encore parti, visibilité, voyageurs, exemple), titre « A → B », avatars ; bandeau
  « Pas de réseau, c'est normal » ; carte MapLibre `TripMap` (Satellite IGN/Esri, Plan OpenFreeMap, Relief 3D, trace,
  balise, départ avec drapeau breton, étapes, sponsors, photos, centrer, plein écran) — Leaflet retiré du projet ;
  `TripDashboard` (6 tuiles, météo 4 créneaux `fetchForecast`, profil d'altitude) + carte de lieu « J2 · près de… »
  (`hooks/useTrip.ts`) ; « Revivre en 3D » avec export paysage / story / carré ; carnet en onglets Étapes / Journal /
  Histoire ; mosaïque photos ; relief jour par jour repliable ; Soutenir (cagnotte = lien, sponsors, mur « bientôt »).

## À faire, dans l'ordre

1. ~~**En-tête et pied de page**~~ (fait) (`SiteHeader`, `SiteFooter`, `PageShell`) : en-tête flottant en pilule floutée sur
   l'accueil (logo, Comment ça marche, Exemple de voyage, Connexion, « Créer mon trip »), en-tête collant simple ailleurs ;
   pied de page sobre (logo, Comment ça marche, Confidentialité, Contact, mentions, CGU, CGV, © année).
2. ~~**Connexion par code**~~ (fait) (pages auth, `hooks/auth.tsx`, modèles d'e-mails `email-templates.ts`, config GoTrue
   `infra/supabase.override.yml` : `GOTRUE_MAILER_OTP_LENGTH=6`, désactiver Google), tests e2e `scripts/e2e/smoke.mjs`
   (récupérer le code dans Mailpit au lieu du lien).
3. ~~**Accueil**~~ (fait) (`Accueil.dc.html`) : récit défilant sur carte satellite 3D (5 chapitres + images-clés de caméra,
   HUD position/distance/vitesse/jour, bandeau « Hors réseau · X km en mémoire », photos qui apparaissent, carte du lien
   privé à copier), « Prêt en 5 minutes », « Ce qui change de Polarsteps » (4 panneaux), « Quel que soit le véhicule »
   (pilules inclinées), grand bloc rouge « Le compteur démarre quand tu pars », FAQ et charte à garder (on les avait).
   Utiliser le tracé Galibier + IGN existant (`example-trip.json`, `lib/route-anim.ts`) plutôt que Bergen/Esri.
4. ~~**Parcours de création**~~ (fait) `/creer` (`Creer un road trip.dc.html`) : compte (prénom + e-mail) → code → type de voyage
   (van, voiture, moto, raid, entre amis, tour du monde) → d'où à où (+ idées) → quand + durée → équipage (prénoms,
   invitations par e-mail facultatives ; véhicules : 1 seul pour l'instant) → nom, couverture, privé → **Accès
   (paiement Stripe ou code TT-)** → lien prêt (copier, WhatsApp, SMS, e-mail, 3 prochaines étapes). Aperçu en direct à
   droite (ordinateur) / compact en haut + bouton collant en bas (téléphone). Brouillon gardé en localStorage pour
   reprendre après Stripe. Base : nouvelles colonnes `trip_type`, `from_place`, `to_place` sur `crews` (migration).
5. ~~**Page road trip**~~ (fait) `/t/:slug` (`Road trip.dc.html`) : en-tête (Suivre, Partager), pastilles (en direct / hors réseau,
   privé, nb voyageurs), titre « A → B », avatars ; bandeau hors réseau ; carte MapLibre (remplace Leaflet) avec
   Satellite / Plan / Relief 3D, carte de lieu « J9 … » ; colonne télémétrie (6 tuiles), météo 4 créneaux (maintenant,
   +3 h, +6 h, demain : prévision Open-Meteo `hourly`), profil d'altitude ; bloc « Revivre en 3D » (lancer, exporter :
   paysage, story, **carré 1:1** à ajouter) ; Carnet de route avec onglets Étapes / Journal ; mosaïque photos (360°) ;
   Soutenir : cagnotte (lien), sponsors, mur d'encouragements (« bientôt » → phase F). Garder nos extras : photos et
   sponsors sur la carte, visionneuse 360°, contact, réseaux sociaux, relief jour par jour, démo.
6. **Espace voyageur** (`Espace voyageur.dc.html`) : barre latérale (Tableau de bord, Prêt au départ, Carnet de route,
   Photos, Partage, Réglages) ; guide 8 onglets avec anneau de progression (Voyage, Équipage, Véhicules, Itinéraire,
   Suivi GPS, Partage, Sponsors & cagnotte, Check-list « Je pars » qui lance le suivi). Rebrancher nos onglets existants
   (Infos, GPS, Étapes, Journal, Photos, Sponsors, Membres, QR, Suppression) dans cette structure. « Importer un GPX ».
7. **Administration** (`Administration.dc.html`) : barre latérale, KPI, tableau des road trips avec filtres, points GPS
   reçus sur 24 h, « À traiter », état des services ; garder nos onglets paiements et codes.
8. **E-mails** (`E-mails.dc.html`) : nouveau gabarit (600 px, crème, en-tête nuit) pour tous les e-mails existants ;
   nouveaux : invitation d'un proche, « C'est parti » (bouton « Je pars »), résumé du soir aux abonnés (désinscription).
9. **Visuels QR** (`Visuels QR.dc.html`) : autocollant carré 12 cm, story 1080×1920 sur fond satellite avec la trace,
   autocollant rond 8 cm (`lib/qr-poster.ts`).
10. **Pages restantes** : mentions, CGU, CGV, confidentialité, 404, page pause (`public/pause.html`), compte,
    invitation, au nouveau style (fond nuit, plus de sections crème).
11. **Phase F** puis **démo neutre** (voir docs/PIVOT.md), puis vérifs (`make check`, `make test`, captures téléphone et
    ordinateur), puis mise en ligne quand Julien valide.
