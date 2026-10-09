/**
 * Sécurité du compte, entièrement basée sur Supabase Auth :
 *  - changement d'email (confirmation envoyée aux deux adresses) ;
 *  - mot de passe : le choisir ou le changer (sur une session ancienne, Supabase Auth demande d'abord un code
 *    envoyé par e-mail : GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION) ;
 *  - double authentification par application (Google Authenticator, 1Password…).
 * Chaque modification déclenche un email d'alerte automatique.
 */
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { CodeInput } from '@/components/auth/CodeInput';
import { PASSWORD_MIN } from '@/components/auth/SignInForm';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { toastError } from '@/lib/errors';

function EmailForm() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const change = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: `${window.location.origin}/mon-compte` },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Confirme le changement avec les liens envoyés à tes deux adresses e-mail.');
      setEmail('');
    },
    onError: toastError,
  });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); change.mutate(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="new-email">Adresse email <span className="text-dust-500">(actuelle : {user?.email})</span></Label>
        <Input id="new-email" type="email" required placeholder="nouvelle@adresse.fr" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" disabled={change.isPending}>Changer</Button>
    </form>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState('');
  /** Code de confirmation demandé par Supabase Auth (session de plus de 24 h). */
  const [nonce, setNonce] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser(nonce ? { password, nonce } : { password });
      if (error?.code === 'reauthentication_needed') {
        const sent = await supabase.auth.reauthenticate();
        if (sent.error) throw sent.error;
        return 'code' as const;
      }
      if (error) throw error;
      return 'ok' as const;
    },
    onSuccess: (res) => {
      if (res === 'code') {
        setNonce('');
        toast.info('Par sécurité, saisis le code qu’on vient de t’envoyer par e-mail.');
        return;
      }
      toast.success('Mot de passe enregistré. Tu peux aussi toujours te connecter avec un code.');
      setPassword('');
      setNonce(null);
    },
    onError: toastError,
  });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="new-password">Nouveau mot de passe <span className="text-dust-500">({PASSWORD_MIN} caractères minimum)</span></Label>
          <PasswordInput id="new-password" autoComplete="new-password" required minLength={PASSWORD_MIN} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {nonce === null && <Button type="submit" disabled={save.isPending || password.length < PASSWORD_MIN}>Enregistrer</Button>}
      </div>
      {nonce !== null && (
        <div className="flex flex-col gap-3">
          <Label htmlFor="password-nonce">Code reçu par e-mail</Label>
          <CodeInput id="password-nonce" value={nonce} onChange={setNonce} autoFocus />
          <div className="flex gap-3">
            <Button type="submit" disabled={save.isPending || nonce.length !== 6}>Confirmer</Button>
            <Button type="button" variant="ghost" onClick={() => setNonce(null)}>Annuler</Button>
          </div>
        </div>
      )}
      <p className="m-0 text-sm text-dust-400">Pas obligatoire : sans mot de passe, tu te connectes avec un code reçu par e-mail.</p>
    </form>
  );
}

function MfaForm() {
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');

  const { data: factor, refetch } = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: async () => (await supabase.auth.mfa.listFactors()).data?.totp[0] ?? null,
  });

  const start = useMutation({
    mutationFn: async () => {
      // Nettoie une tentative précédente non terminée.
      const { data: all } = await supabase.auth.mfa.listFactors();
      for (const f of all?.all ?? []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Application' });
      if (error) throw error;
      return { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
    },
    onSuccess: setEnrolling,
    onError: toastError,
  });

  const verify = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling!.id, code: code.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Double authentification activée 🔐');
      setEnrolling(null);
      setCode('');
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['aal'] });
    },
    onError: () => toast.error('Code incorrect, réessaie'),
  });

  const disable = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Double authentification désactivée');
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['aal'] });
    },
    onError: toastError,
  });

  if (factor?.status === 'verified') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-live"><ShieldCheck className="h-5 w-5" />Double authentification active</p>
        <Button variant="ghost" className="hover:text-primary-light" onClick={() => { if (confirm('Désactiver la double authentification ?')) disable.mutate(); }}>Désactiver</Button>
      </div>
    );
  }
  if (enrolling) {
    return (
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); verify.mutate(); }} className="space-y-4">
        <p className="text-sm text-dust-200">Scanne ce QR code avec ton application (Google Authenticator, 1Password, Bitwarden…), puis saisis le code affiché.</p>
        <img src={enrolling.qr} alt="QR code de double authentification" className="h-48 w-48 rounded-full bg-white p-2" />
        <p className="text-xs text-dust-500">Ou saisis cette clé : <code className="break-all">{enrolling.secret}</code></p>
        <div className="flex gap-3">
          <Input inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Code à 6 chiffres" className="max-w-[160px] text-center font-mono tracking-widest" />
          <Button type="submit" disabled={code.length !== 6 || verify.isPending}>Activer</Button>
          <Button type="button" variant="ghost" onClick={() => setEnrolling(null)}>Annuler</Button>
        </div>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-dust-300">Protège ton compte avec un second code, affiché par une application, en plus de ton mot de passe ou du code reçu par e-mail.</p>
      <Button variant="secondary" onClick={() => start.mutate()} disabled={start.isPending}>Activer</Button>
    </div>
  );
}

export function SecuritySection() {
  return (
    <div className="space-y-8">
      <EmailForm />
      <div className="border-t border-cream/10 pt-8">
        <p className="tt-kicker mb-4 font-semibold text-dust-300">Mot de passe</p>
        <PasswordForm />
      </div>
      <div className="border-t border-cream/10 pt-8">
        <p className="tt-kicker mb-4 font-semibold text-dust-300">Double authentification</p>
        <MfaForm />
      </div>
    </div>
  );
}
