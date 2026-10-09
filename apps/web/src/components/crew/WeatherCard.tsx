/**
 * Météo sur place, en images : fond et pictogramme animé selon le temps qu'il fait (soleil qui tourne, nuages
 * qui passent, pluie, neige, orage), course du soleil entre son lever et son coucher, les 12 prochaines heures
 * avec leur courbe de température, et demain. Données : lib/weather.ts (Open-Meteo, position arrondie).
 * Les animations s'arrêtent si le lecteur a demandé moins de mouvements (index.css).
 */
import type { CSSProperties } from 'react';
import { describeWeather, weatherKind, type WeatherBoard, type WeatherKind } from '@/lib/weather';
import { cn } from '@/lib/utils';

/** Fond de la carte : ciel du moment. */
const SKY: Record<WeatherKind, string> = {
  clear: 'linear-gradient(160deg,#1F63C9 0%,#4C93E6 55%,#F2B35B 135%)',
  'clear-night': 'linear-gradient(160deg,#070D24 0%,#16224A 70%,#2B2F5E 120%)',
  partly: 'linear-gradient(160deg,#2C6BC0 0%,#6E9FD6 70%,#C9D6E2 130%)',
  'partly-night': 'linear-gradient(160deg,#0B1330 0%,#28335A 80%)',
  cloudy: 'linear-gradient(160deg,#3D4654 0%,#6B7684 100%)',
  fog: 'linear-gradient(160deg,#5C636E 0%,#9AA1AA 100%)',
  drizzle: 'linear-gradient(160deg,#2F4256 0%,#5B7189 100%)',
  rain: 'linear-gradient(160deg,#1E2C3D 0%,#3E546C 100%)',
  snow: 'linear-gradient(160deg,#4A6585 0%,#93A9C0 100%)',
  storm: 'linear-gradient(160deg,#17142A 0%,#3A3156 100%)',
};

const CLOUD = 'M17 50h30a11 11 0 0 0 1.5-21.9A15 15 0 0 0 20.2 25 12.5 12.5 0 0 0 17 50z';

function Sun({ cx = 32, cy = 32, r = 11, animated }: { cx?: number; cy?: number; r?: number; animated: boolean }) {
  return (
    <g>
      <g className={animated ? 'tt-wx-spin' : undefined}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line key={i} x1={cx + Math.cos(a) * (r + 5)} y1={cy + Math.sin(a) * (r + 5)} x2={cx + Math.cos(a) * (r + 10)} y2={cy + Math.sin(a) * (r + 10)}
              stroke="#FFD75E" strokeWidth="3.2" strokeLinecap="round" />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} fill="#FFC93C" />
    </g>
  );
}

function Moon({ cx = 30, cy = 30, animated }: { cx?: number; cy?: number; animated: boolean }) {
  return (
    <g>
      <path d={`M${cx + 6} ${cy - 15}a16 16 0 1 0 12 24 13 13 0 0 1-12-24z`} fill="#F3E9C6" />
      {[[50, 14, 0], [12, 16, 1.2], [54, 38, 2]].map(([x, y, d]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#fff" className={animated ? 'tt-wx-twinkle' : undefined} style={{ animationDelay: `${d}s` }} />
      ))}
    </g>
  );
}

