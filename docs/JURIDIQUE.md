# Analyse juridique de TrophyTracker

> Analyse du 2026-09-26. **Ce document n'est pas un avis d'avocat** : c'est un état des lieux, sources à l'appui,
> pour savoir quoi faire et quoi faire vérifier. Avant de lancer l'offre payante, le faire relire gratuitement :
> permanence d'avocat gratuite (mairie, maison de justice et du droit), clinique juridique d'une faculté de droit,
> CCI / CMA pour le statut, INPI pour la marque.

Contexte pris en compte :
- aujourd'hui : site public et gratuit (https://trophytracker.fr), comptes, pages d'équipages, **positions GPS en
  direct**, photos, sponsors ; hébergé sur un serveur personnel derrière Cloudflare ;
- demain : **inscrire un équipage coûtera 10 à 20 €**, tout le reste reste gratuit.

---

## 0. Résumé : les risques et quoi faire

| # | Risque | Gravité | Ce qu'il faut faire | Quand |
|---|---|---|---|---|
| 1 | **Encaisser de l'argent sans statut** (activité commerciale habituelle non déclarée) | Élevée | Créer une micro-entreprise (ou une association) **avant** le premier paiement | Avant le payant |
| 2 | **Règlement du 4L Trophy : « GPS strictement interdit »**. Une carte publique en direct peut être vue comme une aide à la navigation → un équipage pénalisé, TrophyTracker accusé de faciliter la triche | Élevée | Lire le règlement complet (espace participant), délai d'affichage pendant les étapes, clause CGU, contacter l'organisation | Maintenant |
| 3 | **Marque « 4L Trophy »** (Rey Voyages : « marques déposées », reproduction interdite) | Moyenne (↑ avec le payant) | Usage purement référentiel du nom, jamais de logo, jamais « officiel », mention de non-affiliation (déjà là), quelques textes à corriger | Maintenant |
| 4 | **Dépendance commerciale à l'organisateur** : il peut interdire les traceurs tiers dans son règlement ou lancer le sien | Moyenne | Lui écrire avant de lancer le payant ; garder l'option « multi-raids » | Avant le payant |
| 5 | **Pas de mentions légales, pas de CGU**, politique de confidentialité incomplète | Moyenne (amendes possibles, surtout une fois professionnel) | Pages Mentions légales, CGU, Confidentialité complète, lien de signalement | Maintenant |
| 6 | **Géolocalisation = donnée très surveillée par la CNIL** ; le téléphone localise *tous* les occupants de la 4L | Moyenne | Consentement de chaque membre, durées de conservation, masquer départ/domicile, délai, registre RGPD | Maintenant |
| 7 | **Obligations de vente aux consommateurs** (CGV, rétractation 14 j, médiateur obligatoire, bouton « payer ») | Élevée une fois payant | CGV, adhésion à un médiateur (~50-150 €/an), parcours de commande conforme | Avant le payant |
| 8 | **Images satellite Esri** : « not available for commercial use » | Moyenne une fois payant | Remplacer la source satellite (ou prendre une licence) | Avant le payant |
| 9 | **Contenus publiés par les équipages** (photos de personnes, d'enfants au Maroc, logos de sponsors) | Faible à moyenne | Règles dans les CGU + bouton « Signaler » + retrait rapide (statut d'hébergeur) | Maintenant |
| 10 | **Nom « TrophyTracker » non protégé** (quelqu'un peut le déposer avant toi) | Faible | Recherche d'antériorité puis dépôt INPI | Avant le payant |

---

## 1. Le 4L Trophy peut-il me causer des problèmes ?

### 1.1 Qui est en face

D'après les [mentions légales du site officiel](https://www.4ltrophy.com/fr/mentions-legales) :
- éditeur : **Rey Voyages, SAS**, RCS Bayonne 412 608 713, 3 rue de la Tour, 64500 Ciboure ;
- **Désertours** (même adresse, fondée par Jean-Jacques Rey) gère les données personnelles et encaisse les inscriptions ;
- une association étudiante, « 4L Trophy Coordination », co-organise le raid ([partenaires](https://www.4ltrophy.com/fr/partenaires)).

Ce qu'ils écrivent publiquement :
- « **Les marques de Rey Voyages** et de ses partenaires, ainsi que les logos figurant sur le site **sont des marques
  (semi-figuratives ou non) et sont déposées** » ; toute reproduction « effectuée à partir du site est prohibée »
  (articles L.713-2 et suivants du Code de la propriété intellectuelle) ;
- [FAQ](https://www.4ltrophy.com/fr/faq) : « Vous êtes autorisé à utiliser **uniquement le logo 4L TROPHY participant** »,
  et les T-shirts « 4L TROPHY PARTICIPANT » sont permis « mais vous ne pouvez pas les utiliser **à des fins commerciales** » ;
- FAQ : « **L'utilisation du GPS est strictement interdite.** » ; « Toute assistance extérieure à l'organisation est
  sanctionnée par l'exclusion du raid » ;
- leur suivi GPS à eux : « Chaque 4L est équipée d'un boîtier GPS qui transmet sa position en temps réel **au PC Course** »
  ([organisation](https://www.4ltrophy.com/fr/organisation)). Rien sur les pages publiques n'indique qu'ils montrent la
  position de chaque équipage aux familles : leur « course en direct » annonce vidéos, photos, brèves, classement.
  → **TrophyTracker comble un vrai manque, mais c'est aussi un terrain qu'ils pourraient vouloir occuper.**

**Pas trouvé** (à vérifier) : le **règlement complet** n'est pas public, il est dans l'espace participant
(prepa.4ltrophy.com, connexion requise). Le numéro de dépôt de la marque « 4L TROPHY » n'a pas pu être vérifié
(la base INPI refuse les accès automatiques) → à chercher à la main sur [data.inpi.fr](https://data.inpi.fr).

### 1.2 La marque « 4L Trophy » : ce qui est permis, ce qui ne l'est pas

Le droit des marques n'interdit pas de **citer** une marque pour dire à quoi sert son service, tant que c'est
« conforme aux usages loyaux » et que ça ne laisse pas croire à un lien officiel (article L.713-6 du CPI : usage
de la marque « pour désigner […] la destination d'un produit ou d'un service »). Exemple admis : « coque pour iPhone ».
« Suivi GPS des équipages du 4L Trophy » est du même ordre.

Ce qui fait basculer vers la contrefaçon ou le parasitisme :
- utiliser **le logo** (même « participant » : il n'est autorisé que pour les équipages, et pas à des fins commerciales) ;
- mettre « 4L Trophy » **dans le nom du service, le nom de domaine, un nom d'application ou une publicité payante**
  (ex. acheter le mot-clé « 4L Trophy » sur Google Ads) ;
- dire ou suggérer que c'est **officiel, partenaire, validé** ;
- copier leur charte graphique, leurs photos, leurs textes, leur roadbook.

**État actuel du site :**
- ✅ Nom et domaine neutres (TrophyTracker, trophytracker.fr), aucun logo ni photo du 4L Trophy, pied de page
  « projet indépendant, non affilié à l'organisation du 4L Trophy » + lien vers le site officiel. C'est exactement ce qu'il faut.
- ⚠️ À corriger :
  - « **parcours officiel** » ([CrewPage.tsx:175](../apps/web/src/pages/CrewPage.tsx#L175), admin, commentaires) : laisse
    croire que les données viennent de l'organisation → « parcours indicatif » / « itinéraire prévu » ;
  - e-mail d'invitation : « TrophyTracker, **la** plateforme de suivi en direct du 4L Trophy » → « une plateforme
    indépendante de suivi des équipages du 4L Trophy » ;
  - FAQ de l'accueil « Combien ça coûte ? Rien » : à mettre à jour le jour où ça devient payant (pratique commerciale trompeuse sinon) ;
  - ajouter la mention de non-affiliation aussi dans les CGU, les CGV et le parcours de paiement (c'est là qu'elle compte le plus).
- Le mot « 4L » seul : c'est l'ancien nom commercial d'un modèle Renault ; je n'ai pas pu vérifier son statut de marque.
  On ne l'utilise pas comme marque, ni aucun logo Renault : rien à changer.

### 1.3 Parasitisme / concurrence déloyale

Même sans contrefaçon, l'organisateur pourrait invoquer le **parasitisme** (article 1240 du Code civil) : profiter de la
notoriété et des investissements d'autrui sans rien apporter. La jurisprudence admet en général qu'on vende un service
**autour** d'un événement (hôtels près d'un festival, préparateurs de 4L, stickers…) ; le risque monte si le service
se présente comme faisant partie de l'événement ou détourne sa valeur propre (ses classements, son roadbook, ses images).
Même règle que pour la marque : rester clairement **à côté**, jamais **dedans**.

### 1.4 Le règlement : « GPS strictement interdit » → le point le plus sensible

TrophyTracker **n'est pas un GPS de navigation** : Traccar Client n'affiche aucune carte, il envoie juste une position.
Mais :
- n'importe quel membre d'équipage peut ouvrir le site sur son téléphone et **voir sa position sur une carte** ;
- la carte « Où sont-ils ? » montre **les autres équipages en direct** : suivre la trace de ceux qui sont devant est une
  aide à la navigation évidente ;
- le règlement complet peut aller plus loin que la FAQ (téléphones, applications, cartes hors ligne…) → **à lire**.

Si un équipage est pénalisé ou exclu à cause du site, il se retournera contre TrophyTracker, et l'organisation aura
une raison toute trouvée d'interdire le service. Mesures proposées :
1. **Délai d'affichage pendant les étapes** (l'idée « délai de confidentialité » de [IDEES.md](IDEES.md)), réglé
   par l'admin pour l'événement : par ex. positions visibles avec 1 à 2 h de retard pendant les journées de course,
   en direct le reste du temps. Utile aussi contre le vol au bivouac.
2. Pendant les étapes, **pas de carte multi-équipages en direct** (ou avec le même délai).
3. **Clause CGU** : le service n'est ni un outil de navigation ni un outil de sécurité ; chaque équipage est seul
   responsable du respect du règlement de son épreuve et de ce qu'il fait du site pendant la course.
4. Texte clair dans l'espace équipage : « Ne consultez pas la carte pour vous orienter : le règlement l'interdit. »
5. **Demander à l'organisation** ce qu'elle tolère (voir 1.5).

### 1.5 Le vrai risque est commercial : écrire à l'organisation

Juridiquement, ils ne peuvent pas t'empêcher de proposer un service indépendant. Mais **ils écrivent le règlement** :
une ligne « tout dispositif de géolocalisation autre que la balise officielle est interdit » suffirait à tuer le projet.
Et le jour où tu encaisses de l'argent en visant *leurs* participants, tu deviens plus visible.

Recommandation : **leur écrire avant de lancer le payant** (modèle en annexe A). Trois issues possibles :
- ils acceptent ou tolèrent (idéalement par écrit) → tu peux l'utiliser comme argument de confiance, sans dire « officiel » ;
- ils proposent un partenariat → à discuter (ils peuvent aussi vouloir une commission) ;
- ils refusent → tu le sais avant d'avoir investi ; la piste « multi-raids » (Europ'Raid, Rallye des Gazelles…, déjà
  dans [IDEES.md](IDEES.md)) réduit cette dépendance.

Au passage : l'édition 2027 (30 ans) est annoncée **du 17 au 28 février 2027**, départ Biarritz, arrivée Marrakech.

### 1.6 Protéger ton propre nom

« TrophyTracker » est différent de « 4L Trophy » (« trophy » est un mot courant) : risque de confusion faible.
Pour éviter que quelqu'un le dépose avant toi : recherche d'antériorité sur data.inpi.fr, EUIPO et WIPO (pas pu être faite
automatiquement), puis dépôt en ligne à l'INPI (environ 190 € pour une classe, prix à vérifier ; classe 42 « logiciels
en ligne » et éventuellement 38/45). Pas urgent, mais à faire avant la communication autour du payant.

---

## 2. Encaisser de l'argent : il faut un statut

Un particulier peut vendre occasionnellement ses affaires ; **vendre un service de façon habituelle est une activité
professionnelle** qui doit être déclarée. Sans statut : pas de factures possibles, et risque de travail dissimulé.

| | Micro-entreprise (entreprise individuelle) | Association loi 1901 |
|---|---|---|
| Création | Gratuite, en ligne (formalites.entreprises.gouv.fr), quelques jours | Au moins 2 personnes, statuts, déclaration en préfecture |
| Compatible étudiant | Oui | Oui |
| Argent gagné | À toi (après cotisations sociales, environ 21 à 26 % du chiffre d'affaires selon la catégorie d'activité — taux exact à vérifier sur urssaf.fr) | Reste dans l'association, pas de bénéfice personnel |
| TVA | Non facturée tant que CA < 37 500 €/an (franchise en base ; mention « TVA non applicable, art. 293 B du CGI ») | Généralement non |
| Tes biens personnels | Protégés par défaut des dettes professionnelles (réforme de l'entreprise individuelle, 2022) | Protégés (personne morale) |
| Paiement en ligne | Stripe (≈ 1,5 % + 0,25 € par carte européenne) | HelloAsso (gratuit, se finance par pourboires) ou Stripe |
| Règles de vente aux consommateurs | S'appliquent | S'appliquent aussi dès qu'elle vend des services |

Points d'attention :
- **Recommandation** : micro-entreprise, créée juste avant d'ouvrir les paiements (inutile de payer des démarches tant
  que c'est gratuit). Association si tu veux un projet collectif sans but lucratif.
- Ton **adresse** devient publique (registre des entreprises + mentions légales). Si tu ne veux pas afficher le domicile :
  société de domiciliation (quelques euros par mois) — à regarder.
- Revenus de micro-entreprise : à déclarer, et ils peuvent jouer sur certaines aides (APL, prime d'activité, bourse selon
  les cas) → vérifier ta situation avant.
- Compte bancaire séparé obligatoire seulement au-delà de 10 000 € de CA deux années de suite (règle à confirmer).
- Facturation électronique : les micro-entreprises devront transmettre leurs ventes à partir de septembre 2027 (calendrier
  de la réforme à vérifier le moment venu ; Stripe et les logiciels de facturation s'en chargent en général).

---

## 3. Les pages légales à publier

### 3.1 Mentions légales (loi pour la confiance dans l'économie numérique, art. 6 III) — **obligatoire dès maintenant**

- **Tant que c'est gratuit et non professionnel** : un particulier peut rester discret (nom et adresse donnés seulement
  à l'hébergeur)… mais ici **l'hébergeur, c'est toi** (auto-hébergement). En pratique : nom de l'éditeur, contact e-mail,
  directeur de la publication, hébergement.
- **Une fois professionnel** : nom, prénom, adresse, e-mail, téléphone, SIREN, mention TVA, directeur de la publication,
  médiateur de la consommation.
- **Hébergement** : serveur personnel de l'éditeur (France) ; trafic acheminé par Cloudflare, Inc. (101 Townsend St,
  San Francisco, États-Unis) ; e-mails envoyés par Brevo (Sendinblue SAS, Paris).

### 3.2 CGU (conditions générales d'utilisation) — **maintenant**

À couvrir :
- présentation, **service indépendant non affilié au 4L Trophy / Rey Voyages / Désertours** ;
- comptes : âge minimum **15 ans** pour un compte (majorité numérique en France), **18 ans** pour créer ou gérer un équipage ;
- ce que les équipages s'engagent à faire : avoir **l'accord de chaque membre** pour la géolocalisation, avoir les droits
  sur leurs photos, textes et **logos de sponsors**, **ne pas publier de personnes reconnaissables sans leur accord**
  (enfants en particulier, y compris pendant la traversée du Maroc) ;
- contenus interdits et **signalement** (règlement européen sur les services numériques, DSA : point de contact, mécanisme
  de signalement, motivation des retraits) ; suspension de compte ;
- **le service n'est ni un outil de navigation ni un outil de sécurité** ; en cas d'urgence, utiliser le bouton d'alerte
  de la balise officielle et les secours ; respect du règlement de l'épreuve sous la seule responsabilité de l'équipage ;
- disponibilité « au mieux » (obligation de moyens) : zones sans réseau, panne de téléphone, maintenance ;
- propriété : les équipages restent propriétaires de leurs contenus et donnent à TrophyTracker le droit de les afficher ;
- droit applicable (français), modification des CGU avec information des utilisateurs.

### 3.3 CGV (conditions générales de vente) — **avant le payant**

Obligatoires pour vendre à des particuliers (Code de la consommation, art. L.221-5 et suivants) :
- identité du vendeur, **prix TTC** et mention TVA, **ce qu'on achète exactement** (à décider : inscription pour une
  édition ? pour toujours ? que se passe-t-il si l'équipage ne part pas ou si le raid est annulé ?) ;
- **parcours de commande** : acceptation des CGV (case à cocher), bouton explicite « Payer » / « Commande avec obligation
  de paiement » (art. L.221-14), **confirmation par e-mail** avec le récapitulatif et les CGV ;
- **droit de rétractation de 14 jours** : pour un service qui dure jusqu'à la fin du raid, l'exception « service
  entièrement exécuté » ne s'applique pas ; si l'équipage demande à commencer tout de suite puis se rétracte, il ne doit
  que la part déjà fournie (art. L.221-25). **Proposition simple et protectrice : remboursement intégral sur simple
  demande jusqu'au jour du départ.** Pour 10-20 €, c'est commercialement sans risque et ça évite tout litige ;
- **garantie légale de conformité** des services numériques (art. L.224-25-1 et suivants) à mentionner ;
- **médiateur de la consommation** : obligatoire dès un seul client particulier, quel que soit le chiffre d'affaires ;
  amende jusqu'à 3 000 € pour une personne physique ; coût d'adhésion environ 50-150 €/an ; à indiquer dans les CGV ;
- paiement délégué à Stripe (Checkout hébergé) : **aucune donnée bancaire ne passe par le serveur**.

### 3.4 Politique de confidentialité — **maintenant** (voir partie 4)

### 3.5 Pied de page

Liens : Mentions légales · CGU · (CGV) · Confidentialité · Signaler un contenu · Contact.

---

## 4. Données personnelles (RGPD)

La page actuelle ([PrivacyPage.tsx](../apps/web/src/pages/PrivacyPage.tsx)) est honnête et bien écrite, mais il lui
manque des éléments obligatoires (art. 13 RGPD) : identité du responsable, **bases légales, durées de conservation,
destinataires et sous-traitants, transferts hors UE, droit de réclamation auprès de la CNIL**, contact.

### 4.1 Les traitements

| Traitement | Données | Base légale | Durée proposée |
|---|---|---|---|
| Comptes | e-mail, nom affiché, mot de passe haché, double authentification | Contrat (CGU) | Jusqu'à suppression du compte |
| Pages d'équipage | nom, école, ville, récit, liens, e-mail de contact, sponsors | Contrat | Jusqu'à suppression de la page |
| **Positions GPS** | lat/lon, vitesse, cap, altitude, précision, **batterie**, heure | **Consentement** de chaque membre (retirable : couper le suivi, supprimer la trace) | À décider : ex. 12 mois après la fin de l'édition puis suppression, sauf si l'équipage choisit de garder sa trace en souvenir |
| Photos | images (métadonnées GPS déjà supprimées ✅) | Contrat | Jusqu'à suppression |
| Favoris | équipages suivis | Contrat | Jusqu'à suppression du compte |
| E-mails de service | adresse, contenu | Contrat | Journal Brevo (durée Brevo) |
| Journaux techniques | adresse IP, requêtes | Intérêt légitime (sécurité) | À fixer (ex. 12 mois — voir 4.4) |
| Paiements (futur) | nom, e-mail, montant ; **pas la carte** | Contrat + obligation légale (comptabilité : **10 ans**) | 10 ans pour les pièces comptables |

### 4.2 La géolocalisation, point le plus surveillé

- Le téléphone localise **la voiture, donc tous ses occupants** : le consentement de celui qui installe l'application
  ne suffit pas. → Chaque membre accepte explicitement la géolocalisation (case à cocher à l'acceptation de l'invitation,
  horodatée) ; tant qu'un membre n'a pas accepté, la page affiche un avertissement.
- **Ne pas révéler les domiciles** : un équipage qui lance le suivi chez lui avant le départ publie son adresse.
  → Par défaut, ne rendre publiques que les positions **pendant les dates de l'événement** (ou à partir du village départ),
  ou proposer des zones masquées.
- **Délai d'affichage** (voir 1.4) : protège aussi contre les vols au bivouac.
- La **batterie** du téléphone est-elle utile à afficher ? Sinon, ne pas la stocker (minimisation).
- Analyse d'impact (AIPD) : probablement pas obligatoire à cette échelle, mais une courte analyse écrite sur le GPS est
  une bonne protection en cas de contrôle.

### 4.3 Sous-traitants et transferts hors UE

- **Cloudflare** (États-Unis) : voit passer tout le trafic → transfert couvert par le Data Privacy Framework UE–États-Unis
  (Cloudflare est certifié ; à vérifier sur dataprivacyframework.gov).
- **Brevo** (France) : envoi des e-mails.
- **Stripe** (futur ; Irlande / États-Unis).
- **Fonds de carte chargés directement par le navigateur du visiteur**, qui reçoivent donc son adresse IP :
  OpenFreeMap, Amazon S3 (relief), Esri (satellite). À mentionner, ou mieux : les servir depuis ton serveur
  (tuiles auto-hébergées PMTiles, déjà dans [IDEES.md](IDEES.md)).

### 4.4 Le reste

- **Cookies** : aucun, la session est dans le stockage local et est strictement nécessaire → **pas de bandeau** à
  afficher. À garder ainsi : pas de Google Analytics ; si besoin de statistiques, un outil auto-hébergé sans cookie.
- **Registre des traitements** : obligatoire en pratique ; modèle simplifié sur cnil.fr. Je peux le rédiger (docs/).
- **Violation de données** : notifier la CNIL sous 72 h si elle présente un risque → écrire une courte procédure.
- **Journaux et durée de conservation** : la loi (LCEN et décret n° 2021-1362) demande aux hébergeurs de contenus de
  garder de quoi identifier l'auteur d'un contenu (jusqu'à 1 an pour les IP, plus pour les données de compte), ce qui
  entre en tension avec « la suppression efface tout immédiatement ». Décision à prendre, idéalement avec un juriste.
- **Maroc** : les positions sont collectées au Maroc (loi marocaine 09-08) ; le traitement est fait en France par un
  responsable français, donc c'est le RGPD qui s'applique principalement. Risque faible.

---

## 5. Les contenus publiés par les équipages

TrophyTracker **héberge** des contenus qu'il n'écrit pas (photos, récits, logos de sponsors). Statut d'hébergeur (LCEN
art. 6 + DSA) : **pas responsable a priori, mais doit retirer promptement** un contenu manifestement illicite dès qu'on
le lui signale. Il faut donc :
- un **bouton ou lien « Signaler »** sur chaque page d'équipage et photo, et une adresse de contact ;
- un outil admin pour masquer/supprimer un contenu (en partie déjà là) ;
- dans les CGU : règles de contenu, droit à l'image, logos de sponsors sous la responsabilité de l'équipage.

---

## 6. Licences des cartes et ressources

| Ressource | Licence | Statut |
|---|---|---|
| OpenFreeMap / OpenMapTiles / OpenStreetMap | Libre, attribution obligatoire | ✅ attribution présente |
| Relief (Amazon S3, tuiles « terrarium ») | Données ouvertes, attribution demandée | ⚠️ ajouter l'attribution |
| **Esri World Imagery** (satellite de l'accueil) | Compte ArcGIS requis, **« not available for commercial use »** ([Esri](https://www.esri.com/en-us/legal/terms/web-site-service)) | ❌ **à remplacer avant le payant** (source satellite sous licence commerciale ou libre) |
| Polices (@fontsource) | SIL Open Font License | ✅ |
| Traccar Client | Application libre installée par l'équipage | ✅ rien à faire |

---

## 7. Sécurité, responsabilité, assurance

- Le site est déjà sérieux côté sécurité (RLS, double authentification, tests) : **c'est ce qu'on attend d'un
  responsable de traitement** ; documenter les sauvegardes (idée « sauvegarde externe chiffrée » à faire).
- Une coupure du serveur maison pendant le raid n'est pas une faute si les CGU disent « obligation de moyens » et si
  les CGV prévoient ce qui se passe (ex. remboursement au prorata au-delà de X heures d'indisponibilité).
  Attention : face à un consommateur, **on ne peut pas s'exonérer de toute responsabilité** (clause abusive) ; on peut
  seulement la limiter raisonnablement.
- **Assurance responsabilité civile professionnelle** : facultative pour ce type d'activité ; quelques centaines d'euros
  par an au plus, à comparer une fois le statut créé.

---

## 8. Plan d'action

**Décisions de Julien (2026-09-26)**
- Éditeur affiché : Julien Plomion, julien.plomion2006@gmail.com.
- **Pas de délai d'affichage** des positions : il retirerait l'intérêt du direct. À la place, **charte fair-play
  obligatoire** (idée de Julien) : l'équipage s'engage explicitement à ne pas utiliser le site pour s'orienter, à respecter
  le règlement, avec l'accord de tous ses membres ; preuve gardée en base. Le risque restant (l'organisation peut changer
  son règlement) ne se règle qu'en lui écrivant.
- Interface légale **discrète** : liens de pied de page et petites phrases sous les boutons, pas de bandeaux.
- Statut pour le payant (micro-entreprise ou association) : à trancher plus tard.
- Pas de copie du règlement complet.

**Maintenant (site gratuit)**
1. ~~Lire le règlement complet~~ : pas disponible, on fait sans.
2. ✅ Textes « officiel » / « la plateforme » corrigés (« parcours prévu », e-mail d'invitation).
3. ✅ Pages `/mentions-legales`, `/conditions-utilisation`, `/confidentialite` réécrite ; liens dans le pied de page,
   « Contact » et « Signaler un contenu » (e-mail pré-rempli) ; acceptation des CGU sous les boutons d'inscription et
   d'activation d'invitation.
4. ✅ **Charte fair-play** (migration `20260926000001_fair_play.sql`) : case à cocher obligatoire avant la première clé GPS,
   le serveur refuse la clé sans elle ; date, compte et nom affiché gardés dans `crew_devices` (preuve). Charte reprise
   dans les CGU (article 4, `#fair-play`) et sur l'accueil (« L'esprit du raid »). Texte unique dans `apps/web/src/lib/legal.ts`.
   Les équipages qui avaient déjà une clé continuent d'émettre et accepteront la charte à leur prochaine clé.
5. ~~Délai d'affichage~~ : remplacé par la charte (voir décisions).
6. Registre des traitements + procédure de violation de données (docs/) — à faire.
7. ✅ Attribution du relief. Remplacer Esri : avant le payant.
8. **Journaux Docker du serveur** : la politique de confidentialité annonce 12 mois au plus, or Docker ne les purge
   jamais par défaut → configurer la rotation (`/etc/docker/daemon.json` : `"log-driver": "local"` ou `json-file` avec
   `max-size`/`max-file`), commande sudo à lancer par Julien.
9. Adresse de l'hébergeur : les mentions légales donnent le nom et l'e-mail, pas l'adresse postale du serveur (le domicile).
   Tolérable pour un particulier ; à régler (domiciliation) quand le site deviendra professionnel.

**Passage au payant (décidé le 2026-09-27)** — mise en œuvre technique : [PAIEMENT.md](PAIEMENT.md)
- Accès équipage payé **avant de créer la page** : 15 € jusqu'au 30 novembre 2026 inclus, puis 19 €, paiement unique.
- Remboursement : **minimum légal** (rétractation 14 jours, au prorata du service fourni, art. L.221-25) ; les deux
  cases (CGV + demande d'exécution immédiate) sont exigées et horodatées avant le paiement.
- Équipages existants : offerts. Suivre reste gratuit. Coéquipiers invités : gratuits.
- ✅ Fait : page `/conditions-vente` (CGV + formulaire de rétractation), parcours d'achat, textes du site, mentions
  légales et confidentialité mises à jour, admin « Paiements ». En attente : SIRET, médiateur, adresse → `BUSINESS`
  dans `apps/web/src/lib/legal.ts` ; clés Stripe.

**Avant d'ouvrir le paiement**
8. **Écrire à l'organisation** (annexe A) et attendre la réponse.
9. Créer le **statut** (micro-entreprise ou association), choisir l'adresse publiée.
10. Adhérer à un **médiateur de la consommation**.
11. **CGV** + parcours de commande Stripe conforme + e-mail de confirmation + mise à jour de la FAQ « Combien ça coûte ? ».
12. Remplacer **Esri**.
13. Recherche d'antériorité et **dépôt de la marque** TrophyTracker.
14. Faire **relire** CGU/CGV/confidentialité par un juriste (gratuit, voir en tête).

---

## Annexe A — Modèle de message à l'organisation

> Objet : TrophyTracker — suivi GPS des équipages pour leurs proches
>
> Bonjour,
>
> Ancien participant du 4L Trophy (équipage J4L Club), j'ai développé TrophyTracker (https://trophytracker.fr),
> un site indépendant qui permet aux familles et sponsors d'un équipage de suivre sa position et ses photos pendant
> le raid, avec l'application gratuite Traccar Client sur un téléphone.
>
> Je tiens à ce que ce service respecte pleinement le règlement du raid et votre travail :
> - il n'utilise ni votre logo ni vos contenus, et indique clairement ne pas être affilié au 4L Trophy ;
> - il n'est pas un outil de navigation : l'application n'affiche aucune carte à l'équipage, et chaque équipage doit
>   accepter une charte fair-play avant d'activer le suivi (ne jamais s'en servir pour s'orienter, respecter votre
>   règlement et vos consignes) : https://trophytracker.fr/conditions-utilisation#fair-play
>
> Avant de le proposer plus largement, j'aimerais connaître votre position : l'utilisation d'un tel traceur par les
> équipages est-elle compatible avec le règlement ? Y a-t-il des conditions que vous souhaiteriez que je respecte ?
> Je serais aussi ravi d'en discuter si une collaboration vous intéresse.
>
> Bien cordialement,
> Julien [NOM]

(À envoyer à contact@4ltrophy.com, par écrit pour garder une trace de la réponse. Ne pas mentionner le prix tant que
la réponse n'est pas arrivée ? À toi de voir : être transparent dès le départ évite d'avoir l'air de le cacher.)

---

## Sources

- 4L Trophy : [mentions légales](https://www.4ltrophy.com/fr/mentions-legales), [FAQ](https://www.4ltrophy.com/fr/faq),
  [organisation](https://www.4ltrophy.com/fr/organisation), [données personnelles](https://www.4ltrophy.com/fr/donnees-personnelles),
  [partenaires](https://www.4ltrophy.com/fr/partenaires), [pré-inscription](https://www.4ltrophy.com/fr/pre-inscription),
  [accueil (dates 2027)](https://www.4ltrophy.com/fr)
- Code de la consommation, [section rétractation (L221-18 à L221-28)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032221365/)
- Médiation de la consommation : [portail-autoentrepreneur.fr](https://www.portail-autoentrepreneur.fr/academie/creation-auto-entreprise/mediation-consommation),
  [donneespersonnelles.fr](https://www.donneespersonnelles.fr/mediation-consommation)
- Franchise de TVA 2026 (37 500 € pour les services, seuil unique de 25 000 € abandonné) :
  [CMA Nouvelle-Aquitaine](https://cma-nouvelleaquitaine.fr/ressources/seuil-micro-entreprise), [Comptabook](https://comptabook.fr/tva/seuil-franchise-tva-2026/)
- Vendre en ligne sans statut : [Wise](https://wise.com/fr/blog/doit-on-creer-une-entreprise-pour-vendre-en-ligne),
  [portail-autoentrepreneur.fr](https://www.portail-autoentrepreneur.fr/academie/developpement/ecommerce/vente-en-ligne)
- Esri : [conditions d'utilisation](https://www.esri.com/en-us/legal/terms/web-site-service),
  [forum Esri sur l'usage commercial](https://community.esri.com/t5/arcgis-living-atlas-questions/use-of-basemaps-for-commercial-purposes/td-p/1344183)
