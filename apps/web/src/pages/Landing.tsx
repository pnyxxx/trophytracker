import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, EyeOff, Globe2, Lock, Power, Users, Video, Wallet } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LiveScene } from '@/components/landing/LiveScene';
import { FollowerFeatures } from '@/components/landing/FollowerFeatures';
import { currentPriceCents, euros, isLaunchPrice, PRICING } from '@/lib/legal';
import { EXAMPLE_PATH } from '@/lib/example';
import { cn } from '@/lib/utils';

/*
 * L'accueil. Chaque idée n'y est dite qu'une fois :
 *   héros (la promesse + la carte en direct) → comment ça marche → ce que voient les proches → carnet IA
 *   → pour les voyageurs → confidentialité → questions → tarif et départ.
 */

const steps = [
  { n: '1', t: '≈ 2 min', title: 'Crée ta page', text: 'Un nom, une photo de couverture, tes dates. Pas besoin d’itinéraire : la trace s’écrit en roulant.' },
  { n: '2', t: '≈ 3 min', title: 'Lance le suivi', text: 'Scanne un QR code avec l’appli gratuite Traccar Client : ton téléphone devient la balise. Un boîtier GPS compatible marche aussi.' },
  { n: '3', t: 'le jour J', title: 'Partage le lien', text: 'Envoie-le à qui tu veux. Ils l’ouvrent et te suivent, sans compte et sans rien installer.' },
];

const trips = ['en van', 'à moto', 'à vélo', 'en camping-car', 'en 4×4', 'entre potes', 'en famille', 'en raid', 'autour du monde', 'en solo'];

const forYou = [
  { icon: Users, title: 'Toute la bande', text: 'Invite tes compagnons de route : vous gérez la page ensemble, gratuitement pour eux.' },
  { icon: Wallet, title: 'Sponsors et cagnotte', text: 'Une vitrine pour tes sponsors et le lien de ta cagnotte, juste sous la carte.' },
  { icon: Video, title: 'Revivre en 3D', text: 'Ton voyage rejoué en survol satellite, à exporter en vidéo paysage, story ou carré.' },
];

const privacy = [
  { icon: Lock, title: 'Privé par défaut', text: 'Seules les personnes qui ont le lien voient ta page. Elle n’apparaît jamais sur Google.' },
  { icon: Globe2, title: 'Public si tu veux', text: 'Tu choisis la visibilité, et tu peux changer d’avis à tout moment.' },
  { icon: Power, title: 'Tu gardes la main', text: 'Coupe le suivi quand tu veux, efface ta trace en un clic.' },
  { icon: EyeOff, title: 'Sans pub', text: 'Pas de publicité, pas de revente de données. Jamais.' },
];

const faq: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Comment la position est-elle envoyée ?',
    a: 'Avec l’application gratuite Traccar Client (Android et iPhone), installée sur un téléphone du voyage et réglée d’un coup avec un QR code, ou avec un boîtier GPS compatible. Sans réseau, les points sont gardés en mémoire et envoyés dès que le téléphone capte.',
  },
  {
    q: 'Batterie, forfait, étranger : à quoi faut-il penser ?',
    a: 'Le suivi tourne en arrière-plan : en voiture, branche le téléphone sur l’allume-cigare, sinon prévois une batterie externe. Il consomme peu de données, environ 20 Mo par journée de route, et marche partout où ton téléphone capte. Hors de l’Union européenne, vérifie juste le prix de l’itinérance chez ton opérateur.',
  },
  {
    q: 'Pas de nouvelle position : faut-il s’inquiéter ?',
    a: 'Presque toujours, non : en montagne ou dans le désert, il n’y a souvent pas de réseau, et la trace se complète dès que le téléphone en retrouve. Si tu as un doute, contacte directement les voyageurs.',
  },
  {
    q: 'Que devient la page après le voyage ?',
    a: 'Elle reste en ligne en souvenir, avec la trace, les photos et le carnet. Tu peux la garder privée, la rendre publique, ou la supprimer quand tu veux.',
  },
  {
    q: 'Je participe à un raid ou un rallye : j’ai le droit ?',
    a: (
      <>
        Ça dépend de l’organisation : certains règlements interdisent tout système de suivi pendant l’épreuve. Vérifie le tien avant
        de lancer le suivi : tu es seul responsable de son respect. trophytracker n’est ni un outil de navigation, ni un outil de
        sécurité.{' '}
        <Link to="/conditions-utilisation#fair-play" className="font-bold text-signal-text underline-offset-4 hover:text-cream hover:underline">
          Lire la charte
        </Link>
      </>
    ),
  },
];

