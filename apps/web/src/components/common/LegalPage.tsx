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
    <PageShell>
      <Seo title={seoTitle} />
      <PageHero kicker="informations" title={title} />
      <Container className="border-t-[1.5px] border-ink-700 py-12 md:py-16">
        <article className="max-w-3xl text-[18px] leading-relaxed text-dust-100 [&_a]:text-signal-text [&_a]:underline [&_a]:underline-offset-[3px] [&_a:hover]:text-cream [&_h2]:mb-4 [&_h2]:mt-14 [&_h2]:font-display [&_h2]:text-[34px] [&_h2]:font-extrabold [&_h2]:leading-none [&_h2]:tracking-[-0.035em] [&_h2]:text-cream [&>h2:first-child]:mt-0 [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-[20px] [&_h3]:font-bold [&_h3]:text-cream [&_li]:mb-2 [&_p]:mb-4 [&_strong]:text-cream [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-signal">
          {intro && <p className="rounded-[24px] bg-ink-800 p-5 text-[19px] text-cream">{intro}</p>}
          {children}
          <p className="mt-14 font-mono text-[13px] text-dust-500">dernière mise à jour : {LEGAL_UPDATED_AT}</p>
        </article>
      </Container>
    </PageShell>
  );
}
