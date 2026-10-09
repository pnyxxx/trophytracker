/**
 * Connexion et inscription, utilisées par /connexion, /inscription, /invitation et le parcours /creer.
 *
 *  - Par défaut, e-mail + mot de passe. L'inscription demande prénom, e-mail et mot de passe, puis un code
 *    à 6 chiffres reçu par e-mail pour confirmer l'adresse.
 *  - Au choix (ou mot de passe oublié) : un code à 6 chiffres reçu par e-mail, sans mot de passe. Une adresse
 *    inconnue crée alors le compte : on ne dit pas si elle en avait déjà un.
 *
 * Supabase Auth envoie le modèle « confirmation » (nouveau compte) ou « magic-link » (compte existant) : les deux
 * contiennent `{{ .Token }}` et se vérifient avec `verifyOtp({ type: 'email' })`.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { CodeInput } from './CodeInput';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';

/** Délai entre deux envois de code (Supabase Auth refuse plus d'un e-mail par minute et par adresse). */
const RESEND_DELAY = 60;
/** Longueur minimale imposée par Supabase Auth (GOTRUE_PASSWORD_MIN_LENGTH). */
export const PASSWORD_MIN = 10;

export type SignInStep = 'email' | 'code' | 'name';
type Mode = 'login' | 'signup';
type Method = 'password' | 'code';

