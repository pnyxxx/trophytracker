/**
 * /creer : le parcours de création d'un road trip, pensé d'abord pour le téléphone. UNE question par écran, qui
 * tient dans la hauteur de l'écran, le bouton juste sous la question (visible au-dessus du clavier) :
 *
 *   Compte : prénom → e-mail → mot de passe → code reçu par e-mail          (SignInForm, mode `stepwise`)
 *   Road trip : type → départ/arrivée → date → durée → compagnons → nom → photo → visibilité
 *   Accès (paiement Stripe ou code offert) → lien prêt à partager.
 *
 * Les choix uniques (type, date, visibilité) passent à l'écran suivant dès qu'on les touche. Sur ordinateur,
 * l'aperçu de la page se construit à droite. Connecté, on commence directement au type de voyage. Le brouillon
 * est gardé dans le navigateur (localStorage) : on le retrouve au retour de Stripe, ou après avoir fermé l'onglet.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Globe2, ImagePlus, Lock, Plus, Trash2, X } from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { StepNav } from '@/components/common/StepNav';
import { SignInForm, type SignInStep } from '@/components/auth/SignInForm';
import { CrewAccessPurchase } from '@/components/account/CrewAccessPurchase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage, unwrap } from '@/lib/errors';
import { findCity } from '@/lib/geocode';
import { compressImage, uploadCrewImage } from '@/lib/media';
import { markShared } from '@/lib/share';
import { cn } from '@/lib/utils';
import { TRIP_TYPES, type TripType } from '@/lib/trip-types';

// ── Étapes ──────────────────────────────────────────────────────────────────

/** Étapes de la page (le compte en est une seule, découpée en écrans par SignInForm). */
const S = { account: 0, type: 1, route: 2, date: 3, duration: 4, crew: 5, name: 6, cover: 7, visibility: 8, access: 9, share: 10 } as const;
const LAST_STEP = S.share;
/** Écrans du compte, dans l'ordre de la barre d'avancement. */
const ACCOUNT_SCREENS: SignInStep[] = ['su-name', 'su-email', 'su-password', 'code'];
/** Nombre total d'écrans : 4 pour le compte, puis un par étape. */
const SCREENS = ACCOUNT_SCREENS.length + LAST_STEP;
const PHASES = [
  { label: 'Compte', from: 0, to: 3 },
  { label: 'Ton road trip', from: 4, to: 11 },
  { label: 'Accès', from: 12, to: 12 },
  { label: 'Partage', from: 13, to: 13 },
];
/** Conseil affiché sous l'aperçu (ordinateur), par écran. */
const TIPS = [
  'C’est le nom que verront tes proches.',
  'Ton compte sert à retrouver ton road trip depuis n’importe quel appareil.',
  'Tu pourras aussi te connecter avec un code reçu par e-mail.',
  'Le code expire dans 10 minutes.',
  'Le type de voyage adapte les conseils de ton guide « Prêt au départ ».',
  'Pas besoin d’itinéraire : ta trace réelle s’écrira en roulant.',
  'Tes proches verront un compte à rebours jusqu’au départ.',
  'Tu pourras changer les dates plus tard.',
  'Tes compagnons de route gèrent la page avec toi ; tes proches, eux, n’ont besoin de rien.',
  'Tu pourras tout modifier plus tard dans ton espace.',
  'Sans photo, on met une vue satellite de ton point de départ.',
  'Privé ou public : tu peux changer d’avis quand tu veux.',
  'Un seul paiement par road trip. Tes proches suivent gratuitement.',
  'Bravo ! Il te reste quelques réglages, à faire quand tu veux.',
];

const WHENS: { label: string; days: number | null }[] = [
  { label: 'Dans 2 semaines', days: 14 },
  { label: 'Le mois prochain', days: 30 },
  { label: 'Cet été', days: null },
  { label: 'Je suis déjà parti', days: 0 },
];
const DURATIONS: [string, number][] = [['Un week-end', 2], ['Une semaine', 7], ['Deux semaines', 14], ['Un mois', 30]];
const AVATARS = [['bg-signal', 'text-white'], ['bg-cream', 'text-ink'], ['bg-ink-700', 'text-cream'], ['bg-dust-600', 'text-cream']] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DRAFT_KEY = 'tt-creer-brouillon-v2';

