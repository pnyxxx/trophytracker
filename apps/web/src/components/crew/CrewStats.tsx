import type { CrewStats as Stats } from '@/hooks/queries';
import { dayOfTrip, localDate } from '@/lib/days';
import { formatNumber } from '@/lib/format';

/** Tableau de bord du road trip : cases séparées d'un filet, comme un roadbook. */
export function CrewStats({ stats, startedAt }: {
  stats: Stats | null | undefined;
  /** Horodatage (secondes) du premier point de la trace : le jour 1 du road trip. */
  startedAt: number | null;
}) {
  const day = startedAt != null ? dayOfTrip(localDate(startedAt), new Date()) : null;
  const items = [
    { tag: '01 · DISTANCE', label: 'Distance parcourue', value: formatNumber(stats?.total_distance_km, 1), unit: 'km' },
    { tag: '02 · VITESSE', label: 'Vitesse actuelle', value: formatNumber(stats?.current_speed_kmh), unit: 'km/h' },
    { tag: '03 · MOYENNE', label: 'Moyenne (dernière heure)', value: formatNumber(stats?.avg_speed_kmh), unit: 'km/h' },
    { tag: '04 · CALENDRIER', label: 'Jours sur la route', value: day != null ? String(day) : '—', unit: day != null ? (day > 1 ? 'jours' : 'jour') : '' },
  ];

  return (
    <dl className="m-0 grid grid-cols-2 gap-px border border-cream/[0.14] bg-cream/[0.14] lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.tag} className="flex flex-col gap-3 bg-ink p-5 md:p-7">
          <dt className="flex flex-col gap-1">
            <span className="font-mono text-[11px] tracking-[0.14em] text-ochre">{s.tag}</span>
            <span className="text-sm text-dust-400">{s.label}</span>
          </dt>
          <dd className="m-0 font-display text-[44px] font-black leading-none text-cream md:text-[64px]">
            {s.value}
            {s.unit && <span className="ml-1.5 font-mono text-sm font-normal text-dust-400 md:text-base">{s.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
