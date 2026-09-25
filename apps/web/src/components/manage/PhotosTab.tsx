import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/auth';
import { keys, usePhotos } from '@/hooks/queries';
import { supabase, type Crew, type Photo } from '@/lib/supabase';
import { toastError } from '@/lib/errors';
import { removeCrewImages, thumbUrl, uploadCrewImage } from '@/lib/media';
import { Spinner } from '@/components/common/Spinner';
import { Field, orNull, Panel, selectClass } from './shared';

const empty = { kind: 'classic' as 'classic' | 'panorama', title: '', description: '', location: '', taken_label: '' };

export function PhotosTab({ crew }: { crew: Crew }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: photos = [], isLoading } = usePhotos(crew.id);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.photos(crew.id) });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choisissez une image');
      const img = await uploadCrewImage(crew.id, 'photos', file, form.kind === 'panorama' ? 'panorama' : 'photo');
      const { error } = await supabase.from('photos').insert({
        crew_id: crew.id,
        kind: form.kind,
        title: form.title.trim(),
        description: orNull(form.description),
        location: orNull(form.location),
        taken_label: orNull(form.taken_label),
        storage_path: img.path,
        width: img.width,
        height: img.height,
      });
      if (error) {
        await removeCrewImages(img.path); // pas de fichier orphelin
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Photo ajoutée');
      setForm(empty);
      setFile(null);
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

  return (
    <div className="space-y-6">
      <Panel
        title="Ajouter une photo"
        description="Les images sont compressées sur votre appareil avant l’envoi (rapide même en 4G) et leurs données GPS cachées (EXIF) sont supprimées."
      >
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); upload.mutate(); }} className="grid gap-4 md:grid-cols-2">
          <Field id="file" label="Image">
            <Input id="file" type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field id="kind" label="Type" hint="Photo 360° = image panoramique équirectangulaire (format 2:1).">
            <select id="kind" className={selectClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>
              <option value="classic">Photo classique</option>
              <option value="panorama">Photo 360°</option>
            </select>
          </Field>
          <Field id="title" label="Titre"><Input id="title" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Coucher de soleil à Merzouga" /></Field>
          <Field id="location" label="Lieu"><Input id="location" maxLength={120} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field id="taken" label="Date"><Input id="taken" maxLength={60} value={form.taken_label} onChange={(e) => setForm({ ...form, taken_label: e.target.value })} placeholder="Jour 5" /></Field>
          <Field id="desc" label="Description"><Input id="desc" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="md:col-span-2">
            <Button type="submit" disabled={upload.isPending}>
              <Upload />{upload.isPending ? 'Envoi en cours…' : 'Publier la photo'}
            </Button>
          </div>
        </form>
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
                    <p className="text-xs text-dust-500">{p.kind === 'panorama' ? '360°' : 'Photo'}{p.created_by === user?.id ? ' · par vous' : ''}</p>
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
    </div>
  );
}