interface Mate { name: string; email: string }
interface Draft {
  step: number;
  type: TripType | null;
  from: string;
  to: string;
  /** Indice dans WHENS, ou -1 pour une date choisie. */
  when: number;
  /** Une date de départ a été choisie (sinon l'écran « date » n'est pas encore répondu). */
  whenSet: boolean;
  date: string;
  days: number;
  mates: Mate[];
  tripName: string;
  /** « Privé » (par lien, par défaut) ou public (moteurs de recherche). */
  listed: boolean;
  /** Couverture compressée, en data URL (survit au passage par Stripe). */
  cover: string | null;
  /** Road trip créé (dernière étape). */
  created: { id: string; slug: string } | null;
}
const EMPTY: Draft = { step: 0, type: null, from: '', to: '', when: 0, whenSet: false, date: '', days: 7, mates: [], tripName: '', listed: false, cover: null, created: null };

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}
function saveDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // Stockage plein ou refusé (navigation privée) : on retente sans la photo, sinon tant pis.
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, cover: null })); } catch { /* rien */ }
  }
}
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* rien */ } };

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** « Cet été » : le 1er juillet qui vient. */
const nextSummer = (today: Date) => new Date(today.getMonth() >= 6 ? today.getFullYear() + 1 : today.getFullYear(), 6, 1);
function startDate(d: Draft, today = new Date()): Date {
  if (d.when === -1 && d.date) return new Date(`${d.date}T00:00:00`);
  const w = WHENS[d.when] ?? WHENS[0]!;
  return w.days == null ? nextSummer(today) : addDays(today, w.days);
}
const shortDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const longDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const daysUntil = (d: Date) => Math.round((d.getTime() - addDays(new Date(), 0).getTime()) / 864e5);
const defaultName = (d: Draft) => {
  const from = d.from.trim();
  const to = d.to.trim();
  if (from && to) return `${from} → ${to}`;
  if (to) return `Cap sur ${to}`;
  if (from) return `Au départ de ${from}`;
  return 'Mon road trip';
};
const dataUrlToFile = async (url: string) => {
  const blob = await (await fetch(url)).blob();
  return new File([blob], `couverture.${blob.type.includes('webp') ? 'webp' : 'jpg'}`, { type: blob.type });
};

// ── Petits composants ───────────────────────────────────────────────────────

function StepTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="tt-display m-0 text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.02] text-cream">{children}</h1>
      {hint && <p className="m-0 text-[0.9412rem] leading-snug text-dust-300">{hint}</p>}
    </div>
  );
}

/** Choix à toucher (carte). `selected` : mis en avant en rouge. */
function Choice({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex flex-col justify-center gap-0.5 rounded-[18px] border-2 px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cream',
        selected ? 'border-signal bg-signal text-white' : 'border-ink-700 bg-ink-800/80 text-cream backdrop-blur-sm hover:border-dust-600',
        className,
      )}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange, min, max, label, unit }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string; unit: (n: number) => string }) {
  const btn = 'flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-800 text-2xl font-bold text-cream hover:bg-ink-700 disabled:opacity-40';
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-ink-900/80 p-2" role="group" aria-label={label}>
      <button type="button" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label} : un jour de moins`} className={btn}>−</button>
      <span className="font-mono text-[1.4rem] text-cream" aria-live="polite">{unit(value)}</span>
      <button type="button" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} : un jour de plus`} className={btn}>+</button>
    </div>
  );
}

