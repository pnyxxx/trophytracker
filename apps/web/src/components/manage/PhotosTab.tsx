/**
 * Onglet « Photos » : on choisit une ou plusieurs photos, le site retrouve tout seul
 * ce qu'il peut (où, quand, photo 360°), on vérifie, puis on publie.
 *
 * Position de chaque photo, dans l'ordre :
 *  1. le GPS de l'appareil enregistré dans la photo (EXIF) ;
 *  2. sinon, la trace du road trip à l'heure de la prise de vue ;
 *  3. sinon, à placer à la main (recherche d'adresse, carte, coordonnées) — ou pas du tout.
 * Le fichier envoyé, lui, est ré-encodé sans aucune métadonnée (voir media.ts).
 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, ImagePlus, LocateFixed, MapPin, Navigation, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/auth';
import { keys, usePhotos } from '@/hooks/queries';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { supabase, type Crew, type Photo } from '@/lib/supabase';
import { toastError } from '@/lib/errors';
import { removeCrewImages, thumbUrl, uploadCrewImage } from '@/lib/media';
import { readPhotoMeta } from '@/lib/photoMeta';
import { describePosition, type Place } from '@/lib/geocode';
import { positionAt } from '@/lib/geo';
import { dayOfTrip } from '@/lib/days';
import { Spinner } from '@/components/common/Spinner';
import { orNull, Panel } from './shared';
import { LocationPicker, type Coords } from './LocationPicker';

type Source = 'photo' | 'trace' | 'manual';

interface Draft {
  key: string;
  file: File;
  preview: string;
  reading: boolean;
  title: string;
  description: string;
  panorama: boolean;
  takenAt: Date | null;
  coords: Coords | null;
  source: Source | null;
  /** Nom du lieu (ville, village…), retrouvé à partir de la position. */
  place: string;
  error: string | null;
}

const SOURCE_LABEL: Record<Source, string> = {
  photo: 'position enregistrée dans la photo',
  trace: 'retrouvée grâce à la trace du road trip',
  manual: 'placée à la main',
};

const shortDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const shortTime = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** « Jour 5 · 21 févr. » pendant le road trip (dates réglées dans « Infos »), sinon « 3 janv. 2027 ». */
function dateLabel(d: Date | null, start: string | null, end: string | null): string | null {
  if (!d) return null;
  if (start) {
    const day = dayOfTrip(start, d);
    const total = end ? dayOfTrip(start, new Date(`${end}T12:00:00`)) : 99;
    if (day >= 1 && day <= total) return `Jour ${day} · ${shortDate(d)}`;
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const placeName = (p: Place | null) => p?.city ?? p?.title ?? '';

/** Titre par défaut quand on n'en tape pas : le lieu, sinon le jour. */
const autoTitle = (d: Draft, label: string | null) => (d.place ? `Photo à ${d.place}` : label ?? 'Photo');

// ─── Fenêtre « Où a été prise cette photo ? » ────────────────────────────────

function PositionDialog({ crew, initial, onSave, onClose }: {
  crew: Crew;
  initial: Coords | null;
  onSave: (coords: Coords | null, place: Place | null) => void;
  onClose: () => void;
}) {
  const [coords, setCoords] = useState<Coords | null>(initial);
  const [place, setPlace] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const car = crew.last_lat != null && crew.last_lon != null ? { lat: crew.last_lat, lon: crew.last_lon } : null;

  const myPosition = () => {
    if (!navigator.geolocation) return toast.error('Votre navigateur ne donne pas sa position.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }); setPlace(null); setLocating(false); },
      () => { toast.error('Position refusée ou introuvable.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const shortcut = 'inline-flex items-center gap-1.5 text-dust-300 underline-offset-2 hover:text-cream hover:underline';
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Où a été prise cette photo&nbsp;?</DialogTitle>
          <DialogDescription>Elle apparaîtra à cet endroit sur la carte du road trip.</DialogDescription>
        </DialogHeader>
        <LocationPicker
          id="photo-place"
          value={coords}
          placeholder="Ville, village, lieu…"
          onChange={(c, p) => { setCoords(c); setPlace(p); }}
          shortcuts={
            <>
              {car && (
                <button type="button" className={shortcut} onClick={() => { setCoords(car); setPlace(null); }}>
                  <Navigation className="h-3.5 w-3.5" />Dernière position du road trip
                </button>
              )}
              <button type="button" className={shortcut} onClick={myPosition} disabled={locating}>
                <LocateFixed className="h-3.5 w-3.5" />{locating ? 'Recherche…' : 'Ma position actuelle'}
              </button>
            </>
          }
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => onSave(null, null)}>Ne pas la placer sur la carte</Button>
          <Button type="button" onClick={() => onSave(coords, place)} disabled={!coords}>Valider</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet ──────────────────────────────────────────────────────────────────

export function PhotosTab({ crew }: { crew: Crew }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: photos = [], isLoading } = usePhotos(crew.id);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<{ draft: string } | { photo: Photo } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.photos(crew.id) });
  const start = crew.starts_on;
  const end = crew.ends_on;

  // Libère les aperçus en quittant l'onglet.
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  useEffect(() => () => draftsRef.current.forEach((d) => URL.revokeObjectURL(d.preview)), []);

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  /** Toute la trace du road trip (une seule fois), pour retrouver où il était à l'heure d'une photo. */
  const track = () =>
    queryClient.fetchQuery({
      queryKey: ['track-all', crew.id],
      staleTime: 60_000,
      queryFn: async () => ((await supabase.rpc('get_track', { p_crew: crew.id })).data as unknown as TrackPoint[]) ?? [],
    });

  async function analyze(key: string, file: File) {
    const meta = await readPhotoMeta(file);
    let coords: Coords | null = meta.lat != null && meta.lon != null ? { lat: meta.lat, lon: meta.lon } : null;
    let source: Source | null = coords ? 'photo' : null;
    if (!coords && meta.takenAt) {
      const found = positionAt(await track().catch(() => []), meta.takenAt.getTime() / 1000);
      if (found) { coords = found; source = 'trace'; }
    }
    update(key, { reading: false, takenAt: meta.takenAt, panorama: meta.panorama, coords, source });
    if (coords) update(key, { place: placeName(await describePosition(coords.lat, coords.lon)) });
  }

  function addFiles(files: FileList | File[]) {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return toast.error('Choisissez des images (JPG, PNG, HEIC…)');
    const fresh: Draft[] = images.map((file) => ({
      key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), reading: true,
      title: '', description: '', panorama: false, takenAt: null, coords: null, source: null, place: '', error: null,
    }));
    setDrafts((list) => [...list, ...fresh]);
    fresh.forEach((d) => void analyze(d.key, d.file).catch(() => update(d.key, { reading: false })));
  }

  const removeDraft = (key: string) =>
    setDrafts((list) => {
      const d = list.find((x) => x.key === key);
      if (d) URL.revokeObjectURL(d.preview);
      return list.filter((x) => x.key !== key);
    });

  const publish = useMutation({
    mutationFn: async () => {
      let ok = 0;
      const total = drafts.length;
      for (const d of drafts) {
        try {
          const label = dateLabel(d.takenAt, start, end);
          const img = await uploadCrewImage(crew.id, 'photos', d.file, d.panorama ? 'panorama' : 'photo');
          const { error } = await supabase.from('photos').insert({
            crew_id: crew.id,
            kind: d.panorama ? 'panorama' : 'classic',
            title: (d.title.trim() || autoTitle(d, label)).slice(0, 120),
            description: orNull(d.description),
            location: orNull(d.place.slice(0, 120)),
            taken_label: label,
            taken_at: d.takenAt?.toISOString() ?? null,
            lat: d.coords?.lat ?? null,
            lon: d.coords?.lon ?? null,
            storage_path: img.path,
            width: img.width,
            height: img.height,
          });
          if (error) {
            await removeCrewImages(img.path); // pas de fichier orphelin
            throw error;
          }
          removeDraft(d.key);
          ok++;
        } catch (e) {
          update(d.key, { error: e instanceof Error ? e.message : 'Envoi impossible' });
        }
      }
      return { ok, total };
    },
    onSuccess: ({ ok, total }) => {
      if (ok) toast.success(ok > 1 ? `${ok} photos publiées` : 'Photo publiée');
      if (ok < total) toast.error('Certaines photos n’ont pas pu être envoyées : réessayez.');
      void refresh();
    },
    onError: toastError,
  });

  const remove = useMutation({
    mutationFn: async (p: Photo) => {
      const { error } = await supabase.from('photos').delete().eq('id', p.id);
      if (error) throw error;
      await removeCrewImages(p.storage_path);
    },
    onSuccess: () => { toast.success('Photo supprimée'); void refresh(); },
    onError: toastError,
  });

  const placePhoto = useMutation({
    mutationFn: async ({ photo, coords, place }: { photo: Photo; coords: Coords | null; place: string }) => {
      const { error } = await supabase.from('photos')
        .update({ lat: coords?.lat ?? null, lon: coords?.lon ?? null, ...(place ? { location: place.slice(0, 120) } : {}) })
        .eq('id', photo.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => { toast.success(v.coords ? 'Photo placée sur la carte' : 'Photo retirée de la carte'); void refresh(); },
    onError: toastError,
  });

  async function savePosition(coords: Coords | null, place: Place | null) {
    const target = editing;
    setEditing(null);
    if (!target) return;
    const name = coords ? placeName(place) || placeName(await describePosition(coords.lat, coords.lon)) : '';
    if ('draft' in target) update(target.draft, { coords, source: coords ? 'manual' : null, place: name });
    else placePhoto.mutate({ photo: target.photo, coords, place: name });
  }

  const editingInitial =
    editing && 'draft' in editing
      ? drafts.find((d) => d.key === editing.draft)?.coords ?? null
      : editing && editing.photo.lat != null && editing.photo.lon != null
        ? { lat: editing.photo.lat, lon: editing.photo.lon }
        : null;
  const stillReading = drafts.some((d) => d.reading);

  return (
    <div className="space-y-6">
      <Panel
        title="Ajouter des photos"
        description="Choisissez une ou plusieurs photos : on retrouve tout seul quand et où elles ont été prises pour les placer sur votre carte. Vérifiez, puis publiez."
      >
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center transition ${
            dragOver ? 'border-primary bg-primary/10' : 'border-cream/25 hover:border-cream/50 hover:bg-cream/[0.03]'
          }`}
        >
          <ImagePlus className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-extrabold uppercase text-cream">Choisir des photos</span>
          <span className="text-xs text-dust-400">ou glissez-les ici · photos classiques et 360°</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
          />
        </label>

        {drafts.length > 0 && (
          <div className="mt-6 space-y-3">
            {drafts.map((d) => {
              const label = dateLabel(d.takenAt, start, end);
              return (
                <div key={d.key} className="flex gap-4 border border-cream/[0.12] bg-black/20 p-3">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-ink-800 sm:h-28 sm:w-36">
                    <img src={d.preview} alt="" className="h-full w-full object-cover" />
                    {d.panorama && <span className="absolute right-1 top-1 bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">360°</span>}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                      <Input
                        aria-label="Titre de la photo"
                        maxLength={120}
                        value={d.title}
                        onChange={(e) => update(d.key, { title: e.target.value })}
                        placeholder={d.reading ? 'Lecture de la photo…' : autoTitle(d, label)}
                        className="h-9"
                      />
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Retirer cette photo" onClick={() => removeDraft(d.key)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {d.reading ? (
                      <p className="m-0 flex items-center gap-2 text-xs text-dust-400"><Spinner />On cherche où et quand elle a été prise…</p>
                    ) : (
                      <div className="space-y-1 text-xs">
                        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <MapPin className={`h-3.5 w-3.5 shrink-0 ${d.coords ? 'text-primary' : 'text-dust-500'}`} />
                          {d.coords ? (
                            <>
                              <span className="text-cream">{d.place || `${d.coords.lat.toFixed(4)}, ${d.coords.lon.toFixed(4)}`}</span>
                              {d.source && <span className="text-dust-500">· {SOURCE_LABEL[d.source]}{d.source === 'trace' && d.takenAt ? ` à ${shortTime(d.takenAt)}` : ''}</span>}
                            </>
                          ) : (
                            <span className="text-dust-400">Position introuvable</span>
                          )}
                          <button type="button" onClick={() => setEditing({ draft: d.key })} className="text-primary-light underline-offset-2 hover:underline">
                            {d.coords ? 'Modifier' : 'Placer sur la carte'}
                          </button>
                        </p>
                        {label && <p className="m-0 flex items-center gap-2 text-dust-400"><Calendar className="h-3.5 w-3.5 shrink-0" />{label}{d.takenAt ? `, ${shortTime(d.takenAt)}` : ''}</p>}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        aria-label="Description"
                        maxLength={1000}
                        value={d.description}
                        onChange={(e) => update(d.key, { description: e.target.value })}
                        placeholder="Description (facultatif)"
                        className="h-9 min-w-0 flex-1"
                      />
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-dust-300">
                        <input type="checkbox" checked={d.panorama} onChange={(e) => update(d.key, { panorama: e.target.checked })} className="h-4 w-4 accent-primary" />
                        Photo 360°
                      </label>
                    </div>
                    {d.error && <p className="m-0 text-xs text-primary-light">{d.error}</p>}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button type="button" onClick={() => publish.mutate()} disabled={publish.isPending || stillReading}>
                <Upload />{publish.isPending ? 'Envoi en cours…' : drafts.length > 1 ? `Publier les ${drafts.length} photos` : 'Publier la photo'}
              </Button>
              <p className="m-0 max-w-md text-xs text-dust-500">
                Les photos sont allégées avant l’envoi (rapide même en 4G). Le fichier publié ne contient plus aucune donnée cachée :
                seule la position que vous voyez ici apparaît sur la carte.
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title={`Photos publiées (${photos.length})`}>
        {isLoading ? <Spinner /> : photos.length === 0 ? <p className="text-dust-400">Aucune photo pour l’instant.</p> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-[4px] border border-cream/10">
                <img src={thumbUrl(p.storage_path, 480) ?? ''} alt={p.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-cream">{p.title}</p>
                    <p className="text-xs text-dust-500">
                      {p.kind === 'panorama' ? '360°' : 'Photo'}{p.created_by === user?.id ? ' · par vous' : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditing({ photo: p })}
                      className={`mt-1 inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline ${p.lat != null ? 'text-dust-300' : 'text-primary-light'}`}
                    >
                      <MapPin className="h-3 w-3" />{p.lat != null ? (p.location ?? 'Sur la carte') : 'Placer sur la carte'}
                    </button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-dust-300 hover:text-primary-light"
                    aria-label={`Supprimer ${p.title}`}
                    disabled={remove.isPending}
                    onClick={() => { if (confirm(`Supprimer « ${p.title} » ?`)) remove.mutate(p); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {editing && (
        <PositionDialog
          key={'draft' in editing ? editing.draft : editing.photo.id}
          crew={crew}
          initial={editingInitial}
          onSave={(c, p) => void savePosition(c, p)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
