/**
 * Rapport du voyage pour les sponsors (/mon-compte/road-trips/:slug/rapport) : une page A4 claire à imprimer
 * ou à enregistrer en PDF depuis le navigateur (« Imprimer » → « Enregistrer au format PDF »).
 * La trace sur la vue satellite, les chiffres du voyage, la visibilité de la page (visites anonymes,
 * proches abonnés, encouragements), les sponsors remerciés, quelques photos et le lien en QR code.
 */
import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { renderSVG } from 'uqr';
import { ArrowLeft, Printer } from 'lucide-react';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { useCrew, useCrewStats, useMyCrews, useMyRole, usePhotos, useSponsors, useStages } from '@/hooks/queries';
import { useLiveTrack } from '@/hooks/useLiveTrack';
import { lastDays, useVisibility } from '@/hooks/useTrip';
import { altitudeProfile, climbOf } from '@/lib/elevation';
import { localDate } from '@/lib/days';
import { formatNumber } from '@/lib/format';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { dateRange, fitFrame } from '@/lib/qr-poster';

const MAP_W = 1200;
const MAP_H = 620;

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-dust-700">{label}</span>
      <span className="font-mono text-[26px] leading-none text-ink">{value}{unit && <span className="text-[14px] text-dust-700"> {unit}</span>}</span>
    </div>
  );
}

