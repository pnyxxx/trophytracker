import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, Shield, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/hooks/auth';
import { cn } from '@/lib/utils';

const links = [
  { to: '/equipages', label: 'Équipages' },
  { to: '/#comment-ca-marche', label: 'Comment ça marche' },
];

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
    cn('text-sm font-medium transition-colors hover:text-white', isActive ? 'text-white' : 'text-white/70');

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[1000] transition-all duration-300',
        scrolled || open ? 'glass shadow-lg' : 'bg-transparent',
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 text-white">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              {l.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link to="/mon-compte">
                  <User className="mr-1.5 h-4 w-4" />
                  {profile?.display_name ?? 'Mon compte'}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} title="Se déconnecter" className="text-white/70 hover:text-white">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                <Link to="/connexion">Connexion</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/inscription">Créer un compte</Link>
              </Button>
            </div>
          )}
        </nav>

        <button
          className="rounded-md p-2 md:hidden"
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
            className="overflow-hidden border-t border-white/10 md:hidden"
            aria-label="Navigation mobile"
          >
            <div className="container mx-auto flex flex-col gap-1 px-4 py-4 text-white">
              {links.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 hover:bg-white/10">
                  {l.label}
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-3 hover:bg-white/10">
                  <Shield className="h-4 w-4" /> Administration
                </Link>
              )}
              {user ? (
                <>
                  <Link to="/mon-compte" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 hover:bg-white/10">
                    Mon compte
                  </Link>
                  <button onClick={logout} className="rounded-md px-3 py-3 text-left text-white/70 hover:bg-white/10">
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <Link to="/connexion" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 hover:bg-white/10">
                    Connexion
                  </Link>
                  <Button asChild className="mt-2">
                    <Link to="/inscription" onClick={() => setOpen(false)}>
                      Créer un compte
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
