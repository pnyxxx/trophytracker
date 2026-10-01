import { describe, expect, it } from 'vitest';
import { altitudeProfile, climbOf, MIN_ALT_POINTS, pointsOfDays, thin } from './elevation';

const DAY = 86_400;
// 17 février 2027, 10 h (heure locale) : J1 si le départ est le 2027-02-17.
const T0 = new Date(2027, 1, 17, 10).getTime() / 1000;

/** Trace vers l'est le long d'un parallèle, 1 point / 100 m, altitude donnée par `alt(i)`. */
const track = (n: number, alt: (i: number) => number | null, t0 = T0, dt = 10) =>
  Array.from({ length: n }, (_, i) => [31, -5 + i * 0.00105, t0 + i * dt, 60, alt(i)] as [number, number, number, number, number | null]);

describe('altitudeProfile', () => {
  it('sans altitude (téléphone qui ne l’envoie pas, ancienne réponse) : pas de profil', () => {
    expect(altitudeProfile(track(200, () => null), '2027-02-17')).toBeNull();
    expect(altitudeProfile(track(200, () => 100).map((p) => p.slice(0, 4) as unknown as [number, number, number]), '2027-02-17')).toBeNull();
    expect(altitudeProfile(track(MIN_ALT_POINTS - 1, () => 100), '2027-02-17')).toBeNull();
  });

  it('kilomètre parcouru et jour du raid de chaque point', () => {
    const p = altitudeProfile([...track(50, () => 500), ...track(50, () => 500, T0 + 2 * DAY)], '2027-02-17')!;
    expect(p[0]!.day).toBe(1);
    expect(p.at(-1)!.day).toBe(3);
    expect(p[49]!.km).toBeCloseTo(4.9, 0);
  });
});

describe('climbOf', () => {
  it('le bruit du GPS sur une route plate ne fait pas de dénivelé', () => {
    const noisy = altitudeProfile(track(500, (i) => 700 + ((i * 7919) % 13) - 6), null)!; // ± 6 m
    const c = climbOf(noisy)!;
    expect(c.up).toBeLessThanOrEqual(20);
    expect(c.down).toBeLessThanOrEqual(20);
  });

  it('un col : montée puis descente, point culminant', () => {
    const col = altitudeProfile(track(400, (i) => (i < 200 ? 1000 + i * 6 : 2200 - (i - 200) * 6)), null)!;
    const c = climbOf(col)!;
    expect(c.up).toBeGreaterThan(1100);
    expect(c.up).toBeLessThan(1250);
    expect(c.down).toBeGreaterThan(1100);
    expect(c.max).toBeGreaterThanOrEqual(2180);
    expect(c.km).toBeCloseTo(40, -1);
  });

  it('par jour', () => {
    const p = altitudeProfile([...track(100, () => 200), ...track(100, (i) => 200 + i * 5, T0 + DAY)], '2027-02-17')!;
    expect(climbOf(pointsOfDays(p, 1, 1))!.up).toBe(0);
    expect(climbOf(pointsOfDays(p, 2, 2))!.up).toBeGreaterThan(400);
    expect(climbOf(pointsOfDays(p, 5, 5))).toBeNull();
  });
});

describe('thin', () => {
  it('allège sans perdre le sommet', () => {
    const p = altitudeProfile(track(5000, (i) => (Math.abs(i - 2500) < 10 ? 3000 : 500)), null)!;
    expect(Math.max(...p.map((x) => x.alt))).toBe(3000);
    const t = thin(p, 600);
    expect(t.length).toBeLessThanOrEqual(602);
    expect(Math.max(...t.map((x) => x.alt))).toBe(Math.max(...p.map((x) => x.alt)));
  });
});
