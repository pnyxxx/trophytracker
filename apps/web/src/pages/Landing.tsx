import { lazy, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Kicker, SectionTitle } from '@/components/common/Brand';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Countdown } from '@/components/landing/Countdown';
import { CrewFinder } from '@/components/landing/CrewFinder';
import { RouteJourney } from '@/components/landing/RouteJourney';
import { fmtKm, STOPS, TOTAL_KM } from '@/components/landing/journey';
import { useCrewSearch, useEvent } from '@/hooks/queries';
import { departureTime, isLive } from '@/lib/format';
import { FAIR_PLAY, priceSentence } from '@/lib/legal';
import { useSeen } from '@/hooks/useInView';

// La carte (MapLibre) est chargée à part : le haut de page s'affiche tout de suite.
const CtaMap = lazy(() => import('@/components/landing/CtaMap'));

const audiences = [
  {
    n: '01',
    km: 'KM 0 · À la maison',
    title: 'Pour les proches',
    text: 'Parents, amis, grands-parents : voyez où se trouve votre équipage à tout moment, sans attendre un message. Rassurant quand ils traversent le désert !',
  },
  {
    n: '02',
    km: 'KM ∞ · Sur la carte',
    title: 'Pour les sponsors',
    text: 'Suivez l’aventure que vous financez. Votre logo apparaît sur la page et sur la carte de l’équipage, vue par toute sa communauté.',
  },
  {
    n: '03',
    km: `KM ${TOTAL_KM} · Au volant`,
    title: 'Pour les équipages',
    text: 'Une page à vous en 5 minutes : carte en direct, statistiques, photos et 360°, sponsors. Un seul lien à partager, pour un paiement unique.',
  },
];

const steps = [
  { n: '1', title: 'L’équipage crée sa page', text: 'Un paiement unique, puis nom, numéro, photos, sponsors… tout se gère depuis un espace simple.' },
  { n: '2', title: 'Il active le GPS', text: 'L’appli gratuite Traccar Client sur un téléphone de la 4L suffit. Aucun boîtier à acheter.' },
  { n: '3', title: 'Vous suivez en direct', text: 'Position, trace complète depuis le départ, vitesse, kilomètres parcourus, photos du bivouac…' },
];

const features = [
  { tag: '01 · CARTE', title: 'Carte en temps réel', text: 'La 4L bouge sur la carte sans recharger la page.' },
  { tag: '02 · PHOTOS', title: 'Photos & 360°', text: 'Revivez les dunes de Merzouga comme si vous y étiez.' },
  { tag: '03 · FAVORIS', title: 'Vos favoris', text: 'Retrouvez en un clic les équipages que vous suivez.' },
  { tag: '04 · ÉTHIQUE', title: 'Sans pub & respectueux', text: 'Gratuit pour les proches, sans publicité, sans revente de données, sur nos propres serveurs.' },
];

const faq = [
  {
    q: 'Faut-il un compte pour suivre un équipage ?',
    a: 'Non : la page d’un équipage public est accessible à tous via son lien. Un compte (gratuit) sert seulement à enregistrer vos équipages favoris.',
  },
  {
    q: 'Comment l’équipage envoie-t-il sa position ?',
    a: 'Avec l’application gratuite Traccar Client (Android et iPhone) installée sur un téléphone dans la voiture. Elle envoie la position quelques fois par minute quand il y a du réseau, et garde les points en mémoire dans les zones sans réseau pour les envoyer plus tard.',
  },
  {
    q: 'La position est-elle vraiment en direct ?',
    a: 'Oui, à quelques secondes près quand le téléphone a du réseau. Dans le désert, la trace se complète dès que la 4L retrouve une connexion.',
  },
  {
    q: 'Qui peut voir la position de l’équipage ?',
    a: 'L’équipage choisit : page publique (tout le monde avec le lien) ou privée (uniquement ses membres). Il peut changer d’avis à tout moment.',
  },
  {
    q: 'Combien ça coûte ?',
    a: `Suivre un équipage est gratuit, pour tout le monde. Pour créer la page de son équipage : ${priceSentence()}. C’est un paiement unique, sans abonnement, et les coéquipiers la rejoignent gratuitement. TrophyTracker est un projet indépendant, né de l’expérience d’un équipage du 4L Trophy, sans publicité ni revente de données.`,
  },
];

