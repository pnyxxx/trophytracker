import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SiteHeader, type HeaderVariant } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

/**
 * Gabarit commun : en-tête, contenu, pied de page.
 * `header="floating"` (accueil) : l'en-tête flotte au-dessus du contenu, qui commence tout en haut.
 * `headerActions` : boutons propres à la page à la place de la navigation par défaut.
 */
export function PageShell({ children, header = 'sticky', headerActions, relief = 'uni' }: {
  children: ReactNode;
  header?: HeaderVariant;
  headerActions?: ReactNode;
  /** Relief du fond (index.css, .tt-fond). Par défaut aucun (juste le dégradé) : la plupart des pages sont chargées. */
  relief?: 'dunes' | 'montagnes' | 'canyon' | 'collines' | 'uni';
}) {
  return (
    <div className={cn('tt-fond flex min-h-screen flex-col', relief !== 'dunes' && `tt-fond--${relief}`)}>
      <SiteHeader variant={header} actions={headerActions} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
