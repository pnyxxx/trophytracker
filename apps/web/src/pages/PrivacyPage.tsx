import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/common/LegalPage';
import { CONTACT_HREF, EDITOR } from '@/lib/legal';
import { PAGES } from '@/lib/seo-pages';

export default function PrivacyPage() {
  return (
    <LegalPage
      seoTitle={PAGES['/confidentialite'].title}
      title={<>Confidentialité<br />& données</>}
      intro="TrophyTracker est un projet indépendant. Nous collectons le strict minimum, ne vendons aucune donnée et n’affichons aucune publicité."
    >
      <h2>Qui est responsable</h2>
      <p>
        {EDITOR.name}, éditeur du site, est responsable du traitement de vos données. Pour toute question ou demande :{' '}
        <a href={CONTACT_HREF}>{EDITOR.email}</a>.
      </p>

      <h2>Ce que nous stockons, et pourquoi</h2>
      <h3>Votre compte</h3>
      <p>
        Email, nom affiché, mot de passe (chiffré, jamais lisible, même par nous) et, si vous l’activez, la double authentification.
        Ils servent à vous connecter et à vous envoyer les emails liés à votre compte. <em>Base légale : l’exécution du service
        (conditions d’utilisation). Conservation : jusqu’à la suppression du compte.</em>
      </p>
      <h3>Vos favoris</h3>
      <p>
        La liste des road trips que vous suivez, visible par vous seul. <em>Base légale : l’exécution du service. Conservation : jusqu’à
        la suppression du compte.</em>
      </p>
      <h3>Les pages de road trip</h3>
      <p>
        Nom du road trip, présentation, école, ville, liens, email de contact, photos et sponsors, tels que les voyageurs les saisissent.
        <em> Base légale : l’exécution du service. Conservation : jusqu’à la suppression de la page par les voyageurs.</em>
      </p>
      <h3>Les positions GPS</h3>
      <p>
        Position, heure, vitesse, cap, altitude, précision et niveau de batterie envoyés par le téléphone du road trip. Ils servent à
        afficher la carte, la trace et les statistiques.
      </p>
      <ul>
        <li>
          Elles ne sont collectées que lorsqu’un membre du road trip <strong>active volontairement</strong> le suivi, avec l’accord de
          tous les membres (le téléphone localise la voiture et donc tous ses occupants). Chacun peut retirer son accord à tout moment :
          les voyageurs coupent alors le suivi et peuvent supprimer la trace.
        </li>
        <li>
          Tant que les voyageurs n’ont pas lancé le suivi sur le site (mode essai), seule la dernière position reçue est gardée, visible de
          ses seuls membres, pour vérifier que le téléphone fonctionne. Le suivi se lance automatiquement le jour du départ
          prévu, sauf si les voyageurs l’ont arrêté eux-mêmes.
        </li>
        <li>
          Elles sont visibles par tous si la page du road trip est publique, et uniquement par ses membres si elle est privée.
        </li>
        <li>
          Conseil : lancez le suivi une fois partis de chez vous et arrêtez-le au retour, pour ne pas révéler votre domicile.
        </li>
      </ul>
      <p>
        <em>Base légale : le consentement des membres du road trip. Conservation : jusqu’à ce que les voyageurs suppriment leur trace ou
        sa page.</em>
      </p>
      <h3>Les photos</h3>
      <p>
        Elles sont compressées sur votre appareil avant l’envoi et le fichier publié ne garde aucune métadonnée. Pour placer une
        photo sur la carte, le site lit sur votre appareil sa date et sa position de prise de vue (ou la retrouve grâce à la trace du
        road trip) : seule la position que les voyageurs valident est publiée, et ils peuvent la retirer à tout moment.{' '}
        <em>Conservation : jusqu’à leur suppression par les voyageurs.</em>
      </p>
      <h3>Les achats</h3>
      <p>
        Pour l’accès road trip : compte acheteur, email, montant, date, statut du paiement, road trip créé et date d’acceptation des
        conditions de vente. Le paiement lui-même est traité par Stripe : nous ne voyons jamais vos coordonnées bancaires.
        <em> Base légale : l’exécution du contrat et nos obligations comptables. Conservation : 10 ans (pièces comptables), même
        si le compte est supprimé.</em>
      </p>
      <h3>Les journaux techniques</h3>
      <p>
        Comme tout site, le serveur enregistre des journaux (adresse IP, date, page demandée, erreurs) pour assurer la sécurité et
        corriger les pannes. <em>Base légale : notre intérêt légitime à protéger le service. Conservation : 12 mois au plus.</em>
      </p>

      <h2>Qui peut y accéder</h2>
      <p>Personne n’achète ni ne reçoit vos données à des fins commerciales. Seuls y ont accès, pour faire fonctionner le site :</p>
      <ul>
        <li>
          l’éditeur du site, qui reçoit un email à chaque nouveau compte et à chaque nouvel abonnement (nom affiché, email du
          compte, road trip suivi) pour suivre l’activité du service ; ces notifications sont effacées après 30 jours ;
        </li>
        <li>
          <strong>Cloudflare</strong> (États-Unis), par qui passe le trafic du site pour le protéger. Ce transfert hors de l’Union
          européenne est encadré par le Data Privacy Framework UE–États-Unis ;
        </li>
        <li><strong>Brevo</strong> (France), qui envoie les emails ;</li>
        <li>
          <strong>Stripe</strong> (Irlande et États-Unis), qui traite les paiements de l’accès road trip, en tant que prestataire de
          paiement ; ses transferts hors de l’Union européenne sont encadrés par le Data Privacy Framework et des clauses types ;
        </li>
        <li><strong>Google</strong>, uniquement si vous choisissez de vous connecter avec votre compte Google.</li>
      </ul>
      <p>
        Pour afficher les cartes, votre navigateur télécharge directement des images auprès d’
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>, de l’IGN et d’Esri (imagerie satellite) et
        d’Amazon Web Services (relief), qui voient donc votre adresse IP, comme pour n’importe quelle carte en ligne. Quand un
        voyageur cherche une adresse (sponsor, lieu d’une photo), le texte tapé ou la position à nommer est envoyé à{' '}
        <a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer">Photon</a> (komoot, Allemagne), un service de
        recherche d’adresses basé sur OpenStreetMap. Pour afficher la météo sur la page d’un road trip, votre navigateur envoie
        la dernière position du road trip, arrondie à environ 1 km, à{' '}
        <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a> (Suisse), un service météo
        gratuit et sans compte.
      </p>

      <h2>Cookies</h2>
      <p>
        Aucun cookie publicitaire, aucune mesure d’audience, aucun traceur. Seule votre session de connexion est conservée dans votre
        navigateur, parce qu’elle est indispensable pour rester connecté : elle ne demande donc pas de bandeau de consentement.
      </p>

      <h2>Sécurité</h2>
      <p>
        Connexion chiffrée (HTTPS), mots de passe chiffrés, double authentification disponible, droits d’accès vérifiés par la base de
        données elle-même, clé GPS secrète par road trip. En cas de fuite de données présentant un risque, la CNIL et les personnes
        concernées seront prévenues comme la loi le prévoit.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez accéder à vos données, les corriger, les supprimer, les récupérer, vous opposer à leur traitement ou retirer votre
        consentement. La plupart se fait directement depuis « Mon compte » : la suppression du compte efface immédiatement vos données.
        Un road trip peut supprimer sa page et ses photos, et effacer sa trace GPS (onglet GPS). Pour le reste, écrivez à{' '}
        <a href={CONTACT_HREF}>{EDITOR.email}</a> : réponse sous un mois au plus.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la{' '}
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">CNIL</a>.
      </p>

      <h2>Âge minimum</h2>
      <p>
        Il faut avoir au moins 15 ans pour créer un compte (voir les <Link to="/conditions-utilisation">conditions d’utilisation</Link>).
      </p>
    </LegalPage>
  );
}
