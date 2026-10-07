import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, HandHeart, Mail, Settings } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { FacebookIcon, InstagramIcon } from '@/components/common/SocialIcons';
import { Seo } from '@/components/common/Seo';
import { Container, Kicker, LiveDot, SectionTitle } from '@/components/common/Brand';
import { PageLoader } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { CrewAvatar, FollowButton, LiveBadge } from '@/components/crew/CrewBits';
import { CrewStats } from '@/components/crew/CrewStats';
import { CrewGallery } from '@/components/crew/CrewGallery';
import { CrewSponsors } from '@/components/crew/CrewSponsors';
import { CrewShareButton } from '@/components/crew/CrewQr';
import { useCrew, useCrewStats, useMyRole, usePhotos, useSponsors } from '@/hooks/queries';
import { useLiveTrack } from '@/hooks/useLiveTrack';
import { formatRelative, isLive } from '@/lib/format';
import { localDate } from '@/lib/days';
import { altitudeProfile } from '@/lib/elevation';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

const CrewMap = lazy(() => import('@/components/crew/CrewMap').then((m) => ({ default: m.CrewMap })));
const CrewElevation = lazy(() => import('@/components/crew/CrewElevation').then((m) => ({ default: m.CrewElevation })));

const TONES = {
  dark: 'bg-ink text-cream',
  sand: 'bg-sand text-coal',
  cream: 'bg-cream text-coal',
};

function Section({ id, kicker, title, subtitle, tone = 'dark', first = false, children }: {
  id: string; kicker?: ReactNode; title: ReactNode; subtitle?: string; tone?: keyof typeof TONES;
  /** Première section, juste sous l'en-tête plein écran : moins d'espace au-dessus. */
  first?: boolean; children: ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <section id={id} className={cn('scroll-mt-[84px] pb-20 md:pb-[120px]', first ? 'pt-8 md:pt-10' : 'pt-20 md:pt-[120px]', TONES[tone])}>
      <Container className="flex flex-col gap-10 md:gap-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3.5">
            {kicker && <Kicker className={dark ? undefined : 'text-primary'}>{kicker}</Kicker>}
            <SectionTitle>{title}</SectionTitle>
          </div>
          {subtitle && <p className={cn('m-0 max-w-[420px] text-base leading-relaxed', dark ? 'text-dust-300' : 'text-dust-700')}>{subtitle}</p>}
        </div>
        {children}
      </Container>
    </section>
  );
}

/**
 * « Défilez » en bas au centre de l'écran, tant que la page n'a pas bougé. Masqué s'il
 * recouvrirait un bouton : sur téléphone, l'en-tête dépasse souvent l'écran.
 */
