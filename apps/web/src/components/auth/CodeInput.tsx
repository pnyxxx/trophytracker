import { forwardRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Champ « code à 6 chiffres » (code reçu par e-mail ou application d'authentification) :
 * gros chiffres DM Mono espacés, clavier numérique et remplissage automatique sur téléphone.
 */
export const CodeInput = forwardRef<HTMLInputElement, Omit<ComponentProps<'input'>, 'onChange' | 'value'> & {
  value: string;
  onChange: (code: string) => void;
}>(({ value, onChange, className, ...props }, ref) => (
  <input
    ref={ref}
    inputMode="numeric"
    autoComplete="one-time-code"
    pattern="[0-9]{6}"
    maxLength={6}
    placeholder="••••••"
    value={value}
    onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
    className={cn(
      'min-h-[76px] w-full rounded-[20px] border-2 bg-ink-800 px-5 text-center font-mono text-[36px] tracking-[0.45em] text-cream transition-colors placeholder:text-dust-700 focus-visible:outline-none',
      value.length === 6 ? 'border-live' : 'border-ink-600 hover:border-dust-600 focus-visible:border-cream',
      className,
    )}
    {...props}
  />
));
CodeInput.displayName = 'CodeInput';
