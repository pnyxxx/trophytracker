import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase, type Crew } from '@/lib/supabase';
import { socialUrl, webUrl } from '@/lib/social';
import { findCity } from '@/lib/geocode';
import { toastError, unwrap } from '@/lib/errors';
import { keys } from '@/hooks/queries';
import { Field, numOrNull, orNull, Panel, textareaClass } from './shared';
import { AvatarPicker, CoverPicker } from './CrewImages';
import { CityInput } from './CityInput';

type Editable = Pick<Crew,
  'name' | 'car_number' | 'tagline' | 'story' | 'school' | 'city' | 'contact_email' |
  'instagram_url' | 'facebook_url' | 'fundraiser_url' | 'is_public' | 'current_rank' | 'supplies_count' |
  'start_lat' | 'start_lon' | 'start_region'>;

const toForm = (c: Crew) => ({
  name: c.name, car_number: c.car_number ?? '', tagline: c.tagline ?? '', story: c.story ?? '',
  school: c.school ?? '', city: c.city ?? '', contact_email: c.contact_email ?? '',
  instagram_url: c.instagram_url ?? '', facebook_url: c.facebook_url ?? '',
  fundraiser_url: c.fundraiser_url ?? '', is_public: c.is_public,
  current_rank: c.current_rank?.toString() ?? '', supplies_count: c.supplies_count?.toString() ?? '',
  // Position de la ville de départ (drapeau sur la carte), retenue au choix d'une suggestion.
  spot: c.start_lat != null && c.start_lon != null ? { lat: c.start_lat, lon: c.start_lon, region: c.start_region } : null,
});

export function InfoTab({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => toForm(crew));
  // On ne recharge le formulaire que si ses champs ont changé côté serveur :
  // changer une image ou le cadrage ne doit pas effacer une saisie en cours.
  const serverForm = JSON.stringify(toForm(crew));
  useEffect(() => setForm(JSON.parse(serverForm) as ReturnType<typeof toForm>), [serverForm]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const save = useMutation({
    mutationFn: async () => {
      // Ville tapée sans choisir de suggestion : on la cherche nous-mêmes pour planter le drapeau.
      const city = orNull(form.city);
      const spot = city ? form.spot ?? await findCity(city) : null;
      const patch: Editable = {
        name: form.name.trim(),
        car_number: orNull(form.car_number), tagline: orNull(form.tagline), story: orNull(form.story),
        school: orNull(form.school), city, contact_email: orNull(form.contact_email),
        instagram_url: socialUrl('instagram', form.instagram_url), facebook_url: socialUrl('facebook', form.facebook_url),
        fundraiser_url: webUrl('de la cagnotte', form.fundraiser_url),
        is_public: form.is_public,
        current_rank: numOrNull(form.current_rank), supplies_count: numOrNull(form.supplies_count),
        start_lat: spot?.lat ?? null, start_lon: spot?.lon ?? null, start_region: spot?.region ?? null,
      };
      unwrap(await supabase.from('crews').update(patch).eq('id', crew.id));
    },
    onSuccess: () => {
      toast.success('Modifications enregistrées');
      void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) });
      void queryClient.invalidateQueries({ queryKey: keys.stats(crew.id) });
      void queryClient.invalidateQueries({ queryKey: ['my-crews'] });
    },
    onError: toastError,
  });

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-6">
      <Panel title="Images" description="Le logo apparaît sur la carte et dans la liste des road trips ; la couverture en fond du haut de votre page.">
        <div className="flex flex-col gap-4 sm:flex-row">
          <AvatarPicker crew={crew} />
          <CoverPicker crew={crew} />
        </div>
      </Panel>

      <Panel title="Présentation">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="name" label="Nom du road trip"><Input id="name" required minLength={2} maxLength={80} value={form.name} onChange={set('name')} /></Field>
          <Field id="car" label="Numéro du road trip"><Input id="car" maxLength={10} value={form.car_number} onChange={set('car_number')} /></Field>
          <div className="md:col-span-2">
            <Field id="tagline" label="Slogan" hint="Une phrase courte affichée sous le nom."><Input id="tagline" maxLength={140} value={form.tagline} onChange={set('tagline')} /></Field>
          </div>
          <Field id="school" label="École / association"><Input id="school" maxLength={120} value={form.school} onChange={set('school')} /></Field>
          <Field id="city" label="Ville de départ" hint="Un drapeau la marque sur la carte de votre page (le drapeau breton si vous partez de Bretagne).">
            <CityInput id="city" value={form.city} spot={form.spot} onChange={(city, spot) => setForm((f) => ({ ...f, city, spot }))} />
          </Field>
          <div className="md:col-span-2">
            <Field id="story" label="Votre aventure" hint="Qui êtes-vous, pourquoi ce raid, votre projet solidaire…">
              <textarea id="story" maxLength={5000} className={textareaClass} value={form.story} onChange={set('story')} />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Pendant la course" description="Mettez ces chiffres à jour au fil du raid.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="rank" label="Classement actuel"><Input id="rank" type="number" min={1} value={form.current_rank} onChange={set('current_rank')} /></Field>
          <Field id="supplies" label="Fournitures à livrer"><Input id="supplies" type="number" min={0} value={form.supplies_count} onChange={set('supplies_count')} /></Field>
        </div>
      </Panel>

      <Panel title="Contact & réseaux" description="Instagram et Facebook s’affichent en boutons bien visibles en haut de votre page ; l’email, en bas, dans « Un message pour les voyageurs ? ».">
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="email" label="Email de contact"><Input id="email" type="email" value={form.contact_email} onChange={set('contact_email')} /></Field>
          <Field id="insta" label="Instagram"><Input id="insta" inputMode="url" placeholder="@votre-compte ou lien" value={form.instagram_url} onChange={set('instagram_url')} /></Field>
          <Field id="facebook" label="Facebook"><Input id="facebook" inputMode="url" placeholder="Lien de votre page" value={form.facebook_url} onChange={set('facebook_url')} /></Field>
        </div>
      </Panel>

      <Panel title="Cagnotte" description="Le lien de votre cagnotte en ligne (Leetchi, HelloAsso, Lydia…) : un bouton « Participer à la cagnotte » s’affiche en haut de votre page.">
        <Field id="fundraiser" label="Lien de la cagnotte">
          <Input id="fundraiser" inputMode="url" maxLength={300} placeholder="https://www.leetchi.com/…" value={form.fundraiser_url} onChange={set('fundraiser_url')} />
        </Field>
      </Panel>

      <Panel title="Visibilité">
        <div className="flex items-start gap-3">
          <Switch id="public" checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
          <div>
            <Label htmlFor="public" className="text-cream">Page publique</Label>
            <p className="text-sm text-dust-400">
              {form.is_public
                ? 'Tout le monde peut voir la page et la position GPS avec le lien.'
                : 'Seuls les membres du road trip voient la page (y compris la position).'}
            </p>
          </div>
        </div>
      </Panel>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={save.isPending} className="shadow-xl">
          {save.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </form>
  );
}
