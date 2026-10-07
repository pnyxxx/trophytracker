import { describe, expect, it } from 'vitest';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { detectStays, formatDuration, newStays, stayKey } from './stage-detect';

/** Midi, heure locale, un jour fixe : les tests ne dépendent pas du fuseau horaire. */
const T0 = new Date(2027, 6, 1, 12, 0, 0).getTime() / 1000;
const MIN = 60;

/** Trajet vers l'est : un point par minute, ~1,1 km entre deux points. */
function drive(from: number, minutes: number, lon0: number): TrackPoint[] {
  return Array.from({ length: minutes }, (_, i) => [45, lon0 + i * 0.014, from + i * MIN, 70, 500] as TrackPoint);
}
/** À l'arrêt : un point toutes les 30 min, quelques mètres de dérive GPS. */
function stay(from: number, minutes: number, lon: number): TrackPoint[] {
  return Array.from({ length: Math.floor(minutes / 30) + 1 }, (_, i) => [45 + (i % 2) * 0.0002, lon, from + i * 30 * MIN, 0, 500] as TrackPoint);
}

describe('detectStays', () => {
  it('repère une pause de 2 h et une nuit, mais pas un arrêt de 10 min', () => {
    const pts: TrackPoint[] = [
      ...drive(T0, 60, 5),
      ...stay(T0 + 60 * MIN, 10, 5.84), // feu rouge prolongé : rien
      ...drive(T0 + 71 * MIN, 30, 5.85),
      ...stay(T0 + 101 * MIN, 120, 6.27), // pause de 2 h
      ...drive(T0 + 222 * MIN, 30, 6.28),
      ...stay(T0 + 252 * MIN, 14 * 60, 6.7), // nuit
      ...drive(T0 + 1093 * MIN, 20, 6.71),
    ];
    const s = detectStays(pts, { now: T0 + 2000 * MIN });
    expect(s.map((x) => x.kind)).toEqual(['stop', 'night']);
    expect(s[0]!.lon).toBeCloseTo(6.27, 2);
    expect(Math.round(s[0]!.duration / 60)).toBe(120);
    expect(s[1]!.leftAt).not.toBeNull();
  });

  it('marque le départ, et un arrêt en cours sans heure de départ', () => {
    const pts: TrackPoint[] = [...stay(T0, 90, 5), ...drive(T0 + 91 * MIN, 30, 5.01), ...stay(T0 + 121 * MIN, 30, 5.43)];
    const s = detectStays(pts, { now: T0 + 200 * MIN });
    expect(s.map((x) => x.kind)).toEqual(['start', 'stop']);
    expect(s[1]!.leftAt).toBeNull();
  });

  it('ignore les arrêts déjà ajoutés comme étapes', () => {
    const s = detectStays([...drive(T0, 10, 5), ...stay(T0 + 10 * MIN, 120, 5.2)], { now: T0 + 500 * MIN });
    expect(s).toHaveLength(1);
    expect(newStays(s, [{ lat: 45, lon: 5.2, arrived_at: new Date((T0 + 15 * MIN) * 1000).toISOString() }])).toHaveLength(0);
    expect(newStays(s, [{ lat: 45, lon: 5.3, arrived_at: null }])).toHaveLength(1);
    expect(stayKey(s[0]!)).toMatch(/^45\.000,5\.200,\d+$/);
  });
});

describe('formatDuration', () => {
  it('écrit une durée lisible', () => {
    expect(formatDuration(45 * 60)).toBe('45 min');
    expect(formatDuration(2 * 3600 + 5 * 60)).toBe('2 h 05');
    expect(formatDuration(3 * 3600)).toBe('3 h');
  });
});
