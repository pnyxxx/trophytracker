import { Link } from 'react-router-dom';
import { Wordmark } from '@/components/common/Logo';
import { CONTACT_HREF, REPORT_HREF } from '@/lib/legal';

const link = 'text-dust-500 hover:text-white';

/** Pied de page sobre : logo, liens utiles et légaux, année. */
export function SiteFooter() {
  return (
    <footer className="border-t-[1.5px] border-cream/[0.08] text-[0.8235rem] text-dust-500">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-5 px-5 py-9 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <Link to="/" aria-label="trophytracker, accueil" className="text-cream hover:text-cream">
          <Wordmark className="text-[1.0588rem]" />
        </Link>
        <nav className="flex flex-wrap gap-x-[1.2941rem] gap-y-2.5" aria-label="Liens du site">
          <Link to="/#comment" className={link}>Comment ça marche</Link>
          <Link to="/confidentialite" className={link}>Confidentialité</Link>
          <a href={CONTACT_HREF} className={link}>Contact</a>
          <Link to="/mentions-legales" className={link}>Mentions légales</Link>
          <Link to="/conditions-utilisation" className={link}>CGU</Link>
          <Link to="/conditions-vente" className={link}>CGV</Link>
          <a href={REPORT_HREF} className={link}>Signaler un contenu</a>
        </nav>
        <span className="font-mono">© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
