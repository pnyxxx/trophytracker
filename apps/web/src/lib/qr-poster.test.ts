import { describe, expect, it } from 'vitest';
import { dateRange, storyFrame } from './qr-poster';

describe('visuels QR', () => {
  it('écrit les dates du voyage en court', () => {
    expect(dateRange('2026-08-02', '2026-08-16')).toBe('2–16 août');
    expect(dateRange('2026-07-28', '2026-08-03')).toBe('28 juil.–3 août');
    expect(dateRange('2026-08-02', null)).toBe('dès le 2 août');
    expect(dateRange(null, null)).toBe('');
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
