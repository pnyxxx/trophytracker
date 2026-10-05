import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail, Settings } from 'lucide-react';
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
import { CrewRoadbook } from '@/components/crew/CrewRoadbook';
import { CrewShareButton } from '@/components/crew/CrewQr';
import { useRoadbook } from '@/components/crew/roadbook';
import { useCrew, useCrewMembers, useCrewStats, useEvent, useMyRole, usePhotos, useSponsors } from '@/hooks/queries';
import { useLiveTrack } from '@/hooks/useLiveTrack';
import { formatRelative, isLive } from '@/lib/format';
import { raidDay } from '@/lib/stages';
import { altitudeProfile } from '@/lib/elevation';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

const CrewMap = lazy(() => import('@/components/crew/CrewMap').then((m) => ({ default: m.CrewMap })));

const TONES = {
  dark: 'bg-ink text-cream',
  sand: 'bg-sand text-coal',
  cream: 'bg-cream text-coal',
};

function Section({ id, kicker, title, subtitle, tone = 'dark', children }: {
  id: string; kicker?: ReactNode; title: ReactNode; subtitle?: string; tone?: keyof typeof TONES; children: ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <section id={id} className={cn('scroll-mt-[120px] py-20 md:py-[120px]', TONES[tone])}>
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

const NO_WAYPOINTS: never[] = [];

/** « 31.085°N · 4.023°O » */
/** Même texte, sans tenir compte des accents ni des majuscules (« Breizh en sablés » = « BREIZH EN SABLES »). */
const sameText = (a: string, b: string) => {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b);
};

const coords = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'O' : 'E'}`;

export default function CrewPage() {
  const { slug } = useParams();
  const { data: crew, isLoading } = useCrew(slug);
  const { data: event } = useEvent();
  const { data: stats } = useCrewStats(crew?.id);
  const { data: photos = [] } = usePhotos(crew?.id);
  const { data: sponsors = [] } = useSponsors(crew?.id);
  const { data: members = [] } = useCrewMembers(crew?.id);
  const { canEdit } = useMyRole(crew?.id);
  const { points } = useLiveTrack(crew);
  // Jour du raid (recalculé à chaque nouvelle position, donc aussi après minuit pendant le raid).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- points.length : recalcul voulu à chaque position
  const cal = useMemo(() => raidDay(event?.startDate ?? null, event?.endDate ?? null), [event?.startDate, event?.endDate, points.length]);
  const profile = useMemo(() => altitudeProfile(points, event?.startDate ?? null), [points, event?.startDate]);
  const roadbook = useRoadbook(event?.waypoints ?? NO_WAYPOINTS, event?.totalKm ?? null, points, cal, event?.startDate ?? null);
  const plannedStop = roadbook.stops[roadbook.planned.index];
  const plannedSub = plannedStop?.subs[roadbook.planned.sub];
  const planned = plannedStop ? (plannedSub ? `${plannedSub.name} · ${plannedStop.name}` : plannedStop.name) : null;

  if (isLoading) return <PageShell><PageLoader /></PageShell>;
  if (!crew) return <NotFound />;

  const cover = mediaUrl(crew.cover_path);
  const live = isLive(crew.last_fix_at);
  const hasRoute = !!event && roadbook.stops.length > 1;

  const memberNames = members.map((m) => m.display_name).filter(Boolean).join(' & ');
  const anchors = [
    { id: 'carte', label: 'Carte' },
    { id: 'stats', label: 'Stats' },
    hasRoute && { id: 'route', label: 'La route' },
    crew.story && { id: 'histoire', label: 'L’aventure' },
    photos.length > 0 && { id: 'photos', label: 'Photos' },
    sponsors.length > 0 && { id: 'sponsors', label: 'Sponsors' },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <PageShell padTop={false}>
      <Seo
        title={crew.name}
        description={crew.tagline ?? `Suivez l'équipage ${crew.name} en direct sur le 4L Trophy.`}
        image={cover ?? mediaUrl(crew.avatar_path)}
        noindex={!crew.is_public}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'SportsTeam',
            name: crew.name,
            description: crew.tagline ?? undefined,
            sport: '4L Trophy',
            image: cover ?? mediaUrl(crew.avatar_path) ?? undefined,
            url: `${window.location.origin}/equipages/${crew.slug}`,
            sameAs: [crew.instagram_url, crew.facebook_url].filter(Boolean),
            athlete: members.map((m) => ({ '@type': 'Person', name: m.display_name })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${window.location.origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Équipages', item: `${window.location.origin}/equipages` },
              { '@type': 'ListItem', position: 3, name: crew.name },
            ],
          },
        ]}
      />

      {/* ── En-tête : remplit l'écran, le sommaire (≈ 42 px) arrive juste en bas ── */}
      <header className="relative flex min-h-[calc(100svh-42px)] flex-col justify-end overflow-hidden bg-[radial-gradient(120%_80%_at_80%_0%,#3A2215_0%,#1B1310_45%,#120F0C_75%)]">
        {cover && (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35"
            style={{ objectPosition: `${crew.cover_focus_x}% ${crew.cover_focus_y}%` }} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,15,12,.55)_0%,rgba(18,15,12,.3)_40%,#120F0C_100%)]" />
        <Container className="relative grid w-full gap-10 pb-14 pt-32 md:pb-16 md:pt-40 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex min-w-0 flex-col gap-7">
            <Kicker className="flex-wrap gap-x-4 gap-y-2">
              {crew.car_number && (
                <span className="rounded-[3px] bg-primary px-2 py-1 font-mono text-xs font-bold tracking-normal text-white">#{crew.car_number}</span>
              )}
              <span>Équipage · {event?.name ?? '4L Trophy'}</span>
              <LiveBadge lastFixAt={crew.last_fix_at} />
              {!live && crew.last_fix_at && <span className="text-dust-400">Dernière position {formatRelative(crew.last_fix_at)}</span>}
              {!crew.is_public && <span className="border border-cream/25 px-2 py-1 text-dust-100">Page privée</span>}
            </Kicker>
            <div className="flex flex-col gap-3">
              <h1 className="m-0 break-words font-display text-[clamp(56px,9vw,152px)] font-black uppercase leading-[0.92] text-cream">
                {crew.name}
              </h1>
              {(crew.school || crew.city) && (
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-dust-400">{[crew.school, crew.city].filter(Boolean).join(' · ')}</span>
              )}
            </div>
            {crew.tagline && <p className="m-0 max-w-[640px] text-pretty text-xl leading-snug text-dust-100">{crew.tagline}</p>}
            {/* Les noms des membres, sauf s'ils ne font que répéter le nom de l'équipage */}
            {memberNames && !sameText(memberNames, crew.name) && (
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-dust-400">Équipage : {memberNames}</span>
            )}
            {(crew.instagram_url || crew.facebook_url) && (
              <div className="flex flex-wrap gap-3">
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
            <CrewAvatar name={crew.name} path={crew.avatar_path} className="h-24 w-24 border-2 border-cream/20 text-4xl md:h-32 md:w-32 md:text-5xl" />
            {crew.last_lat != null && crew.last_lon != null && (
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-cream">
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
        </Container>
      </header>

      {/* Sommaire de la page, collé sous l'en-tête du site */}
      <nav aria-label="Sections de la page" className="sticky top-[68px] z-[900] border-y border-cream/[0.12] bg-ink/90 backdrop-blur-md">
        <Container className="flex gap-6 overflow-x-auto py-3 font-mono text-xs uppercase tracking-[0.14em]">
          {anchors.map((a) => (
            <a key={a.id} href={`#${a.id}`} className="shrink-0 text-dust-300 hover:text-cream">
              <span className="text-primary">◆</span> {a.label}
            </a>
          ))}
        </Container>
      </nav>

      {/* ── Carte ────────────────────────────────────────────────────────── */}
      <Section
        id="carte"
        kicker={live ? <><LiveDot />Suivi en direct</> : 'Suivi GPS'}
        title="Où est la 4L ?"
        subtitle="Position en temps réel et trace complète depuis le départ."
      >
        <Suspense fallback={<div className="h-[600px] animate-pulse border border-cream/[0.14] bg-ink-900" />}>
          <CrewMap crew={crew} points={points} waypoints={event?.waypoints ?? []} sponsors={sponsors} photos={photos} />
        </Suspense>
      </Section>

      {/* ── Statistiques ─────────────────────────────────────────────────── */}
      <section id="stats" className="scroll-mt-[120px] border-t border-cream/[0.12] bg-ink pb-20 pt-16 md:pb-[120px]">
        <Container className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3.5">
              <Kicker>Tableau de bord</Kicker>
              <SectionTitle>Les chiffres</SectionTitle>
            </div>
            <p className="m-0 max-w-[420px] text-base leading-relaxed text-dust-300">Mises à jour automatiquement à chaque nouvelle position.</p>
          </div>
          <CrewStats stats={stats} cal={cal} planned={planned} />
        </Container>
      </section>

      {/* ── La route ─────────────────────────────────────────────────────── */}
      {hasRoute && (
        <Section
          id="route"
          tone="sand"
          kicker="Le roadbook"
          title="La route"
          subtitle={`De ${roadbook.stops[0]!.name} à ${roadbook.stops.at(-1)!.name} : où en est l’équipage sur le parcours prévu, jour après jour.`}
        >
          <CrewRoadbook roadbook={roadbook} cal={cal} distanceKm={stats?.total_distance_km ?? 0} profile={profile} />
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
            <p className="m-0 font-display text-4xl font-black uppercase leading-none">Un message pour l’équipage ?</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary"><a href={`mailto:${crew.contact_email}`}><Mail />Contacter l'équipage</a></Button>
            </div>
          </Container>
        </section>
      )}
    </PageShell>
  );
}
