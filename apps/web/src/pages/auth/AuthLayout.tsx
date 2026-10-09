import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import { Seo } from '@/components/common/Seo';

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(90%_70%_at_85%_0%,rgba(225,38,44,.16)_0%,rgba(18,19,22,0)_60%),#121316]">
      <Seo title={title} noindex />
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 items-center gap-12 px-4 py-10 sm:px-7 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-20">
        {/* Colonne d'accroche (grand écran) */}
        <div className="hidden flex-col gap-8 lg:flex">
          <Link to="/" className="flex items-center gap-3 text-cream hover:text-cream" aria-label="trophytracker, accueil">
            <LogoMark className="h-14 w-14" /> <Wordmark className="text-[38px]" />
          </Link>
          <p className="tt-display m-0 text-[clamp(64px,7vw,112px)] text-cream">
            Tes proches
            <br />
            te suivent
            <br />
            en <span className="text-signal">direct.</span>
          </p>
          <p className="m-0 max-w-[460px] text-[19px] leading-relaxed text-dust-200">
            Position, trace, photos et carnet de route, sur un seul lien. Gratuit pour les proches, sans application à installer.
          </p>
        </div>

        <div className="relative w-full min-w-0">
          <Link to="/" className="mb-8 flex items-center justify-center gap-[9px] text-cream hover:text-cream lg:hidden" aria-label="trophytracker, accueil">
            <LogoMark /> <Wordmark />
          </Link>
          <div className="rounded-[28px] border-[1.5px] border-ink-700 bg-ink-800 p-5 shadow-[0_24px_60px_rgba(0,0,0,.45)] sm:p-8 md:p-10">
            <h1 className="tt-display m-0 text-[clamp(34px,9vw,52px)] text-cream [overflow-wrap:anywhere]">{title}</h1>
            {subtitle && <p className="mb-0 mt-3 text-[17px] leading-relaxed text-dust-200">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-[15px] text-dust-300">{footer}</div>}
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
