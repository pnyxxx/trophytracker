import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/common/Spinner';
import { PASSWORD_MIN, SignInForm } from '@/components/auth/SignInForm';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { AuthLayout } from './AuthLayout';

/**
 * Lien de l'e-mail d'invitation : /invitation?token_hash=…&type=invite
 * On vérifie le jeton (usage unique, 10 minutes), puis la personne choisit son prénom (et, si elle veut, un mot de passe).
 * Lien expiré : pas grave, le compte existe déjà ; elle se connecte avec un code reçu par e-mail.
 */
export default function InvitationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [state, setState] = useState<'verifying' | 'ready' | 'expired'>('verifying');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verified = useRef(false);

  useEffect(() => {
    if (verified.current) return;
    verified.current = true;
    const tokenHash = params.get('token_hash');
    if (!tokenHash) return setState(user ? 'ready' : 'expired');
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' }).then(({ error }) => {
      setState(error ? 'expired' : 'ready');
      // Retire le jeton de l'URL (historique, partage d'écran…).
      window.history.replaceState(null, '', '/invitation');
    });
  }, [params, user]);

  const welcome = () => {
    toast.success('Bienvenue dans le road trip !');
    navigate('/mon-compte', { replace: true });
  };

  if (state === 'verifying') return <PageLoader />;
  if (state === 'expired') {
    return (
      <AuthLayout title="Rejoins le road trip" subtitle="Ce lien d’invitation a expiré, mais ta place est gardée : connecte-toi avec ton e-mail (mot de passe ou code reçu par e-mail).">
        <SignInForm onDone={welcome} />
      </AuthLayout>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const displayName = name.trim();
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName }, ...(password ? { password } : {}) });
    if (!error && data.user) await supabase.from('profiles').update({ display_name: displayName }).eq('id', data.user.id);
    setBusy(false);
    if (error) return setError(errorMessage(error));
    await queryClient.invalidateQueries();
    welcome();
  };

  return (
    <AuthLayout title="Bienvenue dans le road trip !" subtitle="Dernière étape : ton prénom, c’est le nom que verront tes proches.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="space-y-2">
          <Label htmlFor="name">Ton prénom</Label>
          <Input id="name" autoComplete="given-name" required minLength={2} maxLength={60} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Choisis un mot de passe <span className="font-normal text-dust-400">(facultatif)</span></Label>
          <PasswordInput id="password" autoComplete="new-password" minLength={PASSWORD_MIN} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="m-0 text-[14px] text-dust-400">{PASSWORD_MIN} caractères minimum. Sans mot de passe, tu te connecteras avec un code reçu par e-mail.</p>
        </div>
        {error && <p role="alert" className="m-0 text-[15px] text-signal-text">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy || name.trim().length < 2 || (password.length > 0 && password.length < PASSWORD_MIN)}>{busy ? 'Activation…' : 'Rejoindre le road trip'}</Button>
      </form>
    </AuthLayout>
  );
}
