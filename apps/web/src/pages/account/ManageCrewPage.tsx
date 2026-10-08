/**
 * Espace voyageur d'un road trip : tableau de bord, guide « Prêt au départ », carnet de route, photos,
 * partage et réglages. La section est dans l'adresse (?onglet=…, ?etape=… pour le guide) : les e-mails
 * et les autres pages peuvent y mener directement (ex. ?onglet=gps → guide, étape « Suivi GPS »).
 */
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { TravellerShell } from '@/components/layout/TravellerShell';
import { tripStatus, type Section } from '@/lib/traveller';
import { ProgressRing, SharePanel, TripGuide } from '@/components/manage/TripGuide';
import { useGuide, type GuideStepId } from '@/hooks/useGuide';
import { InfoTab } from '@/components/manage/InfoTab';
import { PhotosTab } from '@/components/manage/PhotosTab';
import { DangerTab } from '@/components/manage/DangerTab';
import { StagesTab } from '@/components/manage/StagesTab';
import { JournalTab } from '@/components/manage/JournalTab';
import { CrewShareButton } from '@/components/crew/CrewQr';
import { keys, useCrew, useCrewStats, useMyCrews, useMyRole, usePhotos, useStages } from '@/hooks/queries';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatNumber, formatRelative, isLive } from '@/lib/format';
import { lastDays, useVisibility } from '@/hooks/useTrip';

const GUIDE_STEPS: GuideStepId[] = ['voyage', 'equipage', 'vehicule', 'itineraire', 'gps', 'partage', 'sponsors', 'checklist'];
/** Anciennes adresses (onglets d'avant la refonte, liens des e-mails) → section et étape. */
const LEGACY: Record<string, [Section, GuideStepId?]> = {
  infos: ['reglages'], suppression: ['reglages'], etapes: ['carnet'], journal: ['carnet'], qr: ['partage'],
  gps: ['guide', 'gps'], sponsors: ['guide', 'sponsors'], membres: ['guide', 'equipage'],
};

function Overview({ crew, onGo }: { crew: Crew; onGo: (s: Section, step?: GuideStepId) => void }) {
  const queryClient = useQueryClient();
  const { data: stats } = useCrewStats(crew.id);
  const { data: photos = [] } = usePhotos(crew.id);
  const { data: stages = [] } = useStages(crew.id);
  const g = useGuide(crew);
  const { data: vis } = useVisibility(crew.id);
  const days = lastDays(vis?.days ?? []);
  const maxDay = Math.max(1, ...days.map((d) => d.views));
  const live = isLive(crew.last_fix_at);
  const next = g.steps.find((s) => s.items.some((i) => !i.done));
  const stop = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('set_tracking', { p_crew: crew.id, p_enabled: false })),
    onSuccess: () => { toast.success('Suivi arrêté : ta position n’est plus publiée.'); void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) }); },
    onError: toastError,
  });
  const tiles = [
    { l: 'distance', v: formatNumber(stats?.total_distance_km ?? crew.total_distance_m / 1000), u: 'km' },
    { l: 'proches abonnés', v: formatNumber(stats?.followers_count ?? crew.followers_count) },
    { l: 'photos', v: String(photos.length) },
    { l: 'étapes', v: String(stages.length) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[14px] text-dust-400">tableau de bord · {tripStatus(crew)}</span>
          <h1 className="tt-display m-0 break-words text-[clamp(36px,5vw,64px)] leading-[1.02] text-cream">{crew.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <CrewShareButton crew={crew} />
          <Button asChild><Link to={`/t/${crew.slug}`}>Voir ma page <ExternalLink /></Link></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`flex flex-col gap-3 rounded-[28px] p-6 ${crew.tracking_enabled ? 'bg-ink-800' : 'bg-signal text-white'}`}>
          <span className="font-mono text-[13px] opacity-90">suivi GPS</span>
          {crew.tracking_enabled ? (
            <>
              <span className="tt-display text-[30px] leading-none text-cream">{live ? 'En direct.' : 'Suivi lancé.'}</span>
              <span className="text-[16px] text-dust-300">
                {crew.last_fix_at ? `Dernière position ${formatRelative(crew.last_fix_at)}.` : 'Aucune position reçue pour l’instant.'}
                {!live && crew.last_fix_at ? ' Sans réseau, c’est normal : le téléphone enverra tout dès qu’il capte.' : ''}
              </span>
              <Button variant="outline" size="sm" className="self-start" disabled={stop.isPending}
                onClick={() => { if (confirm('Arrêter le suivi ? Ta position ne sera plus publiée (tu pourras le relancer).')) stop.mutate(); }}>
                Arrêter le suivi
              </Button>
            </>
          ) : (
            <>
              <span className="tt-display text-[30px] leading-none">Pas encore parti.</span>
              <span className="text-[16px]">Le jour J, appuie sur « Je pars » à la fin du guide : ta position apparaîtra en direct.</span>
              <Button variant="secondary" size="sm" className="self-start" onClick={() => onGo('guide', 'checklist')}>Aller à « Je pars »</Button>
            </>
          )}
        </div>
        <button type="button" onClick={() => onGo('guide', next?.id)} className="flex items-center gap-4 rounded-[28px] bg-ink-800 p-6 text-left hover:bg-ink-700">
          <ProgressRing value={g.total ? g.done / g.total : 0} />
          <span className="flex flex-col gap-1">
            <span className="text-[19px] font-bold text-cream">Prêt au départ</span>
            <span className="text-[15px] text-dust-300">{next ? `Prochaine étape : ${next.label.toLowerCase()}` : 'Tout est prêt, bonne route !'}</span>
            <span className="text-[15px] font-bold text-signal-text">Continuer le guide →</span>
          </span>
        </button>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-2 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.l} className="flex flex-col gap-1 rounded-[20px] bg-ink-800 px-4 py-3.5">
            <dt className="font-mono text-[12px] uppercase tracking-[0.1em] text-dust-400">{t.l}</dt>
            <dd className="m-0 font-mono text-[26px] text-cream">{t.v}{t.u && <span className="text-[14px] text-dust-400"> {t.u}</span>}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-4 rounded-[28px] bg-ink-800 p-6" aria-label="Visibilité pour les sponsors">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[13px] text-dust-400">visibilité · pour tes sponsors</span>
            <span className="tt-display text-[28px] leading-none text-cream">{formatNumber(vis?.totalViews ?? 0)} visite{(vis?.totalViews ?? 0) > 1 ? 's' : ''} de ta page</span>
            <span className="text-[15px] text-dust-300">
              {formatNumber(crew.followers_count + (vis?.invited ?? 0))} proches abonnés · {formatNumber(vis?.cheers ?? 0)} encouragement{(vis?.cheers ?? 0) > 1 ? 's' : ''}
            </span>
          </div>
          <Button asChild variant="secondary"><Link to={`/mon-compte/road-trips/${crew.slug}/rapport`}>Rapport pour les sponsors (PDF)</Link></Button>
        </div>
        <div className="flex h-[70px] items-end gap-[3px]" role="img" aria-label="Visites par jour sur les 30 derniers jours">
          {days.map((d) => <span key={d.day} className="flex-1 rounded-t-[3px] bg-signal" style={{ height: `${Math.max(3, (d.views / maxDay) * 100)}%`, opacity: d.views ? 1 : 0.25 }} title={`${d.day} : ${d.views}`} />)}
        </div>
        <span className="text-[13px] text-dust-500">Visites anonymes des 30 derniers jours (une par navigateur et par jour, sans toi ni tes compagnons de route).</span>
      </section>
    </div>
  );
}

