import { DivIcon } from 'leaflet';
import type { Waypoint } from '@/lib/supabase';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export type WaypointKind = 'start' | 'stage' | 'night' | 'boat' | 'bivouac' | 'finish';

export const WAYPOINT_STYLE: Record<WaypointKind, { emoji: string; color: string; label: string }> = {
  start: { emoji: '🏁', color: '#DB4740', label: 'Départ' },
  stage: { emoji: '📍', color: '#D98A3D', label: 'Étape' },
  night: { emoji: '🛏️', color: '#1A1612', label: 'Étape de nuit' },
  boat: { emoji: '🚢', color: '#3E7C8C', label: 'Traversée' },
  bivouac: { emoji: '⛺', color: '#F2B45A', label: 'Bivouac' },
  finish: { emoji: '🏆', color: '#DB4740', label: 'Arrivée' },
};

/** Style d'un type de point (repli sur « étape » si le type est inconnu). */
export const waypointStyle = (kind: Waypoint['kind']) => WAYPOINT_STYLE[kind as WaypointKind] ?? WAYPOINT_STYLE.stage;

/** Point du parcours : pastille de couleur + nom de l'étape en étiquette mono. */
export function waypointIcon(w: Pick<Waypoint, 'kind' | 'name'>) {
  return new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-wp"><span class="tt-wp-dot" style="background:${waypointStyle(w.kind).color}"></span><span class="tt-wp-label">${escapeHtml(w.name)}</span></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });
}

/** La 4L : point rouge cerclé de blanc, qui pulse quand l'équipage est en direct. */
export function carIcon(live: boolean) {
  return new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-car ${live ? 'tt-car--live' : ''}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

export function sponsorIcon(logoUrl: string | null, name: string) {
  const inner = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" loading="lazy" />`
    : `<span>${escapeHtml(name.slice(0, 2).toUpperCase())}</span>`;
  return new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-sponsor">${inner}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}
