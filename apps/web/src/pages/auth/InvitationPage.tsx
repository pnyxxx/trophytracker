import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/common/Spinner';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { AuthLayout } from './AuthLayout';

/**
 * Lien de l'email d'invitation : /invitation?token_hash=…&type=invite
 * On vérifie le jeton (usage unique), puis la personne choisit son nom et son mot de passe.
 */
export default function InvitationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [state, setState] = useState<'verifying' | 'ready' | 'invalid'>('verifying');
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verified = useRef(false);

  useEffect(() => {
    if (verified.current) return;
    verified.current = true;
    const tokenHash = params.get('token_hash');
    if (!tokenHash) return setState(user ? 'ready' : 'invalid');
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' }).then(({ error }) => {
      setState(error ? 'invalid' : 'ready');
      // Retire le jeton de l'URL (historique, partage d'écran…).
      window.history.replaceState(null, '', '/invitation');
    });
  }, [params, user]);

  if (state === 'verifying') return <PageLoader />;
  if (state === 'invalid') {
    return (
      <AuthLayout title="Invitation expirée" subtitle="Ce lien n'est plus valide. Demandez à votre coéquipier de vous inviter à nouveau.">
        <Button className="w-full" onClick={() => navigate('/connexion')}>Se connecter</Button>
      </AuthLayout>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 10) return setError('Le mot de passe doit contenir au moins 10 caractères');
    if (form.password !== form.confirm) return setError('Les deux mots de passe ne correspondent pas');
    setBusy(true);
    const { data, error } = await supabase.auth.updateUser({ password: form.password, data: { display_name: form.name.trim() } });
    if (!error && data.user) {
      await supabase.from('profiles').update({ display_name: form.name.trim() }).eq('id', data.user.id);
    }
    setBusy(false);
    if (error) return setError(errorMessage(error));
    await queryClient.invalidateQueries();
    toast.success('Bienvenue dans l’équipage ! 🎉');
    navigate('/mon-compte', { replace: true });
  };

  return (
    <AuthLayout title="Bienvenue dans l’équipage !" subtitle="Choisissez votre nom et votre mot de passe pour activer votre compte.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Prénom ou pseudo</Label>
          <Input id="name" required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe <span className="text-dust-500">(10 caractères min.)</span></Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmer</Label>
          <Input id="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </div>
        {error && <p role="alert" className="text-sm text-primary-light">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Activation…' : 'Activer mon compte'}</Button>
        <p className="text-center text-xs text-dust-500">
          En activant votre compte, vous acceptez les <Link to="/conditions-utilisation" className="underline">conditions d’utilisation</Link> et
          la <Link to="/confidentialite" className="underline">politique de confidentialité</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
