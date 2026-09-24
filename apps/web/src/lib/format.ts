const nf = new Intl.NumberFormat('fr-FR');

export const formatNumber = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n);

export const formatKm = (km: number | null | undefined) => (km == null ? '—' : `${nf.format(Math.round(km))} km`);

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

/** « il y a 3 min », « il y a 2 h », « le 18 février » */
export function formatRelative(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return 'jamais';
  const diff = Math.max(0, now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'à l’instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

/** Un équipage est « en direct » si sa dernière position a moins de 10 minutes. */
export const isLive = (lastFixAt: string | null | undefined, now = Date.now()) =>
  !!lastFixAt && now - new Date(lastFixAt).getTime() < 10 * 60 * 1000;

/** « Les Sables Mouvants » → « SM », « J4L Club » → « JC » (mots courts ignorés). */
export function initials(name: string) {
  const words = name.split(/[\s'’-]+/).filter((w) => w.length > 2 || /\d/.test(w));
  const picked = (words.length ? words : [name]).slice(0, 2);
  return picked.map((w) => w[0]!.toUpperCase()).join('') || '?';
}
