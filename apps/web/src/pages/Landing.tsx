import { lazy, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Kicker, SectionTitle } from '@/components/common/Brand';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FAIR_PLAY, priceSentence } from '@/lib/legal';
import { useSeen } from '@/hooks/useInView';

// La carte 3D (MapLibre) est chargée à part, à l'approche de sa section : le haut de page s'affiche tout de suite.
const ExampleTripMap = lazy(() => import('@/components/landing/ExampleTripMap'));

/** Bandeau défilant : les road trips qu'on peut suivre. */
const KINDS = ['Raids', 'Road trips', 'Rallyes', 'Tours d’Europe', 'Van life', 'Voyages à vélo', 'Expéditions', 'Traversées du désert', 'Tours du monde'];

const audiences = [
  {
    n: '01',
    km: 'KM 0 · À la maison',
    title: 'Pour les proches',
    text: 'Parents, amis, grands-parents : voyez où en sont vos voyageurs à tout moment, sans attendre un message. Rassurant quand ils sont loin !',
  },
  {
    n: '02',
    km: 'KM ∞ · Sur la carte',
    title: 'Pour les sponsors',
    text: 'Suivez l’aventure que vous financez. Votre logo apparaît sur la page et sur la carte du road trip, vue par toute sa communauté.',
  },
  {
    n: '03',
    km: 'KM ? · Au volant',
    title: 'Pour les voyageurs',
    text: 'Raid, road trip, tour d’Europe en van ou à vélo : une page à vous en 5 minutes, avec carte en direct, relief, photos et 360°, sponsors et cagnotte. Un seul lien à partager.',
  },
];

const steps = [
  { n: '1', title: 'Créez votre road trip', text: 'Nom, photos, sponsors, cagnotte… tout se gère depuis un espace simple. Invitez vos compagnons de route, gratuitement.' },
  { n: '2', title: 'Activez le suivi', text: 'L’appli gratuite Traccar Client sur un téléphone suffit : un QR code à scanner. Vous avez déjà un boîtier GPS ? Il marche aussi.' },
  { n: '3', title: 'Vos proches suivent', text: 'Position en direct, trace complète, kilomètres, vitesse, relief, photos du soir… sur une page privée, juste pour eux.' },
];

const features = [
  { tag: '01 · CARTE', title: 'Carte en temps réel', text: 'La position bouge sur la carte sans recharger la page.' },
  { tag: '02 · PHOTOS', title: 'Photos & 360°', text: 'Revivez les dunes, les cols et les bivouacs comme si vous y étiez.' },
  { tag: '03 · PRIVÉ', title: 'Privé par défaut', text: 'Seules les personnes qui ont le lien voient le road trip. Rien sur Google.' },
  { tag: '04 · ÉTHIQUE', title: 'Sans pub & respectueux', text: 'Gratuit pour les proches, sans publicité, sans revente de données, sur nos propres serveurs.' },
];

const faq = [
  {
    q: 'Faut-il un compte pour suivre un road trip ?',
    a: 'Non : il suffit du lien envoyé par les voyageurs. Un compte (gratuit) sert seulement à retrouver en un clic les road trips que vous suivez.',
  },
  {
    q: 'Comment la position est-elle envoyée ?',
    a: 'Avec l’application gratuite Traccar Client (Android et iPhone), installée sur un téléphone du road trip, ou avec un boîtier GPS compatible. La position part quelques fois par minute quand il y a du réseau ; dans les zones sans réseau, les points sont gardés en mémoire et envoyés plus tard.',
  },
  {
    q: 'Pas de nouvelle position : faut-il s’inquiéter ?',
    a: 'Presque toujours, non : en montagne ou dans le désert, il n’y a souvent pas de réseau, et la trace se complète dès que le téléphone en retrouve. Si vous avez un doute, contactez directement les voyageurs.',
  },
  {
    q: 'Qui peut voir la position ?',
    a: 'Les voyageurs choisissent : page privée (seulement les personnes qui ont le lien, et jamais sur Google) ou publique. Ils peuvent changer d’avis, couper le suivi ou effacer leur trace à tout moment.',
  },
  {
    q: 'Je participe à un raid ou un rallye : j’ai le droit ?',
    a: 'Ça dépend de l’organisation : certains règlements interdisent tout système de suivi pendant l’épreuve. Vérifiez le vôtre avant d’activer le suivi : vous êtes seuls responsables de son respect. TrophyTracker n’est ni un outil de navigation, ni un outil de sécurité.',
  },
  {
    q: 'Combien ça coûte ?',
    a: `Suivre un road trip est gratuit, pour tout le monde. Pour créer la page de son road trip : ${priceSentence()}. C’est un paiement unique, sans abonnement, et les compagnons de route la rejoignent gratuitement. TrophyTracker est un projet indépendant, né de l’expérience d’un équipage de raid, sans publicité ni revente de données.`,
  },
];

