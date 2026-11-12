/**
 * Champ « nouveau mot de passe » avec une indication en direct : combien de caractères il manque, puis « c'est bon ».
 * Le bouton du formulaire reste cliquable : s'il est trop court à l'envoi, le formulaire passe `showError` et
 * l'indication devient un message d'erreur rouge (au lieu d'un bouton grisé qui n'explique rien).
 */
import { forwardRef, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/utils';
import { PASSWORD_MIN, passwordTooShort } from '@/lib/password';

const plural = (n: number) => `${n} caractère${n > 1 ? 's' : ''}`;

export const NewPasswordField = forwardRef<HTMLInputElement, {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Mot de passe facultatif : vide, il est accepté. */
  optional?: boolean;
  /** Le formulaire a été envoyé avec un mot de passe trop court. */
  showError?: boolean;
  /** Phrase ajoutée sous l'indication quand le champ est vide (ex. « Sans mot de passe, … »). */
  note?: ReactNode;
}>(({ id, label, value, onChange, optional = false, showError = false, note }, ref) => {
  const len = value.length;
  const missing = PASSWORD_MIN - len;
  const invalid = showError && passwordTooShort(value, optional);
  const hintId = `${id}-hint`;

  let hint: ReactNode;
  let tone: string;
  if (len >= PASSWORD_MIN) {
    tone = 'text-live-text';
    hint = <><Check className="h-4 w-4 flex-none" aria-hidden="true" /> Longueur suffisante</>;
  } else if (len === 0) {
    tone = invalid ? 'text-signal-text' : 'text-dust-400';
    hint = invalid ? `Choisis un mot de passe d’au moins ${PASSWORD_MIN} caractères.` : <span>{PASSWORD_MIN} caractères minimum.{note && <> {note}</>}</span>;
  } else {
    tone = invalid ? 'text-signal-text' : 'text-gold-text';
    hint = invalid
      ? `Trop court : il manque ${plural(missing)} (${len}/${PASSWORD_MIN}).`
      : `Encore ${plural(missing)} · ${len}/${PASSWORD_MIN}`;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        ref={ref}
        id={id}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={hintId}
        className={cn(invalid && 'border-signal focus-visible:border-signal')}
      />
      <p id={hintId} aria-live="polite" className={cn('m-0 flex items-center gap-1.5 text-[14px]', tone)}>{hint}</p>
    </div>
  );
});
NewPasswordField.displayName = 'NewPasswordField';
