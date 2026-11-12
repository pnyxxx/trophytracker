/**
 * Tracé du road trip d'exemple pour la carte de l'accueil : apps/tracker/demo/route.json (Thonon → Menton)
 * simplifié et coupé à la position affichée (approche du col d'Izoard), avec les étapes déjà passées.
 * Résultat : apps/web/src/components/landing/example-route.json (quelques Ko).
 *
 *   node scripts/build-landing-route.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const { points } = JSON.parse(readFileSync(new URL('apps/tracker/demo/route.json', root), 'utf8'));

/** Position affichée : peu avant le col d'Izoard, après Briançon. */
const HERE = { lat: 44.835, lon: 6.712 };

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
  // Étapes déjà passées (scripts/lib-demo-crew.mjs) : `label` = étiquette affichée sur la carte.
  stops: [
    { kind: 'start', lon: 6.4797, lat: 46.3705 },
    { kind: 'highlight', lon: 6.4704, lat: 45.9948 },
    { kind: 'highlight', lon: 6.6964, lat: 45.6869 },
    { kind: 'night', lon: 6.7695, lat: 45.6183, label: 'nuit · Bourg-Saint-Maurice' },
    { kind: 'highlight', lon: 7.0306, lat: 45.417, label: 'col de l’Iseran · 2 764 m' },
    { kind: 'night', lon: 6.4293, lat: 45.1655 },
    { kind: 'highlight', lon: 6.4078, lat: 45.0641, label: 'col du Galibier · 2 642 m' },
    { kind: 'stop', lon: 6.6436, lat: 44.8986 },
  ],
};
writeFileSync(new URL('apps/web/src/components/landing/example-route.json', root), `${JSON.stringify(out)}\n`);
console.log(`${path.length} points (sur ${done.length}), ${out.km} km, ${out.altitude} m, ${(JSON.stringify(out).length / 1024).toFixed(1)} Ko`);
