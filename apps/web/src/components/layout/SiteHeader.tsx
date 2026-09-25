import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, User, X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/hooks/auth';
import { cn } from '@/lib/utils';

const links = [
  { to: '/equipages', label: 'Équipages' },
  { to: '/#comment', label: 'Comment ça marche' },
];

const cta =
  'inline-flex items-center gap-2 rounded-[4px] bg-primary px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-primary-dark hover:text-white';

export function SiteHeader() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logout = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn('text-sm font-semibold hover:text-white', isActive ? 'text-white' : 'text-dust-100');

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[1000] border-b border-cream/[0.08] backdrop-blur-[14px] backdrop-saturate-[160%] transition-colors duration-300',
        scrolled || open ? 'bg-ink/[0.86]' : 'bg-ink/[0.35]',
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-7">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation principale">
          {links.map((l) =>
            l.to.includes('#') ? (
              <Link key={l.to} to={l.to} className={navClass({ isActive: false })}>
                {l.label}
              </Link>
            ) : (
              <NavLink key={l.to} to={l.to} className={navClass}>
                {l.label}
              </NavLink>
            ),
          )}
          {isAdmin && (
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/mon-compte" className={cta}>
                <User className="h-4 w-4" />
                {profile?.display_name ?? 'Mon compte'}
              </Link>
              <button onClick={logout} title="Se déconnecter" aria-label="Se déconnecter" className="rounded-[4px] p-2.5 text-dust-100 hover:bg-cream/5 hover:text-white">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <NavLink to="/connexion" className={navClass}>Connexion</NavLink>
              <Link to="/inscription" className={cta}>Créer un compte</Link>
            </>
          )}
        </nav>

        <button
          className="rounded-[4px] p-2 text-cream md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-cream/[0.08] md:hidden"
            aria-label="Navigation mobile"
          >
            <div className="flex flex-col px-4 py-3 sm:px-7">
              {[...links, ...(isAdmin ? [{ to: '/admin', label: 'Administration' }] : []), ...(user ? [{ to: '/mon-compte', label: 'Mon compte' }] : [{ to: '/connexion', label: 'Connexion' }])].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="border-b border-cream/[0.08] py-4 font-display text-3xl font-black uppercase text-cream hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}
              {user ? (
                <button onClick={logout} className="py-4 text-left font-mono text-xs uppercase tracking-[0.14em] text-dust-400 hover:text-cream">
                  Se déconnecter
                </button>
              ) : (
                <Link to="/inscription" onClick={() => setOpen(false)} className={cn(cta, 'mt-4 justify-center py-4')}>
                  Créer un compte
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
