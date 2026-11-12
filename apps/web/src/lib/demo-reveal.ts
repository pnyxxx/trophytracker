/**
 * Road trip d'exemple (crews.is_demo) : sa trace est rejouée en boucle (apps/tracker/src/demo.ts), mais ses photos
 * sont les vraies photos du voyage. Pour que la démo reste cohérente, une photo n'apparaît qu'une fois la trace
 * passée à son endroit (à moins de REVEAL_KM d'un point déjà parcouru). Une photo sans position n'apparaît pas.
 */
import type { TrackPoint } from '@/hooks/useLiveTrack';

/** Distance maximale entre une photo et la trace pour la considérer « passée » (km). */
export const REVEAL_KM = 3;

const toRad = (d: number) => (d * Math.PI) / 180;
function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Les photos déjà « passées » par la trace (points : [lat, lon, …]). */
export function photosPassed<P extends { lat: number | null; lon: number | null }>(photos: P[], points: readonly TrackPoint[]): P[] {
  if (!points.length) return [];
  // Une grille d'environ 0,05° (~5 km) : on ne compare chaque photo qu'aux points des cases voisines.
  const cell = (v: number) => Math.floor(v / 0.05);
  const grid = new Map<string, TrackPoint[]>();
  for (const p of points) {
    const k = `${cell(p[0])}:${cell(p[1])}`;
    const list = grid.get(k);
    if (list) list.push(p);
    else grid.set(k, [p]);
  }
  return photos.filter((ph) => {
    if (ph.lat == null || ph.lon == null) return false;
    const [ci, cj] = [cell(ph.lat), cell(ph.lon)];
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (const p of grid.get(`${ci + di}:${cj + dj}`) ?? []) {
          if (km(ph.lat, ph.lon, p[0], p[1]) <= REVEAL_KM) return true;
        }
      }
    }
    return false;
  });
}