export default function Landing() {
  const ctaRef = useRef<HTMLElement>(null);
  const ctaSeen = useSeen(ctaRef);
  const { data: event } = useEvent();
  const { data: crews } = useCrewSearch('', false, 60);

  const liveCount = (crews?.items ?? []).filter((c) => isLive(c.last_fix_at)).length;
  const beforeStart = !!event?.startDate && departureTime(event.startDate) > Date.now();

  return (
    <PageShell padTop={false}>
      {/* Le site lui-même (WebSite, Organization) est décrit dans le HTML statique de l'accueil : seo-plugin.ts.
          Dates réglées dans l'administration : l'événement n'est décrit que lorsqu'elles sont connues. */}
      <Seo
        jsonLd={event?.startDate ? {
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate ?? undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: [
            { '@type': 'Place', name: 'Biarritz', address: { '@type': 'PostalAddress', addressLocality: 'Biarritz', addressCountry: 'FR' } },
            { '@type': 'Place', name: 'Marrakech', address: { '@type': 'PostalAddress', addressLocality: 'Marrakech', addressCountry: 'MA' } },
          ],
          description: 'Raid humanitaire étudiant en Renault 4L de Biarritz à Marrakech, suivi en direct sur TrophyTracker.',
        } : undefined}
      />

      {/* ── 01 Hero ──────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] flex-col overflow-x-clip bg-[radial-gradient(120%_80%_at_80%_0%,#3A2215_0%,#1B1310_45%,#120F0C_75%)]">
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-end gap-8 px-4 pb-10 pt-28 sm:px-7 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:content-center lg:items-end lg:gap-12 lg:pb-14">
          <div className="flex flex-col gap-5">
            <Kicker>
              <span className="h-2 w-2 rounded-full bg-live" />
              <span>{event?.name ?? '4L Trophy'} · suivi GPS en direct</span>
            </Kicker>
            {/* Une ligne par segment. La taille suit la largeur disponible (« jusqu’au désert. » doit tenir,
                à côté de la colonne de droite sur grand écran) ET la hauteur : tout le hero tient sur un écran. */}
            <h1 className="m-0 font-display text-[clamp(44px,min(13vw,calc((100svh_-_540px)/2.85)),200px)] font-black lg:text-[clamp(64px,min(calc((min(100vw,1400px)_-_496px)/6.55),calc((100svh_-_260px)/2.85)),200px)] uppercase leading-[0.95] tracking-[-0.01em] text-cream sm:whitespace-nowrap">
              Suivez
              <br />
              votre équipage
              <br />
              jusqu’au <span className="font-stencil text-primary">désert.</span>
            </h1>
          </div>

          <div className="flex w-full max-w-[560px] flex-col gap-5">
            <p className="m-0 text-pretty text-lg leading-relaxed text-dust-200">
              Proches, amis, sponsors : retrouvez la position, la trace complète, les photos et les statistiques de
              l’équipage que vous soutenez. Gratuit pour vous, sans application à installer.
            </p>

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.16em] text-dust-400">
                  <span>{beforeStart ? 'Départ dans' : 'Sur la route en ce moment'}</span>
                  <span className="hidden sm:inline lg:hidden">Biarritz · 43°27′N 1°32′O</span>
                </div>
                {beforeStart ? (
                  <Countdown date={event!.startDate!} />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: crews?.total ?? '—', l: 'Équipages' },
                      { v: liveCount, l: 'En direct' },
                    ].map((c) => (
                      <div key={c.l} className="border-l-[3px] border-primary bg-black/35 px-3.5 py-3">
                        <div className="font-mono text-[34px] font-bold leading-none text-cream">{c.v}</div>
                        <div className="mt-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{c.l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <CrewFinder />

              <div className="text-sm text-dust-400">
                Vous participez au raid ?{' '}
                <Link to="/inscription" className="font-semibold text-primary hover:text-primary-light">
                  Inscrivez votre équipage →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bandeau défilant des étapes */}
        <div className="overflow-hidden border-y border-cream/[0.12] bg-ink py-3" aria-hidden="true">
          <div className="flex w-max animate-marquee font-mono text-[13px] uppercase tracking-[0.14em] text-dust-100">
            {[0, 1].map((k) => (
              <div key={k} className="flex gap-10 pr-10">
                {STOPS.map((s) => (
                  <span key={s.name} className="whitespace-nowrap">
                    <span className="text-primary">◆ </span>
                    {s.name} · {s.country} · km {fmtKm(s.km)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 02 La route ──────────────────────────────────────────────────── */}
      {/* Sur grand écran, ce titre est incrusté dans l'écran fixe de « La route ». */}
      <section className="bg-ink px-4 pt-[120px] sm:px-7 min-[1000px]:hidden">
        <div className="flex flex-col gap-3.5">
          <SectionTitle className="leading-[0.88]">Où sont-ils ?</SectionTitle>
        </div>
      </section>
      <RouteJourney />

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
              Pendant 10 jours, des milliers d’étudiants traversent la France, l’Espagne et le Maroc en 4L. À la maison,
              on aimerait bien savoir où ils sont. C’est exactement ce que nous faisons.
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

      {/* ── 05 Charte fair-play ──────────────────────────────────────────── */}
      <section className="bg-sand px-4 py-[120px] text-coal sm:px-7">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-14">
          <div className="flex flex-wrap items-end justify-between gap-7">
            <div className="flex flex-col gap-[18px]">
              <Kicker className="text-dust-700">Charte fair-play</Kicker>
              <SectionTitle className="leading-[0.88]">
                L’esprit
                <br />
                du raid.
              </SectionTitle>
            </div>
            <p className="m-0 max-w-[460px] text-pretty text-[17px] leading-relaxed text-dust-700">
              {FAIR_PLAY.spirit} Chaque équipage s’y engage avant d’activer son suivi.
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
      <section ref={ctaRef} id="inscription" className="relative h-[820px] overflow-hidden bg-ink-900">
        {ctaSeen && (
          <Suspense fallback={null}>
            <CtaMap />
          </Suspense>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#120F0C_0%,rgba(18,15,12,.5)_22%,rgba(18,15,12,.35)_60%,#0A0806_100%)]" />
        <div className="absolute bottom-6 left-4 z-[3] font-mono text-[10px] uppercase tracking-[0.14em] text-dust-300 sm:left-7">
          Merzouga, Maroc · vue satellite
        </div>
        <div className="relative z-[3] mx-auto flex max-w-[1240px] flex-col items-center gap-[22px] px-4 pt-[110px] text-center sm:px-7">
          <Kicker className="text-gold">Merzouga · 31°05′N 4°00′O</Kicker>
          <h2 className="m-0 w-full font-display text-[clamp(56px,8vw,128px)] font-black uppercase leading-[0.96] text-cream">
            Vous partez
            <br />
            sur le raid&nbsp;?
          </h2>
          <p className="m-0 max-w-[520px] text-lg leading-relaxed text-dust-100">
            Créez la page de votre équipage en 5 minutes et partagez un seul lien à vos proches et sponsors.
          </p>
          <p className="m-0 font-mono text-xs uppercase tracking-[0.14em] text-gold">{priceSentence()} · paiement unique</p>
          <Link
            to="/inscription"
            className="rounded-[4px] bg-primary px-8 py-[18px] font-mono text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_40px_rgba(219,71,64,.45)] hover:bg-primary-dark hover:text-white"
          >
            Inscrire mon équipage →
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
