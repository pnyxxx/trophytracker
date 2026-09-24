import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Globe, Instagram, Mail, MapPin, Settings } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import ScrollReveal from '@/components/animations/ScrollReveal';
import { CrewAvatar, FollowButton, LiveBadge, ShareButton } from '@/components/crew/CrewBits';
import { CrewStats } from '@/components/crew/CrewStats';
import { CrewGallery } from '@/components/crew/CrewGallery';
import { CrewSponsors } from '@/components/crew/CrewSponsors';
import { CrewRoadTimeline } from '@/components/crew/CrewRoadTimeline';
import { useCrew, useCrewMembers, useCrewStats, useEvent, useMyRole, usePhotos, useSponsors } from '@/hooks/queries';
import { useLiveTrack } from '@/hooks/useLiveTrack';
import { formatRelative, isLive } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import NotFound from './NotFound';

const CrewMap = lazy(() => import('@/components/crew/CrewMap').then((m) => ({ default: m.CrewMap })));

function Section({ id, title, subtitle, dark, children }: {
  id: string; title: string; subtitle?: string; dark?: boolean; children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-16 py-16 md:py-24 ${dark ? 'bg-black' : 'gradient-sand'}`}>
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className={`mb-2 text-3xl font-bold md:text-5xl ${dark ? 'text-white' : 'text-black'}`}>{title}</h2>
          {subtitle && <p className={`mb-10 max-w-2xl ${dark ? 'text-white/60' : 'text-black/60'}`}>{subtitle}</p>}
        </ScrollReveal>
        {children}
      </div>
    </section>
  );
}

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

  if (isLoading) return <PageShell><PageLoader /></PageShell>;
  if (!crew) return <NotFound />;

  const cover = mediaUrl(crew.cover_path);
  const live = isLive(crew.last_fix_at);

  return (
    <PageShell padTop={false}>
      <Seo title={crew.name} description={crew.tagline ?? `Suivez l'équipage ${crew.name} en direct sur le 4L Trophy.`} />

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-black pb-10 pt-28 md:pb-14 md:pt-36">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="container relative mx-auto flex flex-col gap-6 px-4 md:flex-row md:items-end">
          <CrewAvatar name={crew.name} path={crew.avatar_path} className="h-24 w-24 text-3xl ring-4 ring-black md:h-32 md:w-32" />
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              {crew.car_number && <span className="rounded-md bg-primary px-2 py-1 font-mono text-sm font-bold text-white">#{crew.car_number}</span>}
              <LiveBadge lastFixAt={crew.last_fix_at} />
              {!live && crew.last_fix_at && <span className="text-sm text-white/50">Dernière position {formatRelative(crew.last_fix_at)}</span>}
              {!crew.is_public && <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/70">🔒 Page privée</span>}
            </div>
            <h1 className="text-4xl font-bold text-white md:text-6xl">{crew.name}</h1>
            {crew.tagline && <p className="mt-2 text-lg text-white/80">{crew.tagline}</p>}
            {(crew.school || crew.city) && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/50">
                <MapPin className="h-4 w-4" /> {[crew.school, crew.city].filter(Boolean).join(' · ')}
              </p>
            )}
            {members.length > 0 && (
              <p className="mt-1 text-sm text-white/50">Équipage : {members.map((m) => m.display_name).join(' & ')}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <FollowButton crewId={crew.id} slug={crew.slug} count={crew.followers_count} />
            <ShareButton title={crew.name} className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" />
            {canEdit && (
              <Button asChild variant="secondary">
                <Link to={`/mon-compte/equipages/${crew.slug}`}><Settings className="mr-2 h-4 w-4" />Gérer</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Carte ────────────────────────────────────────────────────────── */}
      <Section id="carte" title="Live tracking" subtitle="Position en temps réel et trace complète depuis le départ.">
        <Suspense fallback={<div className="h-[560px] animate-pulse rounded-2xl bg-black/10" />}>
          <CrewMap crew={crew} points={points} waypoints={event?.waypoints ?? []} sponsors={sponsors} />
        </Suspense>
      </Section>

      {/* ── Statistiques ─────────────────────────────────────────────────── */}
      <Section id="stats" title="Statistiques" subtitle="Mises à jour automatiquement à chaque nouvelle position." dark>
        <CrewStats stats={stats} startDate={event?.startDate ?? null} />
      </Section>

      {/* ── La route ─────────────────────────────────────────────────────── */}
      {event && event.waypoints.length > 1 && (
        <Section id="route" title="La route" subtitle={`De ${event.waypoints[0]!.name} à ${event.waypoints.at(-1)!.name}`}>
          <CrewRoadTimeline waypoints={event.waypoints} distanceKm={stats?.total_distance_km ?? 0} />
        </Section>
      )}

      {/* ── Histoire ─────────────────────────────────────────────────────── */}
      {crew.story && (
        <Section id="histoire" title="Notre aventure" dark>
          <div className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-white/80">{crew.story}</div>
        </Section>
      )}

      {/* ── Photos ───────────────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <Section id="photos" title="Photos & 360°" subtitle="Cliquez pour agrandir. Les photos 360° se parcourent en glissant.">
          <CrewGallery photos={photos} />
        </Section>
      )}

      {/* ── Sponsors ─────────────────────────────────────────────────────── */}
      {sponsors.length > 0 && (
        <Section id="sponsors" title="Nos sponsors" subtitle="Merci à eux : sans eux, pas d'aventure !" dark>
          <CrewSponsors sponsors={sponsors} />
        </Section>
      )}

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      {(crew.contact_email || crew.instagram_url || crew.website_url) && (
        <section className="bg-[hsl(var(--background))] py-12">
          <div className="container mx-auto flex flex-wrap justify-center gap-3 px-4">
            {crew.contact_email && (
              <Button asChild variant="secondary"><a href={`mailto:${crew.contact_email}`}><Mail className="mr-2 h-4 w-4" />Contacter l'équipage</a></Button>
            )}
            {crew.instagram_url && (
              <Button asChild variant="secondary"><a href={crew.instagram_url} target="_blank" rel="noopener noreferrer"><Instagram className="mr-2 h-4 w-4" />Instagram</a></Button>
            )}
            {crew.website_url && (
              <Button asChild variant="secondary"><a href={crew.website_url} target="_blank" rel="noopener noreferrer"><Globe className="mr-2 h-4 w-4" />Site web</a></Button>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
