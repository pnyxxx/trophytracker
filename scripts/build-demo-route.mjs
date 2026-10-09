/**
 * Construit le trajet du road trip d'EXEMPLE (« Route des Grandes Alpes », /t/exemple), rejoué en boucle par le
 * service tracker (apps/tracker/src/demo.ts) :
 *   node scripts/build-demo-route.mjs
 *
 * À relancer seulement pour changer le trajet ou l'horaire : le résultat est commité.
 *  - Routes : calculées par OSRM (router.project-osrm.org) en passant par les cols de la Route des Grandes Alpes.
 *  - Altitude : Open-Meteo (modèle Copernicus 90 m), pour le profil d'élévation.
 *  - Horaire : vraie durée de conduite (vitesse plafonnée à celle d'un van), pause déjeuner, nuits raccourcies.
 *
 * Écrit apps/tracker/demo/route.json : points [lon, lat, altitude m, seconde du cycle] ; deux points au même
 * endroit = une pause.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ─── Le voyage, jour par jour : Thonon-les-Bains → Menton par les grands cols ──────────────────
const P = {
  thonon: [6.47970, 46.37050], morzine: [6.70890, 46.17950], cluses: [6.57970, 46.06060], colombiere: [6.47040, 45.99480],
  laClusaz: [6.42390, 45.90450], aravis: [6.46300, 45.87460], flumet: [6.51540, 45.81870], beaufort: [6.57170, 45.71860],
  roselend: [6.69640, 45.68690], bourgStMaurice: [6.76950, 45.61830],
  valDIsere: [6.97970, 45.44850], iseran: [7.03060, 45.41700], bonneval: [7.04640, 45.37130], lanslebourg: [6.87800, 45.28600],
  modane: [6.66500, 45.20030], stMichel: [6.46970, 45.21770], telegraphe: [6.44450, 45.20220], valloire: [6.42930, 45.16550],
  galibier: [6.40780, 45.06410], lautaret: [6.40400, 45.03490], briancon: [6.64360, 44.89860], izoard: [6.73500, 44.82030],
  guillestre: [6.64850, 44.65960], vars: [6.70320, 44.53890], barcelonnette: [6.65190, 44.38700],
  bonette: [6.80760, 44.32140], stEtienneTinee: [6.92300, 44.25650], stSauveur: [7.10460, 44.08490], stMartinVesubie: [7.25570, 44.06870],
  turini: [7.38970, 43.97750], sospel: [7.44780, 43.87700], menton: [7.49770, 43.77470],
};
const via = (...names) => names.map((n) => P[n]);

const LEGS = [
  { day: 1, parts: [{ road: via('thonon', 'morzine', 'cluses', 'colombiere', 'laClusaz', 'aravis', 'flumet', 'beaufort', 'roselend', 'bourgStMaurice') }] },
  { day: 2, parts: [{ road: via('bourgStMaurice', 'valDIsere', 'iseran', 'bonneval', 'lanslebourg', 'modane', 'stMichel', 'telegraphe', 'valloire') }] },
  { day: 3, parts: [{ road: via('valloire', 'galibier', 'lautaret', 'briancon', 'izoard', 'guillestre', 'vars', 'barcelonnette') }] },
  { day: 4, parts: [{ road: via('barcelonnette', 'bonette', 'stEtienneTinee', 'stSauveur', 'stMartinVesubie', 'turini', 'sospel', 'menton') }] },
];

/** Durée RÉELLE des nuits (en vrai : une quinzaine d'heures). */
const NIGHT_REAL = 20 * 60;
const LUNCH = 30 * 60;
/** Vitesse de croisière d'un van sur les routes de montagne. */
const MAX_KMH = 80;
/** Premier départ de la boucle : 2026-10-05 09:00 (Paris). Les cycles s'enchaînent depuis. */
const EPOCH = '2026-10-05T07:00:00Z';

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
const nodes = []; // [lon, lat, seconde réelle du cycle]
let real = 0;
let totalKm = 0;
const push = (lon, lat, t) => nodes.push([lon, lat, t]);

for (const [li, leg] of LEGS.entries()) {
  if (li > 0) {
    // Nuit : quelques minutes réelles pour toute la nuit.
    const prev = nodes.at(-1);
    real += NIGHT_REAL;
    push(prev[0], prev[1], real);
  }
  const roads = [];
  for (const part of leg.parts) {
    const t0 = real;
    if (part.wait) {
      const prev = nodes.at(-1);
      real += part.wait;
      push(prev[0], prev[1], real);
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

// Arrivée à Menton : trois quarts d'heure au bord de la mer, puis le cycle recommence à Thonon.
const arrival = real;
const FINAL_MIN = 45 * 60;
const cycle = Math.ceil((arrival + FINAL_MIN) / 3600) * 3600;
push(nodes.at(-1)[0], nodes.at(-1)[1], cycle);

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
console.log(`✅ ${Math.round(totalKm)} km, arrivée à Menton après ${(arrival / 3600).toFixed(1)} h, cycle de ${cycle / 3600} h.`);
