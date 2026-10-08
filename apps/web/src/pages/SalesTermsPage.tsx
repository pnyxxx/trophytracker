import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/common/LegalPage';
import { BUSINESS, CONTACT_HREF, EDITOR, euros, PRICING, VAT_MENTION } from '@/lib/legal';
import { PAGES } from '@/lib/seo-pages';

export default function SalesTermsPage() {
  return (
    <LegalPage
      seoTitle={PAGES['/conditions-vente'].title}
      title={<>Conditions<br />de vente</>}
      intro="Suivre un road trip est gratuit. Ces conditions s’appliquent à l’achat d’un accès road trip, qui permet de créer la page d’un road trip."
    >
      <h2>1. Le vendeur</h2>
      <p>
        {EDITOR.name}, {BUSINESS.status.toLowerCase()}
        {BUSINESS.siret ? <>, SIRET {BUSINESS.siret}</> : <> (immatriculation en cours)</>}
        {BUSINESS.address && <>, {BUSINESS.address}</>}. Contact : <a href={CONTACT_HREF}>{EDITOR.email}</a>.
      </p>
      <p>trophytracker est un service indépendant, affilié à aucun organisateur de raid, de rallye ou d’événement.</p>

      <h2>2. Ce que vous achetez</h2>
      <p>
        L’<strong>accès road trip</strong> permet de créer <strong>la page d’un road trip</strong> sur trophytracker et d’utiliser ses
        services : page publique ou privée, suivi GPS en direct avec l’application gratuite Traccar Client, trace et statistiques,
        photos et photos 360°, sponsors, invitation des compagnons de route (gratuite pour eux).
      </p>
      <ul>
        <li>Un accès = une page de road trip. Il est lié au compte qui l’achète, qui devient propriétaire de la page.</li>
        <li>
          Le service est fourni pendant toute la durée du road trip. La page reste ensuite consultable en souvenir, tant que
          trophytracker existe.
        </li>
        <li>
          Le suivi GPS est soumis à la <Link to="/conditions-utilisation#fair-play">charte fair-play</Link> et aux{' '}
          <Link to="/conditions-utilisation">conditions d’utilisation</Link>, qui font partie du contrat.
        </li>
      </ul>

      <h2>3. Prix</h2>
      <ul>
        <li>
          <strong>{euros(PRICING.launchCents)} TTC</strong> pour toute commande passée jusqu’au {PRICING.launchLastDay} inclus
          (heure de Paris), tarif de lancement ;
        </li>
        <li><strong>{euros(PRICING.regularCents)} TTC</strong> à partir du 1er décembre 2026.</li>
      </ul>
      <p>
        {VAT_MENTION}. Le prix applicable est celui affiché au moment de la commande. <strong>Paiement unique</strong> : pas
        d’abonnement, aucun prélèvement ultérieur.
      </p>

      <h2>4. Commande</h2>
      <p>
        La commande se passe depuis « Mon compte », connecté à un compte trophytracker. Avant de payer, vous acceptez ces conditions et
        demandez l’accès immédiat au service (article 7), puis vous êtes redirigé vers la page de paiement sécurisée. Le contrat est
        conclu dès que le paiement est accepté. Vous recevez une confirmation par email, et ces conditions restent disponibles sur
        cette page. Les commandes sont archivées pendant 10 ans.
      </p>

      <h2>5. Paiement</h2>
      <p>
        Le paiement se fait par carte bancaire via <strong>Stripe</strong>, prestataire de paiement agréé. trophytracker ne voit ni ne
        conserve jamais vos coordonnées bancaires. Le montant est débité au moment de la commande.
      </p>

      <h2>6. Accès au service</h2>
      <p>
        L’accès est disponible dès la confirmation du paiement : vous pouvez créer la page de votre road trip depuis « Mon compte ». En
        cas de problème, écrivez à <a href={CONTACT_HREF}>{EDITOR.email}</a>.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        Vous disposez de <strong>14 jours</strong> à compter de la commande pour vous rétracter, sans avoir à vous justifier.
      </p>
      <p>
        En commandant, vous demandez expressément que le service commence immédiatement. Si vous vous rétractez ensuite, vous payez
        la part du service déjà fournie jusqu’à votre demande (article L.221-25 du Code de la consommation), calculée au prorata du
        temps écoulé entre la commande et la fin du road trip ; le reste vous est remboursé.
      </p>
      <p>
        Pour vous rétracter, envoyez une déclaration claire à <a href={CONTACT_HREF}>{EDITOR.email}</a>, par exemple avec le modèle
        ci-dessous. Le remboursement est fait sous 14 jours, sur la carte utilisée pour le paiement. La page du road trip est alors
        dépubliée et le suivi GPS désactivé.
      </p>

      <h2>8. Garantie légale de conformité</h2>
      <p>
        Le service bénéficie de la garantie légale de conformité des contenus et services numériques (articles L.224-25-1 et suivants
        du Code de la consommation). Si le service n’est pas conforme, écrivez-nous : nous le remettrons en conformité et, à défaut,
        vous pourrez obtenir une réduction du prix ou la résolution du contrat.
      </p>
      <p>
        Le suivi GPS dépend du téléphone du road trip et des réseaux mobiles : une position retardée dans une zone sans réseau n’est
        pas un défaut du service (voir les <Link to="/conditions-utilisation">conditions d’utilisation</Link>).
      </p>

      <h2>9. Données personnelles</h2>
      <p>
        Les données de la commande (compte, email, montant, date) sont traitées comme expliqué dans la page{' '}
        <Link to="/confidentialite">Confidentialité & données</Link>.
      </p>

      <h2>10. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation, écrivez d’abord à <a href={CONTACT_HREF}>{EDITOR.email}</a> : nous répondons rapidement.
      </p>
      <p>
        Si le désaccord persiste, vous pouvez recourir gratuitement au médiateur de la consommation
        {BUSINESS.mediator ? (
          <>
            {' '}: <a href={BUSINESS.mediator.url} target="_blank" rel="noopener noreferrer">{BUSINESS.mediator.name}</a>
            {BUSINESS.mediator.address && <>, {BUSINESS.mediator.address}</>}.
          </>
        ) : (
          <> dont les coordonnées seront indiquées ici à l’ouverture des ventes.</>
        )}
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit français. En cas de litige, vous pouvez saisir le tribunal de votre domicile ou celui du
        vendeur.
      </p>

      <h2>Modèle de formulaire de rétractation</h2>
      <p>
        À envoyer à {EDITOR.name}, <a href={CONTACT_HREF}>{EDITOR.email}</a> :
      </p>
      <p className="border-l-[3px] border-cream/20 pl-5 text-base">
        Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous : accès road trip
        trophytracker.
        <br />Commandé le : …
        <br />Nom du consommateur : …
        <br />Adresse email du compte : …
        <br />Date : …
      </p>
    </LegalPage>
  );
}
