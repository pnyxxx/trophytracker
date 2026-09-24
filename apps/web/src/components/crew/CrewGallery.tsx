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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-black/20 text-left"
            aria-label={`Voir la photo ${p.title}`}
          >
            <img
              src={thumbUrl(p.storage_path, 640) ?? ''}
              alt={p.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <p className="absolute bottom-2 left-3 right-3 truncate text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {p.title}
            </p>
            {p.kind === 'panorama' && (
              <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">360°</span>
            )}
          </button>
        ))}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-[2000] flex flex-col bg-black/95 p-4"
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
          <div className="flex items-start justify-between gap-4 text-white">
            <div>
              <p className="text-lg font-bold">{current.title}</p>
              <p className="flex flex-wrap gap-4 text-sm text-white/60">
                {current.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{current.location}</span>}
                {current.taken_label && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{current.taken_label}</span>}
              </p>
              {current.description && <p className="mt-1 max-w-2xl text-sm text-white/80">{current.description}</p>}
            </div>
            <button onClick={() => setIndex(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Fermer">
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
                <button onClick={() => go(-1)} className="absolute left-2 rounded-full bg-white/90 p-3 text-black shadow-lg hover:bg-white" aria-label="Photo précédente">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={() => go(1)} className="absolute right-2 rounded-full bg-white/90 p-3 text-black shadow-lg hover:bg-white" aria-label="Photo suivante">
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
