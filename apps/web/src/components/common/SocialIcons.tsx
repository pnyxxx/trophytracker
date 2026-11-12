/**
 * Logos actuels d'Instagram et de Facebook, en une couleur (currentColor) :
 * lucide-react ne propose plus que d'anciennes versions des logos de marques.
 */
import type { SVGProps } from 'react';
import { Globe, Linkedin, Music2, Twitter, Youtube } from 'lucide-react';
import type { LinkKind } from '@/lib/links';

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

/** Logo d'un lien de sponsor selon son réseau (lib/links.ts) ; un globe pour un site. */
export function LinkIcon({ kind, className }: { kind: LinkKind; className?: string }) {
  switch (kind) {
    case 'instagram': return <InstagramIcon className={className} />;
    case 'facebook': return <FacebookIcon className={className} />;
    case 'tiktok': return <Music2 className={className} aria-hidden="true" />;
    case 'youtube': return <Youtube className={className} aria-hidden="true" />;
    case 'linkedin': return <Linkedin className={className} aria-hidden="true" />;
    case 'x': return <Twitter className={className} aria-hidden="true" />;
    default: return <Globe className={className} aria-hidden="true" />;
  }
}
