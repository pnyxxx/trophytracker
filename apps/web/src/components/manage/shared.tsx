import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="m-0 text-[0.8235rem] leading-relaxed text-dust-400">{hint}</p>}
    </div>
  );
}

/**
 * Panneau de formulaire « Balise » : carte en verre arrondie, grand titre Bricolage.
 * `collapsible` : replié par défaut, on l'ouvre d'un toucher (pages de réglages : on voit tout d'un coup d'œil
 * au lieu d'une page interminable). `defaultOpen` l'ouvre d'office.
 */
export function Panel({ title, description, action, children, collapsible = false, defaultOpen = false }: {
  title: string; description?: ReactNode; action?: ReactNode; children: ReactNode; collapsible?: boolean; defaultOpen?: boolean;
}) {
  const box = 'tt-glass rounded-[24px] border-[1.5px] border-cream/[0.08] p-5 md:p-7';
  const heading = (
    <div className="min-w-0">
      <h2 className="tt-display m-0 text-[1.45rem] leading-none text-cream md:text-[1.8rem]">{title}</h2>
      {description && <div className="mt-2 max-w-[640px] text-[0.8824rem] leading-relaxed text-dust-300">{description}</div>}
    </div>
  );
  if (collapsible) {
    return (
      <details className={cn(box, 'group py-0 md:py-0')} open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 md:py-6 [&::-webkit-details-marker]:hidden">
          <h2 className="tt-display m-0 text-[1.3rem] leading-none text-cream md:text-[1.6rem]">{title}</h2>
          <ChevronDown className="h-5 w-5 flex-none text-dust-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="pb-5 md:pb-7">
          {description && <div className="mb-5 max-w-[640px] text-[0.8824rem] leading-relaxed text-dust-300">{description}</div>}
          {children}
        </div>
      </details>
    );
  }
  return (
    <section className={box}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        {heading}
        {action}
      </div>
      {children}
    </section>
  );
}

export const textareaClass =
  'flex min-h-[8.2353rem] w-full rounded-2xl border-2 border-ink-600 bg-ink px-4 py-3 text-[length:max(16px,1rem)] text-cream placeholder:text-dust-600 hover:border-dust-600 focus-visible:border-cream focus-visible:outline-none';

export const selectClass =
  'flex min-h-14 w-full rounded-2xl border-2 border-ink-600 bg-ink px-4 py-2 text-[length:max(16px,1rem)] text-cream hover:border-dust-600 focus-visible:border-cream focus-visible:outline-none';

/** Convertit "" en null pour les champs optionnels. */
export const orNull = (v: string) => (v.trim() === '' ? null : v.trim());
export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
