/**
 * Mise en page commune des pages légales (mentions légales, CGU, confidentialité) :
 * en-tête, colonne de texte lisible et date de mise à jour.
 */
import type { ReactNode } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Container, PageHero } from '@/components/common/Brand';
import { LEGAL_UPDATED_AT } from '@/lib/legal';

export function LegalPage({ seoTitle, title, intro, children }: {
  seoTitle: string;
  title: ReactNode;
  /** Paragraphe d'introduction mis en avant. */
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageShell padTop={false}>
      <Seo title={seoTitle} />
      <PageHero kicker="Informations" title={title} />
      <Container className="border-t border-cream/[0.12] py-14 md:py-20">
        <article className="max-w-3xl text-lg leading-relaxed text-dust-100 [&_a]:text-primary-light [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-cream [&_h2]:mb-4 [&_h2]:mt-14 [&_h2]:border-t [&_h2]:border-cream/[0.14] [&_h2]:pt-8 [&_h2]:font-display [&_h2]:text-[40px] [&_h2]:font-extrabold [&_h2]: [&_h2]:leading-none [&_h2]:text-cream [&>h2:first-child]:mt-0 [&>h2:first-child]:border-t-0 [&>h2:first-child]:pt-0 [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-cream [&_li]:mb-2 [&_p]:mb-4 [&_strong]:text-cream [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-primary">
          {intro && <p className="border-l-[3px] border-primary pl-5 text-xl text-cream">{intro}</p>}
          {children}
          <p className="mt-14 font-mono text-xs uppercase tracking-[0.12em] text-dust-500">Dernière mise à jour : {LEGAL_UPDATED_AT}</p>
        </article>
      </Container>
    </PageShell>
  );
}
