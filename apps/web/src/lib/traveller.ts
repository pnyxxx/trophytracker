/** Sections de l'espace voyageur et statut d'un road trip (« départ dans 12 jours »). */
import type { Crew } from './supabase';

export type Section = 'tableau' | 'guide' | 'carnet' | 'photos' | 'partage' | 'reglages';
export const SECTIONS: { id: Section; label: string }[] = [
  { id: 'tableau', label: 'Tableau de bord' },
  { id: 'guide', label: 'Prêt au départ' },
  { id: 'carnet', label: 'Carnet de route' },
  { id: 'photos', label: 'Photos' },
  { id: 'partage', label: 'Partage' },
  { id: 'reglages', label: 'Réglages' },
];

const daysUntil = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 864e5);

/** « départ dans 12 jours », « en route », « terminé ». */
export function tripStatus(crew: Pick<Crew, 'starts_on' | 'ends_on' | 'tracking_enabled'>) {
  if (crew.tracking_enabled) return 'en route';
  if (crew.ends_on && daysUntil(crew.ends_on) < 0) return 'voyage terminé';
  if (crew.starts_on) {
    const d = daysUntil(crew.starts_on);
    if (d > 1) return `départ dans ${d} jours`;
    if (d === 1) return 'départ demain';
    if (d === 0) return 'départ aujourd’hui';
  }
  return 'départ à préparer';
}
