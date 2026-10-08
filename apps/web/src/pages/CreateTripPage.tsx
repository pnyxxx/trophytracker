/**
 * /creer : le parcours de création d'un road trip, très guidé, avec l'aperçu de la page qui se construit à côté.
 *   Compte (prénom + e-mail) → code → type de voyage → d'où à où → quand + durée → équipage
 *   → nom, couverture, visibilité → accès (paiement Stripe ou code offert) → lien prêt à partager.
 * Connecté, on commence directement au type de voyage. Le brouillon est gardé dans le navigateur
 * (localStorage) : on le retrouve au retour de la page de paiement Stripe, ou après avoir fermé l'onglet.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ImagePlus, Trash2 } from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { EmailCodeSignIn, type SignInStep } from '@/components/auth/EmailCodeSignIn';
import { CrewAccessPurchase } from '@/components/account/CrewAccessPurchase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage, unwrap } from '@/lib/errors';
import { findCity } from '@/lib/geocode';
import { compressImage, uploadCrewImage } from '@/lib/media';
import { markShared } from '@/lib/share';
import { cn } from '@/lib/utils';

// ── Données du parcours ─────────────────────────────────────────────────────

export const TRIP_TYPES = [
  { id: 'van', label: 'En van', hint: 'camping-car, bivouac' },
  { id: 'voiture', label: 'En voiture', hint: 'road trip classique' },
  { id: 'moto', label: 'À moto', hint: 'cols et virages' },
  { id: 'raid', label: 'Raid ou rallye', hint: 'avec sponsors' },
  { id: 'groupe', label: 'Entre amis', hint: 'à plusieurs' },
  { id: 'monde', label: 'Tour du monde', hint: 'des mois de route' },
] as const;
type TripType = (typeof TRIP_TYPES)[number]['id'];

const IDEAS: [string, string][] = [['Bergen', 'Lofoten'], ['Lisbonne', 'Algarve'], ['Lyon', 'Dolomites'], ['Inverness', 'Île de Skye']];
const WHENS: { label: string; days: number | null }[] = [
  { label: 'Dans 2 semaines', days: 14 },
  { label: 'Le mois prochain', days: 30 },
  { label: 'Cet été', days: null },
  { label: 'Je suis déjà parti', days: 0 },
];
const TIPS = [
  'Ton compte sert à retrouver ton voyage depuis n’importe quel appareil.',
  'Le code expire dans 10 minutes.',
  'Le type de voyage adapte les conseils de ton guide « Prêt au départ ».',
  'Ta trace réelle remplacera cet aperçu dès que tu rouleras.',
  'Tes proches verront un compte à rebours jusqu’au départ.',
  'Tes compagnons de route gèrent la page avec toi ; tes proches, eux, n’ont besoin de rien.',
  'Tu pourras tout modifier plus tard dans ton espace.',
  'Un seul paiement par road trip. Tes proches suivent gratuitement.',
  'Bravo ! Il te reste quelques réglages, à faire quand tu veux.',
];
const MINUTES = [4, 3, 3, 3, 2, 2, 1, 1, 0];
const AVATARS = [['bg-signal', 'text-white'], ['bg-cream', 'text-ink'], ['bg-ink-700', 'text-cream'], ['bg-dust-600', 'text-cream']] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DRAFT_KEY = 'tt-creer-brouillon';
const LAST_STEP = 8;

interface Mate { name: string; email: string }
interface Draft {
  step: number;
  type: TripType | null;
  from: string;
  to: string;
  /** Indice dans WHENS, ou -1 pour une date choisie. */
  when: number;
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
const EMPTY: Draft = { step: 0, type: null, from: '', to: '', when: 0, date: '', days: 12, mates: [], tripName: '', listed: false, cover: null, created: null };

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
const nextSummer = (today: Date) => {
  const y = today.getMonth() >= 6 ? today.getFullYear() + 1 : today.getFullYear();
  return new Date(y, 6, 1);
};
function startDate(d: Draft, today = new Date()): Date {
  if (d.when === -1 && d.date) return new Date(`${d.date}T00:00:00`);
  const w = WHENS[d.when] ?? WHENS[0]!;
  return w.days == null ? nextSummer(today) : addDays(today, w.days);
}
const shortDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const daysUntil = (d: Date) => Math.round((d.getTime() - addDays(new Date(), 0).getTime()) / 864e5);
const defaultName = (d: Draft) => (d.from.trim() || d.to.trim() ? `${d.from.trim() || 'Départ'} → ${d.to.trim() || 'Arrivée'}` : 'Mon road trip');
const dataUrlToFile = async (url: string) => {
  const blob = await (await fetch(url)).blob();
  return new File([blob], `couverture.${blob.type.includes('webp') ? 'webp' : 'jpg'}`, { type: blob.type });
};

