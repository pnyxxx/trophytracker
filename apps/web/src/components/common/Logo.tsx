import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { logoMarkPaths, type LogoTone } from './logo-svg';

/**
 * Logo « La trace dessine la 4L » (docs/branding/), remis le 9 octobre 2026 à la demande de Julien :
 * la trace part du sol, dessine le profil de la voiture d'un seul trait et s'arrête sur le point rouge en direct.
 * `tone` : « dark » sur fond sombre (le site), « light » sur fond clair.
 */
export function LogoMark({ className, tone = 'dark' }: { className?: string; tone?: LogoTone }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-10 w-10 shrink-0', className)} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: logoMarkPaths(tone) }} />
  );
}

/** Nom de la marque en capitales condensées (Big Shoulders Display), « Tracker » toujours en rouge. */
export function Wordmark({ className, plain = false }: { className?: string; plain?: boolean }) {
  return (
    <span className={cn('font-logo text-[26px] font-black uppercase leading-[0.85] tracking-[0.01em]', className)}>
      Trophy<span className={plain ? undefined : 'text-signal'}>Tracker</span>
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2 text-cream no-underline hover:text-cream', className)} aria-label="TrophyTracker, accueil">
      <LogoMark />
      {!compact && <Wordmark />}
    </Link>
  );
}
