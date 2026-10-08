/**
 * Guide « Prêt au départ » de l'espace voyageur : 8 étapes (voyage, équipage, véhicule, itinéraire, suivi GPS,
 * partage, sponsors & cagnotte, check-list), avec un anneau de progression.
 * Les cases se cochent toutes seules d'après les données du road trip ; celles qui ne se voient pas dans les
 * données (batterie externe, support fixé…) se cochent à la main et sont gardées sur cet appareil.
 * À droite de chaque étape : l'outil qui permet de la faire (formulaires et onglets existants).
 * La dernière étape se termine par « Je pars », qui lance le suivi GPS.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { keys } from '@/hooks/queries';
import { useGuide, type GuideStepId } from '@/hooks/useGuide';
import { markShared } from '@/lib/share';
import { webUrl } from '@/lib/social';
import { cn } from '@/lib/utils';
import { CrewQrPanel } from '@/components/crew/CrewQr';
import { CoverPicker } from './CrewImages';
import { MembersTab } from './MembersTab';
import { StagesTab } from './StagesTab';
import { GpsTab } from './GpsTab';
import { SponsorsTab } from './SponsorsTab';
import { Field } from './shared';


/** Anneau de progression. */
export function ProgressRing({ value, size = 72 }: { value: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2B2C33" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E1262C" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[16px] text-cream">{Math.round(value * 100)} %</span>
    </div>
  );
}

/** Étape « Voyage » : l'essentiel de la page (le reste est dans « Réglages »). */
function TripBasics({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({ name: crew.name, tagline: crew.tagline ?? '', starts: crew.starts_on ?? '', ends: crew.ends_on ?? '', listed: crew.is_listed, open: crew.is_public });
  const save = useMutation({
    mutationFn: async () => unwrap(await supabase.from('crews').update({
      name: f.name.trim(), tagline: f.tagline.trim() || null, starts_on: f.starts || null, ends_on: f.ends || null,
      is_public: f.open, is_listed: f.open && f.listed,
    }).eq('id', crew.id)),
    onSuccess: () => {
      toast.success('C’est enregistré');
      void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) });
      void queryClient.invalidateQueries({ queryKey: ['my-crews'] });
    },
    onError: toastError,
  });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="flex flex-col gap-4 rounded-[28px] bg-ink-800 p-5 sm:p-[22px]">
      <Field id="g-name" label="Nom du road trip"><Input id="g-name" required minLength={2} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field id="g-tagline" label="Une phrase d’accroche" hint="Facultatif, affichée sous le nom."><Input id="g-tagline" maxLength={140} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field id="g-start" label="Départ"><Input id="g-start" type="date" value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} /></Field>
        <Field id="g-end" label="Retour"><Input id="g-end" type="date" min={f.starts || undefined} value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} /></Field>
      </div>
      <CoverPicker crew={crew} />
      <div role="radiogroup" aria-label="Qui peut voir la page" className="grid gap-2">
        {[
          { id: 'link', title: 'Privé, par lien', text: 'seuls ceux qui ont le lien voient la page (recommandé)', on: f.open && !f.listed, set: { open: true, listed: false } },
          { id: 'public', title: 'Public', text: 'la page peut apparaître dans les moteurs de recherche', on: f.open && f.listed, set: { open: true, listed: true } },
          { id: 'private', title: 'Voyageurs seulement', text: 'personne d’autre ne voit la page ni la position', on: !f.open, set: { open: false, listed: false } },
        ].map((v) => (
          <button key={v.id} type="button" role="radio" aria-checked={v.on} onClick={() => setF({ ...f, ...v.set })}
            className={cn('flex flex-col rounded-2xl border-2 px-4 py-3 text-left', v.on ? 'border-signal bg-signal/10' : 'border-ink-600 bg-ink hover:border-dust-600')}>
            <span className="font-bold text-cream">{v.title}</span>
            <span className="text-[15px] text-dust-400">{v.text}</span>
          </button>
        ))}
      </div>
      <Button type="submit" disabled={save.isPending} className="self-start">{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</Button>
    </form>
  );
}