/** L'aperçu de la page, tel que le verront les proches (colonne de droite, ordinateur seulement). */
function Preview({ d, firstName, tip }: { d: Draft; firstName: string; tip: string }) {
  const start = startDate(d);
  const until = daysUntil(start);
  const names = [firstName || 'Toi', ...d.mates.map((m) => m.name.trim() || m.email.split('@')[0] || '').filter(Boolean)];
  const type = TRIP_TYPES.find((t) => t.id === d.type);
  const title = d.tripName.trim() || (d.from || d.to ? defaultName(d) : 'Ton road trip');
  return (
    <aside aria-label="Aperçu de ta page" className="sticky top-0 hidden h-[100dvh] flex-col justify-center gap-4 border-l-[1.5px] border-cream/[0.08] p-10 min-[1000px]:flex">
      <span className="font-mono text-[0.7647rem] text-dust-400">aperçu en direct · ce que verront tes proches</span>
      <div className="overflow-hidden rounded-[24px] border-[1.5px] border-cream/[0.12] bg-ink shadow-[0_40px_80px_rgba(0,0,0,.5)]">
        <div className="relative h-[13rem] bg-[#17130F]">
          {d.cover ? (
            <img src={d.cover} alt="" className="block h-full w-full object-cover brightness-[.75]" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(90%_80%_at_80%_10%,#4A2A15,#17130F)]">
              <div className="h-full w-full bg-[url('/accueil/dunes.svg')] bg-cover bg-center opacity-80" />
            </div>
          )}
          <div className="absolute left-3.5 top-3.5 flex gap-1.5">
            <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[0.7059rem] text-ink">{d.listed ? 'public' : 'privé'}</span>
            {type && <span className="rounded-full bg-ink/80 px-2.5 py-1 font-mono text-[0.7059rem] text-cream">{type.label.toLowerCase()}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <span className="font-mono text-[0.7647rem] text-signal-text">{d.whenSet ? (until > 0 ? `départ dans ${until} jour${until > 1 ? 's' : ''}` : 'en direct') : 'départ ?'}</span>
          <span className="tt-display text-[1.9rem] leading-none text-cream [overflow-wrap:anywhere]">{title}</span>
          <div className="flex items-center gap-3">
            <div className="flex">
              {names.slice(0, 5).map((n, i) => (
                <span key={i} className={cn('-mr-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink text-[0.8235rem] font-bold', AVATARS[i % 4]![0], AVATARS[i % 4]![1])}>
                  {(n[0] ?? '?').toUpperCase()}
                </span>
              ))}
            </div>
            <span className="pl-2 text-[0.8824rem] text-dust-300">{names.length > 1 ? names.join(', ') : `${names[0]}, en solo`}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[['départ', d.whenSet ? shortDate(start) : '—'], ['durée', `${d.days} j`], ['de', d.from.trim() || '—']].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-[12px] bg-ink-800 px-3 py-2">
                <div className="font-mono text-[0.5882rem] uppercase tracking-[0.1em] text-dust-400">{k}</div>
                <div className="truncate font-mono text-[0.8235rem] text-cream">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="text-[0.8824rem] leading-normal text-dust-300">{tip}</span>
    </aside>
  );
}

/** Contenu d'une étape : un formulaire (touche « Entrée » du clavier = continuer), ou un simple bloc. */
function StepWrapper({ asForm, onSubmit, children }: { asForm: boolean; onSubmit: (e: FormEvent) => void; children: ReactNode }) {
  return asForm
    ? <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">{children}</form>
    : <div className="flex flex-col gap-6">{children}</div>;
}

// ── La page ─────────────────────────────────────────────────────────────────

export default function CreateTripPage() {
  const { user, profile, isAdmin, loading, needsMfa, mfaPending } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [d, setD] = useState<Draft>(loadDraft);
  const [signIn, setSignIn] = useState<SignInStep>('su-name');
  const [hold, setHold] = useState(false);
  const [copied, setCopied] = useState(false);
  /** L'utilisateur a voulu continuer sans répondre : on affiche pourquoi. */
  const [tried, setTried] = useState(false);
  const firstName = profile?.display_name ?? '';

  const set = (patch: Partial<Draft>) => { setTried(false); setD((cur) => ({ ...cur, ...patch })); };
  useEffect(() => saveDraft(d), [d]);

  // Connecté : le compte est fait. Déconnecté : on ne peut pas aller plus loin que le compte.
  const signedIn = !!user && !needsMfa && !hold;
  useEffect(() => {
    if (loading || mfaPending) return;
    if (signedIn && d.step < S.type) set({ step: S.type });
    if (!user && d.step >= S.type && !d.created) set({ step: S.account });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, user, loading, mfaPending]);

  // Accès payé (ou offert) et pas encore utilisé ? Au retour de Stripe, on réinterroge le temps que Stripe confirme.
  const payment = params.get('paiement');
  const [waitingSince] = useState(() => (payment === 'ok' ? Date.now() : 0));
  const { data: hasAccess, isLoading: loadingAccess } = useQuery({
    queryKey: ['crew-access', user?.id],
    enabled: !!user && !needsMfa,
    queryFn: async () =>
      unwrap(await supabase.from('crew_purchases').select('id').eq('status', 'paid').is('used_at', null).limit(1)).length > 0,
    refetchInterval: (q) => (payment === 'ok' && !q.state.data && Date.now() - waitingSince < 60_000 ? 2_000 : false),
  });
  const accessOk = isAdmin || !!hasAccess;
  useEffect(() => {
    if (!payment) return;
    if (payment === 'annule') toast('Paiement annulé : rien n’a été débité.');
    if (payment === 'ok') toast.success('Paiement reçu, merci ! On termine ta page.');
    setParams({}, { replace: true });
  }, [payment, setParams]);

  const create = useMutation({
    mutationFn: async () => {
      const start = startDate(d);
      const name = d.tripName.trim() || defaultName(d);
      const crew = unwrap(await supabase.rpc('create_crew', { p_name: name, p_starts_on: toISO(start) }));
      const from = d.from.trim();
      const spot = from ? await findCity(from) : null;
      const { error: infoErr } = await supabase.from('crews').update({
        trip_type: d.type,
        city: from || null,
        destination: d.to.trim() || null,
        start_lat: spot?.lat ?? null,
        start_lon: spot?.lon ?? null,
        start_region: spot?.region ?? null,
        ends_on: toISO(addDays(start, Math.max(0, d.days - 1))),
        is_public: true,
        is_listed: d.listed,
      }).eq('id', crew.id);
      const problems: string[] = [];
      if (infoErr) problems.push('certaines informations n’ont pas été enregistrées');
      if (d.cover) {
        try {
          const { path } = await uploadCrewImage(crew.id, 'cover', await dataUrlToFile(d.cover), 'cover');
          await supabase.from('crews').update({ cover_path: path }).eq('id', crew.id);
        } catch {
          problems.push('la photo de couverture n’a pas pu être envoyée');
        }
      }
      for (const m of d.mates.filter((x) => EMAIL_RE.test(x.email.trim()))) {
        const { error } = await supabase.functions.invoke('invite-member', { body: { crewId: crew.id, email: m.email.trim() } });
        if (error) problems.push(`invitation de ${m.email.trim()} impossible`);
      }
      return { crew: { id: crew.id, slug: crew.slug }, problems };
    },
    onSuccess: ({ crew, problems }) => {
      setD((cur) => ({ ...cur, created: crew, step: LAST_STEP, cover: null }));
      window.scrollTo(0, 0);
      void queryClient.invalidateQueries({ queryKey: ['crew-access'] });
      void queryClient.invalidateQueries({ queryKey: ['my-crews'] });
      if (problems.length) toast.warning(`Ta page est créée, mais ${problems.join(', ')}. Tu pourras le refaire dans ton espace.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const mateErrors = d.mates.map((m) => (m.email.trim() && !EMAIL_RE.test(m.email.trim()) ? 'Adresse e-mail incomplète' : null));
  /** Pourquoi on ne peut pas continuer (null : c'est bon). */
  const blocker = ((): string | null => {
    switch (d.step) {
      case S.type: return d.type ? null : 'Choisis comment tu pars.';
      case S.route: return d.from.trim() ? null : 'Indique au moins ta ville de départ.';
      case S.date: return d.whenSet && (d.when !== -1 || d.date) ? null : 'Choisis quand tu pars.';
      case S.crew: return mateErrors.some(Boolean) ? 'Corrige l’adresse e-mail de ton compagnon de route, ou retire-le.' : null;
      case S.name: return d.tripName.trim().length >= 2 ? null : 'Donne un nom à ton road trip (2 caractères minimum).';
      case S.access: return accessOk ? null : 'Règle d’abord ton accès.';
      default: return null;
    }
  })();

  const go = (delta: number) => {
    setTried(false);
    setD((cur) => {
      const step = Math.max(signedIn ? S.type : S.account, Math.min(LAST_STEP, cur.step + delta));
      const patch: Partial<Draft> = { step };
      if (step === S.name && !cur.tripName.trim()) patch.tripName = defaultName(cur);
      return { ...cur, ...patch };
    });
    window.scrollTo(0, 0);
  };
  const next = (e?: FormEvent) => {
    e?.preventDefault();
    if (blocker) return setTried(true);
    if (d.step === S.access) return create.mutate();
    if (d.step === LAST_STEP) {
      const slug = d.created?.slug;
      clearDraft();
      return navigate(slug ? `/mon-compte/road-trips/${slug}` : '/mon-compte');
    }
    go(1);
  };
  /** Choix unique : on l'enregistre et on passe à l'écran suivant, le temps de voir la sélection. */
  const pick = (patch: Partial<Draft>) => {
    set(patch);
    window.setTimeout(() => go(1), 220);
  };

  const pageUrl = d.created ? `${window.location.origin}/road-trip/${d.created.slug}` : '';
  const shareText = `Suis notre road trip « ${d.tripName.trim() || defaultName(d)} » en direct : ${pageUrl}`;
  const shared = () => { if (d.created) markShared(d.created.id); };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      shared();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copie impossible : sélectionne le lien à la main.');
    }
  };

  const pickCover = async (file: File) => {
    try {
      const { blob } = await compressImage(file, 'cover');
      const reader = new FileReader();
      reader.onload = () => set({ cover: String(reader.result) });
      reader.readAsDataURL(blob);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  // Écran affiché dans la barre d'avancement : les 4 premiers sont ceux du compte.
  const screen = d.step >= S.type
    ? ACCOUNT_SCREENS.length + d.step - 1
    : Math.max(0, ACCOUNT_SCREENS.indexOf(signIn === 'name' ? 'code' : signIn === 'email' ? 'su-password' : signIn));
  const minutes = Math.max(0, Math.ceil((SCREENS - 1 - screen) * 0.3));
  const back = d.step > S.type && d.step < LAST_STEP ? () => go(-1) : undefined;
  const start = startDate(d);
  const error = tried && blocker ? <p role="alert" className="m-0 text-[0.9412rem] font-bold text-signal-text">{blocker}</p> : null;

  if (loading) return <PageLoader />;

  const accountTitle: Record<SignInStep, ReactNode> = {
    'su-name': <>Salut ! Comment tu <span className="text-signal">t’appelles</span> ?</>,
    'su-email': 'Ton adresse e-mail ?',
    'su-password': 'Choisis un mot de passe.',
    code: 'Regarde tes e-mails.',
    name: 'Enchanté !',
    email: 'Content de te revoir.',
  };

  return (
    <div className="tt-dunes min-h-[100dvh] text-cream min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(400px,0.8fr)]">
      <Seo title="Créer mon road trip" noindex />
      <div className="flex min-h-[100dvh] min-w-0 flex-col">
        {/* En-tête compact : logo, avancement, temps restant */}
        <header className="flex flex-col gap-3 px-4 pb-1 pt-3.5 min-[1000px]:px-14 min-[1000px]:pt-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" aria-label="trophytracker, accueil" className="flex items-center gap-[9px] text-cream hover:text-cream">
              <LogoMark /><Wordmark className="hidden sm:inline" />
            </Link>
            <span className="font-mono text-[0.7647rem] text-dust-400">
              {PHASES.find((p) => screen >= p.from && screen <= p.to)?.label} · {minutes ? `≈ ${minutes} min` : 'terminé'}
            </span>
          </div>
          <div className="grid grid-cols-[4fr_8fr_1.4fr_1.4fr] gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={SCREENS} aria-valuenow={screen + 1} aria-label="Avancement">
            {PHASES.map((p) => (
              <div key={p.label} className="flex gap-[3px]">
                {Array.from({ length: p.to - p.from + 1 }, (_, k) => p.from + k).map((i) => (
                  <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i < screen ? 'bg-signal' : i === screen ? 'bg-cream' : 'bg-cream/15')} />
                ))}
              </div>
            ))}
          </div>
        </header>

        <main className="flex flex-1 justify-center px-4 pb-8 pt-8 min-[1000px]:items-center min-[1000px]:px-14">
          <div className="flex w-full max-w-[34rem] flex-col gap-6">
            {/* Compte : prénom → e-mail → mot de passe → code */}
            {d.step === S.account && (
              <>
                <StepTitle hint={signIn === 'su-name' ? 'Ta page de road trip prend 4 minutes. On commence par ton compte.' : undefined}>
                  {accountTitle[signIn]}
                </StepTitle>
                {user && needsMfa ? (
                  <p className="m-0 text-dust-200">Termine d’abord ta connexion : <Link to="/connexion?next=/creer" className="font-bold text-signal-text">code de double authentification</Link>.</p>
                ) : (
                  <SignInForm signup stepwise switchable onHold={setHold} onStepChange={(step) => setSignIn(step)} onDone={() => set({ step: S.type })} />
                )}
              </>
            )}

            {d.step > S.account && (
              // L'étape « accès » contient ses propres formulaires (paiement, code offert) : jamais de formulaire
              // dans un formulaire, cette étape-là est donc un simple bloc.
              <StepWrapper asForm={!(d.step === S.access && !accessOk)} onSubmit={next}>
                {/* Type de voyage */}
                {d.step === S.type && (
                  <>
                    {firstName && <span className="-mb-3 font-mono text-[0.8235rem] text-live-text">✓ compte prêt · bienvenue {firstName}</span>}
                    <StepTitle>Tu pars comment ?</StepTitle>
                    <div role="radiogroup" aria-label="Type de voyage" className="grid grid-cols-2 gap-2">
                      {TRIP_TYPES.map((t) => (
                        <Choice key={t.id} selected={d.type === t.id} onClick={() => pick({ type: t.id })} className="min-h-[4.6rem]">
                          <span className="tt-display text-[1.15rem] leading-tight">{t.label}</span>
                          <span className="font-mono text-[0.7059rem] opacity-80">{t.hint}</span>
                        </Choice>
                      ))}
                    </div>
                  </>
                )}

                {/* Départ et arrivée */}
                {d.step === S.route && (
                  <>
                    <StepTitle hint="Pas besoin d’itinéraire précis : ta trace s’écrira toute seule en roulant.">D’où à où ?</StepTitle>
                    <div className="flex flex-col gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="from">Départ</Label>
                        <Input id="from" placeholder="Ville de départ" enterKeyHint="next" maxLength={80} autoFocus value={d.from} onChange={(e) => set({ from: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="to">Arrivée <span className="font-normal text-dust-400">· facultatif</span></Label>
                        <Input id="to" placeholder="Destination" enterKeyHint="next" maxLength={80} value={d.to} onChange={(e) => set({ to: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}

                {/* Date de départ */}
                {d.step === S.date && (
                  <>
                    <StepTitle>Tu pars quand ?</StepTitle>
                    <div role="radiogroup" aria-label="Date de départ" className="grid grid-cols-2 gap-2">
                      {WHENS.map((w, i) => {
                        const dt = w.days == null ? nextSummer(new Date()) : addDays(new Date(), w.days);
                        return (
                          <Choice key={w.label} selected={d.whenSet && d.when === i} onClick={() => pick({ when: i, whenSet: true })} className="min-h-[4.6rem]">
                            <span className="tt-display text-[1.15rem] leading-tight">{w.label}</span>
                            <span className="font-mono text-[0.7059rem] opacity-80">{w.days === 0 ? 'suivi immédiat' : `vers le ${shortDate(dt)}`}</span>
                          </Choice>
                        );
                      })}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="date">Ou une date précise</Label>
                      <Input id="date" type="date" value={d.when === -1 ? d.date : ''} onChange={(e) => set({ when: e.target.value ? -1 : 0, whenSet: !!e.target.value, date: e.target.value })} />
                    </div>
                  </>
                )}

                {/* Durée */}
                {d.step === S.duration && (
                  <>
                    <StepTitle hint={`Départ ${longDate(start)}.`}>Pour combien de temps ?</StepTitle>
                    <div role="radiogroup" aria-label="Durée" className="grid grid-cols-2 gap-2">
                      {DURATIONS.map(([label, n]) => (
                        <Choice key={label} selected={d.days === n} onClick={() => set({ days: n })} className="min-h-[3.6rem]">
                          <span className="tt-display text-[1.05rem]">{label}</span>
                        </Choice>
                      ))}
                    </div>
                    <Stepper value={d.days} onChange={(days) => set({ days })} min={1} max={365} label="Durée" unit={(n) => `${n} jour${n > 1 ? 's' : ''}`} />
                  </>
                )}

                {/* Compagnons de route */}
                {d.step === S.crew && (
                  <>
                    <StepTitle hint="Ils recevront une invitation par e-mail pour gérer la page avec toi. Tes proches, eux, n’ont besoin de rien.">
                      Tu pars avec qui ?
                    </StepTitle>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 rounded-[18px] bg-ink-800/80 px-3 py-2.5">
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-signal font-bold text-white">{(firstName[0] ?? '?').toUpperCase()}</span>
                        <span className="font-bold">{firstName || 'Toi'} <span className="font-normal text-dust-400">· toi</span></span>
                      </div>
                      {d.mates.map((m, i) => {
                        const [bg, fg] = AVATARS[(i + 1) % 4]!;
                        const update = (patch: Partial<Mate>) => set({ mates: d.mates.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                        return (
                          <div key={i} className="flex flex-col gap-2 rounded-[18px] bg-ink-800/80 p-3">
                            <div className="flex items-center gap-3">
                              <span className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-full font-bold', bg, fg)}>{(m.name.trim()[0] ?? '+').toUpperCase()}</span>
                              <Input placeholder="Prénom" aria-label={`Prénom du compagnon de route ${i + 1}`} maxLength={60} autoFocus={!m.name && !m.email} value={m.name} onChange={(e) => update({ name: e.target.value })} className="min-h-12" />
                              <button type="button" onClick={() => set({ mates: d.mates.filter((_, k) => k !== i) })} aria-label={`Retirer ${m.name || 'ce compagnon de route'}`} className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-dust-400 hover:bg-ink-700 hover:text-cream">
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <Input type="email" inputMode="email" placeholder="son@e-mail.fr" aria-label={`E-mail du compagnon de route ${i + 1}`} aria-invalid={!!mateErrors[i]} value={m.email} onChange={(e) => update({ email: e.target.value })} className="min-h-12" />
                            {mateErrors[i] && <span className="text-[0.8235rem] text-signal-text">{mateErrors[i]}</span>}
                          </div>
                        );
                      })}
                      {d.mates.length < 8 && (
                        <button type="button" onClick={() => set({ mates: [...d.mates, { name: '', email: '' }] })} className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-dust-600 px-4 font-bold text-cream hover:border-cream">
                          <Plus className="h-4 w-4" />Ajouter un compagnon de route
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Nom */}
                {d.step === S.name && (
                  <>
                    <StepTitle hint="C’est le titre de ta page. On t’a fait une proposition, change-la si tu veux.">Comment s’appelle ton road trip ?</StepTitle>
                    <Input id="trip-name" aria-label="Nom du road trip" maxLength={80} autoFocus enterKeyHint="next" value={d.tripName} onChange={(e) => set({ tripName: e.target.value })} />
                  </>
                )}

                {/* Photo de couverture */}
                {d.step === S.cover && (
                  <>
                    <StepTitle hint="En haut de ta page. Facultatif : sans photo, on met une vue satellite.">Une photo de couverture ?</StepTitle>
                    {d.cover ? (
                      <div className="relative aspect-[16/10] overflow-hidden rounded-[20px]">
                        <img src={d.cover} alt="Ta photo de couverture" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => set({ cover: null })} className="absolute right-3 top-3 flex min-h-11 items-center gap-2 rounded-full bg-ink/80 px-4 text-[0.8824rem] font-bold text-cream hover:bg-ink">
                          <Trash2 className="h-4 w-4" />Retirer
                        </button>
                      </div>
                    ) : (
                      <label className="flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-cream/25 bg-ink-800/70 text-center text-[0.9412rem] font-bold text-dust-200 hover:border-cream">
                        <ImagePlus className="h-7 w-7" />
                        Choisir une photo
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickCover(f); e.target.value = ''; }} />
                      </label>
                    )}
                  </>
                )}

                {/* Visibilité */}
                {d.step === S.visibility && (
                  <>
                    <StepTitle>Qui peut voir ta page ?</StepTitle>
                    <div role="radiogroup" aria-label="Visibilité" className="flex flex-col gap-2">
                      {[
                        { listed: false, icon: Lock, title: 'Seulement ceux qui ont le lien', text: 'Privé : ta page n’apparaît nulle part, jamais sur Google.', tag: 'recommandé' },
                        { listed: true, icon: Globe2, title: 'Tout le monde', text: 'Public : ta page peut apparaître dans les moteurs de recherche.', tag: null },
                      ].map((o) => (
                        <Choice key={o.title} selected={d.listed === o.listed} onClick={() => pick({ listed: o.listed })} className="flex-row items-center gap-3.5 py-4">
                          <o.icon className="h-6 w-6 flex-none" />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex flex-wrap items-center gap-2 font-bold">
                              {o.title}
                              {o.tag && <span className="rounded-full bg-cream/15 px-2 py-0.5 font-mono text-[0.6471rem] font-normal">{o.tag}</span>}
                            </span>
                            <span className="text-[0.8824rem] opacity-85">{o.text}</span>
                          </span>
                        </Choice>
                      ))}
                    </div>
                  </>
                )}

                {/* Accès */}
                {d.step === S.access && (
                  <>
                    <StepTitle>
                      {accessOk ? 'Tout est prêt.' : 'Dernière étape : ton accès.'}
                    </StepTitle>
                    {loadingAccess ? (
                      <PageLoader />
                    ) : accessOk ? (
                      <div className="flex items-center gap-3 rounded-[18px] bg-live/[0.12] px-4 py-4 text-live-text">
                        <Check className="h-6 w-6 flex-none" />
                        <span>{isAdmin && !hasAccess ? 'Compte administrateur : pas de paiement à faire.' : 'Ton accès est réglé. Il ne reste qu’à créer ta page.'}</span>
                      </div>
                    ) : (
                      <>
                        {waitingSince > 0 && <p className="m-0 text-dust-200">On attend la confirmation de ton paiement…</p>}
                        <CrewAccessPurchase returnTo="creer" compact />
                      </>
                    )}
                  </>
                )}

                {/* Lien prêt */}
                {d.step === S.share && d.created && (
                  <>
                    <span className="flex items-center gap-2 self-start rounded-full bg-signal px-3 py-1.5 font-mono text-[0.7647rem] text-white">
                      <span className="relative h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-white" /><span className="absolute inset-0 rounded-full bg-white" /></span>
                      ta page est en ligne
                    </span>
                    <StepTitle hint="Envoie le lien maintenant : tes proches compteront les jours avec toi, et suivront tout en direct dès le départ.">
                      C’est prêt{firstName ? <>, <span className="text-signal">{firstName}</span></> : null} !
                    </StepTitle>
                    <div className="flex items-center gap-2 rounded-[18px] bg-cream py-1.5 pl-4 pr-1.5 text-ink">
                      <span className="min-w-0 flex-1 truncate font-mono text-[0.8824rem]">{pageUrl.replace(/^https?:\/\//, '')}</span>
                      <button type="button" onClick={copy} className="flex min-h-12 items-center whitespace-nowrap rounded-[14px] bg-signal px-4 font-bold text-white hover:bg-signal-hover">{copied ? 'Copié ✓' : 'Copier'}</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
                        { label: 'SMS', href: `sms:?&body=${encodeURIComponent(shareText)}` },
                        { label: 'E-mail', href: `mailto:?subject=${encodeURIComponent('Suivez notre road trip en direct')}&body=${encodeURIComponent(`${shareText}\n\nPas besoin de compte ni d’application : il suffit d’ouvrir le lien.`)}` },
                      ].map((s) => (
                        <a key={s.label} href={s.href} target="_blank" rel="noreferrer" onClick={shared} className="flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-cream/40 px-3 font-bold text-cream hover:bg-cream hover:text-ink">
                          {s.label}
                        </a>
                      ))}
                    </div>
                  </>
                )}

                {error}
                <StepNav
                  onBack={back}
                  busy={create.isPending}
                  hidePrimary={d.step === S.access && !accessOk}
                  label={
                    d.step === S.access ? (create.isPending ? 'Création de ta page…' : 'Créer ma page →')
                      : d.step === S.share ? 'Préparer mon départ →'
                        : d.step === S.crew && !d.mates.length ? 'Je pars seul →'
                          : d.step === S.cover && !d.cover ? 'Passer →'
                            : 'Continuer →'
                  }
                />
                {d.step === S.share && (
                  <p className="m-0 text-[0.8824rem] text-dust-400">Ton espace te guide pour la suite : installer le suivi GPS sur ton téléphone, ajouter tes sponsors…</p>
                )}
              </StepWrapper>
            )}
          </div>
        </main>
      </div>

      <Preview d={d} firstName={firstName} tip={TIPS[screen] ?? ''} />
    </div>
  );
}
