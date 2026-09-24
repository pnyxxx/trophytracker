import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black text-white/60">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <Logo className="text-white" />
          <p className="max-w-xs text-sm">
            Suivez en direct les équipages du 4L Trophy : position, trace complète, photos et sponsors.
          </p>
        </div>
        <nav className="space-y-2 text-sm" aria-label="Liens du site">
          <p className="font-semibold text-white">Plateforme</p>
          <Link to="/equipages" className="block hover:text-white">Tous les équipages</Link>
          <Link to="/inscription" className="block hover:text-white">Inscrire mon équipage</Link>
          <Link to="/#comment-ca-marche" className="block hover:text-white">Comment ça marche</Link>
        </nav>
        <nav className="space-y-2 text-sm" aria-label="Informations">
          <p className="font-semibold text-white">Informations</p>
          <Link to="/confidentialite" className="block hover:text-white">Confidentialité & données</Link>
          <a href="https://www.4ltrophy.com" target="_blank" rel="noopener noreferrer" className="block hover:text-white">
            Site officiel du 4L Trophy ↗
          </a>
        </nav>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs">
        © {new Date().getFullYear()} TrophysTracker — projet indépendant, non affilié à l'organisation du 4L Trophy.
      </div>
    </footer>
  );
}
