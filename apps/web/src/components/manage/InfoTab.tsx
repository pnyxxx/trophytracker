import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase, type Crew } from '@/lib/supabase';
import { socialUrl, webUrl } from '@/lib/social';
import { findCity } from '@/lib/geocode';
import { toastError, unwrap } from '@/lib/errors';
import { keys } from '@/hooks/queries';
import { Field, orNull, Panel, selectClass, textareaClass } from './shared';
import { TRIP_TYPES } from '@/lib/trip-types';
import { AvatarPicker, CoverPicker } from './CrewImages';
import { CityInput } from './CityInput';

type Editable = Pick<Crew,
  'name' | 'car_number' | 'tagline' | 'story' | 'school' | 'city' | 'contact_email' |
  'instagram_url' | 'facebook_url' | 'fundraiser_url' | 'is_public' | 'is_listed' | 'starts_on' | 'ends_on' |
  'start_lat' | 'start_lon' | 'start_region' | 'destination' | 'trip_type'>;

type Visibility = 'private' | 'link' | 'public';
const visibilityOf = (c: Pick<Crew, 'is_public' | 'is_listed'>): Visibility => (!c.is_public ? 'private' : c.is_listed ? 'public' : 'link');

const VISIBILITY: { value: Visibility; title: string; text: string }[] = [
  { value: 'link', title: 'Privé, par lien', text: 'Toute personne qui a le lien voit la page. Elle n’apparaît nulle part ailleurs, ni sur Google. Recommandé.' },
  { value: 'public', title: 'Public', text: 'Comme « par lien », et la page peut apparaître dans les moteurs de recherche.' },
  { value: 'private', title: 'Voyageurs seulement', text: 'Seuls les voyageurs du road trip voient la page et la position.' },
];

const toForm = (c: Crew) => ({
  name: c.name, car_number: c.car_number ?? '', tagline: c.tagline ?? '', story: c.story ?? '',
  school: c.school ?? '', city: c.city ?? '', contact_email: c.contact_email ?? '',
  instagram_url: c.instagram_url ?? '', facebook_url: c.facebook_url ?? '',
  fundraiser_url: c.fundraiser_url ?? '', visibility: visibilityOf(c),
  starts_on: c.starts_on ?? '', ends_on: c.ends_on ?? '',
  destination: c.destination ?? '', trip_type: c.trip_type ?? '',
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
        is_public: form.visibility !== 'private', is_listed: form.visibility === 'public',
        starts_on: orNull(form.starts_on), ends_on: orNull(form.ends_on),
        destination: orNull(form.destination), trip_type: (orNull(form.trip_type) as Crew['trip_type']) ?? null,
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
      <Panel title="Images" description="Le logo apparaît sur la carte et dans tes road trips ; la couverture en fond du haut de ta page.">
        <div className="flex flex-col gap-4 sm:flex-row">
          <AvatarPicker crew={crew} />
          <CoverPicker crew={crew} />
        </div>
      </Panel>

      <Panel title="Présentation">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="name" label="Nom du road trip"><Input id="name" required minLength={2} maxLength={80} value={form.name} onChange={set('name')} /></Field>
          <Field id="car" label="Numéro de course" hint="Facultatif : ton numéro si tu participes à un rallye."><Input id="car" maxLength={10} value={form.car_number} onChange={set('car_number')} /></Field>
          <div className="md:col-span-2">
            <Field id="tagline" label="Slogan" hint="Une phrase courte affichée sous le nom."><Input id="tagline" maxLength={140} value={form.tagline} onChange={set('tagline')} /></Field>
          </div>
          <Field id="school" label="École, association ou club" hint="Facultatif."><Input id="school" maxLength={120} value={form.school} onChange={set('school')} /></Field>
          <Field id="city" label="Ville de départ" hint="Un drapeau la marque sur la carte de ta page (le drapeau breton si tu pars de Bretagne).">
            <CityInput id="city" value={form.city} spot={form.spot} onChange={(city, spot) => setForm((f) => ({ ...f, city, spot }))} />
          </Field>
          <Field id="destination" label="Destination" hint="Où tu vas : affiché « départ → destination » sur ta page.">
            <Input id="destination" maxLength={80} value={form.destination} onChange={set('destination')} />
          </Field>
          <Field id="trip-type" label="Type de voyage" hint="Adapte les conseils du guide « Prêt au départ ».">
            <select id="trip-type" className={selectClass} value={form.trip_type} onChange={(e) => setForm({ ...form, trip_type: e.target.value })}>
              <option value="">Non précisé</option>
              {TRIP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label} · {t.hint}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field id="story" label="Ton aventure" hint="Qui es-tu, où vas-tu, pourquoi ce voyage, ton projet solidaire…">
              <textarea id="story" maxLength={5000} className={textareaClass} value={form.story} onChange={set('story')} />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Dates" description="Le jour du départ, le suivi GPS se lance tout seul si tu as oublié de le faire. Les photos sont datées « Jour 3 », « Jour 4 »…">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="starts" label="Départ"><Input id="starts" type="date" value={form.starts_on} onChange={set('starts_on')} /></Field>
          <Field id="ends" label="Retour" hint="Facultatif."><Input id="ends" type="date" min={form.starts_on || undefined} value={form.ends_on} onChange={set('ends_on')} /></Field>
        </div>
      </Panel>

      <Panel title="Contact & réseaux" description="Instagram et Facebook s’affichent en boutons bien visibles en haut de ta page ; l’e-mail, en bas, dans « Un message pour les voyageurs ? ».">
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="email" label="Email de contact"><Input id="email" type="email" value={form.contact_email} onChange={set('contact_email')} /></Field>
          <Field id="insta" label="Instagram"><Input id="insta" inputMode="url" placeholder="@ton-compte ou lien" value={form.instagram_url} onChange={set('instagram_url')} /></Field>
          <Field id="facebook" label="Facebook"><Input id="facebook" inputMode="url" placeholder="Lien de ta page" value={form.facebook_url} onChange={set('facebook_url')} /></Field>
        </div>
      </Panel>

      <Panel title="Cagnotte" description="Le lien de ta cagnotte en ligne (Leetchi, HelloAsso, Lydia…) : un bouton « Participer » s’affiche sur ta page.">
        <Field id="fundraiser" label="Lien de la cagnotte">
          <Input id="fundraiser" inputMode="url" maxLength={300} placeholder="https://www.leetchi.com/…" value={form.fundraiser_url} onChange={set('fundraiser_url')} />
        </Field>
      </Panel>

      <Panel title="Visibilité" description="Qui peut voir la page et la position GPS. Tu peux changer d’avis à tout moment.">
        <div role="radiogroup" aria-label="Visibilité" className="grid gap-3 md:grid-cols-3">
          {VISIBILITY.map((v) => (
            <button
              key={v.value}
              type="button"
              role="radio"
              aria-checked={form.visibility === v.value}
              onClick={() => setForm({ ...form, visibility: v.value })}
              className={`flex flex-col gap-1.5 rounded-2xl border-2 p-4 text-left transition ${form.visibility === v.value ? 'border-signal bg-signal/10' : 'border-ink-600 hover:border-dust-600'}`}
            >
              <span className="font-bold text-cream">{v.title}</span>
              <span className="text-[15px] text-dust-300">{v.text}</span>
            </button>
          ))}
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
