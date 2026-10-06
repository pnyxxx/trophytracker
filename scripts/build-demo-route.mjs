/**
 * Construit le trajet de l'équipage de DÉMONSTRATION (J4L Club), rejoué en boucle par le
 * service tracker (apps/tracker/src/demo.ts) :
 *   node scripts/build-demo-route.mjs
 *
 * À relancer seulement pour changer le trajet ou l'horaire : le résultat est commité.
 *  - Routes : calculées par OSRM (router.project-osrm.org) en passant par les points du tracé de
 *    l'accueil (road-path.json), pour suivre les vraies routes au mètre près.
 *  - Altitude : Open-Meteo (modèle Copernicus 90 m), pour le profil d'élévation.
 *  - Horaire : vraie durée de conduite (vitesse plafonnée à celle d'une 4L), pause déjeuner,
 *    nuits et village départ raccourcis.
 *
 * Écrit :
 *  - apps/tracker/demo/route.json : points [lon, lat, altitude m, seconde du cycle] ; deux points
 *    au même endroit = une pause.
 *  - apps/web/src/lib/demo-clock.json : correspondance « seconde du cycle → heure du raid » qui
 *    permet à la page de l'équipage de démo d'afficher le bon jour du raid et la bonne étape.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROAD = JSON.parse(readFileSync(new URL('../apps/web/src/components/landing/road-path.json', import.meta.url), 'utf8'));

// ─── Le voyage, jour par jour (jour 1 = premier jour du raid, village départ) ─────────────────
const SAINT_QUENTIN = [3.28757, 49.84737];
const LE_MANS = [0.19844, 48.00769];
const ROYAN = [-1.02811, 45.62415];
const BAYONNE = [-1.47486, 43.49292];
const at = (name) => {
  const stops = { biarritz: [-1.53571, 43.46484], salamanque: [-5.66642, 40.96821], algesiras: [-5.41098, 36.21315], boulajoul: [-4.98768, 32.88438], merzouga: [-3.99763, 31.21516] };
  const [lon, lat] = stops[name];
  const i = ROAD.findIndex(([x, y]) => x === lon && y === lat);
  if (i < 0) throw new Error(`${name} absent du tracé`);
  return i;
};
/** Points du tracé de l'accueil entre deux étapes (inclus) : la route suit le même chemin. */
const road = (from, to) => ROAD.slice(at(from), at(to) + 1);

// Ferry Algésiras → Tanger Med : le port, puis la traversée du détroit (OSRM ne route pas les ferries).
const PORT_ALGECIRAS = [-5.43665, 36.12986];
const SEA = [[-5.425, 36.1], [-5.42, 36.03], [-5.455, 35.94], [-5.49, 35.9]];
const PORT_TANGER_MED = [-5.50272, 35.88752];
const TANGER_MED_TO_BOULAJOUL = road('algesiras', 'boulajoul').slice(3); // après le port d'arrivée

/** heure « 08:30 » → secondes */
const hm = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 3600 + m * 60;
};
const DAY = 86_400;

const LEGS = [
  { day: -2, depart: '08:30', parts: [{ road: [SAINT_QUENTIN, LE_MANS] }] },
  { day: -1, depart: '09:00', parts: [{ road: [LE_MANS, ROYAN] }] },
  { day: 0, depart: '09:00', parts: [{ road: [ROYAN, BAYONNE] }] },
  { day: 1, depart: '10:00', parts: [{ road: [BAYONNE, ROAD[at('biarritz')]] }] },
  { day: 3, depart: '06:30', parts: [{ road: road('biarritz', 'salamanque') }] },
  { day: 4, depart: '06:30', parts: [{ road: road('salamanque', 'algesiras') }] },
  {
    day: 5, depart: '06:00', lunch: false,
    parts: [
      { road: [ROAD[at('algesiras')], PORT_ALGECIRAS] },
      { wait: 45 * 60 }, // embarquement
      { sea: [PORT_ALGECIRAS, ...SEA, PORT_TANGER_MED], kmh: 32 },
      { wait: 40 * 60 }, // débarquement et douane
      { road: [PORT_TANGER_MED, ...TANGER_MED_TO_BOULAJOUL], lunch: true },
    ],
  },
  { day: 6, depart: '07:00', parts: [{ road: road('boulajoul', 'merzouga') }] },
];

