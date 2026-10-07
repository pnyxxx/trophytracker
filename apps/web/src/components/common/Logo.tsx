import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Logo « Balise » : une balise qui émet, le point « je suis là » et ses ondes. C'est aussi le
 * marqueur de position sur les cartes : le logo et l'interface parlent la même langue.
 * Règles : toujours en minuscules, « tracker » en rouge, jamais de véhicule.
 */
export function LogoMark({ className, tone = 'signal' }: { className?: string; tone?: 'signal' | 'cream' }) {
  const cream = tone === 'cream';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full',
        cream ? 'bg-cream shadow-[0_0_0_4px_rgba(245,241,234,.22)]' : 'bg-signal shadow-[0_0_0_4px_rgba(225,38,44,.22)]',
        className,
      )}
    >
      <span className={cn('h-[31%] w-[31%] rounded-full', cream ? 'bg-signal' : 'bg-cream')} />
    </span>
  );
}

/** « trophytracker » en minuscules, « tracker » en rouge. */
export function Wordmark({ className, plain = false }: { className?: string; plain?: boolean }) {
  return (
    <span className={cn('font-display text-[20px] font-extrabold tracking-[-0.03em]', className)}>
      trophy<span className={plain ? undefined : 'text-signal'}>tracker</span>
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn('flex items-center gap-[9px] text-cream no-underline hover:text-cream', className)} aria-label="trophytracker, accueil">
      <LogoMark />
      {!compact && <Wordmark />}
    </Link>
  );
}
