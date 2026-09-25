import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Container, PageHero } from '@/components/common/Brand';

export default function PrivacyPage() {
  return (
    <PageShell padTop={false}>
      <Seo title="Confidentialité" />
      <PageHero kicker="Informations" title={<>Confidentialité<br />& données</>} />
      <Container className="border-t border-cream/[0.12] py-14 md:py-20">
      <article className="max-w-3xl text-lg leading-relaxed text-dust-100 [&_h2]:mb-4 [&_h2]:mt-14 [&_h2]:border-t [&_h2]:border-cream/[0.14] [&_h2]:pt-8 [&_h2]:font-display [&_h2]:text-[40px] [&_h2]:font-black [&_h2]:uppercase [&_h2]:leading-none [&_h2]:text-cream [&_li]:mb-2 [&_p]:mb-4 [&_strong]:text-cream [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-primary">
        <p className="border-l-[3px] border-primary pl-5 text-xl text-cream">TrophyTracker est un projet indépendant. Nous collectons le strict minimum, ne vendons aucune donnée et n’affichons aucune publicité.</p>

        <h2>Ce que nous stockons</h2>
        <ul>
          <li><strong>Votre compte</strong> : email, nom affiché, mot de passe (chiffré, jamais lisible, même par nous).</li>
          <li><strong>Vos abonnements</strong> : la liste des équipages que vous suivez (visible par vous seul).</li>
          <li><strong>Pour les équipages</strong> : les informations de la page, les photos, les sponsors et les positions GPS envoyées pendant le raid.</li>
        </ul>

        <h2>Positions GPS</h2>
        <p>
          Les positions ne sont collectées que lorsqu’un membre de l’équipage active volontairement le suivi.
          Elles sont visibles par tous si la page de l’équipage est publique, et uniquement par ses membres si elle est privée.
          Nous conseillons d’arrêter le suivi en dehors du raid.
        </p>

        <h2>Photos</h2>
        <p>Les photos sont compressées sur votre appareil avant l’envoi et leurs métadonnées (dont la position GPS de la prise de vue) sont supprimées.</p>

        <h2>Vos droits</h2>
        <p>
          Vous pouvez modifier vos informations et supprimer votre compte à tout moment depuis « Mon compte » :
          la suppression efface immédiatement vos données. Un équipage peut supprimer sa page, sa trace et ses photos.
        </p>

        <h2>Cookies</h2>
        <p>Nous n’utilisons aucun cookie publicitaire ni traceur. Seule votre session de connexion est conservée dans votre navigateur.</p>
      </article>
      </Container>
    </PageShell>
  );
}
