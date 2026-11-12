/**
 * Visuel principal de l'accueil : la carte « en direct » du road trip d'exemple, telle que la voient les proches.
 * Vraie carte au thème « sable de nuit » (ExampleMap, chargée à part) ; tant qu'elle charge, le cadre montre les
 * dunes. La télémétrie bouge doucement (arrêtée si l'utilisateur préfère moins d'animations).
 * Le cadre prend la hauteur que lui donne la page : tout l'écran restant sur téléphone, fixe sur ordinateur.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import ROUTE from './example-route.json';

const ExampleMap = lazy(() => import('./ExampleMap'));

const fmt = (n: number) => n.toLocaleString('fr-FR');

/** Secondes écoulées depuis l'ouverture (arrêté si l'utilisateur préfère moins d'animations). */
function useTicker() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setT((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

export function LiveScene({ className }: { className?: string }) {
  const t = useTicker();
  const ago = 2 + (t % 7);
  const stats = [
    { l: 'distance', v: fmt(ROUTE.km), u: 'km' },
    { l: 'vitesse', v: String(Math.round(41 + 5 * Math.sin(t / 3))), u: 'km/h' },
    { l: 'altitude', v: fmt(ROUTE.altitude), u: 'm' },
    { l: 'météo', v: '9°', u: '' },
  ];

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-[28px] border-[1.5px] border-cream/[0.14] bg-[#17130F] shadow-[0_40px_90px_rgba(0,0,0,.55)]', className)}>
      {/* La carte */}
      <div className="relative min-h-0 flex-1 bg-[url('/accueil/dunes.svg')] bg-cover bg-center">
        <div className="absolute inset-0" aria-hidden="true">
          <Suspense fallback={null}>
            <ExampleMap mode="overview" />
          </Suspense>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(18,19,22,.85))]" />

        {/* En-tête de la carte */}
        <div className="pointer-events-none absolute inset-x-3.5 top-3.5 flex flex-wrap items-center gap-2" aria-hidden="true">
          <span className="flex items-center gap-2 rounded-full bg-[#121316]/85 px-3 py-1.5 font-mono text-[0.7059rem] text-live-text backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-live" />
            en direct · il y a {ago} s
          </span>
          <span className="rounded-full bg-cream px-3 py-1.5 font-mono text-[0.7059rem] text-coal">privé</span>
        </div>

        {/* Le road trip */}
        <div className="pointer-events-none absolute bottom-3.5 left-4 right-12 flex flex-col">
          <span className="font-mono text-[0.6471rem] text-dust-300">Léa &amp; Sam · jour 3</span>
          <span className="tt-display truncate text-[1.4118rem] leading-tight text-cream">Route des Grandes Alpes</span>
        </div>
      </div>

      {/* Télémétrie */}
      <div className="grid flex-none grid-cols-4 gap-px border-t-[1.5px] border-cream/[0.1] bg-cream/[0.08]" aria-hidden="true">
        {stats.map((s) => (
          <div key={s.l} className="flex flex-col gap-0.5 bg-[#121316] px-3 py-2.5 sm:px-4 sm:py-3">
            <span className="font-mono text-[0.5882rem] uppercase tracking-[0.1em] text-dust-500">{s.l}</span>
            <span className="whitespace-nowrap font-mono text-[0.8824rem] font-medium text-cream sm:text-[1rem]">
              {s.v}
              {s.u && <span className="ml-1 text-[0.6471rem] text-dust-400">{s.u}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