function ScrollHint({ target }: { target: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [atTop, setAtTop] = useState(() => window.scrollY < 40);
  const [covers, setCovers] = useState(false);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 40);
    const check = () => {
      const hint = ref.current?.getBoundingClientRect();
      const header = ref.current?.closest('header');
      if (!hint || !header) return;
      setCovers([...header.querySelectorAll('a[href], button')].some((el) => {
        if (el === ref.current) return false;
        const r = el.getBoundingClientRect();
        return r.left < hint.right && r.right > hint.left && r.top < hint.bottom && r.bottom > hint.top;
      }));
    };
    const late = setTimeout(check, 800); // après le chargement des polices et des images
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      clearTimeout(late);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', check);
    };
  }, []);
  const visible = atTop && !covers;
  return (
    <a
      ref={ref}
      href={`#${target}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        'fixed bottom-3 left-1/2 z-[850] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink/70 px-4 py-2 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-cream backdrop-blur-sm transition-opacity duration-500 hover:text-cream',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      Défilez
      <ChevronDown className="h-5 w-5 text-primary motion-safe:animate-bounce" />
    </a>
  );
}

/** « 31.085°N · 4.023°O » */
const coords = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'O' : 'E'}`;

export default function CrewPage() {
  const { slug } = useParams();
  const { data: crew, isLoading } = useCrew(slug);
  const { data: stats } = useCrewStats(crew?.id);
  const { data: photos = [] } = usePhotos(crew?.id);
  const { data: sponsors = [] } = useSponsors(crew?.id);
  const { canEdit } = useMyRole(crew?.id);
  const { points } = useLiveTrack(crew);
  // Jour 1 du voyage = jour du premier point de la trace.
  const startedAt = points[0]?.[2] ?? null;
  const profile = useMemo(() => altitudeProfile(points, startedAt != null ? localDate(startedAt) : null), [points, startedAt]);

  if (isLoading) return <PageShell><PageLoader /></PageShell>;
  if (!crew) return <NotFound />;

  const cover = mediaUrl(crew.cover_path);
  const live = isLive(crew.last_fix_at);

  return (
    <PageShell padTop={false}>
      <Seo
        title={crew.name}
        description={crew.tagline ?? `Suivez le voyage ${crew.name} en direct.`}
        image={cover ?? mediaUrl(crew.avatar_path)}
        noindex={!crew.is_public}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${window.location.origin}/` },
            { '@type': 'ListItem', position: 2, name: crew.name },
          ],
        }}
      />

      {/* ── En-tête : remplit l'écran, la carte arrive juste en dessous.
          Numéro, nom et ville en haut ; le reste en bas. ── */}
      <header className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_80%_0%,#3A2215_0%,#1B1310_45%,#120F0C_75%)]">
        {cover && (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35"
            style={{ objectPosition: `${crew.cover_focus_x}% ${crew.cover_focus_y}%` }} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,15,12,.55)_0%,rgba(18,15,12,.3)_40%,#120F0C_100%)]" />
        <Container className="relative flex w-full flex-1 flex-col justify-between gap-10 pb-14 pt-24 md:pb-16 md:pt-32">
          <div className="flex min-w-0 flex-col gap-7">
            <Kicker className="flex-wrap gap-x-4 gap-y-2">
              {crew.car_number && (
                <span className="rounded-[3px] bg-primary px-2 py-1 font-mono text-xs font-bold tracking-normal text-white">#{crew.car_number}</span>
              )}
              <span>Voyage</span>
              <LiveBadge lastFixAt={crew.last_fix_at} />
              {!live && crew.last_fix_at && <span className="text-dust-400">Dernière position {formatRelative(crew.last_fix_at)}</span>}
              {!crew.is_public && <span className="border border-cream/25 px-2 py-1 text-dust-100">Page privée</span>}
              {crew.is_demo && <span className="border border-ochre/60 px-2 py-1 text-ochre">Voyage de démonstration</span>}
            </Kicker>
            <div className="flex flex-col gap-3">
              <h1 className="m-0 break-words font-display text-[clamp(56px,9vw,152px)] font-black uppercase leading-[0.92] text-cream">
                {crew.name}
              </h1>
              {(crew.school || crew.city) && (
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-dust-400">{[crew.school, crew.city].filter(Boolean).join(' · ')}</span>
              )}
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex min-w-0 flex-col gap-7">
              {crew.tagline && <p className="m-0 max-w-[640px] text-pretty text-xl leading-snug text-dust-100">{crew.tagline}</p>}
              {(crew.fundraiser_url || crew.instagram_url || crew.facebook_url) && (
                <div className="flex flex-wrap gap-3">
                  {crew.fundraiser_url && (
                    <Button asChild>
                      <a href={crew.fundraiser_url} target="_blank" rel="noopener noreferrer"><HandHeart />Participer à la cagnotte</a>
                    </Button>
                  )}
                  {crew.instagram_url && (
                    <Button asChild variant="outline">
                      <a href={crew.instagram_url} target="_blank" rel="noopener noreferrer"><InstagramIcon />Instagram</a>
                    </Button>
                  )}
                  {crew.facebook_url && (
                    <Button asChild variant="outline">
                      <a href={crew.facebook_url} target="_blank" rel="noopener noreferrer"><FacebookIcon />Facebook</a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5 lg:items-end">
              {/* Logo et position à droite, même sur téléphone : l'en-tête ne s'empile pas tout à gauche. */}
              <CrewAvatar name={crew.name} path={crew.avatar_path} className="h-24 w-24 self-end border-2 border-cream/20 text-4xl md:h-32 md:w-32 md:text-5xl" />
              {crew.last_lat != null && crew.last_lon != null && (
                <span className="flex items-center gap-2 self-end font-mono text-[11px] uppercase tracking-[0.12em] text-cream">
                  <span className="h-[7px] w-[7px] rounded-full bg-primary shadow-[0_0_10px_#DB4740]" />
                  {coords(crew.last_lat, crew.last_lon)}
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <FollowButton crewId={crew.id} slug={crew.slug} count={crew.followers_count} />
                <CrewShareButton crew={crew} />
                {canEdit && (
                  <Button asChild variant="secondary">
                    <Link to={`/mon-compte/equipages/${crew.slug}`}><Settings />Gérer</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Container>
        <ScrollHint target="carte" />
      </header>

      {/* ── Carte ────────────────────────────────────────────────────────── */}
      <Section
        id="carte"
        first
        kicker={live ? <><LiveDot />Suivi en direct</> : 'Suivi GPS'}
        title="Où en sont-ils ?"
        subtitle={crew.is_demo
          ? 'Démonstration : un trajet rejoué en boucle et en temps réel.'
          : 'Position en temps réel et trace complète depuis le départ. Pas de nouvelle position ? Souvent, il n’y a simplement pas de réseau.'}
      >
        <Suspense fallback={<div className="h-[600px] animate-pulse border border-cream/[0.14] bg-ink-900" />}>
          <CrewMap crew={crew} points={points} waypoints={[]} sponsors={sponsors} photos={photos} />
        </Suspense>
      </Section>

      {/* ── Statistiques ─────────────────────────────────────────────────── */}
      <section id="stats" className="scroll-mt-[84px] border-t border-cream/[0.12] bg-ink pb-20 pt-16 md:pb-[120px]">
        <Container className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3.5">
              <Kicker>Tableau de bord</Kicker>
              <SectionTitle>Les chiffres</SectionTitle>
            </div>
            <p className="m-0 max-w-[420px] text-base leading-relaxed text-dust-300">Mises à jour automatiquement à chaque nouvelle position.</p>
          </div>
          <CrewStats stats={stats} startedAt={startedAt} />
        </Container>
      </section>

      {/* ── Relief (altitude envoyée par le téléphone) ─────────────────────── */}
      {profile && (
        <Section id="relief" tone="sand" kicker="Profil d’altitude" title="Le relief" subtitle="Montées, descentes et point culminant, jour par jour.">
          <Suspense fallback={<div className="h-[260px] animate-pulse border-2 border-coal bg-cream" />}>
            <CrewElevation profile={profile} />
          </Suspense>
        </Section>
      )}

      {/* ── Histoire ─────────────────────────────────────────────────────── */}
      {crew.story && (
        <Section id="histoire" tone="cream" kicker="Carnet de bord" title="Notre aventure">
          <div className="max-w-3xl whitespace-pre-line border-l-[3px] border-primary pl-6 text-lg leading-relaxed text-dust-800 md:text-xl">
            {crew.story}
          </div>
        </Section>
      )}

      {/* ── Photos ───────────────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <Section id="photos" kicker="Depuis la route" title="Photos & 360°" subtitle="Cliquez pour agrandir. Les photos 360° se parcourent en glissant.">
          <CrewGallery photos={photos} />
        </Section>
      )}

      {/* ── Sponsors ─────────────────────────────────────────────────────── */}
      {sponsors.length > 0 && (
        <Section id="sponsors" tone="sand" kicker="Merci à eux" title="Nos sponsors" subtitle="Sans eux, pas d’aventure !">
          <CrewSponsors sponsors={sponsors} />
        </Section>
      )}

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      {crew.contact_email && (
        <section className="border-t border-cream/[0.12] bg-ink py-14">
          <Container className="flex flex-wrap items-center justify-between gap-6">
            <p className="m-0 font-display text-4xl font-black uppercase leading-none">Un message pour les voyageurs ?</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary"><a href={`mailto:${crew.contact_email}`}><Mail />Leur écrire</a></Button>
            </div>
          </Container>
        </section>
      )}
    </PageShell>
  );
}
