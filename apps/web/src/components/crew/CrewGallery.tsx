/** Galerie de l'équipage : photos classiques et panoramas 360° interactifs. */
import { lazy, Suspense, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import type { Photo } from '@/lib/supabase';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { Spinner } from '@/components/common/Spinner';

const Photo360Viewer = lazy(() => import('@/components/Photo360Viewer').then((m) => ({ default: m.Photo360Viewer })));

export function CrewGallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const current = index != null ? photos[index] : null;
  const go = (delta: number) => setIndex((i) => (i == null ? i : (i + delta + photos.length) % photos.length));

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            className="group relative aspect-[4/3] overflow-hidden border border-cream/[0.08] bg-ink-800 text-left hover:border-primary"
            aria-label={`Voir la photo ${p.title}`}
          >
            <img
              src={thumbUrl(p.storage_path, 640) ?? ''}
              alt={p.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <p className="absolute bottom-2 left-3 right-3 truncate font-display text-xl font-extrabold uppercase text-cream opacity-0 transition group-hover:opacity-100">
              {p.title}
            </p>
            {p.kind === 'panorama' && (
              <span className="absolute right-2 top-2 rounded-[3px] bg-primary px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">360°</span>
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
              <p className="font-display text-3xl font-black uppercase leading-none md:text-4xl">{current.title}</p>
              <p className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ochre">
                {current.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{current.location}</span>}
                {current.taken_label && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{current.taken_label}</span>}
              </p>
              {current.description && <p className="mt-2 max-w-2xl text-sm text-dust-100">{current.description}</p>}
            </div>
            <button onClick={() => setIndex(null)} className="rounded-[4px] border border-cream/25 p-2 hover:border-primary hover:bg-primary" aria-label="Fermer">
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
                <button onClick={() => go(-1)} className="absolute left-2 rounded-[4px] bg-ink p-3 text-cream shadow-lg hover:bg-primary" aria-label="Photo précédente">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={() => go(1)} className="absolute right-2 rounded-[4px] bg-ink p-3 text-cream shadow-lg hover:bg-primary" aria-label="Photo suivante">
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
