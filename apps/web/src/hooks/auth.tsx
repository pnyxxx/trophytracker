/**
 * Contexte d'authentification : session Supabase + profil de l'utilisateur.
 * Utilisation : const { user, profile, isAdmin } = useAuth();
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, type Profile } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** true tant que la session initiale n'est pas connue. */
  loading: boolean;
  /** true juste après un clic sur un lien « mot de passe oublié ». */
  recovering: boolean;
  /** Connecté par mot de passe mais le code de double authentification reste à saisir. */
  needsMfa: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') {
        setRecovering(false);
        // Les données privées de l'utilisateur ne doivent pas rester en cache.
        queryClient.clear();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  // Niveau d'authentification : « aal2 » exigé si la double authentification est activée.
  const { data: aal } = useQuery({
    queryKey: ['aal', session?.access_token],
    enabled: !!session,
    queryFn: async () => (await supabase.auth.mfa.getAuthenticatorAssuranceLevel()).data,
  });
  const needsMfa = !!aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2';

  const userId = session?.user.id;
  const { data: profile = null } = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data;
    },
  });

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    recovering,
    needsMfa,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
