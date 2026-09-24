import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';

export default function PrivacyPage() {
  return (
    <PageShell>
      <Seo title="Confidentialité" />
      <article className="container mx-auto max-w-3xl px-4 py-12 text-white/80 [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-white [&_li]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6">
        <h1 className="mb-6 text-4xl font-bold text-white">Confidentialité & données personnelles</h1>
        <p>TrophysTracker est un projet indépendant. Nous collectons le strict minimum, ne vendons aucune donnée et n’affichons aucune publicité.</p>

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
    </PageShell>
  );
}
