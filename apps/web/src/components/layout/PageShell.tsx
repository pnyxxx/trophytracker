import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

/** Gabarit commun : en-tête fixe, contenu, pied de page. */
export function PageShell({ children, padTop = true }: { children: ReactNode; padTop?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <SiteHeader />
      <main id="contenu" className={padTop ? 'flex-1 pt-[68px]' : 'flex-1'}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
