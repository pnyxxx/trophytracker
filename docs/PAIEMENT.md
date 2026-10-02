# Paiement de l'accès équipage (Stripe)

Suivre un équipage est gratuit. **Créer la page d'un équipage** demande un accès payé une fois :
**15 € jusqu'au 30 novembre 2026 inclus, puis 19 €** (TTC, TVA non applicable, art. 293 B du CGI).

Tant que les clés Stripe ne sont pas configurées, le site affiche le prix et « Paiement bientôt disponible » ;
un admin peut offrir des accès (Administration → Paiements).

## Comment ça marche

```
Mon compte ── cases CGV + accès immédiat ──► Edge Function create-checkout
                                              │ purchase_start (achat « en attente », prix calculé par la base)
                                              ▼
                                   page de paiement Stripe Checkout
                                              │
Stripe ── événement signé ──► Edge Function stripe-webhook ── purchase_paid ──► accès payé
                                                                                  │
Mon compte (?paiement=ok) ── « Créer mon équipage » ── create_crew (consomme l'accès)
```

- Table `crew_purchases` (migration `20260927000001_paid_crews.sql`) : un achat = une page d'équipage.
  Le navigateur ne peut que lire ses propres achats ; tout le reste passe par les fonctions.
- Le prix est dans `private.crew_price_at()` (base) **et** `PRICING` dans `apps/web/src/lib/legal.ts` (affichage) :
  **modifier les deux ensemble**.
- Remboursement total depuis Stripe → la page de l'équipage est dépubliée et sa clé GPS désactivée (automatique).
  Remboursement partiel (rétractation au prorata) → seulement noté : dépublier la page à la main si besoin.
- Les équipages créés avant le passage au payant sont offerts ; les admins peuvent créer un équipage sans payer.

## Codes promo (offrir un ou plusieurs accès)

Gérés entièrement par Stripe : *Catalogue de produits → Coupons → Créer un coupon*.
- **Offrir l'accès** : pourcentage de réduction **100 %**. Pour une simple réduction : un pourcentage ou un montant (ex. 5 €).
- Cocher **« Utiliser des codes promotionnels destinés aux clients »** et choisir le code (ex. `J4L-OFFERT`).
- **Nombre d'accès offerts** : « Limiter le nombre d'utilisations » (ex. 3 → trois équipages). Date limite possible.

Le client saisit le code sur la page de paiement Stripe. Avec 100 %, la commande est à 0 € (aucune carte demandée) et
l'accès est débloqué comme un paiement (statut Stripe `no_payment_required`). Les commandes gratuites apparaissent dans
*Administration → Paiements* (« Code promo (0 €) ») et dans l'onglet « Commandes gratuites » du Dashboard Stripe.
Pour un seul ami, *Administration → Paiements → Offrir un accès* (par email) reste plus direct.

## Mise en route (quand le SIRET est là)

1. **Compte Stripe** sur stripe.com, en tant qu'entrepreneur individuel, avec le SIRET et un compte bancaire.
   Dans *Paramètres → Informations publiques* : nom « TrophyTracker », email de contact, site
   `https://trophytracker.fr`, et **conditions d'utilisation** = `https://trophytracker.fr/conditions-vente`.
2. *Paramètres → Emails clients* : activer les **reçus pour les paiements réussis** (c'est la confirmation de commande
   envoyée au client ; ajouter le lien des CGV dans le pied de page du reçu).
3. **Clé secrète** : *Développeurs → Clés API* → « Clé secrète » (`sk_live_…`).
4. **Webhook** : *Développeurs → Webhooks → Ajouter une destination*
   - URL : `https://trophytracker.fr/functions/v1/stripe-webhook`
   - événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.expired`, `charge.refunded`
   - copier le **secret de signature** (`whsec_…`).
5. Sur le serveur, dans `~/services/trophytracker/.env` :
   ```
   STRIPE_SECRET_KEY=sk_live_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   ```
   puis `docker compose up -d functions web` (le site détecte la clé et ouvre le paiement).
6. Compléter `BUSINESS` dans `apps/web/src/lib/legal.ts` (SIRET, adresse, médiateur), commit, déploiement.
7. Faire un achat réel de 15 € puis se le rembourser depuis Stripe pour vérifier toute la chaîne.

**Tester avant d'avoir le SIRET** : un compte Stripe fonctionne tout de suite en **mode test**, sans SIRET. Mettre les
clés `sk_test_…` / `whsec_…` du mode test dans le `.env` local, et payer avec la carte `4242 4242 4242 4242`
(date future, n'importe quel code). Pour que Stripe joigne le webhook en local : `stripe listen --forward-to
localhost:8088/functions/v1/stripe-webhook` (Stripe CLI), qui affiche le `whsec_…` à utiliser.

## Obligations à remplir avant d'ouvrir les ventes

Détail dans [JURIDIQUE.md](JURIDIQUE.md) :
- immatriculation (SIRET) → mentions légales et CGV ;
- **adhésion à un médiateur de la consommation** → son nom dans les CGV (`BUSINESS.mediator`) ;
- tenir le **livre des recettes** (obligatoire en micro-entreprise) : l'onglet Administration → Paiements et
  l'export Stripe suffisent comme base ;
- déclarer le chiffre d'affaires à l'URSSAF (mensuel ou trimestriel).
