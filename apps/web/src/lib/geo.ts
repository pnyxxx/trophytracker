const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance à vol d'oiseau entre deux points GPS (formule de Haversine), en km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
