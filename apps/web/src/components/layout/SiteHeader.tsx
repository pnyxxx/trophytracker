import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, X } from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import { useAuth } from '@/hooks/auth';
import { cn } from '@/lib/utils';
import { EXAMPLE_PATH } from '@/lib/example';

export type HeaderVariant = 'floating' | 'sticky';

/** Liens de découverte : seulement sur l'accueil, en-tête flottant. */
const discover = [
  { to: '/#comment', label: 'Comment ça marche' },
  { to: EXAMPLE_PATH, label: 'Exemple de voyage' },
];

const navLink = 'text-[15px] font-medium text-dust-200 hover:text-white';
const cta =
  'inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full bg-signal px-[18px] text-[15px] font-bold text-white hover:bg-signal-hover hover:text-white active:bg-signal-press';
const iconBtn = 'flex h-11 w-11 items-center justify-center rounded-full text-dust-200 hover:bg-cream/[0.06] hover:text-white';

/**
 * En-tête du site.
 * - `floating` (accueil) : pilule floutée posée au-dessus du récit, qui se fonce au défilement.
 * - `sticky` (ailleurs) : barre collante simple ; `actions` remplace les boutons par défaut
 *   (ex. « Suivre » / « Partager » sur la page d'un road trip).
 */
export function SiteHeader({ variant = 'sticky', actions }: { variant?: HeaderVariant; actions?: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const floating = variant === 'floating';

  useEffect(() => {
    if (!floating) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [floating]);

  const logout = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  const main = user ? { to: '/mon-compte', label: 'Mes road trips' } : { to: '/creer', label: 'Créer mon trip' };
  const menuLinks = [
    ...(floating ? discover : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Administration' }] : []),
    user ? { to: '/mon-compte', label: 'Mon compte' } : { to: '/connexion', label: 'Connexion' },
  ];

  const brand = (
    <Link to="/" className="flex items-center gap-[9px] text-cream no-underline hover:text-cream" aria-label="trophytracker, accueil">
      <LogoMark />
      <Wordmark className={cn(actions ? 'hidden sm:inline' : 'hidden min-[420px]:inline')} />
    </Link>
  );

  const defaultActions = (
    <>
      <nav className="hidden items-center gap-[22px] md:flex" aria-label="Navigation principale">
        {floating && discover.map((l) => (
          <Link key={l.to} to={l.to} className={navLink}>{l.label}</Link>
        ))}
        {isAdmin && <Link to="/admin" className={navLink}>Admin</Link>}
        {!user && <Link to="/connexion" className={navLink}>Connexion</Link>}
      </nav>
      <Link to={main.to} className={cta}>{main.label}</Link>
      {user && (
        <button onClick={logout} title="Se déconnecter" aria-label="Se déconnecter" className={cn(iconBtn, 'hidden md:flex')}>
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      )}
      <button
        className={cn(iconBtn, 'md:hidden')}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
        aria-controls="menu-mobile"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
    </>
  );

  const menu = (
    <AnimatePresence>
      {open && (
        <motion.nav
          id="menu-mobile"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'flex flex-col px-5 py-2 md:hidden',
            floating
              ? 'mx-auto mt-2 max-w-[1400px] rounded-[24px] border-[1.5px] border-cream/[0.14] bg-ink/[0.94] backdrop-blur-[16px]'
              : 'border-t-[1.5px] border-ink-700',
          )}
          aria-label="Navigation mobile"
        >
          {menuLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="border-b border-ink-700 py-4 font-display text-[26px] font-extrabold tracking-[-0.02em] text-cream last:border-b-0 hover:text-signal-text"
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <button onClick={logout} className="flex min-h-[48px] items-center gap-2 text-left text-[15px] font-medium text-dust-400 hover:text-cream">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          )}
        </motion.nav>
      )}
    </AnimatePresence>
  );

  if (floating) {
    return (
      <header className="fixed inset-x-0 top-0 z-[1000] px-4 pt-3.5 sm:px-5">
        <div
          className={cn(
            'mx-auto flex h-[58px] max-w-[1400px] items-center justify-between gap-3 rounded-full border-[1.5px] border-cream/[0.14] pl-[18px] pr-2 backdrop-blur-[16px] backdrop-saturate-[140%] transition-colors duration-300',
            scrolled || open ? 'bg-ink/[0.86]' : 'bg-ink/[0.55]',
          )}
        >
          {brand}
          <div className="flex items-center gap-1.5 md:gap-[22px]">{defaultActions}</div>
        </div>
        {menu}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-[1000] border-b-[1.5px] border-ink-700 bg-ink/[0.88] backdrop-blur-[14px]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-2.5">
        {brand}
        <div className="flex items-center gap-2 md:gap-[22px]">{actions ?? defaultActions}</div>
      </div>
      {!actions && menu}
    </header>
  );
}
