/**
 * Page publique d'un road trip, /t/:slug (privée par lien par défaut) :
 * en-tête (statut, visibilité, voyageurs), bandeau « pas de réseau, c'est normal », carte + tableau de bord,
 * « Revivre en 3D », carnet de route et photos, puis « Soutenir » (cagnotte, sponsors, encouragements).
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clapperboard, Settings } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { FacebookIcon, InstagramIcon } from '@/components/common/SocialIcons';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { FollowButton } from '@/components/crew/CrewBits';
import { CrewGallery } from '@/components/crew/CrewGallery';
import { CrewLogbook } from '@/components/crew/CrewLogbook';
import { CrewShareButton } from '@/components/crew/CrewQr';
import { PlaceCard, TripDashboard } from '@/components/crew/TripDashboard';
import { tripDay, usePlaceName, useTelemetry } from '@/hooks/useTrip';
import { TripSupport } from '@/components/crew/TripSupport';
import { CheersWall } from '@/components/crew/CheersWall';
import { supabase } from '@/lib/supabase';
import type { ReplayFormat } from '@/components/crew/TripReplay';
import { useCrew, useCrewMembers, useCrewStats, useJournal, useMyRole, usePhotos, useSponsors, useStages } from '@/hooks/queries';
import { useLiveTrack } from '@/hooks/useLiveTrack';
import { formatRelative, isLive } from '@/lib/format';
import { localDate } from '@/lib/days';
import { altitudeProfile } from '@/lib/elevation';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

const TripMap = lazy(() => import('@/components/crew/TripMap').then((m) => ({ default: m.TripMap })));
const TripReplay = lazy(() => import('@/components/crew/TripReplay'));
const CrewElevation = lazy(() => import('@/components/crew/CrewElevation').then((m) => ({ default: m.CrewElevation })));

const AVATARS = ['bg-signal text-white', 'bg-cream text-ink', 'bg-ink-700 text-cream', 'bg-dust-600 text-cream'];
const FORMATS: { id: ReplayFormat; title: string; text: string }[] = [
  { id: 'wide', title: 'Paysage 16:9', text: 'pour YouTube, un écran, un diaporama' },
  { id: 'story', title: 'Story 9:16', text: 'Instagram, TikTok, WhatsApp' },
  { id: 'square', title: 'Carré 1:1', text: 'publication Instagram, Facebook' },
];

/** « Léa, Sam & Noé » */
const joinNames = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`);
const longDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const daysBetween = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 864e5);

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('flex items-center gap-2 rounded-full px-[13px] py-[7px] font-mono text-[14px]', className)}>{children}</span>;
}

export default function CrewPage() {
  const { slug } = useParams();
  const { data: crew, isLoading } = useCrew(slug);
  const { data: stats } = useCrewStats(crew?.id);
  const { data: photos = [] } = usePhotos(crew?.id);
  const { data: sponsors = [] } = useSponsors(crew?.id);
  const { data: stages = [] } = useStages(crew?.id);
  const { data: journal = [] } = useJournal(crew?.id);
  const { data: members = [] } = useCrewMembers(crew?.id);
  const { canEdit } = useMyRole(crew?.id);
  const { points } = useLiveTrack(crew);
  const [replay, setReplay] = useState<ReplayFormat | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const published = journal.filter((j) => j.published);
  // Jour 1 du road trip = date de départ prévue, sinon jour du premier point de la trace.
  const firstFix = points[0]?.[2] ?? null;
  const startDate = crew?.starts_on ?? (firstFix != null ? localDate(firstFix) : null);
  const profile = useMemo(() => altitudeProfile(points, startDate), [points, startDate]);
  const { data: telemetry } = useTelemetry(crew ?? undefined);
  const place = usePlaceName(crew?.last_lat, crew?.last_lon);

  // Une visite par navigateur et par jour, anonyme (rapport aux sponsors) ; les voyageurs ne sont pas comptés.
  const crewId = crew?.id;
  useEffect(() => {
    if (!crewId || canEdit) return;
    const key = `tt-vue-${crewId}-${new Date().toISOString().slice(0, 10)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* stockage indisponible : on compte quand même */ }
    void supabase.rpc('count_page_view', { p_crew: crewId }).then(() => {});
  }, [crewId, canEdit]);

  if (isLoading) return <PageShell><PageLoader /></PageShell>;
  if (!crew) return <NotFound />;

  const cover = mediaUrl(crew.cover_path);
  const live = isLive(crew.last_fix_at);
  const offline = !live && !!crew.last_fix_at && crew.tracking_enabled;
  const notStarted = !crew.last_fix_at;
  const { day, total } = tripDay(crew, firstFix);
  const names = members.map((m) => m.display_name).filter(Boolean);
  const until = crew.starts_on ? daysBetween(crew.starts_on) : null;
  const visibility = !crew.is_public ? 'privé · voyageurs seulement' : crew.is_listed ? 'public' : 'privé · accès par lien';
  const [titleFrom, titleTo] = crew.name.includes('→') ? crew.name.split('→').map((x) => x.trim()) : [crew.name, null];
  const route = crew.city && crew.destination && !crew.name.includes('→') ? `${crew.city} → ${crew.destination}` : null;

  const headerActions = (
    <>
      {canEdit && (
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link to={`/mon-compte/road-trips/${crew.slug}`}><Settings />Gérer</Link>
        </Button>
      )}
      <FollowButton quiet crewId={crew.id} slug={crew.slug} className="min-h-11 px-[18px] text-[16px]" />
      <CrewShareButton crew={crew} variant="default" className="min-h-11 px-[18px] text-[16px]" />
    </>
  );

  return (
    <PageShell headerActions={headerActions}>
      <Seo
        title={crew.name}
        description={crew.tagline ?? `Suis le road trip ${crew.name} en direct.`}
        image={cover ?? mediaUrl(crew.avatar_path)}
        noindex={!crew.is_listed}
      />

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <section className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-5 pb-5 pt-7">
        <div className="flex flex-wrap gap-2">
          {live && (
            <Pill className="bg-live/[0.16] text-live-text">
              <span className="relative h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-live" /><span className="absolute inset-0 rounded-full bg-live" /></span>
              en direct · {formatRelative(crew.last_fix_at)}
            </Pill>
          )}
          {offline && (
            <Pill className="bg-gold/[0.16] text-gold-text">
              <span className="h-2 w-2 rounded-full border-2 border-gold" />hors réseau · dernier signal {formatRelative(crew.last_fix_at)}
            </Pill>
          )}
          {notStarted && (
            <Pill className="bg-ink-800 text-dust-200">{until != null && until > 0 ? `départ dans ${until} jour${until > 1 ? 's' : ''}` : 'pas encore parti'}</Pill>
          )}
          <Pill className="bg-cream text-ink">{visibility}</Pill>
          <Pill className="border-[1.5px] border-ink-700 py-1.5 text-dust-300">1 véhicule · {Math.max(1, members.length)} voyageur{members.length > 1 ? 's' : ''}</Pill>
          {crew.is_demo && <Pill className="border-[1.5px] border-gold/60 py-1.5 text-gold-text">road trip d’exemple</Pill>}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="tt-display m-0 break-words text-[clamp(44px,6vw,92px)] leading-[0.95] text-cream">
              {titleTo ? <>{titleFrom} → <span className="text-signal">{titleTo}</span></> : crew.name}
            </h1>
            {(route || crew.tagline) && <p className="m-0 max-w-[720px] text-[19px] leading-snug text-dust-200">{[route, crew.tagline].filter(Boolean).join(' · ')}</p>}
          </div>
          {names.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex">
                {names.slice(0, 5).map((n, i) => (
                  <span key={i} className={cn('flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink font-bold', i > 0 && '-ml-2.5', AVATARS[i % 4])}>
                    {(n[0] ?? '?').toUpperCase()}
                  </span>
                ))}
              </div>
              <span className="text-[16px] text-dust-300">
                {joinNames(names)}{startDate && !notStarted ? ` · depuis le ${longDate(startDate)}` : ''}
              </span>
            </div>
          )}
        </div>
        {(crew.instagram_url || crew.facebook_url) && (
          <div className="flex flex-wrap gap-2">
            {crew.instagram_url && <Button asChild variant="outline" size="sm"><a href={crew.instagram_url} target="_blank" rel="noopener noreferrer"><InstagramIcon />Instagram</a></Button>}
            {crew.facebook_url && <Button asChild variant="outline" size="sm"><a href={crew.facebook_url} target="_blank" rel="noopener noreferrer"><FacebookIcon />Facebook</a></Button>}
          </div>
        )}
      </section>

      {/* ── Pas de réseau, c'est normal ──────────────────────────────────── */}
      {offline && (
        <section className="mx-auto max-w-[1440px] px-5 pb-4">
          <div role="status" className="flex items-start gap-4 rounded-[24px] bg-cream px-[22px] py-5 text-ink">
            <span className="h-11 w-11 flex-none rounded-full border-[2.5px] border-dashed border-ink" aria-hidden="true" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[20px] font-bold">Pas de réseau, c’est normal.</span>
              <span className="text-[17px] leading-normal text-dust-800">
                Les voyageurs traversent sans doute une zone sans couverture, ou le téléphone est éteint pour la nuit. Il garde la trace en
                mémoire et l’enverra dès qu’il capte. Dernière position{place ? ` : près de ${place}` : ''}, {formatRelative(crew.last_fix_at)}.
                En cas de doute, contacte directement les voyageurs.
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── Carte + tableau de bord ──────────────────────────────────────── */}
      <section id="carte" className="mx-auto grid max-w-[1440px] scroll-mt-20 gap-4 px-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        <Suspense fallback={<div className="h-[62vh] animate-pulse rounded-[28px] bg-ink-800 lg:h-[640px]" />}>
          <TripMap
            crew={crew}
            points={points}
            stages={stages}
            sponsors={sponsors}
            photos={photos}
            className="h-[62vh] min-h-[420px] lg:h-[640px]"
            overlay={<PlaceCard crew={crew} place={place} day={day} />}
          />
        </Suspense>
        <TripDashboard crew={crew} stats={stats} telemetry={telemetry} profile={profile} day={day} total={total} place={place} />
      </section>
      {!offline && !live && !notStarted && (
        <p className="mx-auto mb-0 mt-3 max-w-[1440px] px-5 text-[15px] text-dust-400">
          Pas de nouvelle position ? Souvent, il n’y a simplement pas de réseau : la trace se complète dès que le téléphone capte.
        </p>
      )}

      {/* ── Revivre en 3D ────────────────────────────────────────────────── */}
      {points.length >= 20 && (
        <section className="mx-auto max-w-[1440px] px-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border-[1.5px] border-signal/35 bg-[linear-gradient(100deg,#2A1416_0%,#1F2026_60%)] px-6 py-[22px]">
            <div className="flex max-w-[560px] flex-col gap-1.5">
              <span className="font-mono text-[13px] text-signal-text">revivre en 3D</span>
              <span className="tt-display text-[30px] leading-[1.05] text-cream">Rejoue tout le voyage en survol satellite.</span>
              <span className="text-[16px] text-dust-300">Exportable en vidéo, en paysage, en story ou en carré, avec la trace et les étapes.</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={() => setReplay('wide')}><Clapperboard />Lancer le replay</Button>
              <Button variant="outline" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen}>Exporter en vidéo</Button>
            </div>
            {exportOpen && (
              <div className="grid flex-[1_1_100%] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
                {FORMATS.map((f) => (
                  <button key={f.id} type="button" onClick={() => setReplay(f.id)} className="flex flex-col gap-1 rounded-[18px] bg-ink-700 px-4 py-3.5 text-left text-cream hover:bg-cream hover:text-ink">
                    <span className="text-[16px] font-bold">{f.title}</span>
                    <span className="font-mono text-[13px] opacity-80">{f.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {replay && (
            <Suspense fallback={null}>
              <TripReplay name={crew.name} slug={crew.slug} points={points} stages={stages} initialFormat={replay} onClose={() => setReplay(null)} />
            </Suspense>
          )}
        </section>
      )}

      {/* ── Carnet de route + photos ─────────────────────────────────────── */}
      {(stages.length > 0 || published.length > 0 || crew.story || photos.length > 0) && (
        <section className="mx-auto grid max-w-[1440px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-8 px-5 pt-9">
          {(stages.length > 0 || published.length > 0 || crew.story) && (
            <div id="carnet" className="scroll-mt-24">
              <CrewLogbook stages={stages} photos={photos} journal={published} story={crew.story} points={points} startDate={startDate} />
            </div>
          )}
          {photos.length > 0 && (
            <div id="photos" className="flex scroll-mt-24 flex-col gap-4">
              <CrewGallery photos={photos} />
            </div>
          )}
        </section>
      )}

      {/* ── Relief jour par jour ─────────────────────────────────────────── */}
      {profile && (
        <section id="relief" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pt-9">
          <details className="group rounded-[28px] bg-cream p-5 text-ink sm:p-7">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="tt-display text-[28px]">Le relief, jour par jour</span>
              <span className="font-mono text-[14px] text-dust-700 group-open:hidden">ouvrir +</span>
              <span className="hidden font-mono text-[14px] text-dust-700 group-open:inline">fermer −</span>
            </summary>
            <div className="mt-5">
              <Suspense fallback={<div className="h-[260px] animate-pulse rounded-2xl bg-sand" />}>
                <CrewElevation profile={profile} />
              </Suspense>
            </div>
          </details>
        </section>
      )}

      {/* ── Soutenir ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1440px] px-5 pb-[72px] pt-9">
        <TripSupport
          fundraiserUrl={crew.fundraiser_url}
          sponsors={sponsors}
          contactEmail={crew.contact_email}
          wall={<CheersWall crewId={crew.id} canEdit={canEdit} isDemo={crew.is_demo} />}
        />
      </div>
    </PageShell>
  );
}
