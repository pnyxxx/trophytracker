import { describe, expect, it } from 'vitest';
import { routeKmOf } from '@/components/landing/journey';
import { loopStatus, plannedFor, raidDay, stageState, type StageInput, type StagePoint } from './stages';

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
  lat: w.lat,
  lon: w.lon,
  km: routeKmOf(w.lat, w.lon)!,
  dayStart: w.days[0]!,
  dayEnd: w.days[1]!,
  subs: (w.subs ?? []).map(([a, b]) => ({ lat: w.lat, lon: w.lon, dayStart: a!, dayEnd: b! })),
}));
const [ALG, TANGER, BOUL, MZ, MRK] = [2, 3, 4, 5, 6];
const on = (day: number) => ({ phase: 'during' as const, day, total: 12, daysUntil: null });
/** Une position à `dx` degrés à l'est d'une étape (0,1° ≈ 9,5 km à cette latitude), le jour `day`. */
const near = (i: number, day: number, dx = 0): StagePoint => ({ lat: STOPS[i]!.lat, lon: STOPS[i]!.lon + dx, day });
const state = (day: number, points: StagePoint[], routeKm: number | null = null) => stageState(STOPS, on(day), points, routeKm);

// Arrivée à Merzouga le soir du J6.
const ARRIVED = [near(BOUL, 5), near(BOUL, 6), near(MZ, 6, 0.5), near(MZ, 6)];

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

describe('le jour choisit l’étape', () => {
  it('programme : J7 = Boucle 1, J8 = Boucle 2, J9 = marathon vers Marrakech', () => {
    expect(plannedFor(STOPS, 7)).toEqual({ index: MZ, sub: 0 });
    expect(plannedFor(STOPS, 8)).toEqual({ index: MZ, sub: 1 });
    expect(plannedFor(STOPS, 9)).toEqual({ index: MRK, sub: -1 });
  });

  it('avant le départ : aucune étape en cours, même avec une trace d’essai', () => {
    const s = stageState(STOPS, { phase: 'before', day: null, total: 12, daysUntil: 30 }, [], 1896);
    expect(s).toMatchObject({ source: 'none', index: -1, progressKm: 0 });
    expect(s.statuses.every((x) => x === 'upcoming')).toBe(true);
  });

  it('après le raid : tout est passé', () => {
    const s = stageState(STOPS, { phase: 'after', day: null, total: 12, daysUntil: null }, [], null);
    expect(s.statuses.every((x) => x === 'done')).toBe(true);
    expect(s.subStatuses[MZ]).toEqual(['done', 'done']);
  });
});

describe('le GPS précise la journée', () => {
  it('J6 au matin, encore à Boulajoul : en route vers Merzouga', () => {
    const s = state(6, [near(BOUL, 5), near(BOUL, 6)]);
    expect([s.index, s.here, s.source]).toEqual([MZ, false, 'gps']);
    expect(s.statuses[BOUL]).toBe('done');
  });

  it('J6 au soir, arrivés à Merzouga : sur place, Marrakech à venir (bug corrigé)', () => {
    const s = state(6, ARRIVED);
    expect([s.index, s.here]).toEqual([MZ, true]);
    expect(s.statuses[MRK]).toBe('upcoming');
    expect(s.subStatuses[MZ]).toEqual(['upcoming', 'upcoming']);
  });

  it('J5 : Tanger Med puis Boulajoul', () => {
    expect(state(5, [near(ALG, 4), near(ALG, 5)])).toMatchObject({ index: TANGER, here: false });
    expect(state(5, [near(ALG, 5), near(TANGER, 5), near(TANGER, 5, 0.6)])).toMatchObject({ index: BOUL, here: false });
    expect(state(5, [near(TANGER, 5), near(BOUL, 5)])).toMatchObject({ index: BOUL, here: true });
  });

  it('barre de progression : entre l’étape précédente et l’étape du jour', () => {
    const s = state(6, [near(BOUL, 6, 0.5)], STOPS[BOUL]!.km + 100);
    expect(s.progressKm).toBe(STOPS[BOUL]!.km + 100);
    expect(state(6, [near(BOUL, 6)], STOPS[MRK]!.km).progressKm).toBe(STOPS[MZ]!.km); // jamais au-delà
    expect(state(6, ARRIVED, null).progressKm).toBe(STOPS[MZ]!.km);
  });
});

