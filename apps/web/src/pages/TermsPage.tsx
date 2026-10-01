import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/common/LegalPage';
import { CONTACT_HREF, EDITOR, FAIR_PLAY, REPORT_HREF } from '@/lib/legal';
import { PAGES } from '@/lib/seo-pages';

export default function TermsPage() {
  return (
    <LegalPage
      seoTitle={PAGES['/conditions-utilisation'].title}
      title={<>Conditions<br />d’utilisation</>}
      intro="Les règles du jeu, en clair. En créant un compte ou la page d’un équipage, vous les acceptez."
    >
      <h2>1. Le service</h2>
      <p>
        TrophyTracker permet aux équipages d’un raid comme le 4L Trophy de créer une page, de partager leur position GPS, leur trace,
        leurs photos et leurs sponsors, et à leurs proches de les suivre. Le site est édité par {EDITOR.name} (voir les{' '}
        <Link to="/mentions-legales">mentions légales</Link>).
      </p>
      <p>
        C’est un <strong>projet indépendant</strong> : il n’est ni organisé, ni soutenu, ni validé par l’organisation du 4L Trophy.
      </p>
      <p>
        <strong>Suivre un équipage est gratuit.</strong> Créer la page d’un équipage demande l’achat d’un accès équipage (paiement
        unique), régi par les <Link to="/conditions-vente">conditions de vente</Link>. Les coéquipiers invités n’ont rien à payer.
      </p>

      <h2>2. Votre compte</h2>
      <ul>
        <li>Il faut avoir au moins <strong>15 ans</strong> pour créer un compte, et <strong>18 ans</strong> pour créer ou gérer la page d’un équipage.</li>
        <li>Vous donnez des informations exactes et gardez votre mot de passe secret. Vous êtes responsable de ce qui est fait depuis votre compte.</li>
        <li>Vous pouvez supprimer votre compte à tout moment depuis « Mon compte ».</li>
      </ul>

      <h2>3. Les équipages</h2>
      <p>La personne qui crée ou gère la page d’un équipage s’engage à :</p>
      <ul>
        <li>faire partie de cet équipage ;</li>
        <li>
          avoir l’<strong>accord de chaque membre</strong> avant d’activer le suivi GPS : le téléphone localise la voiture, donc tous
          ses occupants ;
        </li>
        <li>choisir la visibilité de la page (publique ou privée) en connaissance de cause.</li>
      </ul>

      <h2 id="fair-play" className="scroll-mt-24">4. Charte fair-play</h2>
      <p>{FAIR_PLAY.spirit}</p>
      <p>
        Avant de générer la clé GPS de son équipage, un membre accepte cette charte au nom de tout l’équipage ; la date et l’auteur
        de l’acceptation sont conservés. L’équipage s’engage :
      </p>
      <ul>
        {FAIR_PLAY.rules.map((r) => (
          <li key={r.title}><strong>{r.title}.</strong> {r.text}</li>
        ))}
      </ul>
      <p>
        Chaque équipage est <strong>seul responsable</strong> du respect du règlement de son épreuve et de l’usage qu’il fait de ce
        site pendant la course. Un équipage qui utiliserait TrophyTracker pour s’orienter le ferait en violation de ces conditions,
        et son accès au suivi peut être désactivé.
      </p>
      <p>
        Une page publique montre la position à tout le monde : pensez à lancer le suivi une fois partis de chez vous et à l’arrêter
        après le raid.
      </p>

      <h2>5. Ce que vous publiez</h2>
      <p>Vous restez propriétaire de vos textes et photos. Vous nous autorisez simplement à les stocker et à les afficher pour faire fonctionner le service, tant qu’ils sont en ligne.</p>
      <p>Vous ne publiez que ce que vous avez le droit de publier :</p>
      <ul>
        <li>vos propres photos, ou celles dont l’auteur est d’accord ;</li>
        <li>
          pas de <strong>personne reconnaissable sans son accord</strong>, et jamais d’enfant sans l’accord de ses parents, y compris
          pendant la traversée de l’Espagne et du Maroc ;
        </li>
        <li>les logos de vos sponsors avec leur autorisation ;</li>
        <li>
          rien d’illégal, d’insultant, de haineux, de violent, de pornographique ou de trompeur, ni de publicité sans rapport avec
          votre équipage.
        </li>
      </ul>

      <h2>6. Signaler un contenu</h2>
      <p>
        Un contenu vous semble illégal ou contraire à ces règles ? <a href={REPORT_HREF}>Signalez-le par email</a> en indiquant
        l’adresse de la page ou de la photo et la raison. Chaque signalement est examiné rapidement. Un contenu peut être retiré et un
        compte suspendu en cas de manquement ; la personne concernée en est informée avec la raison et peut contester en répondant
        à ce message.
      </p>

      <h2>7. Disponibilité</h2>
      <p>
        Le site est maintenu avec soin mais sans garantie de disponibilité permanente : maintenance, panne ou coupure réseau peuvent
        l’interrompre. TrophyTracker fait de son mieux pour que le service fonctionne, surtout pendant le raid, sans pouvoir le promettre.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Chaque équipage est responsable de sa page et de ce qu’il publie. TrophyTracker, en tant qu’hébergeur, retire les contenus
        manifestement illicites dès qu’il en a connaissance. Dans les limites prévues par la loi, TrophyTracker ne peut être tenu
        responsable d’une position manquante, retardée ou inexacte, ni des conséquences d’une interruption du service.
      </p>

      <h2>9. Changements</h2>
      <p>
        Ces conditions peuvent évoluer avec le service. En cas de changement important, les utilisateurs inscrits sont prévenus par
        email avant qu’il s’applique.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit français. En cas de désaccord, écrivez d’abord à <a href={CONTACT_HREF}>{EDITOR.email}</a> :
        nous chercherons une solution à l’amiable avant tout recours.
      </p>
    </LegalPage>
  );
}
