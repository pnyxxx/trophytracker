import type { CrewStats as Stats } from '@/hooks/queries';
import { formatNumber } from '@/lib/format';

/** Nombre de jours depuis le départ officiel (0 avant le départ). */
function daysOnRoad(startDate: string | null) {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const diff = Date.now() - start;
  return diff < 0 ? 0 : Math.ceil(diff / 86_400_000);
}

/** Tableau de bord de l'équipage : cases séparées d'un filet, comme un roadbook. */
export function CrewStats({ stats, startDate }: { stats: Stats | null | undefined; startDate: string | null }) {
  const days = daysOnRoad(startDate);
  const items = [
    { tag: '01 · DISTANCE', label: 'Distance parcourue', value: formatNumber(stats?.total_distance_km, 1), unit: 'km' },
    { tag: '02 · VITESSE', label: 'Vitesse actuelle', value: formatNumber(stats?.current_speed_kmh), unit: 'km/h' },
    { tag: '03 · MOYENNE', label: 'Moyenne (dernière heure)', value: formatNumber(stats?.avg_speed_kmh), unit: 'km/h' },
    { tag: '04 · CLASSEMENT', label: 'Classement', value: stats?.current_rank ? `${stats.current_rank}ᵉ` : '—', unit: '' },
    { tag: '05 · SOLIDARITÉ', label: 'Fournitures à livrer', value: formatNumber(stats?.supplies_count), unit: '' },
    { tag: '06 · CALENDRIER', label: 'Jours de raid', value: days == null ? '—' : String(days), unit: days ? (days > 1 ? 'jours' : 'jour') : '' },
  ];

  return (
    <dl className="m-0 grid grid-cols-2 gap-px border border-cream/[0.14] bg-cream/[0.14] lg:grid-cols-3">
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
