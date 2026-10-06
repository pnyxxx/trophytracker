/**
 * Profil d'élévation réel de l'équipage (altitude envoyée par le téléphone), jour par jour :
 * courbe d'altitude, dénivelés positif et négatif, point culminant et dernière position.
 * Survol (ou flèches du clavier) : altitude au kilomètre.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatNumber } from '@/lib/format';
import { climbOf, thin, type AltPoint } from '@/lib/elevation';
import type { RaidDay } from '@/lib/stages';
import { cn } from '@/lib/utils';
import type { RoadbookStop } from './roadbook';

const H = 168;
const PAD = { top: 22, right: 10, bottom: 22, left: 44 };
const LINE = '#9A4F16'; // ocre foncé : la trace sur le sable
const FILL = '#D98A3D';

/** Plafond « rond » de l'axe des altitudes. */
const niceMax = (m: number) => {
  const step = m <= 600 ? 200 : m <= 1500 ? 500 : 1000;
  return Math.max(step, Math.ceil((m + 1) / step) * step);
};

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Nom de l'étape prévue un jour donné : « Boucle 1 », « Salamanque »… */
function stageOfDay(stops: RoadbookStop[], day: number) {
  const inDays = (w: { day_start: number | null; day_end: number | null }) =>
    w.day_start != null && day >= w.day_start && day <= (w.day_end ?? w.day_start);
  const stop = stops.filter(inDays).at(-1);
  return stop?.subs.find(inDays)?.name ?? stop?.name ?? null;
}