export default function TripReportPage() {
  const { slug } = useParams();
  const { data: crew, isLoading } = useCrew(slug);
  const { isLoading: loadingRoles } = useMyCrews();
  const { canEdit } = useMyRole(crew?.id);
  const { data: stats } = useCrewStats(crew?.id);
  const { data: photos = [] } = usePhotos(crew?.id);
  const { data: sponsors = [] } = useSponsors(crew?.id);
  const { data: stages = [] } = useStages(crew?.id);
  const { data: vis } = useVisibility(crew?.id);
  const { points } = useLiveTrack(crew);

  const map = useMemo(() => {
    const pts = points.map((p) => ({ lat: p[0], lon: p[1] }));
    const anchor = pts.length ? pts : crew?.start_lat != null && crew.start_lon != null ? [{ lat: crew.start_lat, lon: crew.start_lon }] : [];
    if (!anchor.length) return null;
    const f = fitFrame(anchor, MAP_W, MAP_H, 0.86, 0.8);
    const step = Math.max(1, Math.floor(pts.length / 1500));
    const line = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((p) => f.toPx(p.lat, p.lon).map((n) => n.toFixed(1)).join(',')).join(' ');
    const last = pts.at(-1) ?? anchor[0]!;
    return {
      src: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${f.bbox.map((n) => n.toFixed(5)).join(',')}&bboxSR=4326&imageSR=3857&size=${MAP_W},${MAP_H}&format=jpg&f=image`,
      line,
      end: f.toPx(last.lat, last.lon),
    };
  }, [points, crew?.start_lat, crew?.start_lon]);

  if (isLoading || loadingRoles) return <PageLoader />;
  if (!crew || !canEdit) return <Navigate to="/mon-compte" replace />;

  const firstFix = points[0]?.[2];
  const lastFix = points.at(-1)?.[2];
  const roadDays = firstFix && lastFix ? Math.round((Date.parse(localDate(lastFix)) - Date.parse(localDate(firstFix))) / 864e5) + 1 : null;
  const climb = (() => { const p = altitudeProfile(points, null); return p ? climbOf(p) : null; })();
  const days = lastDays(vis?.days ?? []);
  const maxDay = Math.max(1, ...days.map((d) => d.views));
  const url = `${window.location.origin}/road-trip/${crew.slug}`;
  const qr = renderSVG(url, { ecc: 'M', border: 1, blackColor: '#15161A', whiteColor: '#FFFFFF' });
  const range = dateRange(crew.starts_on, crew.ends_on);

  return (
    <div className="min-h-screen bg-[#E9E4DB] py-8 print:bg-white print:py-0">
      <Seo title={`Rapport · ${crew.name}`} noindex />
      <style>{'@page { size: A4; margin: 12mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'}</style>
      <div className="mx-auto mb-5 flex max-w-[860px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Button asChild variant="outline" className="border-ink text-ink hover:bg-ink/10 hover:text-ink">
          <Link to={`/mon-compte/road-trips/${crew.slug}?onglet=tableau`}><ArrowLeft />Retour à mon espace</Link>
        </Button>
        <Button onClick={() => window.print()}><Printer />Imprimer ou enregistrer en PDF</Button>
      </div>

      <article className="mx-auto flex max-w-[860px] flex-col gap-6 rounded-[24px] bg-cream p-8 text-ink shadow-[0_20px_50px_rgba(0,0,0,.12)] print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[13px] text-signal-light">rapport de voyage{range ? ` · ${range}` : ''}</span>
            <h1 className="tt-display m-0 text-[44px] leading-none">{crew.name}</h1>
            {(crew.city || crew.destination) && <p className="m-0 text-[18px] text-dust-800">{[crew.city, crew.destination].filter(Boolean).join(' → ')}</p>}
          </div>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal"><span className="h-2.5 w-2.5 rounded-full bg-cream" /></span>
            <span className="tt-display text-[20px]">trophy<span className="text-signal">tracker</span></span>
          </span>
        </header>

        {map && (
          <div className="relative overflow-hidden rounded-[18px] bg-ink" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
            <img src={map.src} alt="La trace du voyage sur une vue satellite" className="absolute inset-0 h-full w-full object-cover brightness-[.85]" />
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
              {map.line && <polyline points={map.line} fill="none" stroke="#15161A" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />}
              {map.line && <polyline points={map.line} fill="none" stroke="#E1262C" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
              <circle cx={map.end[0]} cy={map.end[1]} r="12" fill="#E1262C" stroke="#fff" strokeWidth="4" />
            </svg>
          </div>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="tt-display m-0 text-[24px]">Le voyage</h2>
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
            <Stat label="distance" value={formatNumber(stats?.total_distance_km ?? crew.total_distance_m / 1000)} unit="km" />
            <Stat label="jours sur la route" value={roadDays ? String(roadDays) : '—'} />
            <Stat label="altitude max" value={climb ? formatNumber(climb.max) : '—'} unit={climb ? 'm' : undefined} />
            <Stat label="dénivelé +" value={climb ? formatNumber(climb.up) : '—'} unit={climb ? 'm' : undefined} />
            <Stat label="étapes" value={String(stages.length)} />
            <Stat label="photos" value={String(photos.length)} />
          </div>
        </section>

        <section className="flex flex-col gap-3 break-inside-avoid">
          <h2 className="tt-display m-0 text-[24px]">La visibilité</h2>
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
            <Stat label="visites de la page" value={formatNumber(vis?.totalViews ?? 0)} />
            <Stat label="proches abonnés" value={formatNumber((stats?.followers_count ?? crew.followers_count) + (vis?.invited ?? 0))} />
            <Stat label="encouragements" value={formatNumber(vis?.cheers ?? 0)} />
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-dust-700">visites, 30 derniers jours</span>
            <div className="flex h-[90px] items-end gap-[3px]" role="img" aria-label={`Visites par jour sur 30 jours, au plus ${maxDay} en un jour`}>
              {days.map((d) => <span key={d.day} className="flex-1 rounded-t-[3px] bg-signal" style={{ height: `${Math.max(2, (d.views / maxDay) * 100)}%`, opacity: d.views ? 1 : 0.25 }} title={`${d.day} : ${d.views}`} />)}
            </div>
            <span className="text-[12px] text-dust-700">Visites anonymes : une par navigateur et par jour, sans compter les voyageurs.</span>
          </div>
        </section>

        {sponsors.length > 0 && (
          <section className="flex flex-col gap-3 break-inside-avoid">
            <h2 className="tt-display m-0 text-[24px]">Merci à nos sponsors</h2>
            <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
              {sponsors.map((s) => {
                const logo = mediaUrl(s.logo_path);
                return (
                  <div key={s.id} className="flex h-[78px] items-center justify-center rounded-2xl bg-white p-3">
                    {logo ? <img src={logo} alt={s.name} className="max-h-full max-w-full object-contain" /> : <span className="text-center font-bold">{s.name}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {photos.length > 0 && (
          <section className="flex flex-col gap-3 break-inside-avoid">
            <h2 className="tt-display m-0 text-[24px]">En images</h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, 6).map((p) => <img key={p.id} src={thumbUrl(p.storage_path, 480) ?? ''} alt={p.title} className="aspect-[4/3] w-full rounded-2xl object-cover" />)}
            </div>
          </section>
        )}

        <footer className="flex items-center justify-between gap-6 border-t border-[#DDD6CA] pt-5 break-inside-avoid">
          <div className="flex flex-col gap-1">
            <span className="text-[17px] font-bold">Revivre tout le voyage</span>
            <span className="break-all font-mono text-[13px] text-dust-800">{url.replace(/^https?:\/\//, '')}</span>
            <span className="text-[13px] text-dust-700">Carte, trace, photos et carnet de route, en ligne.</span>
          </div>
          <div className="h-[110px] w-[110px] flex-none [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
        </footer>
      </article>
    </div>
  );
}