/** Pictogramme météo en SVG ; `animated` pour le grand pictogramme du moment. */
export function WeatherIcon({ kind, animated = false, className }: { kind: WeatherKind; animated?: boolean; className?: string }) {
  const drift = animated ? 'tt-wx-drift' : undefined;
  const drop = (x: number, delay: number, cls: string, light = false) => (
    <line key={x} x1={x} y1="52" x2={x - 3} y2="60" stroke={light ? '#BFE0FF' : '#7CC4FF'} strokeWidth="2.6" strokeLinecap="round"
      className={animated ? cls : undefined} style={{ animationDelay: `${delay}s` } as CSSProperties} />
  );
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" overflow="visible">
      {kind === 'clear' && <Sun animated={animated} />}
      {kind === 'clear-night' && <Moon animated={animated} />}
      {(kind === 'partly' || kind === 'partly-night') && (
        <>
          {kind === 'partly' ? <Sun cx={24} cy={22} r={9} animated={animated} /> : <Moon cx={22} cy={22} animated={animated} />}
          <path d={CLOUD} fill="#F4F6F9" className={drift} transform="translate(6 2)" />
        </>
      )}
      {kind === 'cloudy' && (
        <>
          <path d={CLOUD} fill="#B9C2CD" transform="translate(-8 -10) scale(.8)" className={animated ? 'tt-wx-drift-slow' : undefined} />
          <path d={CLOUD} fill="#E9EDF2" className={drift} />
        </>
      )}
      {kind === 'fog' && [22, 32, 42].map((y, i) => (
        <line key={y} x1={10 + i * 3} y1={y} x2={54 - i * 2} y2={y} stroke="#EEF1F4" strokeWidth="4.5" strokeLinecap="round" opacity={0.9 - i * 0.2}
          className={animated ? (i % 2 ? 'tt-wx-drift-slow' : 'tt-wx-drift') : undefined} />
      ))}
      {(kind === 'drizzle' || kind === 'rain' || kind === 'snow' || kind === 'storm') && (
        <>
          {kind === 'storm' && (
            <polygon points="33,40 25,54 32,54 28,64 41,48 34,48 38,40" fill="#FFD75E" className={animated ? 'tt-wx-flash' : undefined} />
          )}
          {kind === 'snow'
            ? [20, 32, 44].map((x, i) => (
              <circle key={x} cx={x} cy="55" r="2.6" fill="#fff" className={animated ? 'tt-wx-snow' : undefined} style={{ animationDelay: `${i * 0.9}s` }} />
            ))
            : (kind === 'drizzle' ? [24, 38] : kind === 'storm' ? [20, 46] : [20, 31, 42]).map((x, i) => drop(x, i * 0.3, 'tt-wx-fall', kind === 'drizzle'))}
          <path d={CLOUD} fill={kind === 'storm' ? '#8A84A3' : kind === 'snow' ? '#F4F7FA' : '#C9D2DC'} transform="translate(0 -8)" className={drift} />
        </>
      )}
    </svg>
  );
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Course du soleil : arc du lever au coucher, soleil (ou lune) à l'heure du lieu. */
function SunPath({ sun }: { sun: NonNullable<WeatherBoard['sun']> }) {
  const p = (sun.now - sun.rise) / (sun.set - sun.rise);
  const day = p >= 0 && p <= 1;
  const t = Math.min(1, Math.max(0, p));
  // Demi-ellipse de (10, 46) à (290, 46), sommet à y = 8.
  const x = 10 + t * 280;
  const y = 46 - Math.sin(t * Math.PI) * 38;
  const left = sun.set - sun.now;
  return (
    <div className="flex flex-col gap-1">
      <svg viewBox="0 0 300 54" className="h-auto max-h-[80px] w-full" role="img"
        aria-label={day ? `Soleil levé à ${hhmm(sun.rise)}, couché à ${hhmm(sun.set)}` : `Nuit : le soleil se lève à ${hhmm(sun.rise)}`}>
        <path d="M10 46 A140 38 0 0 1 290 46" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="4 6" />
        {day && <path d={`M10 46 A140 38 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke="#FFD75E" strokeWidth="3" strokeLinecap="round" />}
        <line x1="0" y1="46" x2="300" y2="46" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
        {day
          ? <circle cx={x} cy={y} r="8" fill="#FFC93C" stroke="#fff" strokeWidth="2.5" />
          : <circle cx={p < 0 ? 10 : 290} cy="46" r="6" fill="#F3E9C6" />}
      </svg>
      <div className="flex justify-between font-mono text-[12px] text-white/80">
        <span>↑ {hhmm(sun.rise)}</span>
        <span>{day ? (left > 0 ? `encore ${Math.floor(left / 60)} h ${String(left % 60).padStart(2, '0')} de jour` : 'coucher du soleil') : 'nuit'}</span>
        <span>{hhmm(sun.set)} ↓</span>
      </div>
    </div>
  );
}

/** Les prochaines heures : pictogramme, température sur une courbe, risque de pluie. */
function Hours({ hours }: { hours: WeatherBoard['hours'] }) {
  const temps = hours.map((h) => h.temperature);
  const [lo, hi] = [Math.min(...temps), Math.max(...temps)];
  const yOf = (v: number) => (hi === lo ? 14 : 24 - ((v - lo) / (hi - lo)) * 20);
  const xOf = (i: number) => ((i + 0.5) / hours.length) * 300;
  const line = hours.map((h, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(h.temperature).toFixed(1)}`).join(' ');
  return (
    <div className="flex flex-col gap-1 rounded-[16px] bg-black/20 px-1 py-3">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length},minmax(0,1fr))` }}>
        {hours.map((h) => (
          <div key={h.label} className="flex flex-col items-center gap-1">
            <span className="font-mono text-[12px] text-white/75">{h.label}</span>
            <WeatherIcon kind={weatherKind(h.code, h.isDay)} className="h-8 w-8" />
          </div>
        ))}
      </div>
      <div className="relative">
        <svg viewBox="0 0 300 30" preserveAspectRatio="none" className="block h-[30px] w-full" aria-hidden="true">
          <path d={line} fill="none" stroke="#FFD75E" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length},minmax(0,1fr))` }}>
        {hours.map((h) => (
          <div key={h.label} className="flex flex-col items-center">
            <span className="font-mono text-[16px] text-white">{h.temperature}°</span>
            <span className={cn('font-mono text-[11px]', (h.rain ?? 0) >= 30 ? 'text-[#BFE0FF]' : 'text-transparent')}>💧{h.rain ?? 0} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeatherCard({ board, place }: { board: WeatherBoard; place: string | null }) {
  const kind = weatherKind(board.now.code, board.now.isDay);
  const { label } = describeWeather(board.now.code, board.now.isDay);
  return (
    <section aria-label="Météo sur place" className="relative flex flex-col gap-4 overflow-hidden rounded-[20px] p-4 text-white" style={{ backgroundImage: SKY[kind] }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[17px] font-bold">Météo sur place</span>
        {place && <span className="truncate font-mono text-[13px] text-white/75">{place}</span>}
      </div>
      <div className="flex items-center gap-3">
        <WeatherIcon kind={kind} animated className="h-[92px] w-[92px] flex-none drop-shadow-[0_8px_18px_rgba(0,0,0,.25)]" />
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[54px] leading-none">{board.now.temperature}°</span>
          <span className="mt-1 text-[18px] font-bold">{label}</span>
          <span className="font-mono text-[13px] text-white/80">ressenti {board.now.feelsLike}° · vent {board.now.windKmh} km/h</span>
        </div>
      </div>
      {board.sun && <SunPath sun={board.sun} />}
      {board.hours.length > 1 && <Hours hours={board.hours} />}
      {board.tomorrow && (
        <div className="flex items-center gap-3 rounded-[16px] bg-black/20 px-3 py-2">
          <WeatherIcon kind={weatherKind(board.tomorrow.code)} className="h-9 w-9 flex-none" />
          <span className="flex-1 text-[16px]"><b>Demain</b> · {describeWeather(board.tomorrow.code).label.toLowerCase()}</span>
          <span className="font-mono text-[16px]"><span className="text-white/70">{board.tomorrow.min}°</span> / {board.tomorrow.max}°</span>
        </div>
      )}
    </section>
  );
}
