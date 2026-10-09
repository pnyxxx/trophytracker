import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/common/LegalPage';
import { CONTACT_HREF, EDITOR } from '@/lib/legal';
import { PAGES } from '@/lib/seo-pages';

export default function PrivacyPage() {
  return (
    <LegalPage
      seoTitle={PAGES['/confidentialite'].title}
      title={<>Confidentialité<br />& données</>}
      intro="trophytracker est un projet indépendant. Nous collectons le strict minimum, ne vendons aucune donnée et n’affichons aucune publicité."
    >
      <h2>Qui est responsable</h2>
      <p>
        {EDITOR.name}, éditeur du site, est responsable du traitement de tes données. Pour toute question ou demande :{' '}
        <a href={CONTACT_HREF}>{EDITOR.email}</a>.
      </p>

      <h2>Ce que nous stockons, et pourquoi</h2>
      <h3>Ton compte</h3>
      <p>
        E-mail, prénom affiché et, si tu l’actives, la double authentification. Pas de mot de passe : tu te connectes avec un code à usage unique envoyé par e-mail.
        Ils servent à te connecter et à t’envoyer les e-mails liés à ton compte. <em>Base légale : l’exécution du service
        (conditions d’utilisation). Conservation : jusqu’à la suppression du compte.</em>
      </p>
      <h3>Les road trips que tu suis</h3>
      <p>
        La liste des road trips que tu suis, visible par toi seul. <em>Base légale : l’exécution du service. Conservation : jusqu’à
        la suppression du compte.</em>
      </p>
      <h3>Les e-mails aux proches</h3>
      <p>
        Si tu suis un road trip avec un compte, ou si un voyageur t’invite par e-mail, nous gardons ton adresse pour
        t’envoyer l’invitation, un e-mail « C’est parti » au départ et un résumé chaque soir de route. Chaque e-mail contient un lien
        pour ne plus rien recevoir, en un clic et sans compte ; les voyageurs voient la liste des adresses qu’ils ont invitées et
        peuvent les retirer. <em>Base légale : notre intérêt légitime à prévenir les proches qui suivent un voyage, à la demande des
        voyageurs. Conservation : jusqu’à la désinscription, ou la suppression de la page du road trip.</em>
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
          Conseil : lance le suivi une fois parti de chez toi et arrête-le au retour, pour ne pas révéler ton domicile.
        </li>
      </ul>
      <p>
        <em>Base légale : le consentement des membres du road trip. Conservation : jusqu’à ce que les voyageurs suppriment leur trace ou
        sa page.</em>
      </p>
      <h3>Les photos</h3>
      <p>
        Elles sont compressées sur ton appareil avant l’envoi et le fichier publié ne garde aucune métadonnée. Pour placer une
        photo sur la carte, le site lit sur ton appareil sa date et sa position de prise de vue (ou la retrouve grâce à la trace du
        road trip) : seule la position que les voyageurs valident est publiée, et ils peuvent la retirer à tout moment.{' '}
        <em>Conservation : jusqu’à leur suppression par les voyageurs.</em>
      </p>
      <h3>Les achats</h3>
      <p>
        Pour l’accès road trip : compte acheteur, email, montant, date, statut du paiement, road trip créé et date d’acceptation des
        conditions de vente. Le paiement lui-même est traité par Stripe : nous ne voyons jamais tes coordonnées bancaires.
        <em> Base légale : l’exécution du contrat et nos obligations comptables. Conservation : 10 ans (pièces comptables), même
        si le compte est supprimé.</em>
      </p>
      <h3>Les journaux techniques</h3>
      <p>
        Comme tout site, le serveur enregistre des journaux (adresse IP, date, page demandée, erreurs) pour assurer la sécurité et
        corriger les pannes. <em>Base légale : notre intérêt légitime à protéger le service. Conservation : 12 mois au plus.</em>
      </p>

      <h2>Qui peut y accéder</h2>
      <p>Personne n’achète ni ne reçoit tes données à des fins commerciales. Seuls y ont accès, pour faire fonctionner le site :</p>
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
          paiement ; ses transferts hors de l’Union européenne sont encadrés par le Data Privacy Framework et des clauses types.
        </li>
      </ul>
      <p>
        Pour afficher les cartes, ton navigateur télécharge directement des images auprès d’
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>, d’Esri (imagerie satellite), de l’IGN (quelques vues aériennes) et
        d’Amazon Web Services (relief), qui voient donc ton adresse IP, comme pour n’importe quelle carte en ligne. Quand un
        voyageur cherche une adresse (sponsor, lieu d’une photo), le texte tapé ou la position à nommer est envoyé à{' '}
        <a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer">Photon</a> (komoot, Allemagne), un service de
        recherche d’adresses basé sur OpenStreetMap. Pour afficher la météo sur la page d’un road trip, ton navigateur envoie
        la dernière position du road trip, arrondie à environ 1 km, à{' '}
        <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a> (Suisse), un service météo
        gratuit et sans compte. Quand un voyageur demande un brouillon de journal de bord, les faits de la journée (kilomètres,
        heures, altitudes, noms des étapes et des photos, notes) sont envoyés à Anthropic (États-Unis), qui fournit l’IA Claude, le
        temps de rédiger le texte ; le voyageur le relit avant toute publication.
      </p>

      <h2>Cookies</h2>
      <p>
        Aucun cookie publicitaire, aucun traceur, aucun outil de statistiques tiers. Ton navigateur garde seulement ce qui sert au
        service : ta session de connexion, le brouillon d’un road trip en cours de création, le prénom que tu as mis sur un mur
        d’encouragements et quelques préférences d’affichage. Pour le rapport des voyageurs à leurs sponsors, la page d’un road trip
        compte ses visites de façon anonyme : un simple nombre par jour, sans cookie, sans adresse IP ni identifiant (ton navigateur
        note seulement qu’il a déjà compté sa visite du jour). Rien de tout cela ne demande de bandeau de consentement.
      </p>

      <h2>Sécurité</h2>
      <p>
        Connexion chiffrée (HTTPS), connexion par code à usage unique (pas de mot de passe à voler), double authentification disponible, droits d’accès vérifiés par la base de
        données elle-même, clé GPS secrète par road trip. En cas de fuite de données présentant un risque, la CNIL et les personnes
        concernées seront prévenues comme la loi le prévoit.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux accéder à tes données, les corriger, les supprimer, les récupérer, t’opposer à leur traitement ou retirer ton
        consentement. La plupart se fait directement depuis « Mon compte » : la suppression du compte efface immédiatement tes données.
        Un road trip peut supprimer sa page et ses photos, et effacer sa trace GPS (onglet GPS). Pour le reste, écris à{' '}
        <a href={CONTACT_HREF}>{EDITOR.email}</a> : réponse sous un mois au plus.
      </p>
      <p>
        Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la{' '}
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">CNIL</a>.
      </p>

      <h2>Âge minimum</h2>
      <p>
        Il faut avoir au moins 15 ans pour créer un compte (voir les <Link to="/conditions-utilisation">conditions d’utilisation</Link>).
      </p>
    </LegalPage>
  );
}