export default function Landing() {
  const mapRef = useRef<HTMLElement>(null);
  const mapSeen = useSeen(mapRef);

  return (
    <PageShell padTop={false}>
      {/* Le site lui-même (WebSite, Organization) est décrit dans le HTML statique de l'accueil : seo-plugin.ts. */}
      <Seo />

      {/* ── 01 Hero ──────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] flex-col overflow-x-clip bg-[radial-gradient(120%_80%_at_80%_0%,#3A2215_0%,#1B1310_45%,#120F0C_75%)]">
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-end gap-8 px-4 pb-10 pt-28 sm:px-7 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:content-center lg:items-end lg:gap-12 lg:pb-14">
          <div className="flex flex-col gap-5">
            <Kicker>
              <span className="h-2 w-2 rounded-full bg-live" />
              <span>Carnet de route · suivi GPS en direct</span>
            </Kicker>
            {/* Une ligne par segment ; la taille suit la largeur ET la hauteur : tout le hero tient sur un écran. */}
            <h1 className="m-0 font-display text-[clamp(44px,min(13vw,calc((100svh_-_540px)/2.85)),200px)] font-black lg:text-[clamp(64px,min(calc((min(100vw,1400px)_-_496px)/6.55),calc((100svh_-_260px)/2.85)),200px)] uppercase leading-[0.95] tracking-[-0.01em] text-cream sm:whitespace-nowrap">
              Suivez
              <br />
              leur aventure
              <br />
              en <span className="font-stencil text-primary">direct.</span>
            </h1>
          </div>

          <div className="flex w-full max-w-[560px] flex-col gap-6">
            <p className="m-0 text-pretty text-lg leading-relaxed text-dust-200">
              Raids, road trips, tours du monde : proches, amis et sponsors retrouvent la position, la trace complète, le
              relief et les photos du road trip qu’ils suivent. Gratuit pour eux, sans application à installer.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/inscription"
                className="rounded-[4px] bg-primary px-6 py-4 font-mono text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_40px_rgba(219,71,64,.35)] hover:bg-primary-dark hover:text-white"
              >
                Créer mon road trip →
              </Link>
              <a
                href="#comment"
                className="rounded-[4px] border border-cream/25 px-6 py-4 font-mono text-sm font-bold uppercase tracking-[0.12em] text-cream hover:border-cream hover:text-cream"
              >
                Comment ça marche
              </a>
            </div>
            <p className="m-0 text-sm text-dust-400">
              On vous a envoyé un lien ? Ouvrez-le simplement : pas besoin de compte pour suivre un road trip.
            </p>
          </div>
        </div>

        {/* Bandeau défilant */}
        <div className="overflow-hidden border-y border-cream/[0.12] bg-ink py-3" aria-hidden="true">
          <div className="flex w-max animate-marquee font-mono text-[13px] uppercase tracking-[0.14em] text-dust-100">
            {[0, 1].map((k) => (
              <div key={k} className="flex gap-10 pr-10">
                {KINDS.map((s) => (
                  <span key={s} className="whitespace-nowrap">
                    <span className="text-primary">◆ </span>
                    {s}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 02 Un exemple en 3D ──────────────────────────────────────────── */}
      <section ref={mapRef} className="relative h-[min(820px,100svh)] overflow-hidden bg-ink-900">
        {mapSeen && (
          <Suspense fallback={null}>
            <div className="absolute inset-0"><ExampleTripMap /></div>
          </Suspense>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#120F0C_0%,rgba(18,15,12,.25)_22%,rgba(18,15,12,0)_55%,rgba(18,15,12,.85)_100%)]" />
        <div className="pointer-events-none relative z-[3] mx-auto flex max-w-[1240px] flex-col gap-4 px-4 pt-[90px] sm:px-7">
          <Kicker>Exemple · Col du Galibier, Alpes</Kicker>
          <SectionTitle className="max-w-[760px] leading-[0.92] text-cream">
            Une trace,
            <br />
            lacet après lacet.
          </SectionTitle>
          <p className="m-0 max-w-[440px] text-pretty text-[17px] leading-relaxed text-dust-200">
            Chaque position dessine la route sur une carte satellite en relief, que vos proches suivent en direct.
          </p>
        </div>
        <div className="absolute bottom-6 left-4 z-[3] font-mono text-[10px] uppercase tracking-[0.14em] text-dust-300 sm:left-7">
          Valloire → Galibier → Lautaret · 27 km · 2 642 m · vue satellite 3D
        </div>
      </section>

      {/* ── 03 Pour qui ──────────────────────────────────────────────────── */}
      <section className="bg-sand px-4 py-[120px] text-coal sm:px-7">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-14">
          <div className="flex flex-wrap items-end justify-between gap-7">
            <SectionTitle className="max-w-[780px] leading-[0.96]">
              Un seul lien.
              <br />
              Trois raisons
              <br />
              de l’ouvrir.
            </SectionTitle>
            <p className="m-0 max-w-[420px] text-pretty text-[17px] leading-relaxed text-dust-700">
              Ils traversent un désert, un continent ou juste les Alpes. À la maison, on aimerait bien savoir où ils sont.
              C’est exactement ce que nous faisons.
            </p>
          </div>

          {/* Le roadbook : une case par public */}
          <div className="border-2 border-coal bg-cream">
            <div className="flex flex-wrap border-b-2 border-coal bg-coal font-mono text-[11px] uppercase tracking-[0.16em] text-sand" aria-hidden="true">
              <div className="flex-[0_0_150px] px-5 py-2.5">Case</div>
              <div className="flex-[1_1_220px] px-5 py-2.5">Direction</div>
              <div className="hidden flex-[2_1_320px] px-5 py-2.5 sm:block">Note du roadbook</div>
            </div>
            {audiences.map((a) => (
              <div key={a.n} className="flex flex-wrap border-b-2 border-coal transition-colors last:border-b-0 hover:bg-paper">
                <div className="flex flex-[0_0_150px] flex-col gap-1.5 border-r-2 border-coal px-5 py-7">
                  <span className="font-stencil text-[64px] font-black leading-[0.9] text-primary">{a.n}</span>
                  <span className="font-mono text-[11px] text-dust-700">{a.km}</span>
                </div>
                <div className="flex flex-[1_1_220px] items-center px-5 py-7">
                  <h3 className="m-0 font-display text-[40px] font-black uppercase leading-[0.95]">{a.title}</h3>
                </div>
                <div className="flex flex-[2_1_320px] items-center px-5 pb-7 sm:py-7">
                  <p className="m-0 text-pretty text-[17px] leading-relaxed text-dust-800">{a.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 Comment ça marche ─────────────────────────────────────────── */}
      <section id="comment" className="scroll-mt-[68px] bg-cream px-4 py-[120px] text-coal sm:px-7">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-16">
          <SectionTitle className="leading-[0.88]">
            Comment
            <br />
            ça marche ?
          </SectionTitle>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t-2 border-coal p-0">
            {steps.map((s) => (
              <li key={s.n} className="flex flex-col gap-4 border-b-2 border-coal py-8 pr-7">
                <div className="flex items-baseline gap-3">
                  <span className="font-stencil text-[120px] font-black leading-[0.8] text-primary">{s.n}</span>
                  <span className="tt-kicker text-dust-700">Étape</span>
                </div>
                <h3 className="m-0 font-display text-[34px] font-black uppercase leading-[0.95]">{s.title}</h3>
                <p className="m-0 max-w-[340px] text-base leading-relaxed text-dust-800">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-5">
            {features.map((f) => (
              <div key={f.tag} className="flex flex-col gap-2.5 bg-coal p-6 text-cream">
                <span className="font-mono text-[11px] tracking-[0.14em] text-ochre">{f.tag}</span>
                <span className="font-display text-[26px] font-extrabold uppercase leading-none">{f.title}</span>
                <span className="text-sm leading-[1.55] text-dust-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 05 Charte du voyageur ────────────────────────────────────────── */}
      <section className="bg-sand px-4 py-[120px] text-coal sm:px-7">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-14">
          <div className="flex flex-wrap items-end justify-between gap-7">
            <div className="flex flex-col gap-[18px]">
              <Kicker className="text-dust-700">Charte du voyageur</Kicker>
              <SectionTitle className="leading-[0.88]">
                L’esprit
                <br />
                du road trip.
              </SectionTitle>
            </div>
            <p className="m-0 max-w-[460px] text-pretty text-[17px] leading-relaxed text-dust-700">
              {FAIR_PLAY.spirit} Chaque road trip s’y engage avant d’activer son suivi.
            </p>
          </div>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] border-t-2 border-coal p-0">
            {FAIR_PLAY.rules.map((r, i) => (
              <li key={r.title} className="flex flex-col gap-3 border-b-2 border-coal py-8 pr-7">
                <span className="font-stencil text-[64px] font-black leading-[0.85] text-primary">{i + 1}</span>
                <h3 className="m-0 font-display text-[28px] font-black uppercase leading-[0.95]">{r.title}</h3>
                <p className="m-0 max-w-[340px] text-base leading-relaxed text-dust-800">{r.text}</p>
              </li>
            ))}
          </ol>
          <Link to="/conditions-utilisation#fair-play" className="self-start font-mono text-sm font-bold uppercase tracking-[0.12em] text-primary hover:text-primary-dark">
            Lire les conditions d’utilisation →
          </Link>
        </div>
      </section>

      {/* ── 06 FAQ ───────────────────────────────────────────────────────── */}
      <section className="bg-ink px-4 py-[120px] sm:px-7">
        <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-14">
          <div className="flex flex-col gap-[18px]">
            <Kicker>Briefing avant départ</Kicker>
            <SectionTitle className="leading-[0.88]">
              Questions
              <br />
              fréquentes
            </SectionTitle>
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

      {/* ── 07 Inscription ───────────────────────────────────────────────── */}
      <section id="inscription" className="relative overflow-hidden bg-[radial-gradient(90%_80%_at_50%_100%,#3A2215_0%,#1B1310_50%,#0A0806_100%)] px-4 py-[140px] sm:px-7">
        <div className="relative mx-auto flex max-w-[1240px] flex-col items-center gap-[22px] text-center">
          <Kicker className="text-gold">Prochain départ · le vôtre</Kicker>
          <h2 className="m-0 w-full font-display text-[clamp(56px,8vw,128px)] font-black uppercase leading-[0.96] text-cream">
            Vous partez
            <br />
            à l’aventure&nbsp;?
          </h2>
          <p className="m-0 max-w-[520px] text-lg leading-relaxed text-dust-100">
            Créez la page de votre road trip en 5 minutes et partagez un seul lien à vos proches et sponsors.
          </p>
          <p className="m-0 font-mono text-xs uppercase tracking-[0.14em] text-gold">{priceSentence()} · paiement unique</p>
          <Link
            to="/inscription"
            className="rounded-[4px] bg-primary px-8 py-[18px] font-mono text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_40px_rgba(219,71,64,.45)] hover:bg-primary-dark hover:text-white"
          >
            Créer mon road trip →
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
