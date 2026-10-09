import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FAIR_PLAY, priceSentence } from '@/lib/legal';
import { EXAMPLE_PATH } from '@/lib/example';
import { pointAtDist } from '@/lib/route-anim';
import { cn } from '@/lib/utils';
import { CHAPTERS, distAt, LAST, offlineAt, ROUTE } from '@/components/landing/story';

// La carte 3D (MapLibre) est chargée à part : le texte de l'accueil s'affiche tout de suite.
const StoryMap = lazy(() => import('@/components/landing/StoryMap'));

const steps = [
  { n: '1', t: '≈ 2 min', title: 'Crée ton trip', text: 'Un nom, une photo, tes compagnons de route. L’itinéraire, c’est si tu veux : la trace s’écrit en roulant.' },
  { n: '2', t: '≈ 3 min', title: 'Lance le suivi', text: 'Un QR code à scanner avec l’appli gratuite Traccar Client : ton téléphone envoie ta position. Pas de réseau ? Il garde tout en mémoire.' },
  { n: '3', t: 'tout le trip', title: 'Envoie le lien', text: 'Ton voyage est privé par défaut. Seuls ceux à qui tu envoies le lien peuvent le suivre, sans compte et sans appli.' },
];

const panels = [
  { tag: 'direct', red: true, v: '< 10 s', title: 'Le vrai direct', text: 'Position, vitesse, météo et altitude mises à jour en continu, même pour les grands-parents sur téléphone.' },
  { tag: 'à plusieurs', v: '1 page', title: 'Toute la bande', text: 'Invite tes compagnons de route : vous gérez la page ensemble, et vos proches suivent tout au même endroit.' },
  { tag: 'sponsors · cagnotte', v: '1 lien', title: 'Soutenir le voyage', text: 'Une vitrine pour tes sponsors et le lien de ta cagnotte, sur la même page que la carte.' },
  { tag: '3D', v: 'vidéo', title: 'Revivre en 3D', text: 'Le voyage rejoué en survol satellite, à exporter en vidéo paysage, story ou carré.' },
];

const trips = [
  { label: 'en van', tag: 'semaines → mois', r: -2 },
  { label: 'à moto', tag: 'dénivelé', r: 1.5 },
  { label: 'entre potes', tag: 'à plusieurs', r: -1 },
  { label: 'en famille', tag: 'sans compte', r: 2 },
  { label: 'en raid', tag: 'sponsors', r: -1.5, red: true },
  { label: 'autour du monde', tag: 'multi-pays', r: 1 },
  { label: 'en camping-car', tag: 'bivouacs', r: -2.5 },
  { label: 'à vélo', tag: 'étape par étape', r: 1.5 },
];

const faq = [
  {
    q: 'Faut-il un compte pour suivre un road trip ?',
    a: 'Non : il suffit du lien envoyé par les voyageurs. Rien à installer, ça marche sur n’importe quel téléphone ou ordinateur.',
  },
  {
    q: 'Comment la position est-elle envoyée ?',
    a: 'Avec l’application gratuite Traccar Client (Android et iPhone), installée sur un téléphone du voyage et réglée d’un coup avec un QR code, ou avec un boîtier GPS compatible. Sans réseau, les points sont gardés en mémoire et envoyés dès que le téléphone capte.',
  },
  {
    q: 'Comment marche le carnet de bord avec l’IA ?',
    a: 'Le soir, dans ton espace, appuie sur le micro et raconte ta journée à voix haute (ou écris-la). L’IA en fait une page de carnet : elle garde tes anecdotes, retire les hésitations et ajoute tes kilomètres et ton altitude, sans rien inventer. Tu relis, tu corriges si besoin, et tu publies.',
  },
  {
    q: 'Pas de nouvelle position : faut-il s’inquiéter ?',
    a: 'Presque toujours, non : en montagne ou dans le désert, il n’y a souvent pas de réseau, et la trace se complète dès que le téléphone en retrouve. Si tu as un doute, contacte directement les voyageurs.',
  },
  {
    q: 'Qui peut voir la position ?',
    a: 'Les voyageurs choisissent : privé (seulement les personnes qui ont le lien, et jamais sur Google) ou public. Ils peuvent changer d’avis, couper le suivi ou effacer leur trace à tout moment. Les arrêts de nuit sont floutés.',
  },
  {
    q: 'Je participe à un raid ou un rallye : j’ai le droit ?',
    a: 'Ça dépend de l’organisation : certains règlements interdisent tout système de suivi pendant l’épreuve. Vérifie le tien avant de lancer le suivi : tu es seul responsable de son respect. trophytracker n’est ni un outil de navigation, ni un outil de sécurité.',
  },
  {
    q: 'Combien ça coûte ?',
    a: `Suivre un road trip est gratuit, pour tout le monde. Pour créer la page de ton road trip : ${priceSentence()}. C’est un paiement unique, sans abonnement, et tes compagnons de route te rejoignent gratuitement. Sans publicité ni revente de données.`,
  },
];

