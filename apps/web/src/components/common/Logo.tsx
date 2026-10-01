import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LOGO_TONES as TONES } from './logo-svg';

/**
 * Logo validé « La trace dessine la 4L » (docs/branding/) : la trace part du sol,
 * dessine le profil de la 4L d'un seul trait et s'arrête sur le point rouge en direct.
 * `tone` : « dark » sur fond sombre (le site), « light » sur fond clair.
 */
export function LogoMark({ className, tone = 'dark' }: { className?: string; tone?: keyof typeof TONES }) {
  const c = TONES[tone];
  return (
    <svg viewBox="0 0 64 64" className={cn('h-11 w-11 shrink-0', className)} aria-hidden="true">
      <g transform="translate(1 2.5) scale(0.93)">
        <path d="M5 51 H12 V24 Q12 21 15 21 H38 L46 29 H54 Q58 29 58 33" fill="none" stroke={c.trace} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="46" r="5.5" fill={c.wheelFill} stroke={c.ink} strokeWidth="3" />
        <circle cx="47" cy="46" r="5.5" fill={c.wheelFill} stroke={c.ink} strokeWidth="3" />
        <circle cx="5" cy="51" r="3" fill={c.wheelFill} stroke={c.ink} strokeWidth="2.5" />
        <circle cx="58" cy="33" r="10" fill="none" stroke="#DB4740" strokeWidth="2" opacity="0.45" />
        <circle cx="58" cy="33" r="6" fill="#DB4740" stroke={c.dotStroke} strokeWidth="2.8" />
      </g>
    </svg>
  );
}

/**
 * Nom de la marque en capitales condensées, « Tracker » toujours en rouge
 * (choix de Julien : la maquette le mettait en doré sur fond sombre).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-2xl font-black uppercase leading-[0.85]', className)}>
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
