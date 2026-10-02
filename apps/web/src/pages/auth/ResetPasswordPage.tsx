import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { PageLoader } from '@/components/common/Spinner';
import { AuthLayout } from './AuthLayout';

/** Page atteinte en cliquant sur le lien de l'email « mot de passe oublié ». */
export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (!user) {
    return (
      <AuthLayout title="Lien expiré" subtitle="Ce lien n'est plus valide. Demandez-en un nouveau.">
        <Button asChild className="w-full"><Link to="/mot-de-passe-oublie">Nouveau lien</Link></Button>
      </AuthLayout>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 10) return setError('Au moins 10 caractères');
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    toast.success('Mot de passe modifié');
    navigate('/mon-compte', { replace: true });
  };

  return (
    <AuthLayout title="Nouveau mot de passe">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <PasswordInput id="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmer</Label>
          <PasswordInput id="confirm" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-primary-light">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </form>
    </AuthLayout>
  );
}
