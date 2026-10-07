import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import { Kicker } from '@/components/common/Brand';
import { Seo } from '@/components/common/Seo';

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(120%_80%_at_80%_0%,#3A2215_0%,#1B1310_45%,#120F0C_75%)]">
      <Seo title={title} noindex />
      <div className="mx-auto grid min-h-screen max-w-[1400px] items-center gap-12 px-4 py-10 grid-cols-1 sm:px-7 lg:grid-cols-[1fr_minmax(0,480px)] lg:gap-20">
        {/* Colonne d'accroche (grand écran) */}
        <div className="hidden flex-col gap-8 lg:flex">
          <Link to="/" className="flex items-center gap-3.5 text-cream hover:text-cream" aria-label="Accueil TrophyTracker">
            <LogoMark className="h-14 w-14" /> <Wordmark className="text-[40px]" />
          </Link>
          <p className="m-0 font-display text-[clamp(64px,7vw,120px)] font-black uppercase leading-[0.95] text-cream">
            Suivez
            <br />
            leur aventure
            <br />
            en <span className="font-stencil text-primary">direct.</span>
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-dust-400">
            <span>Raids · Road trips</span>
            <span>Tours du monde · Expéditions</span>
          </div>
        </div>

        <div className="relative w-full min-w-0">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 text-cream hover:text-cream lg:hidden" aria-label="Accueil TrophyTracker">
            <LogoMark /> <Wordmark />
          </Link>
          <div className="border border-cream/[0.14] border-t-[3px] border-t-primary bg-ink-800/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,.45)] sm:p-7 md:p-9">
            <Kicker className="mb-4">Espace membre</Kicker>
            <h1 className="m-0 font-display text-[clamp(32px,10vw,44px)] font-black uppercase leading-[0.95] text-cream [overflow-wrap:anywhere] md:text-[52px]">{title}</h1>
            {subtitle && <p className="mb-0 mt-3 text-sm leading-relaxed text-dust-300">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-sm text-dust-300">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * Évite les redirections ouvertes : seuls les chemins internes (« /… ») sont acceptés.
 * « //site.com » et « /\\site.com » sont interprétés par les navigateurs comme des
 * adresses externes : on les refuse, ainsi que tout caractère de contrôle.
 */
export function safeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || /[\\\s]/.test(next)) return '/mon-compte';
  return next;
}
