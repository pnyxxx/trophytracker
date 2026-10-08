/** Galerie du road trip : photos classiques et panoramas 360° interactifs. */
import { lazy, Suspense, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import type { Photo } from '@/lib/supabase';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { Spinner } from '@/components/common/Spinner';
import { cn } from '@/lib/utils';

const Photo360Viewer = lazy(() => import('@/components/Photo360Viewer').then((m) => ({ default: m.Photo360Viewer })));

/** Mosaïque : la première photo en grand, 6 au plus avant « voir les N ». */
const PREVIEW = 6;

export function CrewGallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const current = index != null ? photos[index] : null;
  const go = (delta: number) => setIndex((i) => (i == null ? i : (i + delta + photos.length) % photos.length));
  const shown = all ? photos : photos.slice(0, PREVIEW);

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="tt-display m-0 text-[36px] text-cream">Photos</h2>
        {photos.length > PREVIEW && (
          <button type="button" onClick={() => setAll((v) => !v)} className="font-mono text-[14px] text-signal-text hover:text-cream">
            {all ? 'voir moins' : `voir les ${photos.length}`}
          </button>
        )}
      </div>
      <div className="grid auto-rows-[120px] grid-cols-3 gap-2 sm:auto-rows-[140px]">
        {shown.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              'group relative overflow-hidden rounded-[22px] bg-ink-800 text-left focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cream',
              i === 0 && 'col-span-2 row-span-2',
              i === 4 && !all && 'col-span-2',
            )}
            aria-label={`Voir la photo ${p.title}`}
          >
            <img
              src={thumbUrl(p.storage_path, i === 0 ? 960 : 480) ?? ''}
              alt={p.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            {p.kind === 'panorama' && (
              <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-signal px-[11px] py-1 font-mono text-[12px] text-white">
                {i === 0 ? '360° · glisser pour explorer' : '360°'}
              </span>
            )}
          </button>
        ))}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-[2000] flex flex-col bg-ink/[0.97] p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIndex(null);
            if (e.key === 'ArrowLeft') go(-1);
            if (e.key === 'ArrowRight') go(1);
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-cream/[0.12] pb-4 text-cream">
            <div>
              <p className="tt-display m-0 text-3xl md:text-4xl">{current.title}</p>
              <p className="mt-2 flex flex-wrap gap-4 font-mono text-[13px] text-signal-text">
                {current.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{current.location}</span>}
                {current.taken_label && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{current.taken_label}</span>}
              </p>
              {current.description && <p className="mt-2 max-w-2xl text-sm text-dust-100">{current.description}</p>}
            </div>
            <button onClick={() => setIndex(null)} className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 hover:bg-signal" aria-label="Fermer">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative mt-4 flex flex-1 items-center justify-center overflow-hidden">
            {current.kind === 'panorama' ? (
              <Suspense fallback={<Spinner />}>
                <div className="h-full w-full">
                  <Photo360Viewer imageUrl={mediaUrl(current.storage_path)!} title={current.title} />
                </div>
              </Suspense>
            ) : (
              <img src={mediaUrl(current.storage_path)!} alt={current.title} className="max-h-full max-w-full object-contain" />
            )}
            {photos.length > 1 && (
              <>
                <button onClick={() => go(-1)} className="absolute left-2 rounded-full bg-ink p-3 text-cream shadow-lg hover:bg-primary" aria-label="Photo précédente">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={() => go(1)} className="absolute right-2 rounded-full bg-ink p-3 text-cream shadow-lg hover:bg-primary" aria-label="Photo suivante">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
