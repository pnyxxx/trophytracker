import { DivIcon } from 'leaflet';
import type { Waypoint } from '@/lib/supabase';
import { initials } from '@/lib/format';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const circle = (emoji: string, color: string) =>
  new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-pin" style="border-color:${color}">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

export type WaypointKind = 'start' | 'stage' | 'night' | 'boat' | 'bivouac' | 'finish';

export const WAYPOINT_STYLE: Record<WaypointKind, { emoji: string; color: string; label: string }> = {
  start: { emoji: '🏁', color: '#ef4444', label: 'Départ' },
  stage: { emoji: '📍', color: '#f59e0b', label: 'Étape' },
  night: { emoji: '🛏️', color: '#3b82f6', label: 'Étape de nuit' },
  boat: { emoji: '🚢', color: '#10b981', label: 'Traversée' },
  bivouac: { emoji: '⛺', color: '#8b5cf6', label: 'Bivouac' },
  finish: { emoji: '🏆', color: '#ef4444', label: 'Arrivée' },
};

/** Style d'un type de point (repli sur « étape » si le type est inconnu). */
export const waypointStyle = (kind: Waypoint['kind']) => WAYPOINT_STYLE[kind as WaypointKind] ?? WAYPOINT_STYLE.stage;

const waypointIcons = new Map<string, DivIcon>();
export function waypointIcon(kind: Waypoint['kind']) {
  if (!waypointIcons.has(kind)) {
    const s = waypointStyle(kind);
    waypointIcons.set(kind, circle(s.emoji, s.color));
  }
  return waypointIcons.get(kind)!;
}

/** La 4L : pastille rouge qui pulse quand l'équipage est en direct. */
export function carIcon(live: boolean) {
  return new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-car ${live ? 'tt-car--live' : ''}"><span>🚗</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
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

/** Marqueur d'équipage sur la carte d'ensemble (initiales ou avatar). */
export function crewIcon(name: string, avatarUrl: string | null, live: boolean) {
  const inner = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`
    : `<span>${escapeHtml(initials(name))}</span>`;
  return new DivIcon({
    className: 'tt-marker',
    html: `<div class="tt-crew ${live ? 'tt-crew--live' : ''}">${inner}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}
