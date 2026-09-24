import { motion } from 'framer-motion';
import StaggerContainer, { StaggerItem } from '@/components/animations/StaggerContainer';
import type { CrewStats as Stats } from '@/hooks/queries';
import { formatNumber } from '@/lib/format';

/** Nombre de jours depuis le départ officiel (0 avant le départ). */
function daysOnRoad(startDate: string | null) {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const diff = Date.now() - start;
  return diff < 0 ? 0 : Math.ceil(diff / 86_400_000);
}

export function CrewStats({ stats, startDate }: { stats: Stats | null | undefined; startDate: string | null }) {
  const days = daysOnRoad(startDate);
  const items = [
    { icon: '🚗', label: 'Distance parcourue', value: formatNumber(stats?.total_distance_km, 1), unit: 'km' },
    { icon: '⚡', label: 'Vitesse actuelle', value: formatNumber(stats?.current_speed_kmh), unit: 'km/h' },
    { icon: '⏱️', label: 'Moyenne (dernière heure)', value: formatNumber(stats?.avg_speed_kmh), unit: 'km/h' },
    { icon: '🏁', label: 'Classement', value: stats?.current_rank ? `${stats.current_rank}ᵉ` : '—', unit: '' },
    { icon: '🎒', label: 'Fournitures à livrer', value: formatNumber(stats?.supplies_count), unit: '' },
    { icon: '📅', label: 'Jours de raid', value: days == null ? '—' : String(days), unit: days ? (days > 1 ? 'jours' : 'jour') : '' },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
      {items.map((s) => (
        <StaggerItem key={s.label}>
          <motion.div
            whileHover={{ y: -4 }}
            className="glass group flex h-full flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:gap-5 md:p-6"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl transition group-hover:bg-primary/20 md:h-14 md:w-14">
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-white md:text-4xl">
                {s.value}
                {s.unit && <span className="ml-1 text-sm font-normal text-white/50 md:text-base">{s.unit}</span>}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-white/60">{s.label}</p>
            </div>
          </motion.div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
