import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="m-0 text-[14px] leading-relaxed text-dust-400">{hint}</p>}
    </div>
  );
}

/** Panneau de formulaire « Balise » : carte arrondie, grand titre Bricolage. */
export function Panel({ title, description, action, children }: {
  title: string; description?: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border-[1.5px] border-ink-700 bg-ink-800 p-5 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="tt-display m-0 text-[28px] leading-none text-cream md:text-[34px]">{title}</h2>
          {description && <div className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-dust-300">{description}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const textareaClass =
  'flex min-h-[140px] w-full rounded-2xl border-2 border-ink-600 bg-ink px-4 py-3 text-[17px] text-cream placeholder:text-dust-600 hover:border-dust-600 focus-visible:border-cream focus-visible:outline-none';

export const selectClass =
  'flex min-h-14 w-full rounded-2xl border-2 border-ink-600 bg-ink px-4 py-2 text-[17px] text-cream hover:border-dust-600 focus-visible:border-cream focus-visible:outline-none';

/** Convertit "" en null pour les champs optionnels. */
export const orNull = (v: string) => (v.trim() === '' ? null : v.trim());
export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
