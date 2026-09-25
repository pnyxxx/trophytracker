import { describe, expect, it } from 'vitest';
import { parseDeviceRequest, parseTimestamp } from '../src/parse.js';

const KEY = 'tt_0123456789abcdef';

describe('parseTimestamp', () => {
  it('accepte les secondes, les millisecondes et les dates ISO', () => {
    expect(parseTimestamp('1760000000').getTime()).toBe(1760000000_000);
    expect(parseTimestamp('1760000000123').getTime()).toBe(1760000000123);
    expect(parseTimestamp('2026-02-20T10:00:00Z').toISOString()).toBe('2026-02-20T10:00:00.000Z');
  });
});

describe('parseDeviceRequest — protocole OsmAnd', () => {
  it('décode une position et convertit la vitesse des nœuds en km/h', () => {
    const r = parseDeviceRequest(
      { id: KEY, lat: '31.08', lon: '-4.02', timestamp: '1760000000', speed: '10', bearing: '90', batt: '76' },
      undefined,
    );
    if ('error' in r) throw new Error(r.error);
    expect(r.key).toBe(KEY);
    expect(r.point).toMatchObject({ lat: 31.08, lon: -4.02, course: 90, battery: 76, source: 'device' });
    expect(r.point.speedKmh).toBeCloseTo(18.52);
  });

  it('ignore les champs optionnels illisibles au lieu de rejeter la position', () => {
    const r = parseDeviceRequest({ id: KEY, lat: '1', lon: '2', speed: 'abc' }, undefined);
    expect('error' in r).toBe(false);
  });

  it('rejette une position sans coordonnées ou avec une clé trop courte', () => {
    expect(parseDeviceRequest({ id: KEY, lat: '1' }, undefined)).toHaveProperty('error');
    expect(parseDeviceRequest({ id: 'x', lat: '1', lon: '2' }, undefined)).toHaveProperty('error');
  });
});

describe('parseDeviceRequest — formulaire POST (Traccar Client 10)', () => {
  // Champs exacts envoyés par le SDK Traccar (HttpUploader.kt) : formulaire, aucun paramètre dans l'URL.
  it('décode le formulaire, y compris avec les champs « charge » et « alarm »', () => {
    const r = parseDeviceRequest(
      {},
      {
        id: KEY, lat: '31.08505', lon: '-4.02298', timestamp: '1760000000', accuracy: '4.5', altitude: '712.0',
        speed: '27.0', bearing: '181.5', batt: '64', charge: 'true', alarm: 'sos',
      },
    );
    if ('error' in r) throw new Error(r.error);
    expect(r.key).toBe(KEY);
    expect(r.point).toMatchObject({ lat: 31.08505, lon: -4.02298, course: 181.5, battery: 64, altitude: 712, accuracy: 4.5 });
    expect(r.point.recordedAt.getTime()).toBe(1760000000_000);
    expect(r.point.speedKmh).toBeCloseTo(50.0, 0);
  });
});

describe('parseDeviceRequest — JSON (Traccar Client ≥ 9)', () => {
  it('décode une position et convertit la vitesse des m/s en km/h', () => {
    const r = parseDeviceRequest(undefined, {
      device_id: KEY,
      location: {
        timestamp: '2026-02-20T10:00:00Z',
        coords: { latitude: 43.46, longitude: -1.53, speed: 10, heading: 180, accuracy: 5 },
        battery: { level: 0.5 },
      },
    });
    if ('error' in r) throw new Error(r.error);
    expect(r.point.speedKmh).toBeCloseTo(36);
    expect(r.point.battery).toBe(50);
    expect(r.point.recordedAt.toISOString()).toBe('2026-02-20T10:00:00.000Z');
  });

  it('une vitesse négative (inconnue) devient null', () => {
    const r = parseDeviceRequest(undefined, {
      device_id: KEY,
      location: { timestamp: '2026-02-20T10:00:00Z', coords: { latitude: 1, longitude: 2, speed: -1 } },
    });
    if ('error' in r) throw new Error(r.error);
    expect(r.point.speedKmh).toBeNull();
  });
});
