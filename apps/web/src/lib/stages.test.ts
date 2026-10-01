import { describe, expect, it } from 'vitest';
import { MAIN_PATH, MAIN_ROUTE, PATH, routeKmOf } from '@/components/landing/journey';
import { raidDay, routeProgress, stageState, type StageInput } from './stages';

const ROUTE = { ...MAIN_ROUTE, toleranceKm: 15 };
const MERZOUGA: [number, number] = [-3.99763, 31.21516];
const same = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

/** Trace GPS [lat, lon, t] qui suit un tracé [lon, lat], un point tous les ~500 m. */
function trace(path: [number, number][]) {
  const out: [number, number, number][] = [];
  path.forEach((b, i) => {
    const a = path[i - 1];
    if (!a) return void out.push([b[1], b[0], 0]);
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.005));
    for (let k = 1; k <= n; k++) out.push([a[1] + ((b[1] - a[1]) * k) / n, a[0] + ((b[0] - a[0]) * k) / n, out.length]);
  });
  return out;
}

// Étapes 2027 (comme en base après la migration 20261001000002).
const W = [
  { name: 'Biarritz', lat: 43.46484, lon: -1.53571, days: [1, 2] },
  { name: 'Salamanque', lat: 40.96821, lon: -5.66642, days: [3, 3] },
  { name: 'Algésiras', lat: 36.21315, lon: -5.41098, days: [4, 4] },
  { name: 'Tanger Med', lat: 35.87604, lon: -5.51333, days: [5, 5] },
  { name: 'Boulajoul', lat: 32.88438, lon: -4.98768, days: [5, 5] },
  { name: 'Merzouga', lat: 31.21516, lon: -3.99763, days: [6, 8], subs: [[7, 7], [8, 8]] },
  { name: 'Marrakech', lat: 31.58108, lon: -7.98231, days: [9, 12] },
];
const STOPS: StageInput[] = W.map((w) => ({
  km: routeKmOf(w.lat, w.lon)!,
  dayStart: w.days[0]!,
  dayEnd: w.days[1]!,
  subs: (w.subs ?? []).map(([a, b]) => ({ dayStart: a!, dayEnd: b! })),
}));
const MZ = 5;
const on = (day: number) => ({ phase: 'during' as const, day, total: 12, daysUntil: null });

const firstMerzouga = PATH.findIndex((p) => same(p, MERZOUGA));
const lastMerzouga = PATH.length - 1 - [...PATH].reverse().findIndex((p) => same(p, MERZOUGA));
const toMerzouga = trace(PATH.slice(0, firstMerzouga + 1));
const loops = trace(PATH.slice(firstMerzouga, lastMerzouga + 1));

describe('raidDay', () => {
  it('compte en jours calendaires et s’arrête à la date de fin', () => {
    expect(raidDay('2027-02-17', '2027-02-28', new Date(2027, 1, 16, 23, 59))).toMatchObject({ phase: 'before', daysUntil: 1 });
    expect(raidDay('2027-02-17', '2027-02-28', new Date(2027, 1, 17, 0, 0))).toMatchObject({ phase: 'during', day: 1, total: 12 });
    expect(raidDay('2027-02-17', '2027-02-28', new Date(2027, 1, 23, 18))).toMatchObject({ day: 7 });
    expect(raidDay('2027-02-17', '2027-02-28', new Date(2027, 1, 28, 23))).toMatchObject({ day: 12 });
    expect(raidDay('2027-02-17', '2027-02-28', new Date(2027, 2, 15))).toMatchObject({ phase: 'after', day: null });
    expect(raidDay(null, null).phase).toBe('unknown');
  });
});

describe('routeProgress', () => {
  it('place une trace qui s’arrête à Merzouga sur Merzouga', () => {
    expect(Math.abs(routeProgress(toMerzouga, ROUTE)! - STOPS[MZ]!.km)).toBeLessThan(3);
  });

  it('ne recule pas et ne compte pas les boucles comme de l’avance au-delà de leur rayon', () => {
    const km = routeProgress([...toMerzouga, ...loops], ROUTE)!;
    expect(km).toBeGreaterThanOrEqual(STOPS[MZ]!.km - 3);
    expect(km).toBeLessThan(STOPS[MZ]!.km + 100);
  });

  it('ignore la route depuis la maison avant d’arriver sur le parcours', () => {
    const fromParis = trace([[2.35, 48.85], [0.0, 44.5], [-1.53571, 43.46484]]);
    expect(routeProgress(fromParis, ROUTE)).toBe(0);
    expect(routeProgress(trace([[2.35, 48.85], [1.5, 47]]), ROUTE)).toBeNull();
  });

  it('suit tout le parcours jusqu’à Marrakech', () => {
    expect(routeProgress(trace(MAIN_PATH), ROUTE)).toBeCloseTo(MAIN_ROUTE.cum.at(-1)!, 0);
  });
});

