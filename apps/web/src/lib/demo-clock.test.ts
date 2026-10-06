import { describe, expect, it } from 'vitest';
import { demoRaidTime } from './demo-clock';
import { dayOfRaid } from './stages';
import DEMO from './demo-clock.json';

const START = '2027-02-17';
const EPOCH = Date.parse(DEMO.epoch);
const CYCLE = DEMO.cycleS * 1000;
const raid = (t: number) => new Date(demoRaidTime(START, t));

describe('horloge de l’équipage de démo', () => {
  it('chaque tour part de Saint-Quentin trois jours avant le raid, à 8 h 30', () => {
    for (const t of [EPOCH, EPOCH + 5 * CYCLE]) {
      const d = raid(t);
      expect(dayOfRaid(START, d)).toBe(-2);
      expect([d.getHours(), d.getMinutes()]).toEqual([8, 30]);
    }
  });

  it('finit au matin de la boucle 1 (J7), à Merzouga', () => {
    const d = raid(EPOCH + CYCLE - 1000);
    expect(dayOfRaid(START, d)).toBe(7);
    expect(d.getHours()).toBe(7);
  });

  it('l’heure du raid avance toujours, et à la vitesse réelle pendant la conduite', () => {
    let prev = -Infinity;
    for (let t = EPOCH; t < EPOCH + CYCLE; t += 60_000) {
      const v = demoRaidTime(START, t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    // Une minute après le départ de Saint-Quentin, il est 8 h 31.
    expect(demoRaidTime(START, EPOCH + 60_000) - demoRaidTime(START, EPOCH)).toBe(60_000);
  });
});
