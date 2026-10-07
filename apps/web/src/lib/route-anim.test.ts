import { describe, expect, it } from 'vitest';
import { bearing, easeAngle, headingAtDist, makeRoute, pathUntil, pointAtDist } from './route-anim';

// Un trajet en L : 0,0 → 0,0.01 (≈ 1,1 km vers le nord) → 0.01,0.01 (≈ 1,1 km vers l'est).
const r = makeRoute([[0, 0], [0, 0.01], [0.01, 0.01]]);

describe('route-anim', () => {
  it('mesure le trajet', () => {
    expect(r.total).toBeGreaterThan(2200);
    expect(r.total).toBeLessThan(2250);
  });

  it('interpole la position', () => {
    const mid = pointAtDist(r, r.cum[1]! / 2);
    expect(mid[0]).toBeCloseTo(0, 6);
    expect(mid[1]).toBeCloseTo(0.005, 4);
    expect(pointAtDist(r, -10)).toEqual([0, 0]);
    expect(pointAtDist(r, 1e9)).toEqual([0.01, 0.01]);
  });

  it('dessine la trace jusqu’à la position', () => {
    const p = pathUntil(r, r.cum[1]! + 10);
    expect(p).toHaveLength(3);
    expect(p.at(-1)![0]).toBeGreaterThan(0);
  });

  it('donne le cap, en regardant devant', () => {
    expect(bearing([0, 0], [0, 1])).toBeCloseTo(0, 3);
    expect(bearing([0, 0], [1, 0])).toBeCloseTo(90, 3);
    expect(headingAtDist(r, 0, 100)).toBeCloseTo(0, 0);
    expect(headingAtDist(r, r.cum[1]! + 50, 100)).toBeCloseTo(90, 0);
  });

  it('lisse un angle par le plus court chemin', () => {
    expect(easeAngle(350, 10, 0.5)).toBeCloseTo(0, 6);
    expect(easeAngle(10, 350, 0.5)).toBeCloseTo(0, 6);
  });
});
