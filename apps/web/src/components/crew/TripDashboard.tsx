/**
 * Colonne « tableau de bord » de la page d'un road trip : 6 tuiles de télémétrie, météo sur place en images
 * (WeatherCard) et profil d'altitude ; plus la carte de lieu posée sur la carte
 * (« J9 · près de Valloire »). Données : get_telemetry (dernière position + bilan du jour),
 * get_crew_stats, la trace (altitudes envoyées par le téléphone) et Open-Meteo / Photon, qui ne
 * reçoivent que la position arrondie (~1 km).
 */
import { useQuery } from '@tanstack/react-query';
import type { Crew } from '@/lib/supabase';
import type { CrewStats } from '@/hooks/queries';
import { round2, type Telemetry } from '@/hooks/useTrip';
import { formatNumber, formatRelative, isLive } from '@/lib/format';
import { climbOf, thin, type AltPoint } from '@/lib/elevation';
import { compassLabel, fetchWeatherBoard } from '@/lib/weather';
import { WeatherCard } from './WeatherCard';
import { cn } from '@/lib/utils';

const hm = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`);

const coordLabel = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'O' : 'E'}`;

/** Carte de lieu posée sur la carte, en bas à gauche. */
export function PlaceCard({ crew, place, day }: { crew: Crew; place: string | null; day: number | null }) {
  if (crew.last_lat == null || crew.last_lon == null) return null;
  const live = isLive(crew.last_fix_at);
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-cream py-2.5 pl-2.5 pr-4 text-ink shadow-[0_14px_30px_rgba(0,0,0,.35)]">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-signal font-mono text-[14px] text-white">{day ? `J${day}` : '●'}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[17px] font-bold">{place ? `Près de ${place}` : 'Dernière position'}{live ? '' : ` · ${formatRelative(crew.last_fix_at)}`}</span>
        <span className="font-mono text-[13px] text-dust-700">
          {coordLabel(crew.last_lat, crew.last_lon)}{live && crew.last_speed_kmh != null ? ` · ${Math.round(crew.last_speed_kmh)} km/h` : ''}
        </span>
      </div>
    </div>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[20px] bg-ink-800 px-4 py-3.5">
      <dt className="font-mono text-[12px] uppercase tracking-[0.1em] text-dust-400">{label}</dt>
      <dd className="m-0 whitespace-nowrap font-mono text-[26px] text-cream">
        {value}{unit && <span className="text-[14px] text-dust-400"> {unit}</span>}
      </dd>
    </div>
  );
}

/** Profil d'altitude compact (SVG), point rouge à la dernière position. */
function MiniProfile({ profile, from, to }: { profile: AltPoint[]; from: string; to: string }) {
  const pts = thin(profile, 120);
  const climb = climbOf(profile);
  if (!climb || pts.length < 2) return null;
  const top = Math.max(200, Math.ceil((climb.max + 1) / 250) * 250);
  const a = pts[0]!.km;
  const b = Math.max(a + 0.1, pts.at(-1)!.km);
  const x = (km: number) => ((km - a) / (b - a)) * 300;
  const y = (alt: number) => 104 - (alt / top) * 96;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.km).toFixed(1)},${y(p.alt).toFixed(1)}`).join(' ');
  const last = pts.at(-1)!;
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-ink-800 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[17px] font-bold">Profil d’altitude</span>
        <span className="font-mono text-[13px] text-dust-400">max {formatNumber(climb.max)} m</span>
      </div>
      <div className="relative h-[110px]">
        <svg viewBox="0 0 300 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img"
          aria-label={`Profil d’altitude : point le plus haut à ${formatNumber(climb.max)} mètres, dénivelé positif de ${formatNumber(climb.up)} mètres`}>
          <path d={`${d} L300,110 L0,110 Z`} fill="rgba(225,38,44,.2)" />
          <path d={d} fill="none" stroke="#E1262C" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <circle cx={x(last.km)} cy={y(last.alt)} r="5" fill="#E1262C" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>
      <div className="flex justify-between font-mono text-[12px] text-dust-400"><span>{from}</span><span>{to}</span></div>
    </div>
  );
}

export function TripDashboard({ crew, stats, telemetry: t, profile, day, total, place }: {
  crew: Crew;
  stats: CrewStats | null | undefined;
  telemetry: Telemetry | undefined;
  profile: AltPoint[] | null;
  day: number | null;
  total: number | null;
  place: string | null;
}) {
  const live = isLive(crew.last_fix_at);
  const climb = profile ? climbOf(profile) : null;
  const [lat, lon] = [round2(t?.lat ?? crew.last_lat), round2(t?.lon ?? crew.last_lon)];
  const { data: weather } = useQuery({
    queryKey: ['weather-board', lat, lon],
    enabled: lat != null && lon != null,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
    queryFn: ({ signal }) => fetchWeatherBoard(lat!, lon!, signal),
  });

  const tiles = [
    { label: 'distance', value: formatNumber(stats?.total_distance_km ?? crew.total_distance_m / 1000, 0), unit: 'km' },
    { label: 'vitesse', value: live && t?.speed_kmh != null ? formatNumber(t.speed_kmh) : '—', unit: 'km/h' },
    { label: 'altitude', value: t?.altitude != null ? formatNumber(t.altitude) : '—', unit: 'm' },
    { label: 'dénivelé +', value: climb ? formatNumber(climb.up) : '—', unit: 'm' },
    { label: 'jour', value: day ? String(day) : '—', unit: total ? `/ ${total}` : undefined },
    { label: 'au volant · auj.', value: t ? hm(t.today.moving_minutes) : '—' },
  ];
  const extras = [
    t?.battery != null ? `batterie ${t.battery} %` : null,
    live && t?.course != null ? `cap ${compassLabel(t.course)?.toLowerCase()}` : null,
    t?.accuracy != null ? `précision ± ${t.accuracy} m` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <dl className="m-0 grid grid-cols-2 gap-2">
        {tiles.map((x) => <Tile key={x.label} {...x} />)}
      </dl>
      {extras.length > 0 && (
        <p className={cn('m-0 px-1 font-mono text-[12px] text-dust-400', t?.battery != null && t.battery < 20 && 'text-signal-text')}>
          {extras.join(' · ')}{t?.battery != null && t.battery < 20 ? ' · batterie faible, le suivi peut s’interrompre' : ''}
        </p>
      )}
      {weather && <WeatherCard board={weather} place={place} />}
      {profile && <MiniProfile profile={profile} from={crew.city ?? 'départ'} to={live ? 'maintenant' : 'dernière position'} />}
    </div>
  );
}
