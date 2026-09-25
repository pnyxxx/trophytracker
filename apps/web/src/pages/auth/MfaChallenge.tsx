import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';

/** Deuxième étape de connexion : code à 6 chiffres de l'application d'authentification. */
export function MfaChallenge() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp[0];
    if (!factor) {
      setBusy(false);
      return setError('Aucune application d’authentification configurée');
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setBusy(false);
    if (error) return setError(errorMessage(error).includes('Invalid') ? 'Code incorrect' : errorMessage(error));
    await queryClient.invalidateQueries({ queryKey: ['aal'] });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otp">Code de votre application d’authentification</Label>
        <Input id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="text-center font-mono text-2xl tracking-[0.5em]" />
      </div>
      {error && <p role="alert" className="text-sm text-primary-light">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : 'Valider'}</Button>
      <Button type="button" variant="ghost" className="w-full text-dust-300" onClick={() => signOut()}>Annuler</Button>
    </form>
  );
}
