/**
 * Connexion et inscription SANS mot de passe : e-mail → code à 6 chiffres reçu par e-mail
 * → (nouveau compte) prénom. Utilisé par /connexion, /inscription, /invitation et le parcours /creer.
 *
 * Supabase Auth envoie le modèle « confirmation » à une adresse inconnue (le compte est créé à la
 * vérification du code) et « magic-link » à un compte existant : les deux contiennent `{{ .Token }}`
 * et se vérifient avec `verifyOtp({ type: 'email' })`. On ne dit jamais si une adresse a déjà un compte.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CodeInput } from './CodeInput';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';

/** Délai entre deux envois de code (Supabase Auth refuse plus d'un e-mail par minute et par adresse). */
const RESEND_DELAY = 60;

export type SignInStep = 'email' | 'code' | 'name';

export function EmailCodeSignIn({ askName = false, initialEmail = '', onHold, onDone, onStepChange, emailFooter }: {
  /** Demander le prénom dès le premier écran (inscription). */
  askName?: boolean;
  initialEmail?: string;
  /**
   * `true` pendant la vérification du code et l'écran « prénom » : la page appelante ne doit pas
   * rediriger dès que la session apparaît.
   */
  onHold?: (hold: boolean) => void;
  /** Connexion terminée (prénom compris). */
  onDone?: () => void;
  /** Changement d'écran (pour les titres et la barre d'avancement de la page), avec l'adresse saisie. */
  onStepChange?: (step: SignInStep, email: string) => void;
  /** Sous le formulaire e-mail (lien « Déjà inscrit ? »…). */
  emailFooter?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [step, setStepState] = useState<SignInStep>('email');
  const setStep = (s: SignInStep) => { setStepState(s); onStepChange?.(s, s === 'email' ? '' : email.trim()); };
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const lastTried = useRef('');

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    setBusy(true);
    setError(null);
    const displayName = name.trim();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, data: displayName ? { display_name: displayName } : undefined },
    });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setCode('');
    lastTried.current = '';
    setWait(RESEND_DELAY);
    setStep('code');
  };

  const verify = async (token: string) => {
    if (busy || token.length !== 6 || token === lastTried.current) return;
    lastTried.current = token;
    setBusy(true);
    setError(null);
    onHold?.(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
    setBusy(false);
    if (error) {
      onHold?.(false);
      return setError(errorMessage(error));
    }
    // Nouveau compte sans prénom (connexion directe, invitation) : on le demande.
    if (!data.user?.user_metadata?.display_name) {
      setStep('name');
      return;
    }
    onHold?.(false);
    onDone?.();
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const displayName = name.trim();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
    if (!error && data.user) await supabase.from('profiles').update({ display_name: displayName }).eq('id', data.user.id);
    setBusy(false);
    if (error) return setError(errorMessage(error));
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    onHold?.(false);
    onDone?.();
  };

  const alert = error && <p role="alert" className="m-0 text-[15px] text-signal-text">{error}</p>;

  if (step === 'name') {
    return (
      <form onSubmit={saveName} className="flex flex-col gap-5">
        <p className="m-0 text-[17px] leading-relaxed text-dust-100">Bienvenue ! Comment t’appelles-tu ? C’est le nom que verront tes proches.</p>
        <div className="space-y-2">
          <Label htmlFor="auth-name">Ton prénom</Label>
          <Input id="auth-name" autoComplete="given-name" required minLength={2} maxLength={60} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {alert}
        <Button type="submit" size="lg" className="w-full" disabled={busy || name.trim().length < 2}>{busy ? 'Enregistrement…' : 'Continuer'}</Button>
      </form>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); lastTried.current = ''; verify(code); }} className="flex flex-col gap-5">
        <p className="m-0 text-[17px] leading-relaxed text-dust-100">
          Code à 6 chiffres envoyé à <b className="break-all text-cream">{email.trim()}</b>. Il expire dans 10 minutes.
        </p>
        <CodeInput
          aria-label="Code à 6 chiffres"
          autoFocus
          value={code}
          onChange={(c) => { setCode(c); setError(null); if (c.length === 6) verify(c); }}
        />
        {alert}
        <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : 'Valider'}</Button>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[15px]">
          <Button type="button" variant="link" className="min-h-11 px-0 disabled:bg-transparent disabled:no-underline" disabled={busy || wait > 0} onClick={send}>
            {wait > 0 ? `Renvoyer le code (${wait} s)` : 'Renvoyer le code'}
          </Button>
          <Button type="button" variant="link" className="min-h-11 px-0 text-dust-300" onClick={() => { setStep('email'); setError(null); }}>
            Changer d’adresse
          </Button>
        </div>
        <p className="m-0 text-[14px] leading-relaxed text-dust-400">Rien reçu ? Regarde dans les spams, l’e-mail vient de trophytracker.</p>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-5">
      {askName && (
        <div className="space-y-2">
          <Label htmlFor="auth-name">Ton prénom</Label>
          <Input id="auth-name" autoComplete="given-name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="auth-email">Ton e-mail</Label>
        <Input id="auth-email" type="email" autoComplete="email" required autoFocus={!askName} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {alert}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir mon code'}</Button>
      <p className="m-0 text-[14px] leading-relaxed text-dust-400">
        Pas de mot de passe à retenir : on t’envoie un code. En continuant, tu acceptes les{' '}
        <Link to="/conditions-utilisation" className="underline">conditions d’utilisation</Link> et la{' '}
        <Link to="/confidentialite" className="underline">politique de confidentialité</Link>.
      </p>
      {emailFooter}
    </form>
  );
}