const sectionTitle = 'tt-display m-0 text-[clamp(2.4706rem,4.59vw,4.9412rem)] leading-[0.95] text-cream';
const kicker = 'font-mono text-[0.7647rem] text-dust-500';

/** La carte du lien privé : celui du road trip d'exemple, à copier ou ouvrir. */
function LinkCard({ className }: { className?: string }) {
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
    <div className={cn('flex flex-col gap-4 rounded-[28px] bg-cream p-[1.2941rem] text-coal shadow-[0_30px_60px_rgba(0,0,0,.45)]', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[1.1765rem] font-extrabold tracking-[-0.02em]">Route des Grandes Alpes</span>
        <span className="rounded-full bg-coal px-2.5 py-1 font-mono text-[0.6471rem] text-cream">privé</span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border-[1.5px] border-coal/[0.12] bg-white py-1.5 pl-3.5 pr-1.5">
        <Link to={EXAMPLE_PATH} className="min-w-0 flex-1 truncate font-mono text-[0.7647rem] text-coal hover:text-signal-light">{url}</Link>
        <button type="button" onClick={copy} className="min-h-10 rounded-xl bg-signal px-3.5 text-[0.8235rem] font-bold text-white hover:bg-signal-hover">
          {copied ? 'Copié ✓' : 'Copier'}
        </button>
      </div>
      <span className="text-[0.8235rem] text-dust-700">Le lien que tu envoies à tes proches. Celui-ci est un exemple : ouvre-le.</span>
    </div>
  );
}

export default function Landing() {
  const price = euros(currentPriceCents());
  const launch = isLaunchPrice();

  return (
    <PageShell header="floating" relief="dunes">
      {/* Le site lui-même (WebSite, Organization) est décrit dans le HTML statique de l'accueil : seo-plugin.ts. */}
      <Seo />

      {/* ── Héros ────────────────────────────────────────────────────────────
           Téléphone : un seul écran cadré (titre, carte qui prend la place restante, bouton en bas).
           Ordinateur : texte et bouton à gauche, carte à droite. */}
      <section className="relative overflow-hidden" aria-labelledby="hero-title">
        {/* Décor : désert de dunes au crépuscule (image vectorielle légère) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_85%_8%,#4A2A15_0%,#24180F_45%,#121316_100%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[url('/fonds/dunes.svg')] bg-cover bg-center opacity-60" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,19,22,.55)_0%,transparent_40%,#15161A_100%)] lg:bg-[linear-gradient(90deg,rgba(18,19,22,.85)_0%,rgba(18,19,22,.35)_55%,transparent_100%),linear-gradient(180deg,transparent_70%,#15161A_100%)]" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[100svh] max-w-[1120px] flex-col gap-5 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[5.1765rem] sm:px-5 lg:grid lg:min-h-[min(100svh,980px)] lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-[1fr_auto_1fr] lg:gap-x-16 lg:gap-y-8 lg:pb-16 lg:pt-[7.0588rem]">
          <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1 lg:justify-end lg:gap-7">
            <span className="hidden items-center gap-2 self-start rounded-full border-[1.5px] border-live/30 bg-live/10 px-3.5 py-1.5 font-mono text-[0.7647rem] text-live-text lg:flex">
              <span className="h-2 w-2 rounded-full bg-live" />
              le carnet de route en direct
            </span>
            <h1 id="hero-title" className="tt-display m-0 text-[clamp(2.7059rem,6.89vw,7.7647rem)] leading-[0.88] tracking-[-0.05em] text-cream">
              Ton road trip,
              <br />
              <span className="text-signal">en direct.</span>
            </h1>
            <p className="m-0 max-w-[520px] text-pretty text-[1rem] leading-snug text-dust-200 lg:text-[1.1176rem] lg:leading-normal">
              <span className="lg:hidden">Tes proches suivent ta position, ta trace et tes photos, d’un simple lien.</span>
              <span className="hidden lg:inline">
                Tu roules, tes proches te suivent : ta position, ta trace, tes photos et ton carnet de route, sur une page privée qu’ils
                ouvrent d’un simple lien.
              </span>
            </p>
          </div>

          <LiveScene className="min-h-[14.7059rem] flex-1 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:h-[min(72svh,660px)] lg:flex-none lg:self-center lg:rotate-[1.5deg]" />

          <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:gap-6">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
              <Link
                to="/creer"
                className="flex min-h-14 items-center justify-center rounded-full bg-signal px-6 text-[1rem] font-bold text-white shadow-[0_4px_0_#8A1217] hover:bg-signal-hover hover:text-white active:translate-y-px"
              >
                Créer mon road trip →
              </Link>
              <Link to={EXAMPLE_PATH} className="hidden min-h-14 items-center rounded-full border-[1.5px] border-cream/40 px-6 text-[1rem] font-bold text-cream hover:border-cream hover:bg-cream hover:text-coal lg:flex">
                Voir un exemple
              </Link>
            </div>
            <p className="m-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[0.7647rem] text-dust-400 lg:justify-start">
              <span>{price} une fois · gratuit pour tes proches</span>
              <Link to={EXAMPLE_PATH} className="font-sans text-[0.8824rem] font-bold text-cream underline underline-offset-4 lg:hidden">Voir un exemple</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Pour tous les road trips (bandeau qui défile) ────────────────── */}
      <section className="overflow-hidden border-y-[1.5px] border-cream/[0.08] py-5" aria-label="Pour tous les road trips">
        <div className="tt-marquee flex w-max gap-3">
          {[0, 1].map((copy) => (
            <ul key={copy} className="m-0 flex list-none gap-3 p-0" aria-hidden={copy === 1}>
              <li className="flex items-center px-2 font-mono text-[0.7647rem] text-dust-500">pour tous les road trips</li>
              {trips.map((t) => (
                <li key={t} className="whitespace-nowrap rounded-full border-[1.5px] border-cream/20 px-5 py-2 text-[1.0588rem] font-extrabold tracking-[-0.01em] text-cream">
                  {t}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* ── Comment ça marche ────────────────────────────────────────────── */}
      <section id="comment" className="mx-auto flex max-w-[1120px] scroll-mt-[5.1765rem] flex-col gap-8 px-5 py-14 lg:gap-11 lg:py-[6.4706rem]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className={sectionTitle}>
            Prêt en 5 minutes.
            <br />
            <span className="text-dust-500">Le reste se fait en roulant.</span>
          </h2>
          <span className={kicker}>// comment ça marche</span>
        </div>
        <ol className="-mx-5 m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:p-0">
          {steps.map((s) => (
            <li key={s.n} className="flex w-[84%] flex-none snap-center sm:w-auto min-h-[13rem] flex-col gap-4 rounded-[28px] bg-cream p-7 text-coal">
              <div className="flex items-center justify-between">
                <span className="flex h-[3.0588rem] w-[3.0588rem] items-center justify-center rounded-full bg-coal text-[1.4118rem] font-extrabold text-cream">{s.n}</span>
                <span className="rounded-full bg-coal/[0.12] px-2.5 py-1 font-mono text-[0.7059rem] font-medium">{s.t}</span>
              </div>
              <h3 className="tt-display mb-0 mt-auto text-[1.8824rem] leading-none">{s.title}</h3>
              <p className="m-0 text-[1rem] leading-normal">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Ce que voient les proches ────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]" aria-labelledby="proches">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-5 py-14 lg:gap-11 lg:py-[6.4706rem]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="proches" className={sectionTitle}>
              Ils sont du voyage.
              <br />
              <span className="text-signal">Depuis leur canapé.</span>
            </h2>
            <p className="m-0 max-w-[420px] text-pretty text-[1.0588rem] leading-[1.55] text-dust-300">
              Une seule page, pensée pour le téléphone et lisible par tout le monde, même par les grands-parents.
            </p>
          </div>
          <FollowerFeatures />
        </div>
      </section>

      {/* ── Le carnet de bord raconté ────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]" aria-labelledby="carnet-ia">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-14 px-5 py-14 lg:py-[6.4706rem]">
          <div className="flex flex-col gap-5">
            <span className="self-start rounded-full bg-signal px-3 py-1 font-mono text-[0.7059rem] font-medium text-white">carnet de route · IA</span>
            <h2 id="carnet-ia" className={sectionTitle}>
              Le soir, tu racontes.
              <br />
              <span className="text-signal">L’IA écrit.</span>
            </h2>
            <p className="m-0 max-w-[480px] text-[1.0588rem] leading-[1.55] text-dust-300">
              Plus besoin d’écrire au bivouac. Appuie sur le micro et raconte ta journée comme à un pote : la panne, le col, le resto.
              L’IA garde toutes tes anecdotes, retire les « euh » et remet tout dans l’ordre avec tes kilomètres et ton altitude.
              Tu relis, tu corriges si besoin, tu publies.
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0 font-mono text-[0.7647rem] text-dust-200">
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
                <span className="font-mono text-[0.7059rem] text-dust-400">ton récit · 1:48</span>
                <p className="m-0 text-[0.9412rem] italic leading-relaxed text-dust-200">
                  « Alors euh ce matin on part de Valloire, et là le Galibier euh… la voiture chauffe à mort, on s’arrête en plein virage,
                  un papi à vélo nous double en rigolant… et en haut, la vue, franchement, on a pleuré. »
                </p>
              </div>
            </div>
            <div className="mx-auto flex items-center gap-2 font-mono text-[0.7647rem] text-signal-text">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" /></svg>
              l’IA met en forme
            </div>
            <div className="flex flex-col gap-2.5 rounded-[24px] bg-cream p-6 text-ink shadow-[0_24px_50px_rgba(0,0,0,.4)]">
              <span className="font-mono text-[0.7059rem] text-dust-700">jour 3 · 42 km · 2 642 m</span>
              <span className="tt-display text-[1.7647rem] leading-[1.05]">Doublés par un papi au Galibier</span>
              <p className="m-0 text-[0.9412rem] leading-relaxed">
                Départ de Valloire ce matin, direction le Galibier. À mi-montée, la voiture chauffe : arrêt forcé en plein virage,
                capot ouvert, pendant qu’un papi à vélo nous double en rigolant. Et puis le sommet, à 2 642 mètres. La vue nous a mis
                les larmes aux yeux.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pour les voyageurs ───────────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]" aria-labelledby="voyageurs">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-5 py-14 lg:gap-11 lg:py-[6.4706rem]">
          <h2 id="voyageurs" className={sectionTitle}>
            Et pour toi,
            <br />
            <span className="text-dust-500">un peu plus.</span>
          </h2>
          <ul className="-mx-5 m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3.5 sm:overflow-visible sm:p-0">
            {forYou.map(({ icon: Icon, title, text }) => (
              <li key={title} className="tt-glass flex w-[84%] flex-none snap-center flex-col gap-5 rounded-[24px] border-[1.5px] border-cream/[0.08] p-6 sm:w-auto">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal/15 text-signal-text">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="m-0 text-[1.2941rem] font-extrabold tracking-[-0.01em] text-cream">{title}</h3>
                  <p className="m-0 text-[0.8824rem] leading-normal text-dust-300">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Confidentialité ──────────────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]" aria-labelledby="vie-privee">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-14 px-5 py-14 lg:py-[6.4706rem]">
          <div className="flex flex-col gap-8">
            <h2 id="vie-privee" className={sectionTitle}>
              Ton voyage,
              <br />
              <span className="text-signal">tes règles.</span>
            </h2>
            <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
              {privacy.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3.5">
                  <Icon className="mt-1 h-5 w-5 flex-none text-signal-text" aria-hidden="true" />
                  <div className="flex flex-col gap-1">
                    <h3 className="m-0 text-[1.0588rem] font-extrabold text-cream">{title}</h3>
                    <p className="m-0 text-[0.8824rem] leading-normal text-dust-300">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <LinkCard className="mx-auto w-full max-w-[440px] lg:mr-0 lg:-rotate-[1.5deg]" />
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-cream/[0.08]" aria-labelledby="faq">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-14 px-5 py-14 lg:py-[6.4706rem]">
          <div className="flex flex-col gap-4">
            <span className={kicker}>// avant de partir</span>
            <h2 id="faq" className={sectionTitle}>Questions fréquentes</h2>
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

      {/* ── Tarif et départ ──────────────────────────────────────────────── */}
      <section id="tarif" className="scroll-mt-[5.1765rem] px-5 pb-[5.2941rem]" aria-labelledby="go">
        <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-end gap-10 rounded-[40px] bg-signal px-7 py-14 text-white sm:px-12 sm:py-[4.2353rem]">
          <h2 id="go" className="tt-display m-0 text-[clamp(3.0588rem,5.74vw,6.5882rem)] leading-[0.9] tracking-[-0.045em]">
            Le compteur
            <br />
            démarre quand
            <br />
            tu pars.
          </h2>
          <div className="flex max-w-[420px] flex-col items-start gap-5 lg:justify-self-end">
            <div className="flex items-end gap-3">
              <span className="tt-display text-[4.2353rem] leading-[0.85]">{price}</span>
              <span className="pb-1 text-[0.9412rem] font-medium leading-tight text-white/90">
                par road trip,
                <br />
                une seule fois
              </span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[0.9412rem] font-medium">
              {['Gratuit pour tes proches et tes compagnons de route', 'Sans abonnement, sans publicité', 'Toutes les fonctions incluses, la page reste en souvenir'].map((x) => (
                <li key={x} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 flex-none opacity-80" aria-hidden="true" />{x}</li>
              ))}
            </ul>
            {launch && (
              <p className="m-0 font-mono text-[0.7647rem] leading-relaxed text-white/85">
                Tarif de lancement jusqu’au {PRICING.launchLastDay}, puis {euros(PRICING.regularCents)}.
              </p>
            )}
            <Link to="/creer" className="rounded-full bg-[#121316] px-[1.5294rem] py-[1rem] text-[1rem] font-extrabold text-white hover:bg-white hover:text-[#121316]">
              Créer mon road trip →
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
