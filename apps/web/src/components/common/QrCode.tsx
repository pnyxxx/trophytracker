/** QR code dessiné en SVG (sans injection de HTML), avec sa marge blanche obligatoire. */
import { useMemo } from 'react';
import { encode } from 'uqr';
import { cn } from '@/lib/utils';

export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const path = useMemo(() => {
    const { data } = encode(value, { ecc: 'M', border: 0 });
    // Un seul chemin : un carré de 1×1 par module noir.
    return {
      size: data.length,
      d: data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ''))).join(''),
    };
  }, [value]);
  const quiet = 4; // marge blanche de 4 modules exigée par la norme QR
  const full = path.size + quiet * 2;
  return (
    <svg
      viewBox={`${-quiet} ${-quiet} ${full} ${full}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={cn('block bg-white', className)}
    >
      <rect x={-quiet} y={-quiet} width={full} height={full} fill="#fff" />
      <path d={path.d} fill="#000" />
    </svg>
  );
}
