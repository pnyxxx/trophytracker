/**
 * QR code de l'équipage, aux couleurs de TrophyTracker : aperçu, téléchargement PNG et partage.
 * Proposé sur la page publique (bouton « QR code ») et dans l'espace équipage (onglet « QR code »).
 */
import { useEffect, useState } from 'react';
import { Download, QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEvent } from '@/hooks/queries';
import type { Crew } from '@/lib/supabase';
import { thumbUrl } from '@/lib/media';
import { canvasToBlob, drawPoster, POSTER_SIZE, type PosterFormat } from '@/lib/qr-poster';
import { cn } from '@/lib/utils';

const FORMATS: { id: PosterFormat; label: string; hint: string }[] = [
  { id: 'sticker', label: 'Autocollant', hint: 'Carré 1600 px, coins arrondis : pour la 4L, un sticker, une affiche.' },
  { id: 'story', label: 'Story réseaux', hint: '1080 × 1920 px : Instagram, Facebook, WhatsApp.' },
];

type CrewForQr = Pick<Crew, 'slug' | 'name' | 'car_number' | 'avatar_path' | 'is_public'>;

export function CrewQrPanel({ crew }: { crew: CrewForQr }) {
  const { data: event } = useEvent();
  const [format, setFormat] = useState<PosterFormat>('sticker');
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState(false);

  const year = event?.startDate?.slice(0, 4);
  const eventName = event?.name ?? '4L Trophy';
  const eventLabel = year && !/\d{4}/.test(eventName) ? `${eventName} ${year}` : eventName;
  const pageUrl = `${window.location.origin}/equipages/${crew.slug}`;
  const fileName = `trophytracker-${crew.slug}-${format === 'sticker' ? 'autocollant' : 'story'}.png`;

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    setImage(null);
    setError(false);
    drawPoster(format, { name: crew.name, carNumber: crew.car_number, url: pageUrl, eventLabel, avatarUrl: thumbUrl(crew.avatar_path, 512) })
      .then(canvasToBlob)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (alive) setImage({ blob, url });
        else URL.revokeObjectURL(url);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [format, crew.name, crew.car_number, crew.avatar_path, pageUrl, eventLabel]);

  const file = image ? new File([image.blob], fileName, { type: 'image/png' }) : null;
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: crew.name, text: `Suivez ${crew.name} en direct sur le 4L Trophy ! ${pageUrl}` });
    } catch {
      /* partage annulé */
    }
  };

  const [w, h] = POSTER_SIZE[format];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
      <div
        className="flex items-center justify-center rounded-md bg-[repeating-conic-gradient(#2A221B_0%_25%,#1B1713_0%_50%)] bg-[length:20px_20px] p-4"
        style={{ aspectRatio: '1 / 1' }}
      >
        {image ? (
          <img src={image.url} alt={`QR code de ${crew.name}`} className="max-h-full max-w-full drop-shadow-xl" style={{ aspectRatio: `${w} / ${h}` }} />
        ) : error ? (
          <p className="m-0 text-center text-sm text-dust-300">Impossible de créer l’image dans ce navigateur.</p>
        ) : (
          <div className="h-2/3 animate-pulse rounded-xl bg-ink-700" style={{ aspectRatio: `${w} / ${h}` }} />
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Format">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={format === f.id}
              onClick={() => setFormat(f.id)}
              className={cn(
                'flex flex-col gap-0.5 rounded-md border px-4 py-3 text-left transition-colors',
                format === f.id ? 'border-primary bg-primary/10' : 'border-cream/15 hover:border-cream/40',
              )}
            >
              <span className="font-display text-xl font-extrabold uppercase text-cream">{f.label}</span>
              <span className="text-sm text-dust-300">{f.hint}</span>
            </button>
          ))}
        </div>

        <p className="m-0 break-all font-mono text-xs text-dust-400">Le QR code ouvre : {pageUrl}</p>
        {!crew.is_public && (
          <p className="m-0 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
            Votre page est privée : le QR code ne marchera que pour les membres de l’équipage. Rendez-la publique dans « Infos » avant de l’imprimer.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild disabled={!image}>
            <a href={image?.url} download={fileName} aria-disabled={!image} onClick={(e) => !image && e.preventDefault()}>
              <Download /> Télécharger le PNG
            </a>
          </Button>
          {canShareFile && (
            <Button variant="secondary" onClick={share}>
              <Share2 /> Partager l’image
            </Button>
          )}
        </div>
        <p className="m-0 text-xs text-dust-500">
          Astuce impression : pour un autocollant extérieur, choisissez un vinyle mat laminé, 10 cm de côté minimum pour être scanné à 1 m.
        </p>
      </div>
    </div>
  );
}

/** Bouton « QR code » de la page publique, qui ouvre le panneau dans une fenêtre. */
export function CrewQrButton({ crew, className }: { crew: CrewForQr; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <QrCode /> QR code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QR code de {crew.name}</DialogTitle>
          <DialogDescription>À coller sur la 4L, à imprimer ou à partager : il ouvre la page de suivi en direct.</DialogDescription>
        </DialogHeader>
        {open && <CrewQrPanel crew={crew} />}
      </DialogContent>
    </Dialog>
  );
}
