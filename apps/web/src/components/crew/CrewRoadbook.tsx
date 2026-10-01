/**
 * « La route » d'un équipage : compteur kilométrique, barre de progression, profil d'élévation
 * (s'il y a des altitudes GPS) et roadbook des étapes (passée, en cours, à venir) avec leurs
 * jours et sous-étapes.
 * L'étape en cours vient de la position GPS recalée sur le parcours, ET du calendrier (lib/stages.ts).
 */
import { lazy, Suspense } from 'react';
import { formatNumber } from '@/lib/format';
import { climbOf, pointsOfDays, type AltPoint } from '@/lib/elevation';
import type { RaidDay, StageStatus } from '@/lib/stages';
import { cn } from '@/lib/utils';
import { waypointStyle } from './mapIcons';
import type { Roadbook } from './roadbook';

const CrewElevation = lazy(() => import('./CrewElevation').then((m) => ({ default: m.CrewElevation })));

/** « J6 », « J6–8 » */
const daysLabel = (a: number | null, b: number | null) => (a == null ? null : b == null || b === a ? `J${a}` : `J${a}–${b}`);

const STATUS_TEXT: Record<StageStatus, string> = { done: '✓ Passée', current: '', upcoming: 'À venir' };

export function CrewRoadbook({ roadbook, cal, distanceKm, profile }: {
  roadbook: Roadbook; cal: RaidDay; distanceKm: number;
  /** Altitudes GPS de la trace (null : le téléphone n'en envoie pas → pas de profil). */
  profile: AltPoint[] | null;
}) {
  const { stops, state, planned } = roadbook;
  if (stops.length === 0) return null;

  const length = stops.at(-1)!.km || 1;
  const progress = Math.min(1, state.progressKm / length);
  const odometer = String(Math.round(distanceKm)).padStart(4, '0').split('');
  const plannedStop = stops[planned.index];
  const plannedSub = plannedStop?.subs[planned.sub];

  const currentText = state.finished ? '🏁 Arrivés' : state.here ? '● Sur place' : '→ En route';

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
            {stops.map((s, i) => (
              <span
                key={s.id}
                className="absolute -top-1 -ml-[5.5px] h-[11px] w-[11px] rounded-full border-2 border-coal"
                style={{ left: `${((s.km / length) * 100).toFixed(2)}%`, background: state.statuses[i] === 'done' || (state.statuses[i] === 'current' && state.here) ? '#DB4740' : '#E9DCC8' }}
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
            <span className="w-full text-sm text-dust-700">Pas de position GPS sur le parcours : l’étape en cours est celle du programme.</span>
          )}
        </p>
      )}

      {profile && (
        <Suspense fallback={<div className="h-[260px] animate-pulse bg-coal/5" />}>
          <CrewElevation profile={profile} stops={stops} cal={cal} />
        </Suspense>
      )}

      {/* Roadbook des étapes */}
      <div className="border-2 border-coal bg-cream">
        <div className="flex border-b-2 border-coal bg-coal font-mono text-[11px] uppercase tracking-[0.16em] text-sand" aria-hidden="true">
          <div className="w-[88px] shrink-0 px-4 py-2.5 md:w-[120px] md:px-5">Case</div>
          <div className="flex-1 px-4 py-2.5 md:px-5">Direction</div>
          <div className="px-4 py-2.5 text-right md:px-5">Statut</div>
        </div>
        <ol className="m-0 list-none p-0">
          {stops.map((s, i) => {
            const status = state.statuses[i]!;
            const current = status === 'current';
            // Dénivelé réel de l'étape : altitudes GPS des jours de l'étape.
            const climb = profile && s.day_start != null ? climbOf(pointsOfDays(profile, s.day_start, s.day_end ?? s.day_start)) : null;
            const days = daysLabel(s.day_start, s.day_end);
            return (
              <li key={s.id} className={cn('flex border-b-2 border-coal last:border-b-0', current && 'bg-paper')}>
                <div className="flex w-[88px] shrink-0 flex-col gap-1 border-r-2 border-coal px-4 py-5 md:w-[120px] md:px-5">
                  <span className="font-stencil text-[44px] font-black leading-[0.9] text-primary md:text-[56px]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-[11px] text-dust-700">KM {formatNumber(Math.round(s.km))}</span>
                  {days && <span className="font-mono text-[11px] font-bold text-coal">{days}</span>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-5 md:px-5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dust-700">
                    {[s.country, s.description ?? waypointStyle(s.kind).label].filter(Boolean).join(' — ')}
                  </span>
                  <h3 className="m-0 break-words font-display text-[28px] font-black uppercase leading-[0.95] text-coal md:text-[40px]">{s.name}</h3>
                  {climb && (
                    <span className="font-mono text-[11px] text-dust-700" aria-label={`Étape de ${climb.km} km, ${climb.up} mètres de montée, ${climb.down} mètres de descente`}>
                      {formatNumber(climb.km)} km · <span className="text-coal">↗ {formatNumber(climb.up)} m</span> · ↘ {formatNumber(climb.down)} m
                    </span>
                  )}
                  {s.subs.length > 0 && (
                    <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 border-l-2 border-dashed border-coal/40 p-0 pl-3">
                      {s.subs.map((u, k) => {
                        const st = state.subStatuses[i]![k]!;
                        return (
                          <li key={u.id} className="flex flex-wrap items-baseline gap-x-2.5">
                            <span className="font-display text-lg font-extrabold uppercase leading-tight text-coal">{waypointStyle(u.kind).emoji} {u.name}</span>
                            {daysLabel(u.day_start, u.day_end) && <span className="font-mono text-[11px] font-bold text-coal">{daysLabel(u.day_start, u.day_end)}</span>}
                            <span className={cn('font-mono text-[10px] font-bold uppercase tracking-[0.14em]', st === 'current' ? 'text-primary' : st === 'done' ? 'text-coal' : 'text-dust-600')}>
                              {st === 'current' ? '● En cours' : st === 'done' ? '✓ Faite' : 'À venir'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 items-center px-4 md:px-5">
                  <span
                    className={cn(
                      'whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.14em] md:text-[11px]',
                      current ? 'text-primary' : status === 'done' ? 'text-coal' : 'text-dust-600',
                    )}
                  >
                    {current ? currentText : STATUS_TEXT[status]}
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
