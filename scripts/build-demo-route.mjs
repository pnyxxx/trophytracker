/**
 * Construit le trajet du road trip d'EXEMPLE (J4L Club, partie Maroc du raid), rejoué en boucle par le service
 * tracker (apps/tracker/src/demo.ts) :
 *   node scripts/build-demo-route.mjs
 *
 * À relancer seulement pour changer le trajet ou l'horaire : le résultat est commité.
 *  - Routes : calculées par OSRM (router.project-osrm.org) en passant par les vraies étapes du raid et les
 *    lieux des photos de l'équipage ; la traversée du détroit est tracée à la main (OSRM ne route pas les ferries).
 *  - Altitude : Open-Meteo (modèle Copernicus 90 m), pour le profil d'élévation.
 *  - Horaire : vraie durée de conduite (vitesse plafonnée à celle d'une 4L), pause déjeuner, nuits raccourcies.
 *
 * Le début du trajet (de la fin de l'Espagne au bivouac de Boulajoul) est « déjà fait » au début de chaque tour
 * (headS) : la page n'est jamais vide, ses premières photos sont déjà là. La boucle animée part de Boulajoul.
 *
 * Écrit apps/tracker/demo/route.json : points [lon, lat, altitude m, seconde du trajet] ; deux points au même
 * endroit = une pause ; `headS` = seconde où commence la partie animée ; `cycleS` = durée de la partie animée.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ─── Le voyage : du bivouac d'Algésiras à Marrakech (étapes du raid, lieux des photos de J4L Club) ─────────
const P = {
  algesiras: [-5.41098, 36.21315], portAlgesiras: [-5.43665, 36.12986],
  portTangerMed: [-5.50272, 35.88752], fes: [-5.0078, 34.0331], ifrane: [-5.1106, 33.5228], azrou: [-5.2216, 33.4341],
  boulajoul: [-4.98768, 32.88438], midelt: [-4.7457, 32.6852], errachidia: [-4.4244, 31.9314], erfoud: [-4.2286, 31.4326],
  merzouga: [-3.99763, 31.21516], desert: [-3.937, 31.054], rissani: [-4.2678, 31.2794], alnif: [-5.166, 31.115],
  tazzarineSud: [-5.423, 30.694], tazzarine: [-5.565, 30.779], nkob: [-5.667, 30.843], agdz: [-6.4489, 30.6948],
  ouarzazate: [-6.9063, 30.9189], tichka: [-7.3806, 31.2871], marrakech: [-7.98231, 31.58108],
};
const via = (...names) => names.map((n) => P[n]);
const SEA = [[-5.425, 36.1], [-5.42, 36.03], [-5.455, 35.94], [-5.49, 35.9]];

const LEGS = [
  {
    day: 1, lunch: false,
    parts: [
      { road: via('algesiras', 'portAlgesiras') },
      { wait: 45 * 60 }, // embarquement
      { sea: [P.portAlgesiras, ...SEA, P.portTangerMed], kmh: 32 },
      { wait: 40 * 60 }, // débarquement et douane
      { road: via('portTangerMed', 'fes', 'ifrane', 'azrou', 'boulajoul'), lunch: true },
    ],
  },
  { day: 2, parts: [{ road: via('boulajoul', 'midelt', 'errachidia', 'erfoud', 'merzouga') }] },
  { day: 3, parts: [{ road: via('merzouga', 'desert', 'merzouga') }] },
  { day: 4, parts: [{ road: via('merzouga', 'rissani', 'alnif', 'tazzarineSud', 'tazzarine', 'nkob', 'agdz') }] },
  { day: 5, parts: [{ road: via('agdz', 'ouarzazate', 'tichka', 'marrakech') }] },
];
/** Le premier jour (jusqu'au bivouac de Boulajoul, nuit comprise) est « déjà fait » au début de chaque tour. */
const HEAD_DAYS = 1;

/** Durée RÉELLE des nuits (en vrai : une quinzaine d'heures). */
const NIGHT_REAL = 20 * 60;
const LUNCH = 30 * 60;
/** Vitesse de croisière d'une 4L sur les routes marocaines. */
const MAX_KMH = 90;
/** Premier départ de la boucle : 2026-11-13 09:00 (Paris). Les cycles s'enchaînent depuis. */
const EPOCH = '2026-11-13T08:00:00Z';