describe('les boucles de Merzouga (~100 km, retour au bivouac le soir)', () => {
  it('J7 au bivouac : Boucle 1 au départ', () => {
    const s = state(7, [...ARRIVED, near(MZ, 7), near(MZ, 7, 0.02)]); // 2 km : on traverse le camp
    expect([s.index, s.here]).toEqual([MZ, true]);
    expect(s.subStatuses[MZ]).toEqual(['ready', 'upcoming']);
  });

  it('J7, la 4L s’éloigne de plus de 5 km : Boucle 1 en cours, Merzouga reste l’étape', () => {
    const s = state(7, [...ARRIVED, near(MZ, 7), near(MZ, 7, 0.1), near(MZ, 7, 0.45)]);
    expect([s.index, s.here]).toEqual([MZ, true]);
    expect(s.subStatuses[MZ]).toEqual(['current', 'upcoming']);
    expect(s.statuses[MRK]).toBe('upcoming');
  });

  it('J7, retour au bivouac : Boucle 1 faite', () => {
    const s = state(7, [...ARRIVED, near(MZ, 7), near(MZ, 7, 0.45), near(MZ, 7, 0.01)]);
    expect(s.subStatuses[MZ]).toEqual(['done', 'upcoming']);
  });

  it('J8 : Boucle 1 faite, Boucle 2 selon la position du jour', () => {
    const day7 = [near(MZ, 7, 0.45), near(MZ, 7)];
    expect(state(8, [...ARRIVED, ...day7, near(MZ, 8)]).subStatuses[MZ]).toEqual(['done', 'ready']);
    expect(state(8, [...ARRIVED, ...day7, near(MZ, 8), near(MZ, 8, -0.4)]).subStatuses[MZ]).toEqual(['done', 'current']);
  });

  it('loopStatus : seuils de 5 km pour partir, 3 km pour revenir', () => {
    const base = STOPS[MZ]!;
    expect(loopStatus([near(MZ, 7, 0.04)], base)).toBe('ready'); // ~4 km
    expect(loopStatus([near(MZ, 7, 0.06)], base)).toBe('current'); // ~6 km
    expect(loopStatus([near(MZ, 7, 0.3), near(MZ, 7, 0.04)], base)).toBe('current'); // revenu à 4 km : pas encore
    expect(loopStatus([near(MZ, 7, 0.3), near(MZ, 7, 0.02)], base)).toBe('done');
  });
});

describe('marathon et arrivée', () => {
  it('J9, même encore près de Merzouga : en route vers Marrakech, boucles faites', () => {
    const s = state(9, [...ARRIVED, near(MZ, 9)]);
    expect([s.index, s.here]).toEqual([MRK, false]);
    expect(s.statuses[MZ]).toBe('done');
    expect(s.subStatuses[MZ]).toEqual(['done', 'done']);
  });

  it('J10 au matin, pas encore à Marrakech : toujours en route ; puis arrivés', () => {
    expect(state(10, [near(MZ, 9, -2), near(MZ, 10, -3)])).toMatchObject({ index: MRK, here: false, finished: false });
    expect(state(10, [near(MZ, 10, -3), near(MRK, 10)])).toMatchObject({ index: MRK, here: true, finished: true });
  });
});

describe('sans GPS : l’étape du programme', () => {
  it('J7 : Merzouga, Boucle 1 en cours', () => {
    const s = state(7, []);
    expect(s).toMatchObject({ source: 'programme', index: MZ, here: true });
    expect(s.subStatuses[MZ]).toEqual(['current', 'upcoming']);
  });

  it('premier jour d’une étape : en route ; jours suivants : sur place', () => {
    expect(state(9, [])).toMatchObject({ index: MRK, here: false });
    expect(state(11, [])).toMatchObject({ index: MRK, here: true });
    expect(state(1, [])).toMatchObject({ index: 0, here: true });
  });
});
