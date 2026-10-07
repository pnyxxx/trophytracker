/** Jours calendaires d'un voyage (J1 = jour du départ, en heure locale). */

/** Nombre de jours calendaires depuis l'origine, pour une date locale (« AAAA-MM-JJ » ou Date). */
function dayIndex(d: string | Date) {
  if (typeof d === 'string') {
    const [y, m, day] = d.split('-').map(Number);
    return Date.UTC(y!, m! - 1, day!) / 86_400_000;
  }
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
}

/** Jour du voyage (1 = jour du départ) d'un instant donné, sans borne. */
export const dayOfTrip = (startDate: string, at: Date) => dayIndex(at) - dayIndex(startDate) + 1;

/** Date locale « AAAA-MM-JJ » d'un horodatage en secondes. */
export function localDate(epochSeconds: number) {
  const d = new Date(epochSeconds * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