// ─── Outils ─────────────────────────────────────────────────────────────────
const toRad = (d) => (d * Math.PI) / 180;
const km = ([lon1, lat1], [lon2, lat2]) => {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Réponses gardées en cache (dossier temporaire) : relancer le script ne refait pas les appels.
const CACHE = join(tmpdir(), 'trophytracker-demo-route');
mkdirSync(CACHE, { recursive: true });

let fromCache = false;
async function getJson(url) {
  const file = join(CACHE, `${createHash('sha1').update(url).digest('hex')}.json`);
  fromCache = existsSync(file);
  if (fromCache) return JSON.parse(readFileSync(file, 'utf8'));
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        writeFileSync(file, JSON.stringify(data));
        return data;
      }
      if (attempt >= 5) throw new Error(`${res.status} ${url.slice(0, 120)}`);
      await sleep(res.status === 429 ? 65_000 : 2000 * attempt);
    } catch (e) {
      // Coupure réseau : on réessaie.
      if (attempt >= 5 || !(e instanceof TypeError)) throw e;
      await sleep(5000 * attempt);
    }
  }
}

/**
 * Itinéraire routier passant par `pts` : [[lon, lat, secondes depuis le début]].
 * Durées d'OSRM, ralenties à MAX_KMH quand OSRM roule plus vite qu'un van.
 * Un point de passage accroché à une route fermée ou à une piste isolée fait faire un grand détour :
 * il est alors retiré et l'itinéraire recalculé.
 */
async function route(input) {
  let pts = input;
  for (;;) {
    const coords = pts.map(([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`).join(';');
    const data = await getJson(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&annotations=distance,duration&continue_straight=true`);
    if (data.code !== 'Ok') throw new Error(`OSRM : ${data.code}`);
    const r = data.routes[0];
    // Routes de montagne : un col fait facilement 2 à 2,5 fois la distance à vol d'oiseau.
    const bad = r.legs.findIndex((leg, i) => leg.distance / 1000 > Math.max(2, km(pts[i], pts[i + 1]) * 3.2));
    if (bad >= 0) {
      const drop = bad + 1 < pts.length - 1 ? bad + 1 : bad;
      if (drop === 0) throw new Error('détour au premier point : à corriger à la main');
      process.stdout.write(`(point ${drop} retiré : détour) `);
      pts = pts.filter((_, i) => i !== drop);
      continue;
    }
    const out = [];
    let t = 0;
    r.legs.forEach((leg, li) => {
      // La géométrie du trajet complet enchaîne les étapes ; chaque étape a ses annotations par segment.
      const start = r.legs.slice(0, li).reduce((n, l) => n + l.annotation.distance.length, 0);
      leg.annotation.distance.forEach((d, k) => {
        const a = r.geometry.coordinates[start + k];
        const b = r.geometry.coordinates[start + k + 1];
        if (!out.length) out.push([a[0], a[1], 0]);
        t += Math.max(leg.annotation.duration[k], (d / 1000 / MAX_KMH) * 3600);
        out.push([b[0], b[1], t]);
      });
    });
    return { pts: out, km: r.distance / 1000 };
  }
}

/** Retire les points inutiles (Douglas-Peucker, tolérance en mètres) en gardant les extrémités. */
function simplify(pts, tolM) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    const k0 = Math.cos(toRad(pts[i][1]));
    const [ax, ay, bx, by] = [pts[i][0] * k0, pts[i][1], pts[j][0] * k0, pts[j][1]];
    const [dx, dy] = [bx - ax, by - ay];
    let [far, best] = [-1, 0];
    for (let k = i + 1; k < j; k++) {
      const [px, py] = [pts[k][0] * k0, pts[k][1]];
      const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
      const d = Math.hypot(px - ax - t * dx, py - ay - t * dy) * 111_320;
      if (d > best) [far, best] = [k, d];
    }
    if (best > tolM) {
      keep[far] = 1;
      stack.push([i, far], [far, j]);
    }
  }
  return pts.filter((_, k) => keep[k]);
}

// ─── Construction ───────────────────────────────────────────────────────────
const nodes = []; // [lon, lat, seconde réelle du trajet]
let real = 0;
/** Seconde où commence la partie animée (après la nuit du dernier jour « déjà fait »). */
let headS = 0;
let totalKm = 0;
const push = (lon, lat, t) => nodes.push([lon, lat, t]);

