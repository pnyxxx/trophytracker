import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { AuthLayout, safeNext } from './AuthLayout';
import { GoogleButton } from './GoogleButton';
import { MfaChallenge } from './MfaChallenge';

export default function LoginPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { user, needsMfa } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    if (user && !needsMfa) navigate(next, { replace: true });
  }, [user, needsMfa, next, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else toast.success('Bon retour parmi nous !');
  };

  const sendMagicLink = async () => {
    if (!email.trim()) return setError('Entrez votre email pour recevoir un lien de connexion');
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${next}` },
    });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else setMagicSent(true);
  };

  if (user && needsMfa) {
    return (
      <AuthLayout title="Double authentification" subtitle="Saisissez le code à 6 chiffres affiché par votre application.">
        <MfaChallenge />
      </AuthLayout>
    );
  }

  if (magicSent) {
    return (
      <AuthLayout title="Vérifiez vos emails" subtitle={`Si un compte existe pour ${email}, un lien de connexion vient d'être envoyé.`}>
        <Button variant="secondary" className="w-full" onClick={() => setMagicSent(false)}>Retour</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Retrouvez vos équipages favoris et gérez le vôtre."
      footer={<>Pas encore de compte ? <Link to={`/inscription?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">Créer un compte</Link></>}
    >
      <GoogleButton next={next} />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link to="/mot-de-passe-oublie" className="text-xs text-dust-300 hover:text-cream">Mot de passe oublié ?</Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-primary-light">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
        <Button type="button" variant="ghost" className="h-auto min-h-10 w-full whitespace-normal py-2.5 leading-snug text-dust-200 hover:text-cream" onClick={sendMagicLink} disabled={busy}>
          Recevoir un lien de connexion par email
        </Button>
      </form>
    </AuthLayout>
  );
}
