const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance à vol d'oiseau entre deux points GPS (formule de Haversine), en km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Où était la 4L à l'instant `t` (secondes) d'après sa trace [lat, lon, t, …] triée par date ?
 * Interpole entre les deux points qui encadrent `t` ; sinon prend le plus proche. Rien si
 * la trace n'a aucun point à moins de `maxGapS` secondes (la 4L n'émettait pas à ce moment-là).
 */
export function positionAt(
  points: readonly (readonly [number, number, number, ...unknown[]])[],
  t: number,
  maxGapS = 1800,
): { lat: number; lon: number } | null {
  if (!points.length) return null;
  // Recherche dichotomique du premier point à t ou après.
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid]![2] < t) lo = mid + 1;
    else hi = mid;
  }
  const after = points[lo];
  const before = points[lo - 1];
  if (before && after && t - before[2] <= maxGapS && after[2] - t <= maxGapS) {
    const k = after[2] === before[2] ? 0 : (t - before[2]) / (after[2] - before[2]);
    return { lat: before[0] + (after[0] - before[0]) * k, lon: before[1] + (after[1] - before[1]) * k };
  }
  const nearest = [before, after]
    .filter((p): p is NonNullable<typeof p> => !!p && Math.abs(p[2] - t) <= maxGapS)
    .sort((a, b) => Math.abs(a[2] - t) - Math.abs(b[2] - t))[0];
  return nearest ? { lat: nearest[0], lon: nearest[1] } : null;
}
