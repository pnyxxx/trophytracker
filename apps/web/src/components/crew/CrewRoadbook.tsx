/**
 * « La route » d'un équipage : compteur kilométrique, barre de progression
 * et roadbook des étapes (passée, en cours, à venir) selon la distance parcourue.
 */
import { useMemo } from 'react';
import type { Waypoint } from '@/lib/supabase';
import { haversineKm } from '@/lib/geo';
import { formatNumber } from '@/lib/format';
import { routeKmOf } from '@/components/landing/journey';
import { waypointStyle } from './mapIcons';

// La route réelle est ~30 % plus longue que la ligne droite entre les étapes.
const ROAD_FACTOR = 1.3;

export function CrewRoadbook({ waypoints, distanceKm, totalKm }: { waypoints: Waypoint[]; distanceKm: number; totalKm: number | null }) {
  // Kilomètre de chaque étape : lu sur la route de référence (celle de l'accueil) quand toutes les
  // étapes s'y trouvent ; sinon estimé à vol d'oiseau, mis à l'échelle de la distance officielle.
  const stops = useMemo(() => {
    const onRoute = waypoints.map((w) => routeKmOf(w.lat, w.lon));
    if (onRoute.every((km, i) => km !== null && (i === 0 || km >= onRoute[i - 1]!))) {
      return waypoints.map((w, i) => ({ ...w, km: onRoute[i]! - onRoute[0]! }));
    }
    let acc = 0;
    const raw = waypoints.map((w, i) => {
      const prev = waypoints[i - 1];
      if (prev) acc += haversineKm(prev.lat, prev.lon, w.lat, w.lon);
      return acc;
    });
    const length = totalKm ?? acc * ROAD_FACTOR;
    return waypoints.map((w, i) => ({ ...w, km: acc ? (raw[i]! / acc) * length : 0 }));
  }, [waypoints, totalKm]);

  const length = stops.at(-1)?.km ?? 0;
  const progress = length ? Math.min(1, distanceKm / length) : 0;
  const passed = (km: number) => distanceKm > 0 && km <= distanceKm;
  const next = stops.findIndex((s) => !passed(s.km)); // -1 : arrivés !
  const odometer = String(Math.round(distanceKm)).padStart(4, '0').split('');

  if (stops.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      {/* Compteur + progression */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-2.5">
          <div className="tt-kicker text-dust-700">Compteur</div>
          <div className="flex items-end gap-1" aria-label={`${Math.round(distanceKm)} kilomètres parcourus`}>
            {odometer.map((d, i) => (
              <div key={i} className="flex h-[62px] w-[44px] items-center justify-center rounded border border-ink-600 bg-[#050403] font-mono text-[36px] font-bold text-cream shadow-[inset_0_12px_16px_rgba(0,0,0,.6)] md:h-[70px] md:w-[50px] md:text-[42px]">
                {d}
              </div>
            ))}
            <span className="ml-2 pb-2 font-mono text-base text-primary">km</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 pb-1">
          <div className="relative h-[3px] bg-coal/20">
            <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${(progress * 100).toFixed(2)}%` }} />
            {stops.map((s) => (
              <span
                key={s.id}
                className="absolute -top-1 -ml-[5.5px] h-[11px] w-[11px] rounded-full border-2 border-coal"
                style={{ left: `${((s.km / (length || 1)) * 100).toFixed(2)}%`, background: passed(s.km) ? '#DB4740' : '#E9DCC8' }}
              />
            ))}
          </div>
          <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-dust-700">
            <span>{stops[0]!.name}</span>
            <span>{Math.round(progress * 100)} % du parcours</span>
            <span>{stops.at(-1)!.name}</span>
          </div>
        </div>
      </div>

      {/* Roadbook des étapes */}
      <div className="border-2 border-coal bg-cream">
        <div className="flex border-b-2 border-coal bg-coal font-mono text-[11px] uppercase tracking-[0.16em] text-sand" aria-hidden="true">
          <div className="w-[88px] shrink-0 px-4 py-2.5 md:w-[120px] md:px-5">Case</div>
          <div className="flex-1 px-4 py-2.5 md:px-5">Direction</div>
          <div className="px-4 py-2.5 text-right md:px-5">Statut</div>
        </div>
        <ol className="m-0 list-none p-0">
          {stops.map((s, i) => {
            const done = passed(s.km);
            const here = i === next && distanceKm > 0;
            return (
              <li key={s.id} className={`flex border-b-2 border-coal last:border-b-0 ${here ? 'bg-paper' : ''}`}>
                <div className="flex w-[88px] shrink-0 flex-col gap-1 border-r-2 border-coal px-4 py-5 md:w-[120px] md:px-5">
                  <span className="font-stencil text-[44px] font-black leading-[0.9] text-primary md:text-[56px]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-[11px] text-dust-700">KM {formatNumber(Math.round(s.km))}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-5 md:px-5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dust-700">
                    {[s.country, s.description ?? waypointStyle(s.kind).label].filter(Boolean).join(' — ')}
                  </span>
                  <h3 className="m-0 break-words font-display text-[28px] font-black uppercase leading-[0.95] text-coal md:text-[40px]">{s.name}</h3>
                </div>
                <div className="flex shrink-0 items-center px-4 md:px-5">
                  <span
                    className={`whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.14em] md:text-[11px] ${
                      here ? 'text-primary' : done ? 'text-coal' : 'text-dust-600'
                    }`}
                  >
                    {here ? '→ En route' : done ? '✓ Passée' : 'À venir'}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
