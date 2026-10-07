import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { AuthLayout, safeNext } from './AuthLayout';
import { GoogleButton } from './GoogleButton';

export default function SignupPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { user } = useAuth();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 10) return setError('Le mot de passe doit contenir au moins 10 caractères');
    if (form.password !== form.confirm) return setError('Les deux mots de passe ne correspondent pas');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { display_name: form.displayName.trim() },
        emailRedirectTo: `${window.location.origin}${next}`,
      },
    });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    // Sans session : un email de confirmation a été envoyé.
    if (!data.session) setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout title="Plus qu'une étape ✉️" subtitle={`Nous avons envoyé un lien de confirmation à ${form.email}. Cliquez dessus pour activer votre compte.`}>
        <p className="text-sm text-dust-300">Rien reçu ? Vérifiez vos spams, ou patientez une minute avant de réessayer.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Gratuit pour suivre vos road trips favoris. Vous participez au raid ? Créez ensuite la page du vôtre."
      footer={<>Déjà inscrit ? <Link to={`/connexion?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">Se connecter</Link></>}
    >
      <GoogleButton next={next} />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Prénom ou pseudo</Label>
          <Input id="name" autoComplete="nickname" required minLength={2} maxLength={60} value={form.displayName} onChange={set('displayName')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe <span className="text-dust-500">(10 caractères min.)</span></Label>
          <PasswordInput id="password" autoComplete="new-password" required minLength={10} value={form.password} onChange={set('password')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmer le mot de passe</Label>
          <PasswordInput id="confirm" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        </div>
        {error && <p role="alert" className="text-sm text-primary-light">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Création…' : 'Créer mon compte'}</Button>
        <p className="text-center text-xs text-dust-500">
          En créant un compte, vous acceptez les <Link to="/conditions-utilisation" className="underline">conditions d’utilisation</Link> et
          la <Link to="/confidentialite" className="underline">politique de confidentialité</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
