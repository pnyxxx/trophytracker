import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-dust-400">{hint}</p>}
    </div>
  );
}

/** Panneau de formulaire : fond brun, filet crème, titre condensé en capitales. */
export function Panel({ title, description, action, children }: {
  title: string; description?: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="border border-cream/[0.14] bg-ink-800 p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 font-display text-[32px] font-black uppercase leading-none text-cream md:text-[38px]">{title}</h2>
          {description && <div className="mt-2 max-w-[640px] text-sm leading-relaxed text-dust-300">{description}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const textareaClass =
  'flex min-h-[140px] w-full rounded-[4px] border border-cream/15 bg-black/30 px-3 py-2 text-sm text-cream placeholder:text-dust-500 hover:border-cream/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary';

export const selectClass =
  'flex h-11 w-full rounded-[4px] border border-cream/15 bg-ink-800 px-3 py-2 text-sm text-cream hover:border-cream/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary';

/** Convertit "" en null pour les champs optionnels. */
export const orNull = (v: string) => (v.trim() === '' ? null : v.trim());
export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