export function CrewElevation({ profile, stops, cal }: { profile: AltPoint[]; stops: RoadbookStop[]; cal: RaidDay }) {
  // Jours du raid pour lesquels on a des altitudes.
  const days = useMemo(() => [...new Set(profile.map((p) => p.day).filter((d): d is number => d != null && d >= 1))], [profile]);
  // Sélection : null = toute la trace ; sinon un jour du raid (par défaut aujourd'hui, s'il a des données).
  const [day, setDay] = useState<number | null>(() => (cal.day != null && days.includes(cal.day) ? cal.day : null));
  const [hover, setHover] = useState<number | null>(null);
  const [ref, width] = useWidth();

  const sel = useMemo(() => (day == null ? profile : profile.filter((p) => p.day === day)), [profile, day]);
  const stats = climbOf(sel);
  const pts = useMemo(() => thin(sel), [sel]);
  if (!stats || pts.length < 2) return null;

  const a = pts[0]!.km;
  const b = Math.max(a + 0.1, pts.at(-1)!.km);
  const w = Math.max(240, width);
  const yMax = niceMax(stats.max);
  const x = (km: number) => PAD.left + ((km - a) / (b - a)) * (w - PAD.left - PAD.right);
  const y = (alt: number) => PAD.top + (1 - Math.max(0, alt) / yMax) * (H - PAD.top - PAD.bottom);
  const coords = pts.map((p) => `${x(p.km).toFixed(1)},${y(p.alt).toFixed(1)}`);
  const line = `M${coords.join('L')}`;
  const area = `M${x(a).toFixed(1)},${y(0)}L${coords.join('L')}L${x(b).toFixed(1)},${y(0)}Z`;

  // Dernière position connue, si elle est dans la sélection.
  const last = profile.at(-1)!;
  const car = sel.at(-1) === last ? last : null;
  const hovered = hover == null ? null : pts[hover]!;
  const nearest = (km: number) => {
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.km - km) < Math.abs(pts[best]!.km - km)) best = i;
    });
    return best;
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(nearest(a + ((e.clientX - r.left - PAD.left) / (r.width - PAD.left - PAD.right)) * (b - a)));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = Math.max(1, Math.round(pts.length / 50)) * (e.key === 'ArrowLeft' ? -1 : 1);
    setHover((h) => Math.max(0, Math.min(pts.length - 1, (h ?? pts.length - 1) + step)));
  };

  const peakX = Math.max(PAD.left + 30, Math.min(w - PAD.right - 30, x(stats.maxKm)));
  const dayLabel = (d: number) => {
    const name = stageOfDay(stops, d);
    return name ? `J${d} · ${name}` : `J${d}`;
  };

  return (
    <figure className="m-0 border-2 border-coal bg-cream">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-coal bg-coal px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-sand md:px-5">
        <span>Profil d’élévation</span>
        <span className="text-dust-300">{day == null ? 'Toute la trace' : dayLabel(day)}</span>
      </figcaption>

      {/* Choix du jour */}
      {days.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-coal/15 px-4 py-3 md:px-5" role="group" aria-label="Jour affiché">
          {[null, ...days].map((d) => (
            <button
              key={d ?? 'tout'}
              type="button"
              aria-pressed={day === d}
              onClick={() => { setDay(d); setHover(null); }}
              className={cn(
                'shrink-0 rounded-[3px] border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors',
                day === d ? 'border-coal bg-coal text-cream' : 'border-coal/25 text-dust-700 hover:border-coal hover:text-coal',
              )}
            >
              {d == null ? 'Tout' : dayLabel(d)}
            </button>
          ))}
        </div>
      )}

      {/* Chiffres */}
      <dl className="m-0 grid grid-cols-2 gap-px bg-coal/15 sm:grid-cols-4">
        {[
          { k: 'Distance', v: formatNumber(stats.km), u: 'km' },
          { k: 'Dénivelé +', v: `↗ ${formatNumber(stats.up)}`, u: 'm' },
          { k: 'Dénivelé −', v: `↘ ${formatNumber(stats.down)}`, u: 'm' },
          { k: 'Point culminant', v: `▲ ${formatNumber(stats.max)}`, u: 'm' },
        ].map((s) => (
          <div key={s.k} className="flex flex-col gap-1 bg-cream px-4 py-3 md:px-5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-dust-700">{s.k}</dt>
            <dd className="m-0 font-display text-2xl font-black leading-none text-coal md:text-3xl">
              {s.v}<span className="ml-1 font-mono text-xs font-normal text-dust-700">{s.u}</span>
            </dd>
          </div>
        ))}
      </dl>

      {/* Courbe */}
      <div ref={ref} className="relative border-t border-coal/15">
        <svg
          width={w}
          height={H}
          viewBox={`0 0 ${w} ${H}`}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="img"
          aria-label={`Profil d’élévation : ${formatNumber(stats.km)} km, ${formatNumber(stats.up)} m de montée, ${formatNumber(stats.down)} m de descente, point culminant ${formatNumber(stats.max)} m.`}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          {[0, yMax / 2, yMax].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke="#1A1612" strokeOpacity={t ? 0.1 : 0.35} strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end" className="fill-dust-700 font-mono text-[10px]">{formatNumber(t)}</text>
            </g>
          ))}
          <text x={PAD.left - 6} y={PAD.top - 9} textAnchor="end" className="fill-dust-600 font-mono text-[9px]">m</text>

          <path d={area} fill={FILL} fillOpacity={0.22} />
          <path d={line} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" />

          {stats.max > 0 && (
            <text x={peakX} y={y(stats.max) - 7} textAnchor="middle" className="fill-coal font-mono text-[10px] font-bold">
              ▲ {formatNumber(stats.max)} m
            </text>
          )}

          <text x={PAD.left} y={H - 6} className="fill-dust-700 font-mono text-[10px]">0 km</text>
          <text x={w - PAD.right} y={H - 6} textAnchor="end" className="fill-dust-700 font-mono text-[10px]">{formatNumber(b - a)} km</text>

          {/* Dernière position */}
          {car && (
            <g>
              <circle cx={x(car.km)} cy={y(car.alt)} r={5.5} fill="#DB4740" stroke="#F4ECDF" strokeWidth={2} />
              <text x={x(car.km) - 9} y={y(car.alt) + 3.5} textAnchor="end" className="fill-primary font-mono text-[10px] font-bold uppercase">La 4L</text>
            </g>
          )}

          {hovered && (
            <g pointerEvents="none">
              <line x1={x(hovered.km)} x2={x(hovered.km)} y1={PAD.top} y2={y(0)} stroke="#1A1612" strokeOpacity={0.6} strokeWidth={1} />
              <circle cx={x(hovered.km)} cy={y(hovered.alt)} r={4} fill={LINE} stroke="#F4ECDF" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hovered && (
          <div
            className="pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-coal px-2 py-1 font-mono text-[11px] text-cream shadow"
            style={{ left: Math.max(70, Math.min(w - 70, x(hovered.km))) }}
            aria-live="polite"
          >
            {formatNumber(hovered.km - a, 1)} km · <b>{formatNumber(hovered.alt)} m</b>
          </div>
        )}
      </div>

      {/* Version tableau (lecteurs d'écran). Masquée par un div : un tableau ne rétrécit pas sous la
          largeur de son contenu, et en sr-only il élargissait la page sur téléphone (dézoom possible). */}
      <div className="sr-only">
        <table>
          <caption>Dénivelé par jour</caption>
          <thead><tr><th>Jour</th><th>Distance (km)</th><th>Montée (m)</th><th>Descente (m)</th><th>Altitude max (m)</th></tr></thead>
          <tbody>
            {days.map((d) => {
              const c = climbOf(profile.filter((p) => p.day === d));
              return c && <tr key={d}><td>{dayLabel(d)}</td><td>{c.km}</td><td>{c.up}</td><td>{c.down}</td><td>{c.max}</td></tr>;
            })}
          </tbody>
        </table>
      </div>

      <p className="m-0 border-t border-coal/15 px-4 py-2 font-mono text-[10px] text-dust-600 md:px-5">
        Altitude mesurée par le GPS du téléphone de l’équipage (lissée) : quelques mètres de marge.
      </p>
    </figure>
  );
}
