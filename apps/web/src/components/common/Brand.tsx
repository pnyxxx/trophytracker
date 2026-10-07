/**
 * Briques visuelles du système « Balise » réutilisées sur toutes les pages :
 * étiquettes DM Mono, pastille « en direct », grands titres et en-tête de page.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Petite étiquette de données DM Mono (rouge « texte » par défaut). */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('tt-kicker flex items-center gap-2 text-signal-text', className)}>{children}</div>;
}

/** Pastille verte qui pulse : l'équipage émet en ce moment. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden="true">
      <span className="absolute inset-0 animate-ping rounded-full bg-live" />
      <span className="absolute inset-0 rounded-full bg-live" />
    </span>
  );
}

/** Grand titre de section (h2), Bricolage Grotesque 800. */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('tt-display m-0 text-[clamp(36px,4.6vw,64px)]', className)}>{children}</h2>;
}

/**
 * En-tête des pages intérieures : étiquette, grand titre, texte d'introduction et actions à droite.
 */
export function PageHero({ kicker, title, children, aside, className }: {
  kicker?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('relative', className)}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 pb-10 pt-12 md:flex-row md:items-end md:justify-between md:pb-12 md:pt-16">
        <div className="flex min-w-0 flex-col gap-4">
          {kicker && <Kicker className="text-dust-400">{kicker}</Kicker>}
          <h1 className="tt-display m-0 break-words text-[clamp(40px,6vw,88px)] text-cream">{title}</h1>
          {children && <div className="max-w-[620px] text-[19px] leading-relaxed text-dust-100">{children}</div>}
        </div>
        {aside && <div className="flex shrink-0 flex-col gap-3 md:items-end">{aside}</div>}
      </div>
    </section>
  );
}

/** Conteneur standard des pages (largeur max + gouttières). */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1440px] px-5', className)}>{children}</div>;
}