export function SignInForm({ signup = false, switchable = false, initialEmail = '', onHold, onDone, onStepChange, emailFooter }: {
  /** Commencer par l'inscription (prénom, e-mail, mot de passe). */
  signup?: boolean;
  /** Lien « Déjà un compte ? / Pas encore de compte ? » dans le formulaire (sinon c'est à la page de l'afficher). */
  switchable?: boolean;
  initialEmail?: string;
  /**
   * `true` pendant la connexion et l'écran « prénom » : la page appelante ne doit pas rediriger
   * dès que la session apparaît.
   */
  onHold?: (hold: boolean) => void;
  /** Connexion terminée (prénom compris). */
  onDone?: () => void;
  /** Changement d'écran (pour les titres et la barre d'avancement de la page), avec l'adresse saisie. */
  onStepChange?: (step: SignInStep, email: string) => void;
  /** Sous le premier formulaire. */
  emailFooter?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(signup ? 'signup' : 'login');
  const [method, setMethod] = useState<Method>('password');
  const [step, setStepState] = useState<SignInStep>('email');
  const setStep = (s: SignInStep) => { setStepState(s); onStepChange?.(s, s === 'email' ? '' : email.trim()); };
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const lastTried = useRef('');
  /** Le code attendu confirme une inscription avec mot de passe (renvoi : `resend`, pas `signInWithOtp`). */
  const [codeFor, setCodeFor] = useState<'signup' | 'otp'>('otp');

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const toCode = (kind: 'signup' | 'otp') => {
    setCodeFor(kind);
    setCode('');
    lastTried.current = '';
    setWait(RESEND_DELAY);
    setStep('code');
  };

  /** Session ouverte : prénom manquant → on le demande, sinon c'est fini. */
  const finish = (displayName: unknown) => {
    if (!displayName) return setStep('name');
    onHold?.(false);
    onDone?.();
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const displayName = name.trim();
    const { error } = codeFor === 'signup' && step === 'code'
      ? await supabase.auth.resend({ type: 'signup', email: email.trim() })
      : await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, data: displayName ? { display_name: displayName } : undefined },
      });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    toCode(step === 'code' ? codeFor : 'otp');
  };

  const logIn = async () => {
    setBusy(true);
    setError(null);
    onHold?.(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      onHold?.(false);
      // Inscription jamais confirmée : on renvoie le code de confirmation.
      if (/not confirmed/i.test(error.message)) {
        const resent = await supabase.auth.resend({ type: 'signup', email: email.trim() });
        setBusy(false);
        if (resent.error) return setError(errorMessage(resent.error));
        return toCode('signup');
      }
      setBusy(false);
      return setError(errorMessage(error));
    }
    setBusy(false);
    finish(data.user?.user_metadata?.display_name);
  };

  const register = async () => {
    setBusy(true);
    setError(null);
    onHold?.(true);
    const displayName = name.trim();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      onHold?.(false);
      setBusy(false);
      return setError(errorMessage(error));
    }
    if (data.session) {
      setBusy(false);
      return finish(data.user?.user_metadata?.display_name);
    }
    // Adresse déjà inscrite (Supabase Auth répond sans rien envoyer) : on tente la connexion avec ce mot de passe.
    if (data.user && data.user.identities?.length === 0) {
      const login = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (!login.error) return finish(login.data.user?.user_metadata?.display_name);
      onHold?.(false);
      setMode('login');
      setPassword('');
      return setError('Tu as déjà un compte avec cette adresse : connecte-toi avec ton mot de passe, ou reçois un code par e-mail.');
    }
    setBusy(false);
    onHold?.(false);
    toCode('signup');
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
    finish(data.user?.user_metadata?.display_name);
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const displayName = name.trim();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName }, ...(newPassword ? { password: newPassword } : {}) });
    if (!error && data.user) await supabase.from('profiles').update({ display_name: displayName }).eq('id', data.user.id);
    setBusy(false);
    if (error) return setError(errorMessage(error));
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    onHold?.(false);
    onDone?.();
  };

  const alert = error && <p role="alert" className="m-0 text-[15px] text-signal-text">{error}</p>;
  const legal = (
    <p className="m-0 text-[14px] leading-relaxed text-dust-400">
      En continuant, tu acceptes les <Link to="/conditions-utilisation" className="underline">conditions d’utilisation</Link> et la{' '}
      <Link to="/confidentialite" className="underline">politique de confidentialité</Link>.
    </p>
  );
  const switchMode = (m: Mode) => { setMode(m); setMethod('password'); setError(null); };

  if (step === 'name') {
    return (
      <form onSubmit={saveName} className="flex flex-col gap-5">
        <p className="m-0 text-[17px] leading-relaxed text-dust-100">Bienvenue ! Comment t’appelles-tu ? C’est le nom que verront tes proches.</p>
        <div className="space-y-2">
          <Label htmlFor="auth-name">Ton prénom</Label>
          <Input id="auth-name" autoComplete="given-name" required minLength={2} maxLength={60} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="auth-new-password">Choisis un mot de passe <span className="font-normal text-dust-400">(facultatif)</span></Label>
          <PasswordInput id="auth-new-password" autoComplete="new-password" minLength={PASSWORD_MIN} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <p className="m-0 text-[14px] text-dust-400">{PASSWORD_MIN} caractères minimum. Sans mot de passe, tu te connecteras avec un code reçu par e-mail.</p>
        </div>
        {alert}
        <Button type="submit" size="lg" className="w-full" disabled={busy || name.trim().length < 2 || (newPassword.length > 0 && newPassword.length < PASSWORD_MIN)}>
          {busy ? 'Enregistrement…' : 'Continuer'}
        </Button>
      </form>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); lastTried.current = ''; verify(code); }} className="flex flex-col gap-5">
        <p className="m-0 text-[17px] leading-relaxed text-dust-100">
          {codeFor === 'signup' ? 'Pour confirmer ton adresse, saisis le code' : 'Code'} à 6 chiffres envoyé à <b className="break-all text-cream">{email.trim()}</b>. Il expire dans 10 minutes.
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
          <Button type="button" variant="link" className="min-h-11 px-0 disabled:bg-transparent disabled:no-underline" disabled={busy || wait > 0} onClick={sendCode}>
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

  const nameField = (
    <div className="space-y-2">
      <Label htmlFor="auth-name">Ton prénom</Label>
      <Input id="auth-name" autoComplete="given-name" required minLength={2} maxLength={60} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
    </div>
  );
  const emailField = (
    <div className="space-y-2">
      <Label htmlFor="auth-email">Ton e-mail</Label>
      <Input id="auth-email" type="email" autoComplete="email" required autoFocus={mode === 'login'} value={email} onChange={(e) => setEmail(e.target.value)} />
    </div>
  );
  const switchLink = switchable && (
    <p className="m-0 text-[15px] text-dust-300">
      {mode === 'signup' ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
      <button type="button" className="min-h-11 font-bold text-signal-text hover:text-cream" onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}>
        {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
      </button>
    </p>
  );

  // Code par e-mail, sans mot de passe (au choix, ou mot de passe oublié).
  if (method === 'code') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="flex flex-col gap-5">
        {mode === 'signup' && nameField}
        {emailField}
        {alert}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir mon code'}</Button>
        <p className="m-0 text-[15px] leading-relaxed text-dust-300">
          On t’envoie un code à 6 chiffres : pas besoin de mot de passe.{' '}
          <button type="button" className="font-bold text-signal-text hover:text-cream" onClick={() => { setMethod('password'); setError(null); }}>
            {mode === 'signup' ? 'Choisir plutôt un mot de passe' : 'Utiliser mon mot de passe'}
          </button>
        </p>
        {legal}
        {switchLink}
        {emailFooter}
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (mode === 'signup') register(); else logIn(); }} className="flex flex-col gap-5">
      {mode === 'signup' && nameField}
      {emailField}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="auth-password">{mode === 'signup' ? 'Choisis un mot de passe' : 'Ton mot de passe'}</Label>
          {mode === 'login' && (
            <button type="button" className="text-[14px] font-bold text-dust-300 hover:text-cream" onClick={() => { setMethod('code'); setError(null); }}>
              Mot de passe oublié ?
            </button>
          )}
        </div>
        <PasswordInput
          id="auth-password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={mode === 'signup' ? PASSWORD_MIN : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'signup' && <p className="m-0 text-[14px] text-dust-400">{PASSWORD_MIN} caractères minimum.</p>}
      </div>
      {alert}
      <Button type="submit" size="lg" className="w-full" disabled={busy || (mode === 'signup' && (password.length < PASSWORD_MIN || name.trim().length < 2))}>
        {busy ? (mode === 'signup' ? 'Création…' : 'Connexion…') : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
      </Button>
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => { setMethod('code'); setError(null); }}>
        {mode === 'signup' ? 'Sans mot de passe : recevoir un code' : 'Recevoir un code par e-mail'}
      </Button>
      {legal}
      {switchLink}
      {emailFooter}
    </form>
  );
}
