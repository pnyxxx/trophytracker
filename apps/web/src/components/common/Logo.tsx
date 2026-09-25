import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** Logo TrophyTracker : un repère GPS stylisé + le nom. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#DB4740" />
      <path d="M16 6.5c-4 0-7 3-7 6.9 0 5.2 7 12.1 7 12.1s7-6.9 7-12.1c0-3.9-3-6.9-7-6.9z" fill="white" />
      <circle cx="16" cy="13.4" r="2.7" fill="#DB4740" />
    </svg>
  );
}

/** Nom de la marque en capitales condensées, « Tracker » en rouge. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-2xl font-black uppercase tracking-[0.02em]', className)}>
      Trophy<span className="text-primary">Tracker</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 text-cream hover:text-cream', className)} aria-label="Accueil TrophyTracker">
      <LogoMark />
      <Wordmark />
    </Link>
  );
}
