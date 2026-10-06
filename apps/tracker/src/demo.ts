/**
 * Équipage de DÉMONSTRATION (crews.is_demo) : sa page vit en permanence.
 *
 * Le tracker lui fait rejouer en boucle un vrai trajet (Saint-Quentin → Le Mans → Royan → Bayonne →
 * Biarritz → … → Merzouga, construit par scripts/build-demo-route.mjs) comme si son téléphone
 * envoyait sa position toutes les 15 s : mêmes fonctions de réception que les vrais équipages, donc
 * trace, compteurs, temps réel et carte se comportent exactement comme pendant le raid.
 *
 * Vitesses réelles (pas d'accéléré) ; seules les nuits et le village départ sont raccourcis à
 * quelques minutes. Les tours s'enchaînent depuis une date fixe (epoch) : en cas de redémarrage, le
 * tracker rattrape les positions manquées, et au début d'un tour il efface la trace du précédent.
 */
import { readFileSync } from 'node:fs';
import type { Db } from './db.js';
import type { IncomingPoint } from './points.js';

export interface DemoRoute {
  /** Début du premier tour (ISO). */
  epoch: string;
  /** Durée d'un tour (s). */
  cycleS: number;
  /** [lon, lat, altitude m, seconde du tour] ; deux points au même endroit = une pause. */
  points: [number, number, number, number][];
}

/** Une position toutes les 15 s, comme un téléphone. */
export const DEMO_STEP_S = 15;
/** Rattrapage après une coupure : une position toutes les 30 s suffit. */
const CATCH_UP_STEP_S = 30;

export function loadDemoRoute(file: URL = new URL('../demo/route.json', import.meta.url)): DemoRoute {
  return JSON.parse(readFileSync(file, 'utf8')) as DemoRoute;
}

/** Début (ms) du tour en cours à l'instant `now`. */
export function cycleStart(route: Pick<DemoRoute, 'epoch' | 'cycleS'>, now: number): number {
  const epoch = Date.parse(route.epoch);
  const len = route.cycleS * 1000;
  return epoch + Math.floor((now - epoch) / len) * len;
}

const toRad = (d: number) => (d * Math.PI) / 180;
function distanceM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(a));
}
function bearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Position de la 4L à la seconde `s` du tour, entre deux points du trajet. */
export function demoPosition(route: DemoRoute, s: number): Omit<IncomingPoint, 'recordedAt' | 'source'> {
  const pts = route.points;
  // Dernier point du trajet atteint à la seconde s (recherche dichotomique).
  let [lo, hi] = [0, pts.length - 1];
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (pts[mid]![3] <= s) lo = mid;
    else hi = mid - 1;
  }
  const a = pts[lo]!;
  const b = pts[Math.min(lo + 1, pts.length - 1)]!;
  const [lonA, latA, altA, tA] = a;
  const [lonB, latB, altB, tB] = b;
  const f = tB > tA ? Math.min(1, Math.max(0, (s - tA) / (tB - tA))) : 0;
  const d = distanceM(latA, lonA, latB, lonB);
  const moving = d > 0 && tB > tA && s < tB;
  // Vitesse du tronçon, avec la petite variation d'un vrai compteur.
  const speed = moving ? (d / (tB - tA)) * 3.6 * (1 + 0.04 * Math.sin(s / 23)) : 0;
  return {
    lat: latA + (latB - latA) * f,
    lon: lonA + (lonB - lonA) * f,
    altitude: altA + (altB - altA) * f,
    speedKmh: Math.round(speed * 10) / 10,
    course: moving ? Math.round(bearing(latA, lonA, latB, lonB)) : null,
    accuracy: 8,
  };
}

/** Instants (ms) des positions à envoyer après `last` (exclu) jusqu'à `now` (inclus). */
export function demoTimes(last: number | null, start: number, now: number): number[] {
  const times: number[] = [];
  let t = last == null ? start : last + DEMO_STEP_S * 1000;
  const step = now - t > 5 * 60_000 ? CATCH_UP_STEP_S * 1000 : DEMO_STEP_S * 1000;
  for (; t < now; t += step) times.push(t);
  times.push(now);
  return times;
}

/** Fait rouler l'équipage de démo (s'il y en a un). Renvoie la fonction d'arrêt. */
export function startDemoDriver(db: Db, route: DemoRoute, log: (msg: string) => void): () => void {
  let busy = false;
  /** Dernière position envoyée : évite de renvoyer le même rattrapage si le suivi a été arrêté. */
  let sent: number | null = null;

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const crew = await db.demoCrew();
      if (!crew) return;
      const now = Date.now();
      const start = cycleStart(route, now);
      let last = Math.max(crew.last_fix_at?.getTime() ?? -Infinity, sent ?? -Infinity);
      if (!Number.isFinite(last) || last < start) {
        await db.demoRestart();
        log('démo : nouveau tour, départ de Saint-Quentin');
        last = NaN;
      }
      const times = demoTimes(Number.isNaN(last) ? null : last, start, now);
      if (times.length > 20) log(`démo : rattrapage de ${times.length} positions`);
      for (const t of times) {
        await db.ingest(crew.id, { ...demoPosition(route, (t - start) / 1000), recordedAt: new Date(t), source: 'device' });
        sent = t;
      }
    } catch (e) {
      log(`démo : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      busy = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), DEMO_STEP_S * 1000);
  return () => clearInterval(timer);
}