/** Réveil à Merzouga le lendemain de l'arrivée : la boucle 1 est « au départ ». */
const END = { day: 7, at: '08:00' };
/** Durée RÉELLE des nuits et du village départ (en vrai : une quinzaine d'heures, ou deux jours). */
const NIGHT_REAL = 20 * 60;
const VILLAGE_REAL = 45 * 60;
const LUNCH = 30 * 60;
/** Vitesse de croisière d'une 4L. */
const MAX_KMH = 100;
/** Premier départ de la boucle : 2026-10-05 06:00 (Paris). Les cycles s'enchaînent depuis. */
const EPOCH = '2026-10-05T04:00:00Z';

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
 * Durées d'OSRM, ralenties à MAX_KMH quand OSRM roule plus vite qu'une 4L.
 * Un point de passage accroché à la mauvaise voie d'une autoroute (ou à une piste isolée) fait faire
 * un grand détour : il est alors retiré et l'itinéraire recalculé.
 */
async function route(input) {
  let pts = input;
  for (;;) {
    const coords = pts.map(([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`).join(';');
    const data = await getJson(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&annotations=distance,duration&continue_straight=true`);
    if (data.code !== 'Ok') throw new Error(`OSRM : ${data.code}`);
    const r = data.routes[0];
    const bad = r.legs.findIndex((leg, i) => leg.distance / 1000 > Math.max(2, km(pts[i], pts[i + 1]) * 1.8));
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
const nodes = []; // [lon, lat, seconde réelle du cycle]
const clock = []; // [seconde réelle du cycle, seconde du raid depuis le jour 1 à 00:00]
let real = 0;
let totalKm = 0;
const push = (lon, lat, t) => nodes.push([lon, lat, t]);

for (const [li, leg] of LEGS.entries()) {
  const virtualDepart = (leg.day - 1) * DAY + hm(leg.depart);
  if (li > 0) {
    // Nuit (ou village départ) : quelques minutes réelles pour toute la nuit du raid.
    const prev = nodes.at(-1);
    real += LEGS[li - 1].day === 1 ? VILLAGE_REAL : NIGHT_REAL;
    push(prev[0], prev[1], real);
  }
  clock.push([real, virtualDepart]);
  let legDuration = 0;
  const legStart = real;
  const roads = [];
  for (const part of leg.parts) {
    const t0 = real;
    if (part.wait) {
      const prev = nodes.at(-1);
      real += part.wait;
      push(prev[0], prev[1], real);
    } else if (part.sea) {
      for (let k = 1; k < part.sea.length; k++) {
        real += (km(part.sea[k - 1], part.sea[k]) / part.kmh) * 3600;
        totalKm += km(part.sea[k - 1], part.sea[k]);
        push(part.sea[k][0], part.sea[k][1], real);
      }
      if (!nodes.length) throw new Error('la traversée ne peut pas ouvrir le voyage');
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
    legDuration = real - legStart;
  }
  clock.push([real, virtualDepart + legDuration]);
}

// Arrivée à Merzouga : on y reste jusqu'au matin de la boucle 1, puis le cycle recommence.
const arrival = real;
const virtualEnd = (END.day - 1) * DAY + hm(END.at);
const FINAL_MIN = 45 * 60;
const cycle = Math.ceil((arrival + FINAL_MIN) / 3600) * 3600;
push(nodes.at(-1)[0], nodes.at(-1)[1], cycle);
clock.push([cycle, virtualEnd]);

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
const meta = { epoch: EPOCH, cycleS: cycle };
mkdirSync(new URL('../apps/tracker/demo/', import.meta.url), { recursive: true });
writeFileSync(new URL('../apps/tracker/demo/route.json', import.meta.url), JSON.stringify({ ...meta, points: out }));
writeFileSync(
  new URL('../apps/web/src/lib/demo-clock.json', import.meta.url),
  `${JSON.stringify({ ...meta, clock: clock.map(([r, v]) => [Math.round(r), Math.round(v)]) }, null, 1)}\n`,
);
console.log(`✅ ${Math.round(totalKm)} km, arrivée à Merzouga après ${(arrival / 3600).toFixed(1)} h, cycle de ${cycle / 3600} h.`);
