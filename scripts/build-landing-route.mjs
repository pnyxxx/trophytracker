/**
 * Tracé du road trip d'exemple (J4L Club, partie Maroc) pour la carte de l'accueil : apps/tracker/demo/route.json
 * (Algésiras → Marrakech) simplifié et coupé à la position affichée (étape marathon, vers Tazzarine), avec les
 * étapes déjà passées.
 * Résultat : apps/web/src/components/landing/example-route.json (quelques Ko).
 *
 *   node scripts/build-landing-route.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const { points } = JSON.parse(readFileSync(new URL('apps/tracker/demo/route.json', root), 'utf8'));

/** Position affichée : l'étape marathon, vers Tazzarine, après Merzouga et le désert. */
const HERE = { lat: 30.779, lon: -5.565 };

const rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371e3 * Math.asin(Math.sqrt(h));
};

// Point le plus proche de la position affichée, dans la seconde moitié du trajet (la route repasse parfois).
let end = 0;
let best = Infinity;
points.forEach((p, i) => {
  const d = dist(p, [HERE.lon, HERE.lat]);
  if (i > points.length * 0.4 && d < best) { best = d; end = i; }
});
const done = points.slice(0, end + 1);
let km = 0;
for (let i = 1; i < done.length; i++) km += dist(done[i - 1], done[i]) / 1000;

/** Ramer-Douglas-Peucker en degrés (suffisant à cette échelle). */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  let idx = 0;
  let max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dx * (pts[i][1] - a[1]) - dy * (pts[i][0] - a[0])) / n;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

const path = simplify(done.map((p) => [p[0], p[1]]), 0.001).map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]);
const out = {
  path,
  here: path.at(-1),
  km: Math.round(km),
  altitude: Math.round(done.at(-1)[2]),
  // Étapes déjà passées : `label` = étiquette affichée sur la carte.
  stops: [
    { kind: 'night', lon: -5.41098, lat: 36.21315 },
    { kind: 'stop', lon: -5.50272, lat: 35.88752, label: 'traversée · Tanger Med' },
    { kind: 'night', lon: -4.98768, lat: 32.88438, label: 'bivouac · Boulajoul' },
    { kind: 'highlight', lon: -3.99763, lat: 31.21516, label: 'Merzouga · erg Chebbi' },
  ],
};
writeFileSync(new URL('apps/web/src/components/landing/example-route.json', root), `${JSON.stringify(out)}\n`);
console.log(`${path.length} points (sur ${done.length}), ${out.km} km, ${out.altitude} m, ${(JSON.stringify(out).length / 1024).toFixed(1)} Ko`);
