/**
 * La « route » illustrée : panneaux des villes du parcours et la 4L qui avance
 * proportionnellement à la distance parcourue par l'équipage.
 */
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import Car4L from '@/components/animations/Car4L';
import CitySign from '@/components/CitySign';
import FinishLine from '@/components/FinishLine';
import type { Waypoint } from '@/lib/supabase';
import { haversineKm } from '@/lib/geo';

const SPACING = 260; // px entre deux panneaux
const TOP = 170;
const SIDES = ['md:left-[22%] left-[4%]', 'md:left-[58%] left-[56%]'];

export function CrewRoadTimeline({ waypoints, distanceKm }: { waypoints: Waypoint[]; distanceKm: number }) {
  // Distance cumulée (à vol d'oiseau) de chaque point depuis le départ.
  const stops = useMemo(() => {
    let acc = 0;
    return waypoints.map((w, i) => {
      const prev = waypoints[i - 1];
      if (prev) acc += haversineKm(prev.lat, prev.lon, w.lat, w.lon);
      return { ...w, km: acc };
    });
  }, [waypoints]);

  // La route réelle est ~30 % plus longue que la ligne droite entre les étapes.
  const ROAD_FACTOR = 1.3;
  const carTop = useMemo(() => {
    if (stops.length < 2) return TOP - 60;
    const d = distanceKm / ROAD_FACTOR;
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1]!;
      const b = stops[i]!;
      if (d <= b.km) {
        const t = b.km > a.km ? (d - a.km) / (b.km - a.km) : 0;
        return TOP + (i - 1 + t) * SPACING;
      }
    }
    return TOP + (stops.length - 1) * SPACING;
  }, [stops, distanceKm]);

  if (stops.length === 0) return null;
  const height = TOP + stops.length * SPACING;

  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl" style={{ height }}>
      <img src="/images/illustrations/route.webp" alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <img
        src="/images/illustrations/start.webp"
        alt="Arche de départ"
        className="absolute left-1/2 top-2 h-[150px] w-auto -translate-x-1/2 object-contain md:h-[190px]"
        loading="lazy"
      />

      {stops.map((w, i) => (
        <motion.div
          key={w.id}
          className={`absolute ${SIDES[i % 2]} z-20`}
          style={{ top: TOP + i * SPACING - 40 }}
          initial={{ opacity: 0, y: -12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <CitySign cityName={w.name.toUpperCase()} />
        </motion.div>
      ))}

      <motion.div
        className="absolute left-1/2 z-30 w-16 -translate-x-1/2 md:w-20"
        initial={{ top: TOP - 60 }}
        whileInView={{ top: carTop }}
        viewport={{ once: true }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      >
        <Car4L withSmoke={distanceKm > 0} position="start" />
      </motion.div>

      <FinishLine topPosition={`${height - 90}px`} />
    </div>
  );
}