describe('stageState', () => {
  it('J4L Club arrivé à Merzouga : Merzouga sur place, Marrakech à venir (bug corrigé)', () => {
    const s = stageState(STOPS, routeProgress(toMerzouga, ROUTE), on(6));
    expect(s.index).toBe(MZ);
    expect(s.here).toBe(true);
    expect(s.statuses[MZ + 1]).toBe('upcoming');
    expect(s.statuses[MZ - 1]).toBe('done');
  });

  it('pendant les boucles (J7, à 60 km du bivouac sur la route du marathon) : toujours Merzouga, boucle 1 en cours', () => {
    const s = stageState(STOPS, STOPS[MZ]!.km + 60, on(7));
    expect([s.index, s.here]).toEqual([MZ, true]);
    expect(s.subStatuses[MZ]).toEqual(['current', 'upcoming']);
    expect(stageState(STOPS, STOPS[MZ]!.km, on(8)).subStatuses[MZ]).toEqual(['done', 'current']);
  });

  // Boucles réelles : ~100 km chacune, retour au bivouac le soir. Pire cas : 50 km aller-retour SUR la
  // route du marathon (la trace « pousse » vers Marrakech), ou sur la route d'arrivée (vallée du Ziz).
  const mzIdx = MAIN_ROUTE.cum.findIndex((km) => km >= STOPS[MZ]!.km);
  const along = (fromIdx: number, km: number) => {
    const to = MAIN_ROUTE.cum.findIndex((c) => c >= MAIN_ROUTE.cum[fromIdx]! + km);
    const path = km > 0 ? MAIN_ROUTE.pts.slice(fromIdx, to + 1) : MAIN_ROUTE.pts.slice(MAIN_ROUTE.cum.findIndex((c) => c >= MAIN_ROUTE.cum[fromIdx]! + km), fromIdx + 1).reverse();
    return trace([...path, ...[...path].reverse()]);
  };
  const loopWest = along(mzIdx, 50);
  const loopNorth = along(mzIdx, -50);

  it('boucle de 100 km le long de la route du marathon : progression bornée à ~50 km après Merzouga', () => {
    const km = routeProgress([...toMerzouga, ...loopNorth, ...loopWest], ROUTE)!;
    expect(km - STOPS[MZ]!.km).toBeGreaterThan(40);
    expect(km - STOPS[MZ]!.km).toBeLessThan(55);
  });

  it('J7 et J8, après les deux boucles de 100 km : Merzouga reste sur place, Marrakech à venir', () => {
    const km = routeProgress([...toMerzouga, ...loopWest, ...loopNorth], ROUTE);
    for (const [day, subs] of [[6, ['upcoming', 'upcoming']], [7, ['current', 'upcoming']], [8, ['done', 'current']]] as const) {
      const s = stageState(STOPS, km, on(day));
      expect([s.index, s.here]).toEqual([MZ, true]);
      expect(s.statuses[MZ + 1]).toBe('upcoming');
      expect(s.subStatuses[MZ]).toEqual(subs);
    }
  });

  it('J9, départ du marathon : en route vers Marrakech, boucles faites', () => {
    const s = stageState(STOPS, STOPS[MZ]!.km + 60, on(9));
    expect([s.index, s.here]).toEqual([MZ + 1, false]);
    expect(s.statuses[MZ]).toBe('done');
    expect(s.subStatuses[MZ]).toEqual(['done', 'done']);
  });

  it('en retard sur le programme : la position l’emporte', () => {
    const s = stageState(STOPS, STOPS[1]!.km + 50, on(7));
    expect([s.index, s.here]).toEqual([2, false]);
  });

  it('sans position GPS pendant le raid : étape du programme', () => {
    expect(stageState(STOPS, null, on(7))).toMatchObject({ source: 'programme', index: MZ, here: true });
    expect(stageState(STOPS, null, on(9))).toMatchObject({ source: 'programme', index: MZ + 1, here: false });
    expect(stageState(STOPS, null, { phase: 'before', day: null, total: 12, daysUntil: 30 })).toMatchObject({ source: 'none', index: -1 });
  });

  it('arrivée à Marrakech', () => {
    expect(stageState(STOPS, STOPS.at(-1)!.km, on(10))).toMatchObject({ index: W.length - 1, here: true, finished: true });
  });
});
