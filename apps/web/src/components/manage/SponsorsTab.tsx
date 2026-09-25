import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { keys, useSponsors } from '@/hooks/queries';
import { supabase, type Crew, type Sponsor } from '@/lib/supabase';
import { toastError } from '@/lib/errors';
import { mediaUrl, removeCrewImages, uploadCrewImage } from '@/lib/media';
import { Spinner } from '@/components/common/Spinner';
import { Field, numOrNull, orNull, Panel } from './shared';

type Form = { name: string; website_url: string; city: string; lat: string; lon: string; sort_order: string };
const toForm = (s?: Sponsor): Form => ({
  name: s?.name ?? '', website_url: s?.website_url ?? '', city: s?.city ?? '',
  lat: s?.lat?.toString() ?? '', lon: s?.lon?.toString() ?? '', sort_order: s?.sort_order.toString() ?? '0',
});

/** Accepte « 49.84, 3.28 » collé depuis Google Maps dans le champ latitude. */
function splitCoords(form: Form): Form {
  const m = form.lat.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? { ...form, lat: m[1]!, lon: m[2]! } : form;
}

function SponsorDialog({ crew, sponsor, open, onClose }: { crew: Crew; sponsor?: Sponsor; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(() => toForm(sponsor));
  const [logo, setLogo] = useState<File | null>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const save = useMutation({
    mutationFn: async () => {
      const f = splitCoords(form);
      const lat = numOrNull(f.lat);
      const lon = numOrNull(f.lon);
      if ((lat === null) !== (lon === null)) throw new Error('Indiquez la latitude ET la longitude (ou aucune des deux)');
      if (f.website_url && !/^https?:\/\//i.test(f.website_url)) throw new Error('Le site web doit commencer par https://');

      let logoPath = sponsor?.logo_path ?? null;
      let uploaded: string | null = null;
      if (logo) {
        uploaded = (await uploadCrewImage(crew.id, 'sponsors', logo, 'logo')).path;
        logoPath = uploaded;
      }
      const row = {
        name: f.name.trim(), website_url: orNull(f.website_url), city: orNull(f.city),
        lat, lon, sort_order: Number(f.sort_order) || 0, logo_path: logoPath,
      };
      const { error } = sponsor
        ? await supabase.from('sponsors').update(row).eq('id', sponsor.id)
        : await supabase.from('sponsors').insert({ ...row, crew_id: crew.id });
      if (error) {
        await removeCrewImages(uploaded);
        throw error;
      }
      if (uploaded && sponsor?.logo_path) await removeCrewImages(sponsor.logo_path);
    },
    onSuccess: () => {
      toast.success(sponsor ? 'Sponsor modifié' : 'Sponsor ajouté');
      void queryClient.invalidateQueries({ queryKey: keys.sponsors(crew.id) });
      onClose();
    },
    onError: toastError,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{sponsor ? 'Modifier le sponsor' : 'Nouveau sponsor'}</DialogTitle></DialogHeader>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <Field id="s-name" label="Nom"><Input id="s-name" required maxLength={100} value={form.name} onChange={set('name')} /></Field>
          <Field id="s-logo" label="Logo" hint={sponsor?.logo_path ? 'Laissez vide pour garder le logo actuel.' : 'PNG avec fond transparent idéalement.'}>
            <Input id="s-logo" type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
          </Field>
          <Field id="s-web" label="Site web"><Input id="s-web" type="url" placeholder="https://…" value={form.website_url} onChange={set('website_url')} /></Field>
          <Field id="s-city" label="Ville"><Input id="s-city" maxLength={80} value={form.city} onChange={set('city')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="s-lat" label="Latitude" hint="Astuce : collez « lat, lon » depuis Google Maps.">
              <Input id="s-lat" inputMode="decimal" value={form.lat} onChange={set('lat')} placeholder="49.8466" />
            </Field>
            <Field id="s-lon" label="Longitude"><Input id="s-lon" inputMode="decimal" value={form.lon} onChange={set('lon')} placeholder="3.2875" /></Field>
          </div>
          <Field id="s-order" label="Ordre d'affichage" hint="Les plus petits nombres apparaissent en premier.">
            <Input id="s-order" type="number" min={0} value={form.sort_order} onChange={set('sort_order')} />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SponsorsTab({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const { data: sponsors = [], isLoading } = useSponsors(crew.id);
  const [editing, setEditing] = useState<Sponsor | 'new' | null>(null);

  const remove = useMutation({
    mutationFn: async (s: Sponsor) => {
      const { error } = await supabase.from('sponsors').delete().eq('id', s.id);
      if (error) throw error;
      await removeCrewImages(s.logo_path);
    },
    onSuccess: () => { toast.success('Sponsor supprimé'); void queryClient.invalidateQueries({ queryKey: keys.sponsors(crew.id) }); },
    onError: toastError,
  });

  return (
    <Panel
      title={`Sponsors (${sponsors.length})`}
      description="Vos sponsors apparaissent sur votre page et, s’ils ont une position, sur votre carte."
    >
      <Button onClick={() => setEditing('new')} className="mb-6"><Plus />Ajouter un sponsor</Button>
      {isLoading ? <Spinner /> : sponsors.length === 0 ? <p className="text-dust-400">Aucun sponsor pour l’instant.</p> : (
        <ul className="divide-y divide-cream/10">
          {sponsors.map((s) => (
            <li key={s.id} className="flex items-center gap-4 py-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[4px] bg-white">
                {s.logo_path ? <img src={mediaUrl(s.logo_path)!} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs font-bold text-black">{s.name.slice(0, 2)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-extrabold uppercase leading-tight text-cream">{s.name}</p>
                <p className="text-xs text-dust-500">{[s.city, s.lat != null ? '📍 sur la carte' : null].filter(Boolean).join(' · ')}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(s)} aria-label={`Modifier ${s.name}`}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="hover:text-primary-light" aria-label={`Supprimer ${s.name}`}
                onClick={() => { if (confirm(`Supprimer ${s.name} ?`)) remove.mutate(s); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <SponsorDialog
          key={editing === 'new' ? 'new' : editing.id}
          crew={crew}
          sponsor={editing === 'new' ? undefined : editing}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </Panel>
  );
}
