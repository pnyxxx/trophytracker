/**
 * Carnet de route d'un road trip, en onglets :
 *  - Étapes : créées par les voyageurs, jour du voyage, lieu, durée et kilomètre de la trace où elles tombent ;
 *  - Journal : les pages du journal de bord publiées ;
 *  - Histoire : le récit libre des voyageurs (crews.story).
 */
import { useMemo, useState } from 'react';
import type { Photo, TripStage } from '@/lib/supabase';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { thumbUrl } from '@/lib/media';
import { formatNumber } from '@/lib/format';
import { haversineKm } from '@/lib/geo';
import { dayOfTrip } from '@/lib/days';
import { formatDuration } from '@/lib/stage-detect';
import { cn } from '@/lib/utils';
import { stageStyle } from './mapIcons';

export interface JournalItem {
  id: string;
  day: string;
  title: string;
  body: string;
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);
const hour = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const longDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Photos prises pendant une étape (ou dans les 12 h si l'étape n'a pas d'heure de départ). */
function photosOf(stage: TripStage, photos: Photo[]) {
  if (!stage.arrived_at) return [];
  const from = time(stage.arrived_at) - 30 * 60_000;
  const to = stage.left_at ? time(stage.left_at) + 30 * 60_000 : from + 12 * 3600_000;
  return photos.filter((p) => p.taken_at && time(p.taken_at) >= from && time(p.taken_at) <= to).slice(0, 4);
}

/** Kilomètre de la trace à un instant donné (premier point à cette heure ou après). */
function kmAt(points: readonly TrackPoint[], cum: number[], at: number) {
  if (!points.length || !Number.isFinite(at)) return null;
  const s = at / 1000;
  const i = points.findIndex((p) => p[2] >= s);
  return cum[i < 0 ? points.length - 1 : i] ?? null;
}

type Tab = 'etapes' | 'journal' | 'histoire';

export function CrewLogbook({ stages, photos, journal = [], story, points, startDate }: {
  stages: TripStage[];
  photos: Photo[];
  journal?: JournalItem[];
  story?: string | null;
  points: readonly TrackPoint[];
  /** Jour 1 du voyage (« AAAA-MM-JJ »), pour numéroter les étapes. */
  startDate: string | null;
}) {
  const tabs = ([
    ['etapes', 'Étapes', stages.length > 0],
    ['journal', 'Journal', journal.length > 0],
    ['histoire', 'Histoire', !!story],
  ] as const).filter((t) => t[2]);
  // Choix de l'onglet gardé ; par défaut le premier disponible (les étapes peuvent arriver après le récit).
  const [picked, setTab] = useState<Tab | null>(null);
  const tab: Tab = picked && tabs.some((t) => t[0] === picked) ? picked : tabs[0]?.[0] ?? 'etapes';
  const cum = useMemo(() => {
    const out = [0];
    for (let i = 1; i < points.length; i++) out.push(out[i - 1]! + haversineKm(points[i - 1]![0], points[i - 1]![1], points[i]![0], points[i]![1]));
    return out;
  }, [points]);
  const sorted = useMemo(() => [...stages].sort((a, b) => time(b.arrived_at) - time(a.arrived_at)), [stages]);
  const entries = useMemo(() => [...journal].sort((a, b) => b.day.localeCompare(a.day)), [journal]);
  if (!tabs.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="tt-display m-0 text-[36px] text-cream">Carnet de route</h2>
        {tabs.length > 1 && (
          <div role="tablist" aria-label="Carnet de route" className="flex gap-1 rounded-full bg-ink-800 p-1">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn('flex min-h-10 items-center rounded-full px-4 text-[15px] font-bold', tab === id ? 'bg-cream text-ink' : 'text-dust-100 hover:text-white')}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'etapes' && (
        <ol className="m-0 flex list-none flex-col p-0">
          {sorted.map((w, i) => {
            const style = stageStyle(w.kind);
            const day = startDate && w.arrived_at ? dayOfTrip(startDate, new Date(w.arrived_at)) : null;
            const km = kmAt(points, cum, time(w.arrived_at));
            const duration = w.arrived_at && w.left_at ? (time(w.left_at) - time(w.arrived_at)) / 1000 : null;
            const pics = photosOf(w, photos);
            const sub = [style.label, w.place !== w.name ? w.place : null, w.arrived_at ? hour(w.arrived_at) : null,
              duration && duration >= 600 ? formatDuration(duration) : null].filter(Boolean).join(' · ');
            return (
              <li key={w.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3.5 border-t-[1.5px] border-ink-700 py-3.5">
                <span className={cn('flex h-11 items-center justify-center rounded-[14px] font-mono text-[14px]', i === 0 ? 'bg-signal text-white' : 'bg-ink-700 text-dust-100')}>
                  {day && day >= 1 ? `J${day}` : style.emoji}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[18px] font-bold text-cream">{w.name}</span>
                  <span className="text-[15px] text-dust-400">{sub}</span>
                  {w.note && <p className="mb-0 mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-dust-200">{w.note}</p>}
                  {pics.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {pics.map((p) => (
                        <a key={p.id} href="#photos" className="block shrink-0">
                          <img src={thumbUrl(p.storage_path, 320) ?? ''} alt={p.title} loading="lazy" className="h-20 w-28 rounded-xl object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <span className="self-start whitespace-nowrap pt-2.5 font-mono text-[14px] text-dust-300">{km != null ? `km ${formatNumber(km)}` : ''}</span>
              </li>
            );
          })}
        </ol>
      )}

      {tab === 'journal' && (
        <div className="flex flex-col gap-3">
          {entries.map((j) => {
            const day = startDate ? dayOfTrip(startDate, new Date(`${j.day}T12:00:00`)) : null;
            return (
              <article key={j.id} className="flex flex-col gap-2.5 rounded-[24px] bg-ink-800 p-5">
                <span className="font-mono text-[13px] text-signal-text">{day && day >= 1 ? `J${day} · ` : ''}{longDay(j.day)}</span>
                <h3 className="tt-display m-0 text-[24px] text-cream">{j.title}</h3>
                <p className="m-0 whitespace-pre-line text-[17px] leading-relaxed text-dust-100">{j.body}</p>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'histoire' && story && (
        <div className="whitespace-pre-line rounded-[24px] bg-ink-800 p-5 text-[17px] leading-relaxed text-dust-100">{story}</div>
      )}
    </div>
  );
}
