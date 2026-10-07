/**
 * Télémétrie en direct d'un road trip, façon tableau de bord : signal, vitesse, altitude, cap,
 * batterie du téléphone, météo à la position et bilan du jour.
 * Quand plus aucune position n'arrive depuis un moment, un message rassure les proches :
 * sans réseau (montagne, désert…), c'est normal, et les positions arrivent d'un coup ensuite.
 */
import { useQuery } from '@tanstack/react-query';
import { BatteryLow, BatteryMedium, Navigation2, Radio, Sunset, Wind } from 'lucide-react';
import { supabase, type Crew } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import { formatNumber, formatRelative, isLive } from '@/lib/format';
import { compassLabel, describeWeather, fetchWeather } from '@/lib/weather';
import { cn } from '@/lib/utils';

interface Telemetry {
  recorded_at: string;
  lat: number;
  lon: number;
  speed_kmh: number | null;
  course: number | null;
  altitude: number | null;
  accuracy: number | null;
  battery: number | null;
  today: { distance_km: number; moving_minutes: number; max_altitude: number | null };
}

/** Au-delà, on prévient que l'absence de position est sans doute un simple trou de réseau. */
const QUIET_MS = 60 * 60_000;

const hm = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`);

function Tile({ tag, label, children, className }: { tag: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[148px] flex-col gap-3 bg-ink p-5', className)}>
      <dt className="flex flex-col gap-0.5">
        <span className="font-mono text-[11px] tracking-[0.14em] text-ochre">{tag}</span>
        <span className="text-sm text-dust-400">{label}</span>
      </dt>
      <dd className="m-0 flex flex-1 flex-col justify-end">{children}</dd>
    </div>
  );
}

const Big = ({ value, unit }: { value: string; unit?: string }) => (
  <span className="font-display text-[44px] font-black leading-none text-cream md:text-[52px]">
    {value}{unit && <span className="ml-1.5 font-mono text-sm font-normal text-dust-400">{unit}</span>}
  </span>
);

export function CrewTelemetry({ crew }: { crew: Crew }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: t } = useQuery({
    queryKey: ['telemetry', crew.id, crew.last_fix_at],
    enabled: !!crew.last_fix_at,
    refetchInterval: 60_000,
    queryFn: async () => unwrap(await supabase.rpc('get_telemetry', { p_crew: crew.id, p_tz: tz })) as unknown as Telemetry,
  });
  // Météo : position arrondie à ~1 km, rafraîchie toutes les 15 min.
  const lat = t ? Math.round(t.lat * 100) / 100 : null;
  const lon = t ? Math.round(t.lon * 100) / 100 : null;
  const { data: weather } = useQuery({
    queryKey: ['weather', lat, lon],
    enabled: lat != null && lon != null,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
    queryFn: ({ signal }) => fetchWeather(lat!, lon!, signal),
  });

  if (!t) return null;
  const live = isLive(t.recorded_at);
  const quiet = Date.now() - new Date(t.recorded_at).getTime() > QUIET_MS;
  const speed = live ? t.speed_kmh ?? 0 : 0;
  const w = weather ? describeWeather(weather.code, weather.isDay) : null;
  const battery = t.battery;

  return (
    <div className="flex flex-col gap-4">
      {quiet && (
        <div className="flex gap-3 border-l-[3px] border-ochre bg-ochre/10 p-4 text-sm leading-relaxed text-dust-100">
          <Radio className="mt-0.5 h-5 w-5 shrink-0 text-ochre" />
          <p className="m-0">
            <strong className="text-cream">Pas de nouvelle position depuis {formatRelative(t.recorded_at).replace(/^il y a /, '')}.</strong>{' '}
            Pas d’inquiétude : en montagne, dans le désert ou en mer, il n’y a souvent tout simplement pas de réseau. Le téléphone garde
            les positions en mémoire et les envoie toutes d’un coup dès qu’il capte. Le téléphone peut aussi être éteint pour la nuit.
            En cas de doute, contactez directement les voyageurs.
          </p>
        </div>
      )}

      <dl className="m-0 grid grid-cols-2 gap-px border border-cream/[0.14] bg-cream/[0.14] md:grid-cols-3 xl:grid-cols-6">
        <Tile tag="SIGNAL" label={live ? 'Position reçue' : 'Dernière position'}>
          <span className={cn('flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.12em]', live ? 'text-live' : 'text-dust-200')}>
            <span className={cn('h-2.5 w-2.5 rounded-full', live ? 'animate-pulse bg-live' : 'bg-dust-500')} />
            {live ? 'En direct' : 'Hors ligne'}
          </span>
          <span className="mt-1 text-sm text-dust-300">{formatRelative(t.recorded_at)}</span>
          {t.accuracy != null && <span className="text-xs text-dust-500">précision ± {t.accuracy} m</span>}
        </Tile>

        <Tile tag="VITESSE" label="Vitesse actuelle">
          <Big value={formatNumber(speed)} unit="km/h" />
          <span className="mt-2 block h-1 w-full bg-cream/10" aria-hidden="true">
            <span className="block h-full bg-primary transition-all duration-700" style={{ width: `${Math.min(100, (speed / 130) * 100)}%` }} />
          </span>
        </Tile>

        <Tile tag="ALTITUDE" label="Altitude">
          <Big value={t.altitude != null ? formatNumber(t.altitude) : '—'} unit={t.altitude != null ? 'm' : undefined} />
        </Tile>

        <Tile tag="CAP" label="Direction">
          <span className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-cream/20">
              <Navigation2 className="h-6 w-6 text-primary transition-transform duration-700" style={{ transform: `rotate(${t.course ?? 0}deg)` }} />
            </span>
            <span className="font-display text-2xl font-black uppercase leading-none text-cream">{live ? compassLabel(t.course) ?? '—' : 'À l’arrêt'}</span>
          </span>
        </Tile>

        <Tile tag="BATTERIE" label="Téléphone de bord">
          {battery != null ? (
            <>
              <span className="flex items-center gap-2">
                {battery < 20 ? <BatteryLow className="h-6 w-6 text-primary" /> : <BatteryMedium className="h-6 w-6 text-live" />}
                <Big value={String(battery)} unit="%" />
              </span>
              {battery < 20 && <span className="mt-1 text-xs text-primary">Batterie faible : le suivi peut s’interrompre.</span>}
            </>
          ) : <span className="text-sm text-dust-400">Non transmise</span>}
        </Tile>

        <Tile tag="MÉTÉO" label="Sur place">
          {w && weather ? (
            <>
              <span className="flex items-center gap-2">
                <span className="text-4xl" aria-hidden="true">{w.icon}</span>
                <Big value={`${weather.temperature}°`} />
              </span>
              <span className="mt-1 text-sm text-dust-300">{w.label} · ressenti {weather.feelsLike}°</span>
              <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-dust-400">
                <span className="inline-flex items-center gap-1"><Wind className="h-3.5 w-3.5" />{weather.windKmh} km/h</span>
                {weather.sunset && <span className="inline-flex items-center gap-1"><Sunset className="h-3.5 w-3.5" />{weather.sunset}</span>}
              </span>
            </>
          ) : <span className="text-sm text-dust-400">…</span>}
        </Tile>
      </dl>

      <div className="flex flex-wrap gap-x-8 gap-y-2 border border-cream/[0.14] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-dust-300">
        <span className="text-ochre">Aujourd’hui</span>
        <span><strong className="text-cream">{formatNumber(t.today.distance_km, 1)}</strong> km</span>
        <span><strong className="text-cream">{hm(t.today.moving_minutes)}</strong> de route</span>
        {t.today.max_altitude != null && <span>point culminant <strong className="text-cream">{formatNumber(t.today.max_altitude)} m</strong></span>}
      </div>
    </div>
  );
}
