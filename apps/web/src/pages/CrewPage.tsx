/**
 * Page publique d'un road trip, /road-trip/:slug (privée par lien par défaut). Pensée d'abord pour le téléphone,
 * comme une appli plutôt qu'une longue liste :
 *   1. l'identité du voyage, en compact (couverture, titre, statut, voyageurs) ;
 *   2. la carte en grand, avec les chiffres clés collés dessous (téléphone) ou le tableau de bord à côté (ordinateur) ;
 *   3. des onglets : En direct (téléphone) · Photos · Carnet · Revivre (replay 3D, relief) · Soutenir ; ouvert par
 *      défaut sur les photos, ou sur « Soutenir » s'il n'y en a pas.
 * Les liens « #carnet » et « #photos » (e-mails du soir, bulles de la carte) ouvrent le bon onglet.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clapperboard, Settings } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { FacebookIcon, InstagramIcon } from '@/components/common/SocialIcons';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { CrewAvatar, FollowButton } from '@/components/crew/CrewBits';
import { CrewGallery } from '@/components/crew/CrewGallery';
import { CrewLogbook } from '@/components/crew/CrewLogbook';
import { CrewShareButton } from '@/components/crew/CrewQr';
import { dashboardTiles, KeyStats, PlaceCard, TripDashboard } from '@/components/crew/TripDashboard';
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
  { id: 'wide', title: 'Paysage 16:9', text: 'YouTube, un écran, un diaporama' },
  { id: 'story', title: 'Story 9:16', text: 'Instagram, TikTok, WhatsApp' },
  { id: 'square', title: 'Carré 1:1', text: 'publication Instagram, Facebook' },
];

type Tab = 'direct' | 'carnet' | 'photos' | 'revivre' | 'soutenir';

/** « Léa, Sam & Noé » */
const joinNames = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`);
const longDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const daysBetween = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 864e5);

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[0.7647rem]', className)}>{children}</span>;
}

/** Vrai sur ordinateur (le tableau de bord est alors à côté de la carte, pas dans un onglet). */
function useWide() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
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
  const wide = useWide();
  const [tab, setTab] = useState<Tab | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
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

  // Onglets disponibles (un onglet vide n'est pas proposé).
  const hasLogbook = stages.length > 0 || published.length > 0 || !!crew?.story;
  const canReplay = points.length >= 20;
  const tabs = ([
    !wide && { id: 'direct', label: 'En direct' },
    photos.length > 0 && { id: 'photos', label: 'Photos', count: photos.length },
    { id: 'carnet', label: 'Carnet', count: published.length || undefined },
    (canReplay || profile) && { id: 'revivre', label: 'Revivre' },
    { id: 'soutenir', label: 'Soutenir' },
  ].filter(Boolean) as { id: Tab; label: string; count?: number }[]);
  // Onglet ouvert par défaut : les photos (ce que les proches regardent d'abord), sinon « Soutenir ».
  const fallback: Tab = photos.length > 0 ? 'photos' : 'soutenir';
  const current: Tab = tab && tabs.some((t) => t.id === tab) ? tab : fallback;

  /** Ouvre un onglet ; si la barre d'onglets est collée en haut, on remonte au début du contenu. */
  const open = (t: Tab, scroll = false) => {
    setTab(t);
    const bar = tabsRef.current;
    if (bar && (scroll || bar.getBoundingClientRect().top < 80)) bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // « #carnet », « #photos » : depuis les e-mails du soir et les bulles de la carte.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (h === 'carnet' || h === 'photos' || h === 'soutenir' || h === 'revivre') open(h, true);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!crew]);

  if (isLoading) return <PageShell><PageLoader /></PageShell>;
  if (!crew) return <NotFound />;

  const cover = mediaUrl(crew.cover_path);
  const live = isLive(crew.last_fix_at);
  const offline = !live && !!crew.last_fix_at && crew.tracking_enabled;
  const notStarted = !crew.last_fix_at;
  const { day, total } = tripDay(crew, firstFix);
  const names = members.map((m) => m.display_name).filter(Boolean);
  const until = crew.starts_on ? daysBetween(crew.starts_on) : null;
  const visibility = !crew.is_public ? 'voyageurs seulement' : crew.is_listed ? 'public' : 'privé · par lien';
  const [titleFrom, titleTo] = crew.name.includes('→') ? crew.name.split('→').map((x) => x.trim()) : [crew.name, null];
  const route = crew.city && crew.destination && !crew.name.includes('→') ? `${crew.city} → ${crew.destination}` : null;
  const tiles = dashboardTiles(crew, stats, telemetry, profile, day, total);

  const headerActions = (
    <>
      {canEdit && (
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link to={`/mon-compte/road-trips/${crew.slug}`}><Settings />Gérer</Link>
        </Button>
      )}
      <FollowButton quiet crewId={crew.id} slug={crew.slug} className="min-h-10 px-4 text-[0.9412rem]" />
      <CrewShareButton crew={crew} variant="default" className="min-h-10 px-4 text-[0.9412rem]" />
    </>
  );

  const status = (
    <>
      {live && (
        <Pill className="bg-live/[0.18] text-live-text backdrop-blur-md">
          <span className="relative h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-live" /><span className="absolute inset-0 rounded-full bg-live" /></span>
          en direct · {formatRelative(crew.last_fix_at)}
        </Pill>
      )}
      {offline && (
        <Pill className="bg-gold/[0.18] text-gold-text backdrop-blur-md">
          <span className="h-2 w-2 rounded-full border-2 border-gold" />hors réseau · {formatRelative(crew.last_fix_at)}
        </Pill>
      )}
      {notStarted && (
        <Pill className="bg-ink/70 text-dust-100 backdrop-blur-md">{until != null && until > 0 ? `départ dans ${until} jour${until > 1 ? 's' : ''}` : 'pas encore parti'}</Pill>
      )}
      <Pill className="bg-cream text-ink">{visibility}</Pill>
      {crew.car_number && <Pill className="bg-signal font-bold text-white">#{crew.car_number}</Pill>}
      {crew.is_demo && <Pill className="border-[1.5px] border-gold/60 bg-ink/50 text-gold-text">road trip d’exemple</Pill>}
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

      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-3 pb-16 pt-3 sm:px-5 lg:gap-4 lg:pt-5">
        {/* ── Identité du voyage ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[24px] border-[1.5px] border-cream/[0.08]">
          {cover ? (
            <>
              <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${crew.cover_focus_x}% ${crew.cover_focus_y}%` }} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,19,22,.1)_0%,rgba(18,19,22,.55)_45%,rgba(18,19,22,.94)_100%)]" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_85%_0%,#4A2A15_0%,#22170F_55%,#16130F_100%)]">
              <div className="h-full w-full bg-[url('/fonds/montagnes.svg')] bg-cover bg-center opacity-90" />
            </div>
          )}
          <div className="relative flex flex-col gap-3 px-4 pb-4 pt-[clamp(4.5rem,13vw,9rem)] sm:px-6 sm:pb-5">
            <div className="flex flex-wrap gap-1.5">{status}</div>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="flex min-w-0 items-end gap-3.5">
                {crew.avatar_path && (
                  <CrewAvatar name={crew.name} path={crew.avatar_path} className="h-14 w-14 rounded-[16px] border-2 border-cream/20 text-xl sm:h-20 sm:w-20 sm:text-3xl" />
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <h1 className="tt-display m-0 break-words text-[clamp(1.9rem,4.2vw,3.6rem)] leading-[0.95] text-cream">
                    {titleTo ? <>{titleFrom} → <span className="text-signal">{titleTo}</span></> : crew.name}
                  </h1>
                  {(route || crew.tagline || crew.school) && (
                    <p className="m-0 max-w-[44rem] text-[0.9412rem] leading-snug text-dust-200 sm:text-[1rem]">{[route, crew.tagline, crew.school].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              </div>
              {names.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <div className="flex">
                    {names.slice(0, 5).map((n, i) => (
                      <span key={i} className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink text-[0.8235rem] font-bold', i > 0 && '-ml-2', AVATARS[i % 4])}>
                        {(n[0] ?? '?').toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <span className="text-[0.8824rem] text-dust-200">
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
          </div>
        </section>

        {/* ── Pas de réseau, c'est normal ────────────────────────────────── */}
        {offline && (
          <div role="status" className="flex items-start gap-3.5 rounded-[20px] bg-cream px-4 py-3.5 text-ink">
            <span className="mt-0.5 h-8 w-8 flex-none rounded-full border-[2.5px] border-dashed border-ink" aria-hidden="true" />
            <p className="m-0 text-[0.9412rem] leading-snug">
              <b>Pas de réseau, c’est normal.</b> Le téléphone garde la trace en mémoire et l’enverra dès qu’il capte. Dernière position
              {place ? ` près de ${place}` : ''}, {formatRelative(crew.last_fix_at)}. En cas de doute, contacte directement les voyageurs.
            </p>
          </div>
        )}

        {/* ── Carte + chiffres ───────────────────────────────────────────── */}
        <section id="carte" className="grid scroll-mt-20 gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(20rem,1fr)] lg:gap-4">
          <div className="flex flex-col overflow-hidden rounded-[24px] border-[1.5px] border-cream/[0.1] lg:border-0">
            <Suspense fallback={<div className="h-[56svh] min-h-[20rem] animate-pulse bg-ink-800 lg:h-[40rem] lg:rounded-[24px]" />}>
              <TripMap
                crew={crew}
                points={points}
                stages={stages}
                sponsors={sponsors}
                photos={photos}
                className="h-[56svh] min-h-[20rem] rounded-none border-0 lg:h-[40rem] lg:rounded-[24px] lg:border-[1.5px] lg:border-cream/[0.1]"
                overlay={<PlaceCard crew={crew} place={place} day={day} />}
              />
            </Suspense>
            <KeyStats tiles={tiles} className="lg:hidden" />
          </div>
          {wide && (
            <aside className="flex max-h-[40rem] flex-col gap-3 overflow-y-auto pr-1">
              <TripDashboard crew={crew} stats={stats} telemetry={telemetry} profile={profile} day={day} total={total} place={place} />
            </aside>
          )}
        </section>
        {!offline && !live && !notStarted && (
          <p className="m-0 px-1 text-[0.8235rem] text-dust-400">
            Pas de nouvelle position ? Souvent, il n’y a simplement pas de réseau : la trace se complète dès que le téléphone capte.
          </p>
        )}

        {/* ── Onglets ────────────────────────────────────────────────────── */}
        <div ref={tabsRef} className="sticky top-[3.6rem] z-[500] -mx-3 scroll-mt-[3.6rem] px-3 py-2 sm:-mx-5 sm:px-5">
          <div role="tablist" aria-label="Le road trip" className="tt-glass flex gap-1 overflow-x-auto rounded-full border-[1.5px] border-cream/[0.08] p-1 [scrollbar-width:none]">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`onglet-${t.id}`}
                aria-selected={current === t.id}
                aria-controls={`panneau-${t.id}`}
                onClick={() => open(t.id)}
                className={cn(
                  'flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[0.9412rem] font-bold transition-colors',
                  current === t.id ? 'bg-cream text-ink' : 'text-dust-200 hover:text-white',
                )}
              >
                {t.label}
                {t.count != null && <span className={cn('font-mono text-[0.7059rem] font-normal', current === t.id ? 'text-dust-700' : 'text-dust-400')}>{t.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <section id={`panneau-${current}`} role="tabpanel" aria-labelledby={`onglet-${current}`} className="min-h-[50svh]">
          {current === 'direct' && (
            <div className="flex flex-col gap-3">
              <TripDashboard crew={crew} stats={stats} telemetry={telemetry} profile={profile} day={day} total={total} place={place} withoutKeyStats />
              {canReplay && (
                <button type="button" onClick={() => open('revivre')} className="flex items-center justify-between gap-3 rounded-[20px] border-[1.5px] border-signal/35 bg-[linear-gradient(100deg,#2A1416_0%,#1F2026_70%)] px-4 py-3.5 text-left">
                  <span className="flex flex-col"><span className="font-bold text-cream">Revivre le voyage en 3D</span><span className="text-[0.8235rem] text-dust-300">replay en survol, exportable en vidéo</span></span>
                  <Clapperboard className="h-5 w-5 flex-none text-signal-text" />
                </button>
              )}
            </div>
          )}

          {current === 'carnet' && (
            <div id="carnet" className="max-w-[48rem]">
              {hasLogbook ? (
                <CrewLogbook stages={stages} photos={photos} journal={published} story={crew.story} points={points} startDate={startDate} />
              ) : (
                <p className="tt-glass m-0 rounded-[20px] px-5 py-6 text-dust-300">Le carnet de route se remplira au fil du voyage : étapes, nuits, coups de cœur et pages du journal.</p>
              )}
            </div>
          )}

          {current === 'photos' && (
            <div id="photos"><CrewGallery photos={photos} /></div>
          )}

          {current === 'revivre' && (
            <div className="flex flex-col gap-4">
              {canReplay && (
                <div className="flex flex-col gap-4 rounded-[24px] border-[1.5px] border-signal/35 bg-[linear-gradient(100deg,#2A1416_0%,#1F2026_60%)] p-5 sm:p-6">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[0.7647rem] text-signal-text">revivre en 3D</span>
                    <span className="tt-display text-[1.6rem] leading-[1.05] text-cream">Tout le voyage en survol satellite.</span>
                    <span className="text-[0.9412rem] text-dust-300">Exportable en vidéo, en paysage, en story ou en carré, avec la trace et les étapes.</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Button onClick={() => setReplay('wide')}><Clapperboard />Lancer le replay</Button>
                    <Button variant="outline" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen}>Exporter en vidéo</Button>
                  </div>
                  {exportOpen && (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2">
                      {FORMATS.map((f) => (
                        <button key={f.id} type="button" onClick={() => setReplay(f.id)} className="flex flex-col gap-1 rounded-[18px] bg-ink-700 px-4 py-3 text-left text-cream hover:bg-cream hover:text-ink">
                          <span className="text-[0.9412rem] font-bold">{f.title}</span>
                          <span className="font-mono text-[0.7059rem] opacity-80">{f.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {replay && (
                <Suspense fallback={null}>
                  <TripReplay name={crew.name} slug={crew.slug} points={points} stages={stages} initialFormat={replay} onClose={() => setReplay(null)} />
                </Suspense>
              )}
              {profile && (
                <div className="rounded-[24px] bg-cream p-5 text-ink sm:p-6">
                  <h2 className="tt-display m-0 mb-4 text-[1.5rem]">Le relief, jour par jour</h2>
                  <Suspense fallback={<div className="h-[15rem] animate-pulse rounded-2xl bg-sand" />}>
                    <CrewElevation profile={profile} />
                  </Suspense>
                </div>
              )}
            </div>
          )}

          {current === 'soutenir' && (
            <TripSupport
              fundraiserUrl={crew.fundraiser_url}
              sponsors={sponsors}
              contactEmail={crew.contact_email}
              wall={<CheersWall crewId={crew.id} canEdit={canEdit} isDemo={crew.is_demo} />}
            />
          )}
        </section>
      </div>
    </PageShell>
  );
}