const fmt = (n: number, digits = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Grand écran et animations permises : le récit se joue au défilement. Sinon : vue fixe et chapitres en cartes. */
function useStoryMode() {
  const query = '(min-width: 960px) and (prefers-reduced-motion: no-preference)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** Avancement du récit (0 → LAST) selon la position de défilement dans la section. */
function useStoryProgress(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  const [prog, setProg] = useState(active ? 0 : LAST);
  useEffect(() => {
    if (!active) return setProg(LAST);
    let pending = false;
    const update = () => {
      pending = false;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const f = clamp01(-r.top / (r.height - window.innerHeight || 1));
      setProg((p) => (Math.abs(p - f * LAST) > 0.004 ? f * LAST : p));
    };
    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, active]);
  return prog;
}

/** La carte du lien privé, à la fin du récit. */
function LinkCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.host}${EXAMPLE_PATH}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${EXAMPLE_PATH}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers refusé : le lien reste lisible */
    }
  };
  return (
    <div className={cn('flex flex-col gap-4 rounded-[28px] bg-cream p-[22px] text-coal shadow-[0_30px_60px_rgba(0,0,0,.45)]', className)} style={style}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[20px] font-extrabold tracking-[-0.02em]">Valloire → Lautaret</span>
        <span className="rounded-full bg-coal px-2.5 py-1 font-mono text-[11px] text-cream">privé</span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border-[1.5px] border-coal/[0.12] bg-white py-1.5 pl-3.5 pr-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{url}</span>
        <button type="button" onClick={copy} className="min-h-10 rounded-xl bg-signal px-3.5 text-[14px] font-bold text-white hover:bg-signal-hover">
          {copied ? 'Copié ✓' : 'Copier'}
        </button>
      </div>
      <span className="text-[14px] text-dust-700">Les personnes qui ont le lien suivent le voyage · aucune n’a besoin de compte</span>
    </div>
  );
}

