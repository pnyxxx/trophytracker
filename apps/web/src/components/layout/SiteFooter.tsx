import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import { CONTACT_HREF, REPORT_HREF } from '@/lib/legal';

const link = 'text-dust-400 hover:text-white';

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-primary bg-ink-950 text-dust-400">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-7 lg:grid-cols-3">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <LogoMark className="h-11 w-11" />
            <div className="flex flex-col gap-1.5">
              <Wordmark className="text-[30px] text-cream" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ochre">Carnet de route en direct</span>
            </div>
          </div>
          <p className="max-w-[300px] text-sm leading-relaxed">
            Le carnet de route en direct de vos road trips, raids et road trips : position, trace, photos et sponsors. Gratuit pour les proches.
          </p>
        </div>
        <nav className="flex flex-col gap-2.5 text-sm" aria-label="Liens du site">
          <p className="tt-kicker text-cream">Plateforme</p>
          <Link to="/inscription" className={link}>Créer mon road trip</Link>
          <Link to="/#comment" className={link}>Comment ça marche</Link>
        </nav>
        <nav className="flex flex-col gap-2.5 text-sm" aria-label="Informations">
          <p className="tt-kicker text-cream">Informations</p>
          <Link to="/mentions-legales" className={link}>Mentions légales</Link>
          <Link to="/conditions-utilisation" className={link}>Conditions d’utilisation</Link>
          <Link to="/conditions-vente" className={link}>Conditions de vente</Link>
          <Link to="/confidentialite" className={link}>Confidentialité & données</Link>
        </nav>
      </div>
      <div className="border-t border-cream/10 px-4 py-5 text-center text-xs sm:px-7">
        © {new Date().getFullYear()} TrophyTracker — projet indépendant, affilié à aucun organisateur d’événement.
        {' · '}<a href={CONTACT_HREF} className={link}>Contact</a>
        {' · '}<a href={REPORT_HREF} className={link}>Signaler un contenu</a>
      </div>
    </footer>
  );
}
