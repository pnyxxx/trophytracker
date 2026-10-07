import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/common/LegalPage';
import { CONTACT_HREF, EDITOR, FAIR_PLAY, REPORT_HREF } from '@/lib/legal';
import { PAGES } from '@/lib/seo-pages';

export default function TermsPage() {
  return (
    <LegalPage
      seoTitle={PAGES['/conditions-utilisation'].title}
      title={<>Conditions<br />d’utilisation</>}
      intro="Les règles du jeu, en clair. En créant un compte ou la page d’un road trip, vous les acceptez."
    >
      <h2>1. Le service</h2>
      <p>
        TrophyTracker permet aux voyageurs (road trip, raid, rallye, tour du monde…) de créer la page de leur road trip, de partager
        leur position GPS, leur trace, leurs photos et leurs sponsors, et à leurs proches de les suivre. Le site est édité par {EDITOR.name} (voir les{' '}
        <Link to="/mentions-legales">mentions légales</Link>).
      </p>
      <p>
        C’est un <strong>projet indépendant</strong> : il n’est affilié à aucun organisateur de raid, de rallye ou d’événement, et aucun organisateur ne le soutient ni ne le valide.
      </p>
      <p>
        <strong>Suivre un road trip est gratuit.</strong> Créer la page d’un road trip demande l’achat d’un accès (paiement unique), régi
        par les <Link to="/conditions-vente">conditions de vente</Link>. Les compagnons de route invités n’ont rien à payer.
      </p>

      <h2>2. Votre compte</h2>
      <ul>
        <li>Il faut avoir au moins <strong>15 ans</strong> pour créer un compte, et <strong>18 ans</strong> pour créer ou gérer la page d’un road trip.</li>
        <li>Vous donnez des informations exactes et gardez votre mot de passe secret. Vous êtes responsable de ce qui est fait depuis votre compte.</li>
        <li>Vous pouvez supprimer votre compte à tout moment depuis « Mon compte ».</li>
      </ul>

      <h2>3. Les road trips</h2>
      <p>La personne qui crée ou gère la page d’un road trip s’engage à :</p>
      <ul>
        <li>faire partie de ce road trip ;</li>
        <li>
          avoir l’<strong>accord de chaque voyageur</strong> avant d’activer le suivi GPS : le téléphone localise le véhicule, donc
          tous ses occupants ;
        </li>
        <li>choisir la visibilité de la page (publique ou privée) en connaissance de cause.</li>
      </ul>

      <h2 id="fair-play" className="scroll-mt-24">4. Charte du voyageur</h2>
      <p>{FAIR_PLAY.spirit}</p>
      <p>
        Avant de générer la clé GPS de son road trip, un voyageur accepte cette charte et ces conditions au nom de tous ; la date et
        l’auteur de l’acceptation sont conservés. Les voyageurs s’engagent :
      </p>
      <ul>
        {FAIR_PLAY.rules.map((r) => (
          <li key={r.title}><strong>{r.title}.</strong> {r.text}</li>
        ))}
      </ul>
      <h3 id="evenements" className="scroll-mt-24">Raids, rallyes et événements organisés</h3>
      <p>
        Beaucoup d’épreuves ont leur propre règlement, et <strong>certaines interdisent tout système de géolocalisation ou de suivi
        pendant l’épreuve</strong>, sous peine de pénalité ou d’exclusion. Avant d’activer le suivi, les voyageurs qui participent
        à un raid, un rallye, une course ou tout autre événement organisé <strong>vérifient que son règlement et son organisation
        l’autorisent</strong>, et coupent le suivi pendant les périodes où il est interdit.
      </p>
      <p>
        Les voyageurs sont <strong>seuls responsables</strong> du respect de ce règlement et de l’usage qu’ils font de ce site
        pendant l’épreuve. TrophyTracker n’est ni un outil de navigation, ni un outil de sécurité, ni un moyen d’assistance. Un
        road trip qui utiliserait TrophyTracker pour s’orienter ou suivre d’autres concurrents le ferait en violation de ces
        conditions, et son accès au suivi peut être désactivé. Si un organisateur nous signale qu’un road trip enfreint son règlement,
        nous pouvons suspendre son suivi.
      </p>
      <p>
        Une page publique montre la position à tout le monde : pensez à lancer le suivi une fois partis de chez vous et à
        l’arrêter au retour. Une page privée n’est visible que par les personnes qui ont son lien.
      </p>

      <h2>5. Ce que vous publiez</h2>
      <p>Vous restez propriétaire de vos textes et photos. Vous nous autorisez simplement à les stocker et à les afficher pour faire fonctionner le service, tant qu’ils sont en ligne.</p>
      <p>Vous ne publiez que ce que vous avez le droit de publier :</p>
      <ul>
        <li>vos propres photos, ou celles dont l’auteur est d’accord ;</li>
        <li>
          pas de <strong>personne reconnaissable sans son accord</strong>, et jamais d’enfant sans l’accord de ses parents, y compris
          à l’étranger ;
        </li>
        <li>les logos de vos sponsors avec leur autorisation ;</li>
        <li>
          rien d’illégal, d’insultant, de haineux, de violent, de pornographique ou de trompeur, ni de publicité sans rapport avec
          votre road trip.
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
        l’interrompre. TrophyTracker fait de son mieux pour que le service fonctionne, surtout pendant les road trips, sans pouvoir le promettre.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Chaque road trip est sous la responsabilité de ses voyageurs, pour sa page et ce qui y est publié. TrophyTracker, en tant qu’hébergeur, retire les contenus
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
