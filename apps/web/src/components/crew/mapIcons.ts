/**
 * Marqueurs des cartes MapLibre d'un road trip : des éléments HTML (styles .tt-* dans index.css),
 * posés avec `new maplibregl.Marker({ element })`. Tout texte venu des voyageurs est échappé.
 */
import type { TripStage } from '@/lib/supabase';

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export type StageKind = TripStage['kind'];

export const STAGE_STYLE: Record<string, { emoji: string; color: string; label: string }> = {
  start: { emoji: '🏁', color: '#E1262C', label: 'Départ' },
  stop: { emoji: '📍', color: '#E8A33D', label: 'Étape' },
  night: { emoji: '🌙', color: '#3E5C8C', label: 'Nuit' },
  highlight: { emoji: '⭐', color: '#F2C27A', label: 'Coup de cœur' },
  finish: { emoji: '🏆', color: '#E1262C', label: 'Arrivée' },
};

/** Style d'un type d'étape (repli sur « étape » si le type est inconnu). */
export const stageStyle = (kind: string) => STAGE_STYLE[kind] ?? STAGE_STYLE.stop!;

function el(html: string, w: number, h: number, label?: string) {
  const div = document.createElement('div');
  div.className = 'tt-marker';
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  div.innerHTML = html;
  if (label) {
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', label);
    div.tabIndex = 0;
  }
  return div;
}

const RED_FLAG =
  '<svg class="tt-start-flag" viewBox="0 0 24 30" aria-hidden="true"><path d="M3 2v27" stroke="#15161A" stroke-width="2.4" stroke-linecap="round"/>'
  + '<path d="M4 3h16l-4 5 4 5H4z" fill="#E1262C" stroke="#15161A" stroke-width="1.6" stroke-linejoin="round"/></svg>';

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

/** Étape du road trip : pastille de couleur + nom de l'étape en étiquette mono. */
export const stageMarker = (w: Pick<TripStage, 'kind' | 'name'>) =>
  el(`<div class="tt-wp"><span class="tt-wp-dot" style="background:${stageStyle(w.kind).color}"></span><span class="tt-wp-label">${escapeHtml(w.name)}</span></div>`, 12, 12, w.name);

/** Ville de départ : drapeau planté (breton si on part de Bretagne) + nom de la ville. */
export const startMarker = (city: string | null, region: string | null) =>
  el(`<div class="tt-start">${region === 'Bretagne' ? BRETON_FLAG : RED_FLAG}<span class="tt-wp-label tt-start-label">${escapeHtml(city || 'Départ')}</span></div>`, 24, 30, `Départ : ${city || 'ville de départ'}`);

/** Photo : vignette encadrée de blanc, à l'endroit de la prise de vue. */
export const photoMarker = (thumbUrl: string | null, panorama: boolean, title: string) =>
  el(`<div class="tt-photo">${thumbUrl ? `<img src="${escapeHtml(thumbUrl)}" alt="" loading="lazy" />` : ''}${panorama ? '<span>360°</span>' : ''}</div>`, 52, 52, `Photo : ${title}`);

/** La balise du voyageur : point rouge cerclé de blanc, qui pulse en direct (gris hors réseau). */
export const beaconMarker = (live: boolean) => el(`<div class="tt-car ${live ? 'tt-car--live' : 'tt-car--off'}"></div>`, 22, 22, 'Position du voyageur');

export const sponsorMarker = (logoUrl: string | null, name: string) =>
  el(`<div class="tt-sponsor">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="" loading="lazy" />` : `<span>${escapeHtml(name.slice(0, 2).toUpperCase())}</span>`}</div>`, 38, 38, `Sponsor : ${name}`);
