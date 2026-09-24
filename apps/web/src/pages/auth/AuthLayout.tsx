import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/common/Logo';
import { Seo } from '@/components/common/Seo';

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12">
      <Seo title={title} />
      <div className="absolute -left-40 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 text-xl font-bold text-white">
          <LogoMark /> Trophys<span className="-ml-2.5 text-primary">Tracker</span>
        </Link>
        <div className="glass rounded-3xl p-8">
          <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">{title}</h1>
          {subtitle && <p className="mb-6 text-sm text-white/60">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-white/60">{footer}</div>}
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
