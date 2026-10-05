import { DivIcon } from 'leaflet';
import type { Waypoint } from '@/lib/supabase';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export type WaypointKind = 'start' | 'stage' | 'night' | 'boat' | 'bivouac' | 'finish' | 'loop';

export const WAYPOINT_STYLE: Record<WaypointKind, { emoji: string; color: string; label: string }> = {
  start: { emoji: '🏁', color: '#DB4740', label: 'Départ' },
  stage: { emoji: '📍', color: '#D98A3D', label: 'Étape' },
  night: { emoji: '🛏️', color: '#1A1612', label: 'Étape de nuit' },
  boat: { emoji: '🚢', color: '#3E7C8C', label: 'Traversée' },
  bivouac: { emoji: '⛺', color: '#F2B45A', label: 'Bivouac' },
  finish: { emoji: '🏆', color: '#DB4740', label: 'Arrivée' },
  loop: { emoji: '🔁', color: '#D98A3D', label: 'Boucle' },
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

/** Drapeau rouge à queue d'aronde, sur son mât (le pied du mât est sur la ville). */
const RED_FLAG =
  '<svg class="tt-start-flag" viewBox="0 0 24 30" aria-hidden="true">' +
  '<path d="M4 2v27" stroke="#1a1612" stroke-width="2.5" stroke-linecap="round"/>' +
  '<path d="M5 3h15l-4 5.5 4 5.5H5z" fill="#DB4740" stroke="#f4ecdf" stroke-width="1.5" stroke-linejoin="round"/>' +
  '</svg>';

/**
 * Gwenn-ha-du, sur le même mât : 9 bandes (5 noires, 4 blanches), canton blanc
 * sur les 5 premières bandes, semé de mouchetures d'hermine.
 */
const BRETON_FLAG = (() => {
  const [x, y, w, h] = [5, 3, 18, 12];
  const band = h / 9;
  const stripes = [0, 2, 4, 6, 8]
    .map((i) => `<rect x="${x}" y="${(y + i * band).toFixed(2)}" width="${w}" height="${band.toFixed(2)}" fill="#111"/>`)
    .join('');
  const [cw, ch] = [w * 4 / 9, band * 5];
  const ermines = [[0.25, 0.22], [0.5, 0.22], [0.75, 0.22], [0.375, 0.5], [0.625, 0.5], [0.25, 0.78], [0.5, 0.78], [0.75, 0.78]]
    .map(([u, v]) => `<path d="M${(x + u * cw).toFixed(2)} ${(y + v * ch - 0.9).toFixed(2)}l0.55 1.6h-1.1z" fill="#111"/>`)
    .join('');
  return (
    '<svg class="tt-start-flag" viewBox="0 0 24 30" aria-hidden="true">' +
    '<path d="M4 2v27" stroke="#1a1612" stroke-width="2.5" stroke-linecap="round"/>' +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>` +
    stripes +
    `<rect x="${x}" y="${y}" width="${cw.toFixed(2)}" height="${ch.toFixed(2)}" fill="#fff"/>` +
    ermines +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#1a1612" stroke-width="0.8"/>` +
    '</svg>'
  );
})();

/** Ville de départ de l'équipage : drapeau planté (breton si on part de Bretagne) + nom de la ville. */
export function startIcon(city: string | null, region: string | null) {
  const flag = region === 'Bretagne' ? BRETON_FLAG : RED_FLAG;
  return new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-start">${flag}<span class="tt-wp-label tt-start-label">${escapeHtml(city || 'Départ')}</span></div>`,
    iconSize: [24, 30],
    iconAnchor: [4, 29],
    popupAnchor: [6, -28],
  });
}

/** Photo : vignette carrée encadrée de blanc, à l'endroit de la prise de vue. */
export function photoIcon(thumbUrl: string | null, panorama: boolean) {
  return new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-photo">${thumbUrl ? `<img src="${escapeHtml(thumbUrl)}" alt="" loading="lazy" />` : ''}${panorama ? '<span>360°</span>' : ''}</div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26],
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

/** Un équipage sur la carte de tous les équipages : la 4L (point rouge) + son numéro en étiquette. */
export function crewIcon(live: boolean, label: string) {
  return new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-car ${live ? 'tt-car--live' : ''}"></div><span class="tt-wp-label tt-crew-label">${escapeHtml(label)}</span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}
