/**
 * Carnet de route d'un road trip : une frise chronologique des étapes (créées par les voyageurs)
 * et des pages du journal de bord, avec les photos prises à chaque étape.
 */
import type { Photo, TripStage } from '@/lib/supabase';
import { thumbUrl } from '@/lib/media';
import { formatDuration } from '@/lib/stage-detect';
import { stageStyle } from './mapIcons';

export interface JournalItem {
  id: string;
  day: string;
  title: string;
  body: string;
}

type Item =
  | { type: 'stage'; at: number; stage: TripStage }
  | { type: 'journal'; at: number; entry: JournalItem };

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);
const dayLabel = (ms: number) =>
  new Date(ms).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const hour = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Photos prises pendant une étape (ou ce jour-là si l'étape n'a pas d'heure de départ). */
function photosOf(stage: TripStage, photos: Photo[]) {
  if (!stage.arrived_at) return [];
  const from = time(stage.arrived_at) - 30 * 60_000;
  const to = stage.left_at ? time(stage.left_at) + 30 * 60_000 : from + 12 * 3600_000;
  return photos.filter((p) => p.taken_at && time(p.taken_at) >= from && time(p.taken_at) <= to).slice(0, 4);
}

export function CrewLogbook({ stages, photos, journal = [] }: { stages: TripStage[]; photos: Photo[]; journal?: JournalItem[] }) {
  const items: Item[] = [
    ...stages.map((stage) => ({ type: 'stage' as const, at: time(stage.arrived_at), stage })),
    ...journal.map((entry) => ({ type: 'journal' as const, at: new Date(`${entry.day}T21:00:00`).getTime(), entry })),
  ].sort((a, b) => a.at - b.at);

  let lastDay = '';
  return (
    <ol className="relative m-0 list-none border-l-2 border-coal/20 p-0 pl-6 md:pl-10">
      {items.map((it) => {
        const day = Number.isFinite(it.at) ? dayLabel(it.at) : 'Sans date';
        const header = day !== lastDay ? day : null;
        lastDay = day;
        return (
          <li key={it.type === 'stage' ? it.stage.id : it.entry.id} className="relative pb-10 last:pb-0">
            {header && <p className="tt-kicker -ml-6 mb-4 mt-2 text-primary md:-ml-10">{header}</p>}
            {it.type === 'stage' ? <StageCard stage={it.stage} photos={photosOf(it.stage, photos)} /> : <JournalCard entry={it.entry} />}
          </li>
        );
      })}
    </ol>
  );
}

function StageCard({ stage, photos }: { stage: TripStage; photos: Photo[] }) {
  const style = stageStyle(stage.kind);
  const duration = stage.arrived_at && stage.left_at ? (time(stage.left_at) - time(stage.arrived_at)) / 1000 : null;
  return (
    <article className="relative">
      <span
        className="absolute -left-[33px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-cream text-xs md:-left-[49px]"
        style={{ background: style.color }}
        aria-hidden="true"
      >
        {style.emoji}
      </span>
      <p className="m-0 font-mono text-[11px] uppercase tracking-[0.14em] text-dust-700">
        {[style.label, stage.place !== stage.name ? stage.place : null, stage.arrived_at ? hour(stage.arrived_at) : null,
          duration && duration >= 600 ? formatDuration(duration) : null].filter(Boolean).join(' · ')}
      </p>
      <h3 className="m-0 mt-1 font-display text-3xl font-black uppercase leading-none text-coal md:text-4xl">{stage.name}</h3>
      {stage.note && <p className="mb-0 mt-3 max-w-2xl whitespace-pre-line text-base leading-relaxed text-dust-800">{stage.note}</p>}
      {photos.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {photos.map((p) => (
            <a key={p.id} href="#photos" className="block shrink-0">
              <img src={thumbUrl(p.storage_path, 320) ?? ''} alt={p.title} loading="lazy" className="h-28 w-40 border-2 border-coal object-cover" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function JournalCard({ entry }: { entry: JournalItem }) {
  return (
    <article className="relative border-2 border-coal bg-cream p-5 md:p-6">
      <span className="absolute -left-[33px] top-5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-cream bg-coal text-xs md:-left-[49px]" aria-hidden="true">✍️</span>
      <p className="tt-kicker m-0 text-ochre">Journal de bord</p>
      <h3 className="m-0 mt-1 font-display text-2xl font-black uppercase leading-none text-coal md:text-3xl">{entry.title}</h3>
      <p className="mb-0 mt-3 whitespace-pre-line text-base leading-relaxed text-dust-800">{entry.body}</p>
    </article>
  );
}
