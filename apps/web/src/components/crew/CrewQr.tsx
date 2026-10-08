/**
 * Visuels QR code du road trip (autocollant, story, rond) : aperçu, téléchargement PNG et partage.
 * Proposés sur la page publique (fenêtre « Partager ») et dans l'espace voyageur (« Partage »).
 */
import { useEffect, useState } from 'react';
import { Copy, Download, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase, type Crew } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { isLive } from '@/lib/format';
import { dayOfTrip } from '@/lib/days';
import { canvasToBlob, drawPoster, POSTER_SIZE, type PosterFormat } from '@/lib/qr-poster';
import { markShared } from '@/lib/share';
import { cn } from '@/lib/utils';

const FORMATS: { id: PosterFormat; label: string; hint: string }[] = [
  { id: 'sticker', label: 'Autocollant véhicule', hint: 'Carré 12 × 12 cm (1440 px) : à coller sur la vitre arrière ou la carrosserie.' },
  { id: 'story', label: 'Story', hint: '1080 × 1920 sur la vue satellite de ta trace : Instagram, WhatsApp, Facebook.' },
  { id: 'round', label: 'Autocollant rond', hint: 'Rond de 8 cm (960 px) : pour une gourde, un casque, une valise.' },
];
const FILE: Record<PosterFormat, string> = { sticker: 'autocollant', story: 'story', round: 'rond' };

type CrewForQr = Pick<Crew, 'id' | 'slug' | 'name' | 'is_public' | 'city' | 'destination' | 'starts_on' | 'ends_on' | 'last_fix_at' | 'total_distance_m' | 'start_lat' | 'start_lon'>;

export function CrewQrPanel({ crew, showUrl = true }: { crew: CrewForQr; showUrl?: boolean }) {
  const [format, setFormat] = useState<PosterFormat>('sticker');
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState(false);
  const pageUrl = `${window.location.origin}/t/${crew.slug}`;
  const fileName = `trophytracker-${crew.slug}-${FILE[format]}.png`;
  // La trace ne sert qu'à la story (vue satellite) : chargée seulement pour elle.
  const { data: track, isFetched } = useQuery({
    queryKey: ['poster-track', crew.id],
    enabled: format === 'story',
    staleTime: 5 * 60_000,
    queryFn: async () => ((await supabase.rpc('get_track', { p_crew: crew.id })).data ?? []) as unknown as number[][],
  });
  const ready = format !== 'story' || isFetched;
  const live = isLive(crew.last_fix_at);
  const day = crew.starts_on ? dayOfTrip(crew.starts_on, new Date()) : null;

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let url: string | null = null;
    setImage(null);
    setError(false);
    drawPoster(format, {
      name: crew.name, url: pageUrl, city: crew.city, destination: crew.destination, starts_on: crew.starts_on, ends_on: crew.ends_on,
      live, day: day && day >= 1 ? day : null, distanceKm: crew.total_distance_m / 1000, track: track ?? [],
      start: crew.start_lat != null && crew.start_lon != null ? { lat: crew.start_lat, lon: crew.start_lon } : null,
    })
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
  }, [ready, format, track, crew.name, crew.city, crew.destination, crew.starts_on, crew.ends_on, crew.total_distance_m, crew.start_lat, crew.start_lon, live, day, pageUrl]);

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
      <div className="relative aspect-square rounded-[20px] bg-[repeating-conic-gradient(#2B2C33_0%_25%,#1F2026_0%_50%)] bg-[length:20px_20px]">
        <div className="absolute inset-4 flex items-center justify-center">
          {image ? (
            <img src={image.url} alt={`Visuel QR code de ${crew.name}`} className="h-full w-full object-contain drop-shadow-xl" />
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
              className={cn('flex flex-col gap-0.5 rounded-2xl border-2 px-4 py-3 text-left transition-colors',
                format === f.id ? 'border-signal bg-signal/10' : 'border-ink-600 hover:border-dust-600')}
            >
              <span className="text-[17px] font-bold text-cream">{f.label}</span>
              <span className="text-[14px] text-dust-300">{f.hint}</span>
            </button>
          ))}
        </div>

        {showUrl && <p className="m-0 break-all font-mono text-[13px] text-dust-400">Le QR code ouvre : {pageUrl}</p>}
        {!crew.is_public && (
          <p className="m-0 rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2 text-[14px] text-gold-text">
            Ta page est réservée aux voyageurs : le QR code ne marchera que pour vous. Rends-la « privée, par lien » dans les réglages avant de l’imprimer.
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
        <p className="m-0 text-[13px] text-dust-500">
          Astuce impression : pour un autocollant extérieur, choisis un vinyle mat laminé ; à 12 cm, le QR se scanne à plus d’un mètre.
        </p>
      </div>
    </div>
  );
}

/**
 * Bouton « Partager » de la page publique : une seule fenêtre pour envoyer le lien
 * (partage du téléphone ou copie) et créer l'image avec QR code (autocollant, story).
 */
export function CrewShareButton({ crew, className, variant = 'outline' }: { crew: CrewForQr; className?: string; variant?: 'outline' | 'default' }) {
  const [open, setOpen] = useState(false);
  const pageUrl = `${window.location.origin}/t/${crew.slug}`;
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
      toast.success('Lien copié ! Envoie-le à tes proches et sponsors.');
    } catch {
      toast.error('Copie impossible : sélectionnez le lien à la main.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
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
        <h3 className="m-0 mt-2 font-display text-2xl font-extrabold text-cream">Image avec QR code</h3>
        {open && <CrewQrPanel crew={crew} showUrl={false} />}
      </DialogContent>
    </Dialog>
  );
}
