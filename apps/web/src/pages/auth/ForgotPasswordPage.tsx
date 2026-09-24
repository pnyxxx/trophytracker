import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { AuthLayout } from './AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else setSent(true);
  };

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle={sent ? undefined : 'Entrez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.'}
      footer={<Link to="/connexion" className="hover:text-white">← Retour à la connexion</Link>}
    >
      {sent ? (
        // Même message que l'email existe ou non : on ne révèle pas qui est inscrit.
        <p className="text-white/80">Si un compte existe pour <strong>{email}</strong>, un email vient d'être envoyé. Pensez à vérifier vos spams.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer le lien'}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
