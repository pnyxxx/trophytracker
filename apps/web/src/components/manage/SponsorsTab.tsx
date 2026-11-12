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
import { Field, orNull, Panel } from './shared';
import { linkInfo, normalizeLink, sponsorLinks } from '@/lib/links';
import { LinkIcon } from '@/components/common/SocialIcons';
import { Label } from '@/components/ui/label';
import { LocationPicker, type Coords } from './LocationPicker';

type Form = { name: string; description: string; phone: string; email: string; links: string[]; city: string; sort_order: string };
const toForm = (s?: Sponsor): Form => ({
  name: s?.name ?? '', description: s?.description ?? '', phone: s?.phone ?? '', email: s?.email ?? '',
  links: s ? (sponsorLinks(s).length ? sponsorLinks(s) : ['']) : [''],
  city: s?.city ?? '', sort_order: s?.sort_order.toString() ?? '0',
});
const MAX_LINKS = 8;

function SponsorDialog({ crew, sponsor, open, onClose }: { crew: Crew; sponsor?: Sponsor; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(() => toForm(sponsor));
  const [coords, setCoords] = useState<Coords | null>(() =>
    sponsor?.lat != null && sponsor.lon != null ? { lat: sponsor.lat, lon: sponsor.lon } : null);
  const [logo, setLogo] = useState<File | null>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const save = useMutation({
    mutationFn: async () => {
      const links = form.links.map(normalizeLink).filter((x): x is string => !!x).slice(0, MAX_LINKS);
      const first = (kind: string) => links.find((l) => linkInfo(l).kind === kind) ?? null;
      let logoPath = sponsor?.logo_path ?? null;
      let uploaded: string | null = null;
      if (logo) {
        uploaded = (await uploadCrewImage(crew.id, 'sponsors', logo, 'logo')).path;
        logoPath = uploaded;
      }
      const row = {
        name: form.name.trim(), city: orNull(form.city),
        description: orNull(form.description), phone: orNull(form.phone), email: orNull(form.email), links,
        // Anciens champs, gardés pour la carte et les anciens affichages : premier site, premier compte de chaque réseau.
        website_url: first('site'), instagram_url: first('instagram'), facebook_url: first('facebook'),
        lat: coords?.lat ?? null, lon: coords?.lon ?? null, sort_order: Number(form.sort_order) || 0, logo_path: logoPath,
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
      <DialogContent>
        <DialogHeader><DialogTitle>{sponsor ? 'Modifier le sponsor' : 'Nouveau sponsor'}</DialogTitle></DialogHeader>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <Field id="s-name" label="Nom"><Input id="s-name" required maxLength={100} value={form.name} onChange={set('name')} /></Field>
          <Field id="s-logo" label="Logo" hint={sponsor?.logo_path ? 'Laisse vide pour garder le logo actuel.' : 'PNG avec fond transparent idéalement.'}>
            <Input id="s-logo" type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
          </Field>
          <Field id="s-desc" label="Présentation" hint="Facultatif : une phrase, affichée sur sa fiche.">
            <Input id="s-desc" maxLength={280} placeholder="Garage familial à Saint-Quentin depuis 1982" value={form.description} onChange={set('description')} />
          </Field>
          <div className="space-y-2">
            <Label>Sites et réseaux sociaux</Label>
            {form.links.map((l, i) => {
              const info = l.trim() ? linkInfo(normalizeLink(l) ?? l) : null;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-ink-700 text-dust-200" title={info?.name}>
                    <LinkIcon kind={info?.kind ?? 'site'} className="h-[18px] w-[18px]" />
                  </span>
                  <Input
                    aria-label={`Lien ${i + 1}`}
                    inputMode="url"
                    placeholder={i === 0 ? 'son-site.fr, @son-instagram, lien Facebook…' : 'Un autre site ou réseau'}
                    value={l}
                    onChange={(e) => setForm({ ...form, links: form.links.map((x, k) => (k === i ? e.target.value : x)) })}
                  />
                  {form.links.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" aria-label={`Retirer le lien ${i + 1}`} onClick={() => setForm({ ...form, links: form.links.filter((_, k) => k !== i) })}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              );
            })}
            {form.links.length < MAX_LINKS && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, links: [...form.links, ''] })}><Plus />Ajouter un lien</Button>
            )}
            <p className="m-0 text-[0.8235rem] text-dust-400">Autant qu’il en faut : plusieurs sites, Instagram, Facebook, TikTok… On reconnaît le réseau tout seul.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="s-phone" label="Téléphone"><Input id="s-phone" type="tel" inputMode="tel" maxLength={30} value={form.phone} onChange={set('phone')} /></Field>
            <Field id="s-email" label="E-mail"><Input id="s-email" type="email" inputMode="email" maxLength={200} value={form.email} onChange={set('email')} /></Field>
          </div>
          <Field id="s-place" label="Adresse" hint="Pour placer le sponsor sur ta carte. Facultatif.">
            <LocationPicker
              id="s-place"
              value={coords}
              onChange={(c, place) => {
                setCoords(c);
                // La ville affichée se remplit toute seule (et reste modifiable).
                if (place?.city) setForm((f) => ({ ...f, city: place.city! }));
              }}
            />
          </Field>
          <Field id="s-city" label="Ville affichée" hint="Remplie automatiquement à partir de l’adresse.">
            <Input id="s-city" maxLength={80} value={form.city} onChange={set('city')} />
          </Field>
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
      description="Tes sponsors apparaissent sur ta page et, s’ils ont une position, sur ta carte."
    >
      <Button onClick={() => setEditing('new')} className="mb-6"><Plus />Ajouter un sponsor</Button>
      {isLoading ? <Spinner /> : sponsors.length === 0 ? <p className="text-dust-400">Aucun sponsor pour l’instant.</p> : (
        <ul className="divide-y divide-cream/10">
          {sponsors.map((s) => (
            <li key={s.id} className="flex items-center gap-4 py-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white">
                {s.logo_path ? <img src={mediaUrl(s.logo_path)!} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs font-bold text-black">{s.name.slice(0, 2)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-extrabold leading-tight text-cream">{s.name}</p>
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
