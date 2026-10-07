/**
 * QR code du road trip, aux couleurs de TrophyTracker : aperçu, téléchargement PNG et partage.
 * Proposé sur la page publique (dans la fenêtre « Partager », avec le lien de la page)
 * et dans l'espace équipage (onglet « QR code »).
 */
import { useEffect, useState } from 'react';
import { Copy, Download, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Crew } from '@/lib/supabase';
import { thumbUrl } from '@/lib/media';
import { canvasToBlob, drawPoster, POSTER_SIZE, type PosterFormat } from '@/lib/qr-poster';
import { markShared } from '@/lib/share';
import { cn } from '@/lib/utils';

const FORMATS: { id: PosterFormat; label: string; hint: string }[] = [
  { id: 'sticker', label: 'Autocollant', hint: 'Carré 1600 px, coins arrondis : pour le véhicule, un sticker, une affiche.' },
  { id: 'story', label: 'Story réseaux', hint: '1080 × 1920 px : Instagram, Facebook, WhatsApp.' },
];

type CrewForQr = Pick<Crew, 'id' | 'slug' | 'name' | 'car_number' | 'avatar_path' | 'is_public'>;

export function CrewQrPanel({ crew, showUrl = true }: { crew: CrewForQr; showUrl?: boolean }) {
  const [format, setFormat] = useState<PosterFormat>('sticker');
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState(false);

  const eventLabel = 'Carnet de route en direct';
  const pageUrl = `${window.location.origin}/road-trips/${crew.slug}`;
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
    markShared(crew.id);
    try {
      await navigator.share({ files: [file], title: crew.name, text: `Suivez ${crew.name} en direct ! ${pageUrl}` });
    } catch {
      /* partage annulé */
    }
  };

  const [w, h] = POSTER_SIZE[format];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
      {/* Cadre de taille fixe, image en absolu : Safari (iPhone) ignore sinon le max-height
          d'une image dans un bloc à aspect-ratio et affiche la story à 1080 px de large. */}
      <div className="relative aspect-square rounded-md bg-[repeating-conic-gradient(#2A221B_0%_25%,#1B1713_0%_50%)] bg-[length:20px_20px]">
        <div className="absolute inset-4 flex items-center justify-center">
          {image ? (
            <img src={image.url} alt={`QR code de ${crew.name}`} className="h-full w-full object-contain drop-shadow-xl" />
          ) : error ? (
            <p className="m-0 text-center text-sm text-dust-300">Impossible de créer l’image dans ce navigateur.</p>
          ) : (
            <div className="h-full animate-pulse rounded-xl bg-ink-700" style={{ aspectRatio: `${w} / ${h}` }} />
          )}
        </div>
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

        {showUrl && <p className="m-0 break-all font-mono text-xs text-dust-400">Le QR code ouvre : {pageUrl}</p>}
        {!crew.is_public && (
          <p className="m-0 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
            Votre page est privée : le QR code ne marchera que pour les membres du road trip. Rendez-la publique dans « Infos » avant de l’imprimer.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild disabled={!image}>
            <a href={image?.url} download={fileName} aria-disabled={!image} onClick={(e) => (image ? markShared(crew.id) : e.preventDefault())}>
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

/**
 * Bouton « Partager » de la page publique : une seule fenêtre pour envoyer le lien
 * (partage du téléphone ou copie) et créer l'image avec QR code (autocollant, story).
 */
export function CrewShareButton({ crew, className }: { crew: CrewForQr; className?: string }) {
  const [open, setOpen] = useState(false);
  const pageUrl = `${window.location.origin}/road-trips/${crew.slug}`;
  const canShare = typeof navigator.share === 'function';

  const send = async () => {
    markShared(crew.id);
    try {
      await navigator.share({ title: crew.name, text: `Suivez ${crew.name} en direct !`, url: pageUrl });
    } catch {
      /* partage annulé */
    }
  };
  const copy = async () => {
    markShared(crew.id);
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success('Lien copié ! Partagez-le à vos proches et sponsors.');
    } catch {
      toast.error('Copie impossible : sélectionnez le lien à la main.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Share2 /> Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partager {crew.name}</DialogTitle>
          <DialogDescription>Envoyez le lien de la page, ou créez une image avec QR code à coller sur le véhicule ou à poster en story.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 rounded-md border border-cream/15 p-4">
          <p className="m-0 select-all break-all font-mono text-sm text-cream">{pageUrl}</p>
          <div className="flex flex-wrap gap-2">
            {canShare && (
              <Button onClick={send}>
                <Send /> Envoyer le lien
              </Button>
            )}
            <Button variant={canShare ? 'outline' : 'default'} onClick={copy}>
              <Copy /> Copier le lien
            </Button>
          </div>
        </div>
        <h3 className="m-0 mt-2 font-display text-2xl font-extrabold uppercase text-cream">Image avec QR code</h3>
        {open && <CrewQrPanel crew={crew} showUrl={false} />}
      </DialogContent>
    </Dialog>
  );
}
