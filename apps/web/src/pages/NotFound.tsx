import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <PageShell>
      <Seo title="Page introuvable" />
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="mb-4 text-7xl">🏜️</p>
        <h1 className="mb-3 text-4xl font-bold text-white">Perdu dans le désert…</h1>
        <p className="mb-8 max-w-md text-white/60">Cette page n'existe pas (ou plus). Si c'est un équipage, il est peut-être passé en privé.</p>
        <div className="flex gap-3">
          <Button asChild><Link to="/">Accueil</Link></Button>
          <Button asChild variant="secondary"><Link to="/equipages">Voir les équipages</Link></Button>
        </div>
      </div>
    </PageShell>
  );
}
