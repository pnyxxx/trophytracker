import { Link } from 'react-router-dom';
import { Wordmark } from '@/components/common/Logo';

const link = 'text-dust-400 hover:text-white';

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-primary bg-ink-950 text-dust-400">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-7 lg:grid-cols-3">
        <div className="flex flex-col gap-3.5">
          <Wordmark className="text-[26px] text-cream" />
          <p className="max-w-[300px] text-sm leading-relaxed">
            Suivez en direct les équipages du 4L Trophy : position, trace complète, photos et sponsors.
          </p>
        </div>
        <nav className="flex flex-col gap-2.5 text-sm" aria-label="Liens du site">
          <p className="tt-kicker text-cream">Plateforme</p>
          <Link to="/equipages" className={link}>Tous les équipages</Link>
          <Link to="/inscription" className={link}>Inscrire mon équipage</Link>
          <Link to="/#comment" className={link}>Comment ça marche</Link>
        </nav>
        <nav className="flex flex-col gap-2.5 text-sm" aria-label="Informations">
          <p className="tt-kicker text-cream">Informations</p>
          <Link to="/confidentialite" className={link}>Confidentialité & données</Link>
          <a href="https://www.4ltrophy.com" target="_blank" rel="noopener noreferrer" className={link}>
            Site officiel du 4L Trophy ↗
          </a>
        </nav>
      </div>
      <div className="border-t border-cream/10 px-4 py-5 text-center text-xs sm:px-7">
        © {new Date().getFullYear()} TrophyTracker — projet indépendant, non affilié à l’organisation du 4L Trophy.
      </div>
    </footer>
  );
}
