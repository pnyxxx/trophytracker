import type { ReactNode } from 'react';
import { SiteHeader, type HeaderVariant } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

/**
 * Gabarit commun : en-tête, contenu, pied de page.
 * `header="floating"` (accueil) : l'en-tête flotte au-dessus du contenu, qui commence tout en haut.
 * `headerActions` : boutons propres à la page à la place de la navigation par défaut.
 */
export function PageShell({ children, header = 'sticky', headerActions }: {
  children: ReactNode;
  header?: HeaderVariant;
  headerActions?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <SiteHeader variant={header} actions={headerActions} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