// ── Petits composants ───────────────────────────────────────────────────────

function StepTitle({ children }: { children: ReactNode }) {
  return <h1 className="tt-display m-0 text-[clamp(34px,4.4vw,60px)] leading-none text-cream">{children}</h1>;
}

function Choice({ selected, onClick, children, className, role = 'radio' }: {
  selected: boolean; onClick: () => void; children: ReactNode; className?: string; role?: 'radio' | 'button';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === 'radio' ? selected : undefined}
      aria-pressed={role === 'button' ? selected : undefined}
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-[22px] border-2 px-4 py-3.5 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cream',
        className,
      )}
      data-selected={selected}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange, min, max, label, unit }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string; unit: (n: number) => string }) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label} : un de moins`} className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-ink-800 text-2xl font-bold text-cream hover:bg-ink-700">−</button>
      <span className="min-w-[130px] text-center font-mono text-[28px] text-cream" aria-live="polite">{unit(value)}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} : un de plus`} className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-ink-800 text-2xl font-bold text-cream hover:bg-ink-700">+</button>
    </div>
  );
}

/** L'aperçu de la page, tel que le verront les proches (colonne de droite sur ordinateur). */
function Preview({ d, firstName, tip }: { d: Draft; firstName: string; tip: string }) {
  const start = startDate(d);
  const until = daysUntil(start);
  const names = [firstName || 'Toi', ...d.mates.map((m) => m.name.trim() || m.email.split('@')[0] || '').filter(Boolean)];
  const type = TRIP_TYPES.find((t) => t.id === d.type);
  const title = d.tripName.trim() || (d.from || d.to ? defaultName(d) : 'Ton road trip');
  const hasRoute = !!(d.from.trim() && d.to.trim());
  return (
    <aside aria-label="Aperçu de ta page" className="sticky top-0 hidden h-screen flex-col justify-center gap-4 border-l-[1.5px] border-ink-700 bg-ink-950 p-10 min-[1000px]:flex">
      <span className="font-mono text-[13px] text-dust-400">aperçu en direct · ce que verront tes proches</span>
      <div className="overflow-hidden rounded-[28px] border-[1.5px] border-ink-700 bg-ink shadow-[0_40px_80px_rgba(0,0,0,.5)]">
        <div className="relative h-[250px] bg-ink-800">
          <img
            src={d.cover ?? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-12,34,22,62&bboxSR=4326&imageSR=3857&size=900,640&format=jpg&f=image'}
            alt=""
            className="block h-full w-full object-cover brightness-[.7]"
          />
          {!d.cover && (
            <svg viewBox="0 0 400 250" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M90,190 C150,170 180,120 250,100 S320,60 330,50" fill="none" stroke="#F5F1EA" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" opacity={hasRoute ? 1 : 0.25} />
              <circle cx="90" cy="190" r="8" fill="#E1262C" stroke="#fff" strokeWidth="3" opacity={hasRoute ? 1 : 0.25} />
              <circle cx="330" cy="50" r="7" fill="#F5F1EA" stroke="#15161A" strokeWidth="3" opacity={hasRoute ? 1 : 0.25} />
            </svg>
          )}
          <div className="absolute left-4 top-4 flex gap-1.5">
            <span className="rounded-full bg-cream px-[11px] py-1 font-mono text-[12px] text-ink">{d.listed ? 'public' : 'privé'}</span>
            <span className="rounded-full bg-ink/80 px-[11px] py-1 font-mono text-[12px] text-cream">{type ? type.label.toLowerCase() : 'type ?'}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-[22px]">
          <span className="font-mono text-[13px] text-signal-text">{until > 0 ? `départ dans ${until} jour${until > 1 ? 's' : ''}` : 'en direct'}</span>
          <span className="tt-display text-[38px] leading-none text-cream [overflow-wrap:anywhere]">{title}</span>
          <div className="flex items-center gap-3">
            <div className="flex">
              {names.slice(0, 5).map((n, i) => (
                <span key={i} className={cn('-mr-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink text-[14px] font-bold', AVATARS[i % 4]![0], AVATARS[i % 4]![1])}>
                  {(n[0] ?? '?').toUpperCase()}
                </span>
              ))}
            </div>
            <span className="pl-2 text-[15px] text-dust-300">{names.length > 1 ? names.join(', ') : `${names[0]}, en solo`}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[['départ', shortDate(start)], ['durée', `${d.days} j`], ['véhicule', '1']].map(([k, v]) => (
              <div key={k} className="rounded-[14px] bg-ink-800 px-3 py-2.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-dust-400">{k}</div>
                <div className="whitespace-nowrap font-mono text-[15px] text-cream">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="text-[15px] leading-normal text-dust-400">{tip}</span>
    </aside>
  );
}

// ── La page ─────────────────────────────────────────────────────────────────

export default function CreateTripPage() {
  const { user, profile, isAdmin, loading, needsMfa, mfaPending } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [d, setD] = useState<Draft>(loadDraft);
  const [signIn, setSignIn] = useState<{ step: SignInStep; email: string }>({ step: 'email', email: '' });
  const [hold, setHold] = useState(false);
  const [copied, setCopied] = useState(false);
  const firstName = profile?.display_name ?? '';

  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }));
  useEffect(() => saveDraft(d), [d]);

  // Connecté : les étapes du compte sont faites. Déconnecté : on ne peut pas aller plus loin que le compte.
  const signedIn = !!user && !needsMfa && !hold;
  useEffect(() => {
    if (loading || mfaPending) return;
    if (signedIn && d.step < 2) set({ step: 2 });
    if (!user && d.step >= 2 && !d.created) set({ step: 0 });
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
      void queryClient.invalidateQueries({ queryKey: ['crew-access'] });
      void queryClient.invalidateQueries({ queryKey: ['my-crews'] });
      if (problems.length) toast.warning(`Ta page est créée, mais ${problems.join(', ')}. Tu pourras le refaire dans ton espace.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const mateErrors = d.mates.map((m) => (m.email.trim() && !EMAIL_RE.test(m.email.trim()) ? 'Adresse e-mail incomplète' : null));
  const canNext = [
    false, false,
    !!d.type,
    !!(d.from.trim() && d.to.trim()),
    d.when !== -1 || !!d.date,
    mateErrors.every((e) => !e),
    d.tripName.trim().length >= 2,
    accessOk,
    true,
  ][d.step];

  const go = (delta: number) => {
    setD((cur) => {
      const step = Math.max(signedIn ? 2 : 0, Math.min(LAST_STEP, cur.step + delta));
      const patch: Partial<Draft> = { step };
      if (step === 6 && !cur.tripName.trim()) patch.tripName = defaultName(cur);
      return { ...cur, ...patch };
    });
    window.scrollTo(0, 0);
  };
  const next = () => {
    if (!canNext) return;
    if (d.step === 7) return create.mutate();
    if (d.step === LAST_STEP) {
      const slug = d.created?.slug;
      clearDraft();
      return navigate(slug ? `/mon-compte/road-trips/${slug}` : '/mon-compte');
    }
    go(1);
  };

  const pageUrl = d.created ? `${window.location.origin}/t/${d.created.slug}` : '';
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

  // Étape affichée : sur les deux premières, c'est le sous-écran de connexion qui compte.
  const shownStep = d.step >= 2 ? d.step : signIn.step === 'email' ? 0 : 1;
  const phases = useMemo(() => [
    { label: 'Compte', steps: [0, 1] },
    { label: 'Ton road trip', steps: [2, 3, 4, 5, 6] },
    { label: 'Accès', steps: [7] },
    { label: 'Partage', steps: [8] },
  ], []);
  const start = startDate(d);
  const nextLabel = [
    '', '', 'Continuer →', 'Continuer →', 'Continuer →',
    d.mates.some((m) => m.email.trim()) ? 'Continuer →' : 'Je pars seul →',
    'Continuer →', create.isPending ? 'Création…' : 'Créer ma page →', 'Ouvrir mon espace →',
  ][shownStep];
  const mobileTitle = d.tripName.trim() || (d.from || d.to ? defaultName(d) : 'Ton road trip');

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-ink text-cream min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
      <Seo title="Créer mon road trip" noindex />
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex flex-col gap-3.5 px-[18px] pb-2 pt-4 min-[1000px]:px-14">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" aria-label="trophytracker, accueil" className="flex items-center gap-[9px] text-cream hover:text-cream">
              <LogoMark /><Wordmark />
            </Link>
            <span className="font-mono text-[14px] text-dust-400">{MINUTES[shownStep] ? `≈ ${MINUTES[shownStep]} min restantes` : 'terminé'}</span>
          </div>
          <div className="grid grid-cols-[2fr_5fr_1.2fr_1.6fr] gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={LAST_STEP} aria-valuenow={shownStep} aria-label="Avancement">
            {phases.map((p) => {
              const a = p.steps[0]!;
              const b = p.steps.at(-1)!;
              return (
                <div key={p.label} className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex gap-1">
                    {p.steps.map((i) => (
                      <span key={i} className={cn('h-1.5 flex-1 rounded-[3px] transition-colors duration-300', i < shownStep ? 'bg-signal' : i === shownStep ? 'bg-cream' : 'bg-ink-700')} />
                    ))}
                  </div>
                  <span className={cn('truncate font-mono text-[12px]', shownStep >= a && shownStep <= b ? 'text-cream' : shownStep > b ? 'text-signal-text' : 'text-dust-600')}>{p.label}</span>
                </div>
              );
            })}
          </div>
        </header>

        {shownStep >= 2 && (
          <div className="mx-[18px] mt-1.5 flex items-center gap-3 rounded-[18px] bg-ink-800 px-3 py-2.5 min-[1000px]:hidden">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-signal"><span className="h-3 w-3 rounded-full bg-cream" /></span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-mono text-[11px] text-dust-400">aperçu de ta page</span>
              <span className="tt-display truncate text-[18px] text-cream">{mobileTitle}</span>
            </div>
            <span className="whitespace-nowrap font-mono text-[12px] text-dust-300">{TRIP_TYPES.find((t) => t.id === d.type)?.label.toLowerCase() ?? 'type ?'}</span>
          </div>
        )}

        <main className="flex flex-1 items-start px-[18px] pb-3 pt-6 min-[1000px]:items-center min-[1000px]:px-14 min-[1000px]:pb-10">
          <div className="flex w-full max-w-[620px] flex-col gap-[26px]">
            {/* 0-1 · Compte et code */}
            {shownStep <= 1 && (
              <div className="flex flex-col gap-[18px]">
                {signIn.step === 'email' ? (
                  <>
                    <span className="flex items-center gap-2 self-start rounded-full bg-live/[0.16] px-[13px] py-[7px] font-mono text-[14px] text-live-text">
                      <span className="h-2 w-2 rounded-full bg-live" />4 minutes · gratuit pour tes proches
                    </span>
                    <StepTitle>On prépare ton <span className="text-signal">départ</span> ?</StepTitle>
                    <p className="m-0 text-[19px] leading-[1.55] text-dust-100">D’abord ton compte. Ensuite, ta page de road trip se construit sous tes yeux.</p>
                  </>
                ) : signIn.step === 'code' ? (
                  <StepTitle>Regarde tes e-mails.</StepTitle>
                ) : (
                  <StepTitle>Enchanté !</StepTitle>
                )}
                {user && needsMfa ? (
                  <p className="m-0 text-dust-200">Termine d’abord ta connexion : <Link to="/connexion?next=/creer" className="font-bold text-signal-text">code de double authentification</Link>.</p>
                ) : (
                  <EmailCodeSignIn
                    askName
                    onHold={setHold}
                    onStepChange={(step, email) => setSignIn({ step, email })}
                    onDone={() => set({ step: 2 })}
                    emailFooter={<span className="text-[14px] text-dust-400">Déjà inscrit ? Mets simplement ton e-mail : on te reconnaîtra.</span>}
                  />
                )}
              </div>
            )}

            {/* 2 · Type de voyage */}
            {shownStep === 2 && (
              <div className="flex flex-col gap-[18px]">
                <span className="font-mono text-[14px] text-live-text">✓ compte prêt · bienvenue {firstName}</span>
                <StepTitle>Tu pars comment ?</StepTitle>
                <div role="radiogroup" aria-label="Type de voyage" className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
                  {TRIP_TYPES.map((t) => {
                    const sel = d.type === t.id;
                    return (
                      <Choice key={t.id} selected={sel} onClick={() => set({ type: t.id })} className={cn('min-h-[88px] justify-between', sel ? 'border-signal bg-signal text-white' : 'border-ink-700 bg-ink-800 text-cream')}>
                        <span className="font-mono text-[13px] opacity-85">{t.hint}</span>
                        <span className="tt-display text-[22px]">{t.label}</span>
                      </Choice>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3 · D'où à où */}
            {shownStep === 3 && (
              <div className="flex flex-col gap-[18px]">
                <StepTitle>D’où à où ?</StepTitle>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
                  <div className="space-y-2">
                    <Label htmlFor="from">Départ</Label>
                    <Input id="from" placeholder="Ville de départ" maxLength={80} autoFocus value={d.from} onChange={(e) => set({ from: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to">Arrivée</Label>
                    <Input id="to" placeholder="Destination" maxLength={80} value={d.to} onChange={(e) => set({ to: e.target.value })} />
                  </div>
                </div>
                <span className="text-[15px] text-dust-400">En panne d’inspiration ?</span>
                <div className="flex flex-wrap gap-2">
                  {IDEAS.map(([a, b]) => (
                    <button key={a} type="button" onClick={() => set({ from: a, to: b })} className="flex min-h-11 items-center rounded-full border-[1.5px] border-cream/35 px-4 text-[15px] font-bold text-cream hover:bg-cream hover:text-ink">
                      {a} → {b}
                    </button>
                  ))}
                </div>
                <span className="text-[15px] text-dust-400">Pas besoin d’itinéraire précis : la trace s’écrit toute seule en roulant.</span>
              </div>
            )}

            {/* 4 · Quand et combien de temps */}
            {shownStep === 4 && (
              <div className="flex flex-col gap-[18px]">
                <StepTitle>Tu pars quand ?</StepTitle>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
                  {WHENS.map((w, i) => {
                    const sel = d.when === i;
                    const dt = w.days == null ? nextSummer(new Date()) : addDays(new Date(), w.days);
                    return (
                      <Choice key={w.label} role="button" selected={sel} onClick={() => set({ when: i })} className={cn('min-h-20 justify-center gap-1', sel ? 'border-cream bg-cream text-ink' : 'border-ink-700 bg-ink-800 text-cream')}>
                        <span className="tt-display text-[21px]">{w.label}</span>
                        <span className="font-mono text-[13px] opacity-85">{w.days === 0 ? 'suivi immédiat' : `vers le ${shortDate(dt)}`}</span>
                      </Choice>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Ou une date précise</Label>
                  <Input id="date" type="date" value={d.when === -1 ? d.date : ''} onChange={(e) => set({ when: e.target.value ? -1 : 0, date: e.target.value })} className="max-w-[260px]" />
                </div>
                <span className="font-bold">Combien de jours ?</span>
                <Stepper value={d.days} onChange={(days) => set({ days })} min={1} max={365} label="Durée" unit={(n) => `${n} jour${n > 1 ? 's' : ''}`} />
              </div>
            )}

            {/* 5 · Équipage */}
            {shownStep === 5 && (
              <div className="flex flex-col gap-[18px]">
                <StepTitle>Qui part avec toi ?</StepTitle>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-signal text-[18px] font-bold text-white">{(firstName[0] ?? '?').toUpperCase()}</span>
                  <span className="text-[18px] font-bold">{firstName || 'Toi'} <span className="font-normal text-dust-400">· toi</span></span>
                </div>
                {d.mates.map((m, i) => {
                  const [bg, fg] = AVATARS[(i + 1) % 4]!;
                  const update = (patch: Partial<Mate>) => set({ mates: d.mates.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                  return (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <span className={cn('flex h-12 w-12 flex-none items-center justify-center rounded-full text-[18px] font-bold', bg, fg)}>{(m.name.trim()[0] ?? '+').toUpperCase()}</span>
                        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                          <Input placeholder="Prénom" aria-label={`Prénom du coéquipier ${i + 1}`} maxLength={60} value={m.name} onChange={(e) => update({ name: e.target.value })} />
                          <Input type="email" placeholder="son@e-mail.fr" aria-label={`E-mail du coéquipier ${i + 1}`} aria-invalid={!!mateErrors[i]} value={m.email} onChange={(e) => update({ email: e.target.value })} />
                        </div>
                        <button type="button" onClick={() => set({ mates: d.mates.filter((_, k) => k !== i) })} aria-label="Retirer" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-[22px] text-dust-400 hover:bg-ink-800 hover:text-cream">×</button>
                      </div>
                      {mateErrors[i] && <span className="pl-[60px] text-[14px] text-signal-text">{mateErrors[i]}</span>}
                    </div>
                  );
                })}
                <button type="button" onClick={() => set({ mates: [...d.mates, { name: '', email: '' }] })} disabled={d.mates.length >= 8} className="flex min-h-12 items-center self-start rounded-full border-[1.5px] border-dashed border-dust-600 px-[18px] font-bold text-cream hover:border-cream disabled:opacity-50">
                  + Ajouter un coéquipier
                </button>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-ink-800 px-4 py-3.5">
                  <span className="flex flex-col"><span className="font-bold">1 véhicule</span><span className="text-[15px] text-dust-400">un téléphone dans le véhicule pour le suivi</span></span>
                  <span className="font-mono text-[13px] text-dust-500">plusieurs véhicules : bientôt</span>
                </div>
                <span className="text-[15px] text-dust-400">Tes coéquipiers recevront une invitation par e-mail pour gérer la page avec toi. Tu pars seul ? Passe simplement à la suite.</span>
              </div>
            )}

            {/* 6 · Touche finale */}
            {shownStep === 6 && (
              <div className="flex flex-col gap-[18px]">
                <StepTitle>La touche finale.</StepTitle>
                <div className="space-y-2">
                  <Label htmlFor="trip-name">Nom du road trip</Label>
                  <Input id="trip-name" maxLength={80} value={d.tripName} onChange={(e) => set({ tripName: e.target.value })} />
                  <span className="block text-[14px] text-dust-400">On te l’a proposé, modifie-le si tu veux.</span>
                </div>
                <span className="font-bold">Photo de couverture <span className="font-normal text-dust-400">· facultatif</span></span>
                {d.cover ? (
                  <div className="relative h-[170px] overflow-hidden rounded-[20px]">
                    <img src={d.cover} alt="Ta photo de couverture" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => set({ cover: null })} className="absolute right-3 top-3 flex min-h-11 items-center gap-2 rounded-full bg-ink/80 px-4 text-[15px] font-bold text-cream hover:bg-ink">
                      <Trash2 className="h-4 w-4" />Retirer
                    </button>
                  </div>
                ) : (
                  <label className="flex h-[170px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-ink-600 bg-ink-800 text-center text-[15px] text-dust-300 hover:border-cream">
                    <ImagePlus className="h-6 w-6" />
                    Choisis une photo, ou passe : on mettra une vue satellite
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickCover(f); e.target.value = ''; }} />
                  </label>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={!d.listed}
                  onClick={() => set({ listed: !d.listed })}
                  className="flex items-center justify-between gap-3 rounded-[18px] bg-ink-800 px-4 py-3.5 text-left"
                >
                  <span className="flex flex-col">
                    <span className="font-bold">Voyage privé</span>
                    <span className="text-[15px] text-dust-400">{d.listed ? 'public : la page peut apparaître dans les moteurs de recherche' : 'seuls ceux qui ont le lien le voient'}</span>
                  </span>
                  <span aria-hidden="true" className={cn('flex h-[30px] w-[52px] flex-none items-center rounded-full p-[3px] transition-colors', d.listed ? 'justify-start bg-ink-600' : 'justify-end bg-signal')}>
                    <span className="h-6 w-6 rounded-full bg-white" />
                  </span>
                </button>
              </div>
            )}

            {/* 7 · Accès */}
            {shownStep === 7 && (
              <div className="flex flex-col gap-[18px]">
                <StepTitle>Dernière ligne droite.</StepTitle>
                {loadingAccess ? (
                  <PageLoader />
                ) : accessOk ? (
                  <div className="flex items-center gap-3 rounded-[18px] bg-live/[0.12] px-4 py-4 text-live-text">
                    <Check className="h-6 w-6 flex-none" />
                    <span className="text-[17px]">{isAdmin && !hasAccess ? 'Compte administrateur : pas de paiement à faire.' : 'Ton accès est réglé. Il ne reste qu’à créer ta page.'}</span>
                  </div>
                ) : (
                  <>
                    <p className="m-0 text-[18px] leading-[1.55] text-dust-100">
                      Un paiement unique pour ce road trip, et c’est parti. Tes proches suivent gratuitement, sans compte.
                      {payment === 'ok' || waitingSince ? ' On attend la confirmation de ton paiement…' : ''}
                    </p>
                    <CrewAccessPurchase returnTo="creer" />
                  </>
                )}
              </div>
            )}

            {/* 8 · Lien prêt */}
            {shownStep === 8 && d.created && (
              <div className="flex flex-col gap-[18px]">
                <span className="flex items-center gap-2 self-start rounded-full bg-signal px-[13px] py-[7px] font-mono text-[14px] text-white">
                  <span className="relative h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-white" /><span className="absolute inset-0 rounded-full bg-white" /></span>
                  ta balise est créée
                </span>
                <h1 className="tt-display m-0 text-[clamp(40px,5.4vw,76px)] leading-[0.98] text-cream">C’est prêt, <span className="text-signal">{firstName}</span>.</h1>
                <p className="m-0 text-[18px] leading-[1.55] text-dust-100">Envoie le lien maintenant : tes proches compteront les jours avec toi, et suivront tout en direct dès le départ.</p>
                <div className="flex items-center gap-2 rounded-[18px] bg-cream py-1.5 pl-4 pr-1.5 text-ink">
                  <span className="min-w-0 flex-1 truncate font-mono text-[15px]">{pageUrl.replace(/^https?:\/\//, '')}</span>
                  <button type="button" onClick={copy} className="flex min-h-12 items-center whitespace-nowrap rounded-[14px] bg-signal px-[18px] font-bold text-white hover:bg-signal-hover">{copied ? 'Copié ✓' : 'Copier'}</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
                    { label: 'SMS', href: `sms:?&body=${encodeURIComponent(shareText)}` },
                    { label: 'E-mail aux grands-parents', href: `mailto:?subject=${encodeURIComponent('Suivez notre road trip en direct')}&body=${encodeURIComponent(`${shareText}\n\nPas besoin de compte ni d’application : il suffit d’ouvrir le lien.`)}` },
                  ].map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noreferrer" onClick={shared} className="flex min-h-11 items-center rounded-full border-[1.5px] border-cream/40 px-4 font-bold text-cream hover:bg-cream hover:text-ink">
                      {s.label}
                    </a>
                  ))}
                </div>
                <span className="mt-1.5 font-mono text-[14px] text-dust-400">avant le départ · à ton rythme</span>
                <div className="flex flex-col gap-2">
                  {[
                    { n: '1', t: 'Installer le suivi GPS', s: 'l’appli gratuite sur le téléphone du véhicule', time: '3 min', tab: 'gps' },
                    { n: '2', t: 'Ajouter sponsors et cagnotte', s: 'si tu en as', time: '2 min', tab: 'sponsors' },
                    { n: '3', t: 'Imprimer l’autocollant QR', s: 'à coller sur le véhicule', time: '1 min', tab: 'qr' },
                  ].map((x) => (
                    <Link key={x.n} to={`/mon-compte/road-trips/${d.created!.slug}?onglet=${x.tab}`} onClick={clearDraft} className="flex items-center gap-3.5 rounded-[18px] bg-ink-800 px-4 py-3.5 text-cream hover:bg-ink-700 hover:text-cream">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-ink-700 font-mono text-[14px]">{x.n}</span>
                      <span className="flex min-w-0 flex-1 flex-col"><span className="font-bold">{x.t}</span><span className="text-[15px] text-dust-400">{x.s}</span></span>
                      <span className="whitespace-nowrap font-mono text-[13px] text-signal-text">{x.time}</span>
                    </Link>
                  ))}
                </div>
                <button type="button" onClick={() => { clearDraft(); setD({ ...EMPTY, step: 2 }); window.scrollTo(0, 0); }} className="self-start text-[15px] font-bold text-dust-300 underline underline-offset-[3px] hover:text-cream">
                  Créer un autre road trip
                </button>
              </div>
            )}

            {/* Navigation (ordinateur) */}
            {shownStep >= 2 && (
              <div className="hidden items-center justify-between gap-3 pt-1 min-[1000px]:flex">
                <Button variant="ghost" onClick={() => go(-1)} className={cn('text-dust-300', (shownStep <= 2 || shownStep === LAST_STEP) && 'invisible')}>← Retour</Button>
                <Button size="lg" onClick={next} disabled={!canNext || create.isPending}>{nextLabel}</Button>
              </div>
            )}
          </div>
        </main>

        {/* Navigation collante (téléphone) */}
        {shownStep >= 2 && (
          <div className="sticky bottom-0 flex gap-2.5 bg-[linear-gradient(180deg,rgba(21,22,26,0),#15161A_35%)] px-[18px] pb-[18px] pt-3 min-[1000px]:hidden">
            <button type="button" onClick={() => go(-1)} aria-label="Retour" className={cn('flex h-14 w-14 flex-none items-center justify-center rounded-full bg-ink-800 text-xl font-bold text-cream', (shownStep <= 2 || shownStep === LAST_STEP) && 'invisible')}>←</button>
            <Button size="lg" onClick={next} disabled={!canNext || create.isPending} className="flex-1">{nextLabel}</Button>
          </div>
        )}
      </div>

      <Preview d={d} firstName={firstName} tip={TIPS[shownStep] ?? ''} />
      {/* Départ calculé (lecteurs d'écran) */}
      <span className="sr-only" aria-live="polite">{shownStep === 4 ? `Départ le ${start.toLocaleDateString('fr-FR')}` : ''}</span>
    </div>
  );
}