export default function ManageCrewPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: crew, isLoading } = useCrew(slug);
  const { isLoading: loadingRoles } = useMyCrews();
  const { canEdit, isOwner } = useMyRole(crew?.id);
  const { data: photos = [] } = usePhotos(crew?.id);

  if (isLoading || loadingRoles) return <PageLoader />;
  if (!crew || !canEdit) return <Navigate to="/mon-compte" replace />;

  const raw = params.get('onglet');
  const legacy = raw ? LEGACY[raw] : undefined;
  const section: Section = legacy?.[0] ?? (raw as Section | null) ?? (crew.tracking_enabled ? 'tableau' : 'guide');
  const stepParam = params.get('etape') as GuideStepId | null;
  const step: GuideStepId = legacy?.[1] ?? (stepParam && GUIDE_STEPS.includes(stepParam) ? stepParam : 'voyage');
  const go = (s: Section, st?: GuideStepId) => {
    setParams(s === 'guide' ? { onglet: s, etape: st ?? step } : { onglet: s }, { replace: true });
    window.scrollTo(0, 0);
  };

  return (
    <TravellerShell crew={crew} section={section} onSection={(s) => go(s)} badges={{ guide: <GuideCount crew={crew} />, photos: photos.length ? String(photos.length) : undefined }}>
      <Seo title={`Mon espace · ${crew.name}`} noindex />
      {section === 'tableau' && <Overview crew={crew} onGo={go} />}
      {section === 'guide' && <TripGuide crew={crew} step={step} onStep={(st) => go('guide', st)} />}
      {section === 'carnet' && (
        <div className="flex flex-col gap-6">
          <h1 className="tt-display m-0 text-[clamp(36px,5vw,64px)] leading-[1.02] text-cream">Carnet de route</h1>
          <StagesTab crew={crew} />
          <JournalTab crew={crew} />
        </div>
      )}
      {section === 'photos' && (
        <div className="flex flex-col gap-6">
          <h1 className="tt-display m-0 text-[clamp(36px,5vw,64px)] leading-[1.02] text-cream">Photos</h1>
          <PhotosTab crew={crew} />
        </div>
      )}
      {section === 'partage' && (
        <div className="flex flex-col gap-6">
          <h1 className="tt-display m-0 text-[clamp(36px,5vw,64px)] leading-[1.02] text-cream">Partage</h1>
          <SharePanel crew={crew} />
        </div>
      )}
      {section === 'reglages' && (
        <div className="flex flex-col gap-6">
          <h1 className="tt-display m-0 text-[clamp(36px,5vw,64px)] leading-[1.02] text-cream">Réglages</h1>
          <InfoTab crew={crew} />
          {isOwner && <DangerTab crew={crew} />}
        </div>
      )}
    </TravellerShell>
  );
}

/** Badge « 3/8 » du guide dans la navigation. */
function GuideCount({ crew }: { crew: Crew }) {
  const g = useGuide(crew);
  return <>{g.stepsDone}/8</>;
}
