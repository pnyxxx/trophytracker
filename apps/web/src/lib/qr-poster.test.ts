import { describe, expect, it } from 'vitest';
import { dateRange, numericRange, storyFrame, storyStats } from './qr-poster';

describe('visuels QR', () => {
  it('écrit les dates du voyage en court', () => {
    expect(dateRange('2026-08-02', '2026-08-16')).toBe('2–16 août');
    expect(dateRange('2026-07-28', '2026-08-03')).toBe('28 juil.–3 août');
    expect(dateRange('2026-08-02', null)).toBe('dès le 2 août');
    expect(dateRange(null, null)).toBe('');
  });

  it('écrit les dates des visuels en chiffres', () => {
    expect(numericRange('2027-02-18', '2027-02-28')).toBe('18/02 – 28/02/2027');
    expect(numericRange('2026-12-28', '2027-01-05')).toBe('28/12/2026 – 05/01/2027');
    expect(numericRange('2027-02-18', null)).toBe('dès le 18/02/2027');
    expect(numericRange(null, null)).toBe('');
  });

  it('story : chiffres utiles seulement, jamais « 0 photo »', () => {
    const today = new Date('2027-02-06T10:00:00');
    expect(storyStats({ starts_on: '2027-02-18', ends_on: '2027-02-28', totalDays: 11, travellers: ['Julien', 'Paul'] }, today))
      .toEqual([['J-12', 'avant le départ'], ['18/02/2027', 'départ'], ['11 jours', 'de voyage']]);
    expect(storyStats({ distanceKm: 1284.4, day: 4, totalDays: 11, travellers: ['Julien'] }, today))
      .toEqual([[`${(1284).toLocaleString('fr-FR')} km`, 'parcourus'], ['4/11', 'jour du voyage'], ['11 jours', 'de voyage']]);
    expect(storyStats({ travellers: ['Julien'] }, today)).toEqual([['1', 'voyageur']]);
  });

  it('cadre la trace au milieu de la story', () => {
    const pts = [{ lat: 60.39, lon: 5.32 }, { lat: 62.1, lon: 7.21 }, { lat: 63.43, lon: 10.39 }];
    const f = storyFrame(pts, 1080, 1920);
    for (const p of pts) {
      const [x, y] = f.toPx(p.lat, p.lon);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1080);
      expect(y).toBeGreaterThan(1920 * 0.25);
      expect(y).toBeLessThan(1920 * 0.75);
    }
    const [minLon, minLat, maxLon, maxLat] = f.bbox;
    expect(minLon).toBeLessThan(5.32);
    expect(maxLon).toBeGreaterThan(10.39);
    expect(minLat).toBeLessThan(60.39);
    expect(maxLat).toBeGreaterThan(63.43);
  });
});
