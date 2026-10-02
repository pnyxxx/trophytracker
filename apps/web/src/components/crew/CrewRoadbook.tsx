/**
 * « La route » d'un équipage : compteur kilométrique (sa vraie distance GPS), % du parcours,
 * profil d'élévation (s'il y a des altitudes GPS) et roadbook des étapes de panneau en panneau
 * (Biarritz → Salamanque, …, boucles) : terminée, en cours, à venir.
 * L'étape en cours vient du calendrier, précisé par la position GPS (lib/stages.ts).
 */
import { lazy, Suspense } from 'react';
import { formatNumber } from '@/lib/format';
import { climbOf, pointsOfDays, type AltPoint } from '@/lib/elevation';
import type { Leg, LegStatus, RaidDay, StageStatus } from '@/lib/stages';
import { cn } from '@/lib/utils';
import { waypointStyle } from './mapIcons';
import type { Roadbook } from './roadbook';

const CrewElevation = lazy(() => import('./CrewElevation').then((m) => ({ default: m.CrewElevation })));

/** « J6 », « J6–8 » */
const daysLabel = (a: number | null, b: number | null) => (a == null ? null : b == null || b === a ? `J${a}` : `J${a}–${b}`);

const LEG_TEXT: Record<LegStatus, string> = { done: '✓ Terminée', current: '→ En route', ready: '◆ Au départ', upcoming: 'À venir' };
const START_TEXT: Record<StageStatus, string> = { done: '✓ Partis', current: '● Sur place', upcoming: 'À venir' };