for (const [li, leg] of LEGS.entries()) {
  if (li > 0) {
    // Nuit : quelques minutes réelles pour toute la nuit.
    const prev = nodes.at(-1);
    real += NIGHT_REAL;
    push(prev[0], prev[1], real);
  }
  if (li === HEAD_DAYS) headS = real;
  const roads = [];
  for (const part of leg.parts) {
    const t0 = real;
    if (part.wait) {
      const prev = nodes.at(-1);
      real += part.wait;
      push(prev[0], prev[1], real);
    } else if (part.sea) {
      // Traversée en ferry : en ligne droite d'un point de la mer à l'autre, à la vitesse du bateau.
      process.stdout.write(`Jour ${leg.day} : traversée… `);
      let seaKm = 0;
      part.sea.forEach((pt, k) => {
        if (k === 0) return;
        const d = km(part.sea[k - 1], pt);
        seaKm += d;
        real += (d / part.kmh) * 3600;
        push(pt[0], pt[1], real);
      });
      totalKm += seaKm;
      console.log(`${seaKm.toFixed(0)} km`);
    } else {
      process.stdout.write(`Jour ${leg.day} : route de ${part.road.length} points… `);
      const r = await route(part.road);
      totalKm += r.km;
      console.log(`${r.km.toFixed(0)} km, ${(r.pts.at(-1)[2] / 3600).toFixed(1)} h`);
      // Pause déjeuner au milieu des longues étapes de route.
      const wantsLunch = (part.lunch ?? leg.lunch ?? true) && r.pts.at(-1)[2] > 3 * 3600;
      const mid = r.pts.at(-1)[2] / 2;
      let lunched = !wantsLunch;
      r.pts.forEach(([lon, lat, t], k) => {
        if (k === 0 && nodes.length) return; // déjà là
        push(lon, lat, t0 + t + (lunched && wantsLunch ? LUNCH : 0));
        if (!lunched && t >= mid) {
          lunched = true;
          push(lon, lat, t0 + t + LUNCH);
        }
      });
      real = nodes.at(-1)[2];
      roads.push(r);
    }
  }
}

// Arrivée à Marrakech : trois quarts d'heure sur place, puis le tour recommence au départ de Boulajoul.
const arrival = real;
const FINAL_MIN = 45 * 60;
const end = Math.ceil((arrival + FINAL_MIN) / 3600) * 3600;
push(nodes.at(-1)[0], nodes.at(-1)[1], end);
const cycle = end - headS;

// Points superflus retirés sur les routes (les pauses et les heures de passage sont gardées).
const before = nodes.length;
const slim = [];
let run = [];
const flush = () => {
  if (run.length) slim.push(...simplify(run, 8));
  run = [];
};
nodes.forEach((n, i) => {
  const prev = nodes[i - 1];
  const next = nodes[i + 1];
  const pause = (prev && prev[0] === n[0] && prev[1] === n[1]) || (next && next[0] === n[0] && next[1] === n[1]);
  if (pause) {
    flush();
    slim.push(n);
  } else run.push(n);
});
flush();
console.log(`Points : ${before} → ${slim.length}`);

// ─── Altitude (Open-Meteo, 100 points par requête) ────────────────────────────
// Un échantillon tous les ~1 km, interpolé ensuite sur chaque point du trajet. Open-Meteo compte
// chaque coordonnée comme un appel (600 par minute) : une requête de 100 points toutes les 11 s.
const samples = [];
let acc = 0;
slim.forEach((n, i) => {
  if (i) acc += km(slim[i - 1], n);
  if (!i || acc >= 1 || i === slim.length - 1) {
    samples.push(i);
    acc = 0;
  }
});
const elev = new Map();
for (let s = 0; s < samples.length; s += 100) {
  const chunk = samples.slice(s, s + 100);
  const lat = chunk.map((i) => slim[i][1].toFixed(5)).join(',');
  const lon = chunk.map((i) => slim[i][0].toFixed(5)).join(',');
  const data = await getJson(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
  chunk.forEach((i, k) => elev.set(i, data.elevation[k]));
  process.stdout.write(`\rAltitude : ${Math.min(s + 100, samples.length)}/${samples.length}`);
  if (!fromCache) await sleep(11_000);
}
console.log();
const altitudes = slim.map((_, i) => {
  if (elev.has(i)) return elev.get(i);
  const k = samples.findIndex((s) => s > i);
  const [a, b] = [samples[k - 1], samples[k]];
  return elev.get(a) + ((elev.get(b) - elev.get(a)) * (i - a)) / (b - a);
});
// La mer est à 0 m (le modèle donne parfois une valeur négative au large).
const out = slim.map(([lon, lat, t], i) => [+lon.toFixed(5), +lat.toFixed(5), Math.max(0, Math.round(altitudes[i])), Math.round(t * 10) / 10]);

// ─── Écriture ───────────────────────────────────────────────────────────────
const meta = { epoch: EPOCH, headS: Math.round(headS), cycleS: Math.round(cycle) };
mkdirSync(new URL('../apps/tracker/demo/', import.meta.url), { recursive: true });
writeFileSync(new URL('../apps/tracker/demo/route.json', import.meta.url), JSON.stringify({ ...meta, points: out }));
console.log(`✅ ${Math.round(totalKm)} km ; déjà fait : ${(headS / 3600).toFixed(1)} h ; boucle animée : ${(cycle / 3600).toFixed(1)} h jusqu'à Marrakech.`);