export default function Landing() {
  const storyRef = useRef<HTMLElement>(null);
  const wide = useStoryMode();
  const prog = useStoryProgress(storyRef, wide);
  const [altitude, setAltitude] = useState<number | null>(null);

  const d = distAt(prog);
  const pos = pointAtDist(ROUTE, d);
  const off = wide && offlineAt(prog);
  const near = Math.round(prog);
  const linkK = clamp01((prog - 4.4) / 0.5);
  const hud = [
    { l: 'position', v: `${fmt(pos[1], 3)}°N ${fmt(pos[0], 3)}°E` },
    { l: 'distance', v: `${fmt(d / 1000, 1)} km` },
    { l: 'vitesse', v: off ? '— km/h' : `${Math.round(34 + 10 * Math.sin(d / 900))} km/h` },
    { l: 'altitude', v: altitude == null ? '—' : `${fmt(altitude)} m` },
  ];

  return (
    <PageShell header="floating">
      {/* Le site lui-même (WebSite, Organization) est décrit dans le HTML statique de l'accueil : seo-plugin.ts. */}
      <Seo />

      {/* ── 01 Récit : la montée du Galibier, au fil du défilement ─────────── */}
      <section ref={storyRef} className="relative" style={{ height: wide ? '330vh' : '100svh' }} aria-label="Exemple : un road trip suivi en direct">
        <div className="sticky top-0 h-[100svh] overflow-hidden bg-[#1A1C20]">
          <div className="absolute inset-0">
            <Suspense fallback={null}>
              <StoryMap prog={prog} wide={wide} onAltitude={setAltitude} />
            </Suspense>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_100%_at_60%_40%,transparent_50%,rgba(10,10,12,.65)_100%),linear-gradient(180deg,rgba(18,19,22,.6)_0%,transparent_18%,transparent_45%,rgba(18,19,22,.94)_100%)]" />

          {/* Télémétrie du voyageur */}
          <div className={cn('pointer-events-none absolute inset-x-5 top-24 transition-opacity duration-500', wide && prog > 0.6 && prog < 4.5 ? 'opacity-100' : 'opacity-0')} aria-hidden="true">
            <div className="mx-auto flex max-w-[1400px] flex-wrap justify-end gap-2">
              {hud.map((h) => (
                <div key={h.l} className="flex min-w-[112px] flex-col gap-0.5 rounded-2xl border-[1.5px] border-cream/[0.14] bg-[#121316]/[0.72] px-3.5 py-2 backdrop-blur-[10px]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-dust-500">{h.l}</span>
                  <span className="font-mono text-[16px] font-medium text-cream">{h.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hors réseau */}
          <div className={cn('pointer-events-none absolute left-1/2 top-[150px] flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-cream px-4 py-2 font-mono text-[13px] font-medium text-coal transition-opacity duration-500', off ? 'opacity-100' : 'opacity-0')} aria-hidden="true">
            <span className="h-2 w-2 rounded-full border-2 border-coal" />
            Hors réseau · {fmt(0.6 + (prog - 2.5) * 0.4, 1)} km en mémoire
          </div>

          {/* Repères de chapitres */}
          {wide && (
            <div className="pointer-events-none absolute right-5 top-1/2 flex -translate-y-1/2 flex-col gap-2.5" aria-hidden="true">
              {Array.from({ length: LAST + 1 }, (_, k) => (
                <span key={k} className={cn('w-1.5 rounded-[3px] transition-all duration-300', k === near ? 'h-7' : 'h-1.5', k <= near ? 'bg-signal' : 'bg-cream/30')} />
              ))}
            </div>
          )}

          {/* Accroche */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={wide ? { opacity: Math.max(0, 1 - prog * 2.2), transform: `translateY(${Math.round(-prog * 120)}px)`, pointerEvents: prog < 0.3 ? 'auto' : 'none' } : undefined}
          >
            <div className="mx-auto grid max-w-[1400px] items-end gap-8 px-5 pb-14 lg:grid-cols-2">
              <h1 className="tt-display m-0 text-[clamp(60px,9vw,150px)] leading-[0.88] tracking-[-0.05em] text-cream">
                Ton road trip,
                <br />
                <span className="text-signal">en direct.</span>
              </h1>
              <div className="flex max-w-[440px] flex-col gap-5 lg:justify-self-end">
                <p className="m-0 text-pretty text-[19px] leading-normal text-dust-200">
                  Tu roules, ceux que tu invites te suivent. Position, trace, photos et stats sur une page privée, accessible uniquement par ton lien.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link to="/creer" className="rounded-full bg-signal px-[22px] py-[15px] text-[16px] font-bold text-white shadow-[0_4px_0_#8A1217] hover:bg-signal-hover hover:text-white">
                    Créer mon trip →
                  </Link>
                  {wide && (
                    <span className="flex items-center gap-2.5 font-mono text-[12px] text-dust-300">
                      <span className="inline-block animate-bounce">↓</span>Fais défiler pour partir
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chapitres (grand écran) */}
          {wide && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
              <div className="relative mx-auto h-[360px] max-w-[1400px] px-5">
                {CHAPTERS.map((c, k) => {
                  const dk = prog - (k + 1);
                  const op = k === CHAPTERS.length - 1 && prog > 4.6 ? 0 : Math.max(0, 1 - Math.max(0, Math.abs(dk) - 0.3) * 3);
                  return (
                    <div
                      key={c.tag}
                      className="absolute left-5 top-1/2 flex w-[440px] flex-col gap-3.5 rounded-[28px] border-[1.5px] border-cream/[0.14] bg-[#121316]/[0.74] p-7 backdrop-blur-[14px] backdrop-saturate-[140%]"
                      style={{ opacity: op, transform: `translateY(calc(-50% + ${Math.round(-dk * 30)}px))` }}
                      aria-hidden={op < 0.5}
                    >
                      <span className="self-start rounded-full bg-signal px-[11px] py-1 font-mono text-[12px] font-medium text-white">{c.tag}</span>
                      <h2 className="tt-display m-0 text-[clamp(34px,3.6vw,52px)] leading-[0.98] text-cream">{c.title}</h2>
                      <p className="m-0 text-[17px] leading-[1.55] text-dust-200">{c.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Le lien privé, à la fin du récit */}
          {wide && (
            <LinkCard
              className="absolute bottom-16 right-[max(48px,calc((100vw-1400px)/2+48px))] w-[min(400px,calc(100%-40px))] transition-opacity duration-300"
              style={{ opacity: linkK, transform: `translateY(${Math.round((1 - linkK) * 30)}px)`, pointerEvents: linkK > 0.5 ? 'auto' : 'none' }}
            />
          )}
        </div>
      </section>

      {/* Chapitres en cartes (téléphone, ou animations réduites) */}
      {!wide && (
        <section className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 pb-6 pt-14">
          {CHAPTERS.map((c) => (
            <div key={c.tag} className="flex flex-col gap-2.5 rounded-[24px] border-[1.5px] border-cream/[0.08] bg-[#1D1E23] p-[22px]">
              <span className="self-start rounded-full bg-signal px-[11px] py-1 font-mono text-[12px] font-medium text-white">{c.tag}</span>
              <h2 className="tt-display m-0 text-[30px] leading-none text-cream">{c.title}</h2>
              <p className="m-0 text-[16px] leading-normal text-dust-200">{c.text}</p>
            </div>
          ))}
          <LinkCard className="mt-3" />
        </section>
      )}

      {/* ── 02 Comment ça marche ─────────────────────────────────────────── */}
      <section id="comment" className="mx-auto flex max-w-[1400px] scroll-mt-[88px] flex-col gap-11 px-5 py-[110px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="tt-display m-0 text-[clamp(44px,5.6vw,84px)] leading-[0.95] text-cream">
            Prêt en 5 minutes.
            <br />
            <span className="text-dust-500">Zéro prise de tête.</span>
          </h2>
          <span className="font-mono text-[13px] text-dust-500">// comment ça marche</span>
        </div>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4 p-0">
          {steps.map((s) => (
            <li key={s.n} className="flex min-h-[300px] flex-col gap-4 rounded-[28px] bg-cream p-7 text-coal">
              <div className="flex items-center justify-between">
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-coal text-[24px] font-extrabold text-cream">{s.n}</span>
                <span className="rounded-full bg-coal/[0.12] px-2.5 py-1 font-mono text-[12px] font-medium">{s.t}</span>
              </div>
              <h3 className="tt-display mb-0 mt-auto text-[32px] leading-none">{s.title}</h3>
              <p className="m-0 text-[17px] leading-normal">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 03 Ce qui change ─────────────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-start gap-14 px-5 py-[110px]">
          <div className="flex flex-col gap-5 lg:sticky lg:top-[110px]">
            <span className="self-start rounded-full bg-cream px-3 py-1 font-mono text-[12px] font-medium text-coal">le lien partagé</span>
            <h2 className="tt-display m-0 text-[clamp(44px,5.6vw,84px)] leading-[0.95] text-cream">
              Ce qui change
              <br />
              <span className="text-signal">vraiment.</span>
            </h2>
            <p className="m-0 max-w-[420px] text-[18px] leading-[1.55] text-dust-300">
              Ton trip reste privé : seuls ceux qui ont ton lien le voient. Famille, potes ou sponsors, toute la bande est dans la voiture avec toi. Ou presque.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3.5">
            {panels.map((p) => (
              <div key={p.tag} className={cn('flex min-h-[230px] flex-col gap-3.5 rounded-[24px] border-[1.5px] border-cream/[0.08] bg-[#1D1E23] p-6 transition-colors', p.red ? 'hover:border-signal' : 'hover:border-cream')}>
                <span className={cn('self-start rounded-full px-[11px] py-1 font-mono text-[12px] font-medium text-coal', p.red ? 'bg-signal text-white' : 'bg-cream')}>{p.tag}</span>
                <span className="font-mono text-[30px] font-medium tracking-[-0.03em] text-cream">{p.v}</span>
                <div className="mt-auto flex flex-col gap-1.5">
                  <span className="text-[22px] font-extrabold tracking-[-0.01em] text-cream">{p.title}</span>
                  <span className="text-[15px] leading-normal text-dust-300">{p.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03 bis Le carnet de bord raconté ─────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]" aria-labelledby="carnet-ia">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-14 px-5 py-[110px]">
          <div className="flex flex-col gap-5">
            <span className="self-start rounded-full bg-signal px-3 py-1 font-mono text-[12px] font-medium text-white">carnet de bord · IA</span>
            <h2 id="carnet-ia" className="tt-display m-0 text-[clamp(44px,5.6vw,84px)] leading-[0.95] text-cream">
              Le soir, tu racontes.
              <br />
              <span className="text-signal">L’IA écrit.</span>
            </h2>
            <p className="m-0 max-w-[480px] text-[18px] leading-[1.55] text-dust-300">
              Plus besoin d’écrire au bivouac. Appuie sur le micro et raconte ta journée comme à un pote : la panne, le col, le resto.
              L’IA garde toutes tes anecdotes, retire les « euh », remet tout dans l’ordre avec tes kilomètres et ton altitude.
              Tu relis, tu publies : tes proches reçoivent ta page dans leur résumé du soir.
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0 font-mono text-[13px] text-dust-200">
              {['2 minutes au micro', 'rien d’inventé', 'tu relis avant de publier'].map((x) => (
                <li key={x} className="rounded-full border-[1.5px] border-cream/20 px-3.5 py-1.5">{x}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="flex items-start gap-3.5 rounded-[24px] bg-[#1D1E23] p-5">
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-signal text-white shadow-[0_10px_26px_rgba(225,38,44,.4)]">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="font-mono text-[12px] text-dust-400">ton récit · 1:48</span>
                <p className="m-0 text-[16px] italic leading-relaxed text-dust-200">
                  « Alors euh ce matin on part de Valloire, et là le Galibier euh… la voiture chauffe à mort, on s’arrête en plein virage,
                  un papi à vélo nous double en rigolant… et en haut, la vue, franchement, on a pleuré. »
                </p>
              </div>
            </div>
            <div className="mx-auto flex items-center gap-2 font-mono text-[13px] text-signal-text">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" /></svg>
              l’IA met en forme
            </div>
            <div className="flex flex-col gap-2.5 rounded-[24px] bg-cream p-6 text-ink shadow-[0_24px_50px_rgba(0,0,0,.4)]">
              <span className="font-mono text-[12px] text-dust-700">jour 3 · 42 km · 2 642 m</span>
              <span className="tt-display text-[30px] leading-[1.05]">Doublés par un papi au Galibier</span>
              <p className="m-0 text-[16px] leading-relaxed">
                Départ de Valloire ce matin, direction le Galibier. À mi-montée, la voiture chauffe : arrêt forcé en plein virage,
                capot ouvert, pendant qu’un papi à vélo nous double en rigolant. Et puis le sommet, à 2 642 mètres. La vue nous a mis
                les larmes aux yeux.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 04 Tous les trips ────────────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-9 px-5 py-[110px]">
          <h2 className="tt-display m-0 text-[clamp(44px,5.6vw,84px)] leading-[0.95] text-cream">Quel que soit le véhicule.</h2>
          <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
            {trips.map((t) => (
              <li
                key={t.label}
                className={cn('flex items-baseline gap-3 rounded-full border-[1.5px] px-[26px] py-3.5 transition-transform duration-200 [transform:rotate(var(--r))] hover:[transform:rotate(0deg)_scale(1.04)]', t.red ? 'border-signal bg-signal text-white' : 'border-cream/35 text-cream')}
                style={{ '--r': `${t.r}deg` } as React.CSSProperties}
              >
                <span className="text-[clamp(22px,2.6vw,36px)] font-extrabold tracking-[-0.02em]">{t.label}</span>
                <span className="font-mono text-[12px] opacity-75">{t.tag}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 05 Charte du voyageur ────────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-11 px-5 py-[110px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="tt-display m-0 text-[clamp(44px,5.6vw,84px)] leading-[0.95] text-cream">
              L’esprit
              <br />
              <span className="text-dust-500">du road trip.</span>
            </h2>
            <p className="m-0 max-w-[460px] text-pretty text-[17px] leading-relaxed text-dust-300">
              {FAIR_PLAY.spirit} Chaque road trip s’y engage avant de lancer son suivi.
            </p>
          </div>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3.5 p-0">
            {FAIR_PLAY.rules.map((r, i) => (
              <li key={r.title} className="flex flex-col gap-3 rounded-[24px] border-[1.5px] border-cream/[0.08] bg-[#1D1E23] p-6">
                <span className="font-mono text-[13px] text-signal-text">0{i + 1}</span>
                <h3 className="m-0 text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-cream">{r.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-dust-300">{r.text}</p>
              </li>
            ))}
          </ol>
          <Link to="/conditions-utilisation#fair-play" className="self-start font-bold text-signal-text hover:text-cream">
            Lire les conditions d’utilisation →
          </Link>
        </div>
      </section>

      {/* ── 06 Questions ─────────────────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-14 px-5 py-[110px]">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[13px] text-dust-500">// avant de partir</span>
            <h2 className="tt-display m-0 text-[clamp(44px,5.6vw,84px)] leading-[0.95] text-cream">Questions fréquentes</h2>
          </div>
          <Accordion type="single" collapsible defaultValue="q0" className="border-t border-cream/20">
            {faq.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── 07 Départ ────────────────────────────────────────────────────── */}
      <section id="go" className="px-5 pb-[90px]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-end gap-8 rounded-[40px] bg-signal px-7 py-14 text-white sm:px-12 sm:py-[72px]">
          <h2 className="tt-display m-0 text-[clamp(52px,7vw,112px)] leading-[0.9] tracking-[-0.045em]">
            Le compteur
            <br />
            démarre quand
            <br />
            tu pars.
          </h2>
          <div className="flex max-w-[400px] flex-col items-start gap-[18px] lg:justify-self-end">
            <p className="m-0 text-[18px] font-medium leading-normal">
              Sans pub, sans abonnement, et tes données restent à toi. Crée ton trip maintenant, lance le suivi le jour J.
            </p>
            <p className="m-0 font-mono text-[13px] leading-relaxed text-white/85">{priceSentence()} · paiement unique · gratuit pour tes proches</p>
            <Link to="/creer" className="rounded-full bg-[#121316] px-[26px] py-[17px] text-[17px] font-extrabold text-white hover:bg-white hover:text-[#121316]">
              Créer mon trip →
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
