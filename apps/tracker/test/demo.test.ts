import { describe, expect, it } from 'vitest';
import { cycleStart, demoPosition, demoTimes, loadDemoRoute, type DemoRoute } from '../src/demo.js';

// 0 → 100 s : 1 km vers le nord (36 km/h) ; 100 → 160 s : pause ; puis encore 1 km en 100 s.
const ROUTE: DemoRoute = {
  epoch: '2026-10-05T04:00:00Z',
  cycleS: 300,
  points: [
    [3, 49, 100, 0],
    [3, 49.008993, 120, 100],
    [3, 49.008993, 120, 160],
    [3, 49.017986, 140, 260],
  ],
};

describe('démo : position rejouée', () => {
  it('avance le long du trajet à la bonne vitesse', () => {
    const p = demoPosition(ROUTE, 50);
    expect(p.lat).toBeCloseTo(49.0045, 4);
    expect(p.altitude).toBeCloseTo(110);
    expect(p.speedKmh).toBeGreaterThan(34);
    expect(p.speedKmh).toBeLessThan(38);
    expect(p.course).toBe(0);
  });

  it('reste sur place, vitesse nulle, pendant une pause', () => {
    const p = demoPosition(ROUTE, 130);
    expect(p.lat).toBeCloseTo(49.008993, 6);
    expect(p.speedKmh).toBe(0);
    expect(p.course).toBeNull();
  });

  it('attend à l’arrivée jusqu’à la fin du tour', () => {
    const p = demoPosition(ROUTE, 290);
    expect(p.lat).toBeCloseTo(49.017986, 6);
    expect(p.speedKmh).toBe(0);
  });
});

describe('démo : tours et rattrapage', () => {
  it('les tours s’enchaînent depuis la date de départ', () => {
    const epoch = Date.parse(ROUTE.epoch);
    expect(cycleStart(ROUTE, epoch + 10_000)).toBe(epoch);
    expect(cycleStart(ROUTE, epoch + 300_000)).toBe(epoch + 300_000);
    expect(cycleStart(ROUTE, epoch + 650_000)).toBe(epoch + 600_000);
  });

  it('une position toutes les 15 s, la dernière à l’instant présent', () => {
    expect(demoTimes(1_000_000, 0, 1_040_000)).toEqual([1_015_000, 1_030_000, 1_040_000]);
  });

  it('après une longue coupure, rattrape depuis le début du tour, une position toutes les 30 s', () => {
    const times = demoTimes(null, 0, 3_600_000);
    expect(times[0]).toBe(0);
    expect(times[1]).toBe(30_000);
    expect(times.at(-1)).toBe(3_600_000);
  });
});

describe('démo : trajet généré', () => {
  const route = loadDemoRoute();
  const near = (p: number[], lon: number, lat: number) => Math.abs(p[0]! - lon) < 0.05 && Math.abs(p[1]! - lat) < 0.05;

  it('part de Saint-Quentin et arrive à Merzouga', () => {
    expect(near(route.points[0]!, 3.2876, 49.8474)).toBe(true);
    expect(near(route.points.at(-1)!, -3.9976, 31.2152)).toBe(true);
  });

  it('avance dans le temps et tient dans un tour', () => {
    expect(route.points.every((p, i) => !i || p[3] >= route.points[i - 1]![3])).toBe(true);
    expect(route.points.at(-1)![3]).toBeLessThanOrEqual(route.cycleS);
  });

  it('ne roule jamais plus vite qu’une 4L (sauf erreur du trajet)', () => {
    const fastest = Math.max(...Array.from({ length: Math.floor(route.cycleS / 60) }, (_, k) => demoPosition(route, k * 60).speedKmh ?? 0));
    expect(fastest).toBeLessThanOrEqual(110);
  });
});
