import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export function Panel({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6 md:p-8">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {description && <div className="mb-6 mt-1 text-sm text-white/60">{description}</div>}
      {!description && <div className="mb-6" />}
      {children}
    </section>
  );
}

export const textareaClass =
  'flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Convertit "" en null pour les champs optionnels. */
export const orNull = (v: string) => (v.trim() === '' ? null : v.trim());
export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