/** Lien de la cagnotte (le reste de « Réglages » n'est pas utile ici). */
function FundraiserForm({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(crew.fundraiser_url ?? '');
  const save = useMutation({
    mutationFn: async () => unwrap(await supabase.from('crews').update({ fundraiser_url: webUrl('de la cagnotte', url) }).eq('id', crew.id)),
    onSuccess: () => { toast.success('Lien de la cagnotte enregistré'); void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) }); },
    onError: toastError,
  });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="flex flex-col gap-3 rounded-[28px] bg-ink-800 p-5 sm:p-[22px]">
      <Field id="g-fund" label="Lien de la cagnotte" hint="Un bouton « Participer » mène vers ta cagnotte (aucun montant n’est affiché sur la page).">
        <Input id="g-fund" inputMode="url" maxLength={300} placeholder="https://www.helloasso.com/…" value={url} onChange={(e) => setUrl(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" disabled={save.isPending} className="self-start">Enregistrer</Button>
    </form>
  );
}

/** Inviter des proches par e-mail : ils reçoivent le lien, puis « C'est parti » et le résumé du soir. */
function InviteRelatives({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const { data: subscribers = [] } = useQuery({
    queryKey: ['crew-subscribers', crew.id],
    queryFn: async () => unwrap(await supabase.from('crew_subscribers').select('id, email, unsubscribed_at, created_at').eq('crew_id', crew.id).order('created_at')),
  });
  const emails = text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  const invite = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('invite_relatives', { p_crew: crew.id, p_emails: emails })),
    onSuccess: (n) => {
      toast.success(n ? `${n} invitation${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''}` : 'Ces personnes sont déjà invitées');
      setText('');
      markShared(crew.id);
      void queryClient.invalidateQueries({ queryKey: ['crew-subscribers', crew.id] });
    },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('crew_subscribers').delete().eq('id', id)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['crew-subscribers', crew.id] }),
    onError: toastError,
  });
  return (
    <div className="flex flex-col gap-3.5 rounded-[28px] bg-ink-800 p-5 sm:p-[22px]">
      <h3 className="tt-display m-0 text-[24px] text-cream">Inviter des proches par e-mail</h3>
      <p className="m-0 text-[15px] leading-relaxed text-dust-300">
        Ils reçoivent le lien, puis un e-mail « C’est parti » quand tu appuies sur « Je pars », et un résumé chaque soir de route.
        Pas de compte à créer ; un clic suffit pour se désinscrire.
      </p>
      {!crew.is_public ? (
        <p className="m-0 text-[15px] text-gold-text">Ta page est réservée aux voyageurs : rends-la « privée, par lien » dans les réglages pour inviter des proches.</p>
      ) : (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); invite.mutate(); }} className="flex flex-col gap-2.5">
          <label htmlFor="relatives" className="text-[16px] font-bold">Leurs adresses e-mail</label>
          <textarea id="relatives" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="mamie@exemple.fr, papa@exemple.fr"
            className="min-h-[96px] w-full rounded-2xl border-2 border-ink-600 bg-ink px-4 py-3 text-[17px] text-cream placeholder:text-dust-600 hover:border-dust-600 focus-visible:border-cream focus-visible:outline-none" />
          <Button type="submit" className="self-start" disabled={!emails.length || invite.isPending}>
            {invite.isPending ? 'Envoi…' : `Envoyer ${emails.length > 1 ? `${emails.length} invitations` : 'l’invitation'}`}
          </Button>
        </form>
      )}
      {subscribers.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {subscribers.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-3.5 py-2.5">
              <span className="min-w-0 truncate text-[15px] text-cream">{x.email}</span>
              <span className="flex items-center gap-2">
                <span className={cn('font-mono text-[12px]', x.unsubscribed_at ? 'text-dust-500' : 'text-live-text')}>{x.unsubscribed_at ? 'désinscrit' : 'invité'}</span>
                <Button size="sm" variant="ghost" aria-label={`Retirer ${x.email}`} onClick={() => remove.mutate(x.id)}>Retirer</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Partage : lien à copier, e-mail aux grands-parents, QR code et visuels. */
export function SharePanel({ crew }: { crew: Crew }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/t/${crew.slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      markShared(crew.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copie impossible : sélectionne le lien à la main.');
    }
  };
  const mail = `mailto:?subject=${encodeURIComponent(`Suivez « ${crew.name} » en direct`)}&body=${encodeURIComponent(`Bonjour !\n\nVous pourrez suivre notre road trip en direct sur cette page : ${url}\n\nPas besoin de compte ni d’application : il suffit d’ouvrir le lien.`)}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3.5 rounded-[28px] bg-cream p-5 text-ink sm:p-[22px]">
        <span className="text-[18px] font-bold">Ton lien privé</span>
        <span className="break-all font-mono text-[14px]">{url.replace(/^https?:\/\//, '')}</span>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy}><Copy />{copied ? 'Lien copié ✓' : 'Copier le lien'}</Button>
          <Button asChild variant="outline" className="border-ink text-ink hover:bg-ink/10 hover:text-ink"><a href={mail} onClick={() => markShared(crew.id)}>E-mail aux proches</a></Button>
        </div>
        <span className="text-[15px] text-dust-800">Personne n’a besoin de compte pour suivre le voyage.</span>
      </div>
      <InviteRelatives crew={crew} />
      <div className="rounded-[28px] bg-ink-800 p-5 sm:p-[22px]">
        <h3 className="tt-display m-0 mb-4 text-[24px] text-cream">Autocollant et story</h3>
        <CrewQrPanel crew={crew} showUrl={false} />
      </div>
    </div>
  );
}

/** « Je pars » : lance le suivi (la charte doit être acceptée, dans « Suivi GPS »). */
function GoButton({ crew, fairPlayOk, onNeedGps }: { crew: Crew; fairPlayOk: boolean; onNeedGps: () => void }) {
  const queryClient = useQueryClient();
  const go = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('set_tracking', { p_crew: crew.id, p_enabled: true })),
    onSuccess: () => {
      toast.success('Bonne route ! Le suivi est lancé : tes proches te voient avancer et reçoivent « C’est parti ».');
      void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) });
    },
    onError: toastError,
  });
  if (crew.tracking_enabled) {
    return (
      <div className="flex flex-col gap-3 rounded-[28px] bg-live/[0.14] p-6 text-live-text">
        <span className="font-mono text-[13px]">c’est parti</span>
        <span className="tt-display text-[30px] leading-none text-cream">Le suivi est lancé. Bonne route !</span>
        <Button asChild variant="secondary" className="self-start"><Link to={`/t/${crew.slug}`}>Voir ma page en direct</Link></Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-[28px] bg-signal p-6 text-white">
      <span className="font-mono text-[13px]">jour J</span>
      <span className="tt-display text-[34px] leading-none">Quand tout est coché, appuie sur « Je pars ».</span>
      <span className="text-[17px] leading-normal">Le suivi démarre : ta position apparaît en direct sur la page, et tes proches reçoivent un e-mail « C’est parti ». Tu peux l’arrêter à tout moment.</span>
      {fairPlayOk ? (
        <Button variant="secondary" size="lg" className="mt-1.5 self-start" disabled={go.isPending} onClick={() => go.mutate()}>{go.isPending ? 'Lancement…' : 'Je pars →'}</Button>
      ) : (
        <Button variant="secondary" size="lg" className="mt-1.5 self-start" onClick={onNeedGps}>D’abord, la charte du voyageur →</Button>
      )}
    </div>
  );
}

export function TripGuide({ crew, step, onStep }: { crew: Crew; step: GuideStepId; onStep: (s: GuideStepId) => void }) {
  const g = useGuide(crew);
  const idx = Math.max(0, g.steps.findIndex((s) => s.id === step));
  const cur = g.steps[idx]!;
  const tools: Record<GuideStepId, ReactNode> = {
    voyage: <TripBasics crew={crew} />,
    equipage: <MembersTab crew={crew} />,
    vehicule: (
      <div className="flex flex-col gap-3 rounded-[24px] bg-ink-800 p-5">
        <span className="h-10 w-10 rounded-full border-[3px] border-ink bg-signal shadow-[0_0_0_2px_#E1262C]" aria-hidden="true" />
        <span className="tt-display text-[24px] text-cream">Le véhicule</span>
        <span className="text-[15px] text-dust-400">{crew.last_fix_at ? 'Le téléphone du véhicule envoie sa position.' : 'Aucune position reçue pour l’instant.'}</span>
        <span className={cn('font-mono text-[13px]', crew.last_fix_at ? 'text-live-text' : 'text-gold-text')}>{crew.last_fix_at ? '● signal reçu' : '○ téléphone à relier dans « Suivi GPS »'}</span>
        <Button variant="outline" size="sm" className="self-start" onClick={() => onStep('gps')}>Relier le téléphone</Button>
      </div>
    ),
    itineraire: <StagesTab crew={crew} />,
    gps: <GpsTab crew={crew} />,
    partage: <SharePanel crew={crew} />,
    sponsors: <div className="flex flex-col gap-4"><FundraiserForm crew={crew} /><SponsorsTab crew={crew} /></div>,
    checklist: <GoButton crew={crew} fairPlayOk={g.fairPlayOk} onNeedGps={() => onStep('gps')} />,
  };
  // Les outils larges (GPS, étapes) prennent toute la largeur sous la carte de l'étape.
  const wide = cur.id === 'gps' || cur.id === 'itineraire' || cur.id === 'sponsors' || cur.id === 'equipage';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[14px] text-dust-400">guide · 8 étapes</span>
          <h1 className="tt-display m-0 text-[clamp(36px,5vw,72px)] leading-[1.05] text-cream">Prêt au <span className="text-signal">départ</span></h1>
        </div>
        <div className="flex items-center gap-4 rounded-[24px] bg-ink-800 py-3.5 pl-3.5 pr-5">
          <ProgressRing value={g.total ? g.done / g.total : 0} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[17px] font-bold">{g.stepsDone === 0 ? 'Aucune étape terminée' : `${g.stepsDone} étape${g.stepsDone > 1 ? 's' : ''} sur 8 terminée${g.stepsDone > 1 ? 's' : ''}`}</span>
            <span className="text-[15px] text-dust-400">{g.total - g.done ? `Encore ${g.total - g.done} point${g.total - g.done > 1 ? 's' : ''} avant le départ` : 'Tout est prêt !'}</span>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Étapes du guide" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {g.steps.map((s, i) => {
          const complete = s.items.every((x) => x.done);
          const sel = i === idx;
          return (
            <button key={s.id} role="tab" type="button" aria-selected={sel} onClick={() => onStep(s.id)}
              className={cn('flex min-h-12 flex-none items-center gap-2.5 whitespace-nowrap rounded-full border-[1.5px] px-4 text-[15px] font-bold',
                sel ? 'border-cream bg-cream text-ink' : 'border-ink-700 bg-ink-800 text-dust-100 hover:border-dust-600')}>
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full font-mono text-[12px]',
                complete ? 'bg-live text-ink' : sel ? 'bg-ink text-cream' : 'bg-ink-700 text-dust-300')}>
                {complete ? '✓' : i + 1}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      <section role="tabpanel" aria-label={cur.title} className={cn('grid items-start gap-4', !wide && 'lg:grid-cols-2')}>
        <div className="flex flex-col gap-4 rounded-[28px] bg-ink-800 p-5 sm:p-[26px]">
          <span className="font-mono text-[13px] text-signal-text">étape {idx + 1} / 8</span>
          <h2 className="tt-display m-0 text-[38px] leading-none text-cream">{cur.title}</h2>
          <p className="m-0 text-[18px] leading-[1.55] text-dust-100">{cur.intro}</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {cur.items.map((it) => {
              const body = (
                <>
                  <span className={cn('flex h-7 w-7 flex-none items-center justify-center rounded-[9px] border-2 font-bold text-white', it.done ? 'border-live bg-live' : 'border-dust-600')}>
                    {it.done && <Check className="h-4 w-4" />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className={cn('text-[17px] font-bold', it.done && 'line-through decoration-cream/40')}>{it.t}</span>
                    {it.d && <span className="text-[15px] text-dust-400">{it.d}</span>}
                  </span>
                </>
              );
              return (
                <li key={it.id}>
                  {it.manual ? (
                    <button type="button" role="checkbox" aria-checked={it.done} onClick={() => g.toggle(it.id)} className="flex min-h-14 w-full items-center gap-3.5 rounded-2xl bg-ink px-3.5 py-2.5 text-left hover:bg-ink-950">
                      {body}
                    </button>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3.5 rounded-2xl bg-ink px-3.5 py-2.5" aria-label={`${it.t} : ${it.done ? 'fait' : 'à faire'}`}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-1.5 flex justify-between gap-2.5">
            <Button variant="outline" disabled={idx === 0} onClick={() => onStep(g.steps[idx - 1]!.id)}>← Précédent</Button>
            {idx < 7 && <Button onClick={() => onStep(g.steps[idx + 1]!.id)}>Étape suivante →</Button>}
          </div>
        </div>
        <div className="min-w-0">{tools[cur.id]}</div>
      </section>
    </div>
  );
}
