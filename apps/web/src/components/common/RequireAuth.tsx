import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth';
import { PageLoader } from './Spinner';

/** Protège une page : redirige vers la connexion (puis revient ici après). */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, profile, isAdmin, loading, needsMfa, mfaPending } = useAuth();
  const location = useLocation();

  if (loading || mfaPending || (user && admin && !profile)) return <PageLoader />;
  if (!user || needsMfa) {
    return <Navigate to={`/connexion?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