export function CrewRoadbook({ roadbook, cal, distanceKm, profile }: {
  roadbook: Roadbook; cal: RaidDay; distanceKm: number;
  /** Altitudes GPS de la trace (null : le téléphone n'en envoie pas → pas de profil). */
  profile: AltPoint[] | null;
}) {
  const { stops, state, legs, progress, planned } = roadbook;
  if (stops.length === 0) return null;

  const odometer = String(Math.round(distanceKm)).padStart(4, '0').split('');
  const plannedStop = stops[planned.index];
  const plannedSub = plannedStop?.subs[planned.sub];
  const start = stops[0]!;
  // Position de chaque panneau sur la barre : au prorata du poids des étapes.
  const total = legs.reduce((t, l) => t + l.weight, 0) || 1;
  const marks = legs.reduce<number[]>((acc, l) => [...acc, (acc.at(-1) ?? 0) + l.weight / total], []);

  const statusText = (l: Leg, i: number) => {
    if (l.status === 'current' && l.type === 'loop') return '● En cours';
    if (l.status === 'done' && i === legs.length - 1) return '🏁 Arrivés';
    return LEG_TEXT[l.status];
  };

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
            {[0, ...marks].map((f, i) => (
              <span
                key={i}
                className="absolute -top-1 -ml-[5.5px] h-[11px] w-[11px] rounded-full border-2 border-coal"
                style={{ left: `${(f * 100).toFixed(2)}%`, background: i === 0 ? (state.index >= 0 ? '#DB4740' : '#E9DCC8') : legs[i - 1]!.status === 'done' ? '#DB4740' : '#E9DCC8' }}
              />
            ))}
          </div>
          <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-dust-700">
            <span>{start.name}</span>
            <span>{Math.round(progress * 100)} % du parcours</span>
            <span>{stops.at(-1)!.name}</span>
          </div>
        </div>
      </div>

      {/* Calendrier ↔ étapes : le jour du raid et ce qui est prévu au programme */}
      {cal.phase === 'during' && (
        <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-[3px] border-primary pl-4 text-coal">
          <span className="font-display text-3xl font-black uppercase leading-none">J{cal.day}{cal.total ? <span className="font-mono text-sm font-normal text-dust-700"> / {cal.total}</span> : null}</span>
          {plannedStop && (
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-dust-700">
              Au programme : {plannedSub ? `${plannedSub.name} · ${plannedStop.name}` : plannedStop.name}
            </span>
          )}
          {state.source === 'programme' && (
            <span className="w-full text-sm text-dust-700">Pas de position GPS ces derniers jours : l’étape affichée est celle du programme.</span>
          )}
        </p>
      )}

      {profile && (
        <Suspense fallback={<div className="h-[260px] animate-pulse bg-coal/5" />}>
          <CrewElevation profile={profile} stops={stops} cal={cal} />
        </Suspense>
      )}

      {/* Roadbook : une case par étape, du panneau de départ au panneau d'arrivée */}
      <div className="border-2 border-coal bg-cream">
        <div className="flex border-b-2 border-coal bg-coal font-mono text-[11px] uppercase tracking-[0.16em] text-sand" aria-hidden="true">
          <div className="w-[88px] shrink-0 px-4 py-2.5 md:w-[120px] md:px-5">Case</div>
          <div className="flex-1 px-4 py-2.5 md:px-5">Direction</div>
          <div className="px-4 py-2.5 text-right md:px-5">Statut</div>
        </div>
        <ol className="m-0 list-none p-0">
          {/* Départ : le village, avant la première étape */}
          <li className={cn('flex border-b-2 border-coal', state.index === 0 && !state.finished && 'bg-paper')}>
            <div className="flex w-[88px] shrink-0 flex-col justify-center gap-1 border-r-2 border-coal px-4 py-4 md:w-[120px] md:px-5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Départ</span>
              {daysLabel(start.day_start, start.day_end) && <span className="font-mono text-[11px] font-bold text-coal">{daysLabel(start.day_start, start.day_end)}</span>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-4 md:px-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dust-700">
                {[start.country, start.description ?? waypointStyle(start.kind).label].filter(Boolean).join(' — ')}
              </span>
              <h3 className="m-0 break-words font-display text-[24px] font-black uppercase leading-[0.95] text-coal md:text-[30px]">{start.name}</h3>
            </div>
            <div className="flex shrink-0 items-center px-4 md:px-5">
              <span className={cn('whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.14em] md:text-[11px]', state.statuses[0] === 'current' ? 'text-primary' : state.statuses[0] === 'done' ? 'text-coal' : 'text-dust-600')}>
                {START_TEXT[state.statuses[0] ?? 'upcoming']}
              </span>
            </div>
          </li>

          {legs.map((l, i) => {
            const to = stops[l.to]!;
            const from = stops[l.from]!;
            const sub = l.type === 'loop' ? to.subs[l.sub] : undefined;
            const active = l.status === 'current' || l.status === 'ready';
            // Vraie distance et dénivelé de l'étape (positions GPS de ses jours), une fois commencée.
            const climb = profile && l.dayStart != null && (l.status === 'done' || l.status === 'current')
              ? climbOf(pointsOfDays(profile, l.dayStart, l.dayEnd ?? l.dayStart))
              : null;
            const days = daysLabel(l.dayStart, l.dayEnd);
            const kicker = sub
              ? [to.country, sub.description ?? `Boucle autour de ${to.name}`]
              : [to.country, to.description ?? waypointStyle(to.kind).label, l.via.length ? `via ${l.via.map((v) => stops[v]!.name).join(', ')}` : null];
            return (
              <li key={sub ? sub.id : to.id} className={cn('flex border-b-2 border-coal last:border-b-0', active && 'bg-paper')}>
                <div className="flex w-[88px] shrink-0 flex-col gap-1 border-r-2 border-coal px-4 py-5 md:w-[120px] md:px-5">
                  <span className="font-stencil text-[44px] font-black leading-[0.9] text-primary md:text-[56px]">{String(i + 1).padStart(2, '0')}</span>
                  {days && <span className="font-mono text-[11px] font-bold text-coal">{days}</span>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-5 md:px-5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dust-700">{kicker.filter(Boolean).join(' — ')}</span>
                  <h3 className="m-0 break-words font-display text-[28px] font-black uppercase leading-[0.95] text-coal md:text-[40px]">
                    {sub ? (
                      <>{waypointStyle(sub.kind).emoji} {sub.name}</>
                    ) : (
                      <><span className="text-dust-600">{from.name} →</span> {to.name}</>
                    )}
                  </h3>
                  {climb && (
                    <span className="font-mono text-[11px] text-dust-700" aria-label={`${climb.km} km, ${climb.up} mètres de montée, ${climb.down} mètres de descente${l.status === 'current' ? ', étape en cours' : ''}`}>
                      {formatNumber(climb.km)} km · <span className="text-coal">↗ {formatNumber(climb.up)} m</span> · ↘ {formatNumber(climb.down)} m
                      {l.status === 'current' && <span className="text-primary"> · en cours</span>}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center px-4 md:px-5">
                  <span
                    className={cn(
                      'whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.14em] md:text-[11px]',
                      active ? 'text-primary' : l.status === 'done' ? 'text-coal' : 'text-dust-600',
                    )}
                  >
                    {statusText(l, i)}
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
