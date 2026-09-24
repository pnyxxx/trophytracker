import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Camera, Gift, HeartHandshake, Map, Search, ShieldCheck, Smartphone, Users } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ScrollReveal from '@/components/animations/ScrollReveal';
import { CrewCard } from '@/components/crew/CrewBits';
import { Countdown } from '@/components/landing/Countdown';
import { useCrewSearch, useEvent } from '@/hooks/queries';

const CrewsOverviewMap = lazy(() => import('@/components/landing/CrewsOverviewMap'));

const audiences = [
  {
    icon: HeartHandshake,
    title: 'Pour les proches',
    text: 'Parents, amis, grands-parents : voyez où se trouve votre équipage à tout moment, sans attendre un message. Rassurant quand ils traversent le désert !',
  },
  {
    icon: Gift,
    title: 'Pour les sponsors',
    text: 'Suivez l’aventure que vous financez. Votre logo apparaît sur la page et sur la carte de l’équipage, vue par toute sa communauté.',
  },
  {
    icon: Users,
    title: 'Pour les équipages',
    text: 'Une page à vous, gratuite, en 5 minutes : carte en direct, statistiques, photos et 360°, sponsors. Un seul lien à partager.',
  },
];

const steps = [
  { icon: Users, title: 'L’équipage crée sa page', text: 'Nom, numéro, photos, sponsors… tout se gère depuis un espace simple.' },
  { icon: Smartphone, title: 'Il active le GPS', text: 'L’appli gratuite Traccar Client sur un téléphone de la 4L suffit. Aucun boîtier à acheter.' },
  { icon: Map, title: 'Vous suivez en direct', text: 'Position, trace complète depuis le départ, vitesse, kilomètres parcourus, photos du bivouac…' },
];

const features = [
  { icon: Map, title: 'Carte en temps réel', text: 'La 4L bouge sur la carte sans recharger la page.' },
  { icon: Camera, title: 'Photos & 360°', text: 'Revivez les dunes de Merzouga comme si vous y étiez.' },
  { icon: Bell, title: 'Vos favoris', text: 'Retrouvez en un clic les équipages que vous suivez.' },
  { icon: ShieldCheck, title: 'Gratuit & respectueux', text: 'Sans publicité, sans revente de données, sur nos propres serveurs.' },
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
    a: 'Rien. TrophysTracker est un projet indépendant et gratuit, né de l’expérience d’un équipage du 4L Trophy.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data: event } = useEvent();
  const { data: crews } = useCrewSearch('', false, 60);

  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/equipages?q=${encodeURIComponent(query.trim())}` : '/equipages');
  };

  return (
    <PageShell padTop={false}>
      <Seo />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-b from-black via-[hsl(var(--hero-bg))] to-black pb-16 pt-28">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            className="absolute -right-1/4 bottom-1/4 h-[700px] w-[700px] rounded-full bg-secondary/20 blur-[120px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 w-fit rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80"
          >
            🚗 {event?.name ?? '4L Trophy'} · suivi GPS en direct
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mb-6 max-w-4xl text-4xl font-bold text-white md:text-7xl"
          >
            Suivez votre équipage <span className="text-gradient-red">en direct</span>, jusqu’au bout du désert.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-300 md:text-xl"
          >
            Proches, amis, sponsors : retrouvez la position, la trace complète, les photos et les
            statistiques de l’équipage que vous soutenez. Gratuit, sans application à installer.
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onSubmit={search}
            className="mx-auto mb-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            role="search"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom de l’équipage, numéro, école…"
                aria-label="Rechercher un équipage"
                className="h-14 rounded-xl border-white/20 bg-white/10 pl-12 text-base text-white placeholder:text-white/40"
              />
            </div>
            <Button type="submit" size="lg" className="h-14 rounded-xl px-8 text-base font-bold">
              Trouver
            </Button>
          </motion.form>

          {event?.startDate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mb-8">
              <p className="mb-3 text-sm uppercase tracking-widest text-white/50">Départ dans</p>
              <Countdown date={event.startDate} />
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="text-sm text-white/60">
            Vous participez au raid ?{' '}
            <Link to="/inscription" className="font-semibold text-primary underline-offset-4 hover:underline">
              Créez la page de votre équipage gratuitement →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Pour qui ─────────────────────────────────────────────────────── */}
      <section className="gradient-sand py-20 md:py-28">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <h2 className="mb-4 text-center text-3xl font-bold text-black md:text-5xl">Pourquoi TrophysTracker ?</h2>
            <p className="mx-auto mb-14 max-w-2xl text-center text-lg text-black/70">
              Pendant 10 jours, des milliers d’étudiants traversent la France, l’Espagne et le Maroc en 4L.
              À la maison, on aimerait bien savoir où ils sont. C’est exactement ce que nous faisons.
            </p>
          </ScrollReveal>
          <div className="grid gap-6 md:grid-cols-3">
            {audiences.map((a, i) => (
              <ScrollReveal key={a.title} delay={i * 0.1}>
                <div className="h-full rounded-3xl bg-white p-8 shadow-sm">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <a.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-black">{a.title}</h3>
                  <p className="text-black/70">{a.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Carte d'ensemble ─────────────────────────────────────────────── */}
      <section className="bg-black py-20 md:py-28">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <h2 className="mb-4 text-center text-3xl font-bold text-white md:text-5xl">Sur la route en ce moment</h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-white/60">
              Dernière position connue de chaque équipage. Cliquez sur un équipage pour suivre sa trace complète.
            </p>
          </ScrollReveal>
          <div className="h-[60vh] min-h-[380px] overflow-hidden rounded-3xl border border-white/10">
            <Suspense fallback={<div className="h-full w-full animate-pulse bg-white/5" />}>
              <CrewsOverviewMap crews={crews?.items ?? []} />
            </Suspense>
          </div>

          {crews && crews.items.length > 0 && (
            <>
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {crews.items.slice(0, 6).map((c) => (
                  <CrewCard key={c.id} crew={c} />
                ))}
              </div>
              <div className="mt-8 text-center">
                <Button asChild variant="secondary" size="lg">
                  <Link to="/equipages">Voir les {crews.total} équipages</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Comment ça marche ────────────────────────────────────────────── */}
      <section id="comment-ca-marche" className="scroll-mt-16 bg-[hsl(var(--background))] py-20 md:py-28">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <h2 className="mb-14 text-center text-3xl font-bold text-white md:text-5xl">Comment ça marche ?</h2>
          </ScrollReveal>
          <div className="relative grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 0.1}>
                <div className="text-center">
                  <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
                    <s.icon className="h-9 w-9" />
                    <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white font-bold text-black">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">{s.title}</h3>
                  <p className="mx-auto max-w-xs text-white/60">{s.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6">
                <f.icon className="mb-3 h-6 w-6 text-primary" />
                <p className="mb-1 font-bold text-white">{f.title}</p>
                <p className="text-sm text-white/60">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="gradient-sand py-20 md:py-28">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="mb-10 text-center text-3xl font-bold text-black md:text-5xl">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="rounded-3xl bg-white px-6 text-black shadow-sm">
            {faq.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`} className="border-black/10">
                <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-black/70">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Appel à l'action ─────────────────────────────────────────────── */}
      <section className="bg-primary py-16 text-center text-white">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Vous partez sur le raid ?</h2>
          <p className="mx-auto mb-8 max-w-xl text-white/85">
            Créez la page de votre équipage en 5 minutes et partagez un seul lien à vos proches et sponsors.
          </p>
          <Button asChild size="lg" variant="secondary" className="px-10 text-base font-bold">
            <Link to="/inscription">Inscrire mon équipage</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
