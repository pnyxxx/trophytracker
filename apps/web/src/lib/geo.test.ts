import { describe, expect, it } from 'vitest';
import { positionAt } from './geo';
import { parseCoords } from './geocode';

describe('positionAt (position de la 4L à l’heure d’une photo)', () => {
  const track = [
    [31.0, -4.0, 1000],
    [31.1, -4.2, 1600],
    [31.5, -4.5, 10000],
  ] as const;

  it('interpole entre les deux points qui encadrent l’instant', () => {
    expect(positionAt(track, 1300)).toEqual({ lat: expect.closeTo(31.05, 6), lon: expect.closeTo(-4.1, 6) });
  });
  it('prend le point exact', () => {
    expect(positionAt(track, 1600)).toEqual({ lat: 31.1, lon: -4.2 });
  });
  it('prend le point le plus proche quand l’autre est trop loin dans le temps', () => {
    expect(positionAt(track, 2000)).toEqual({ lat: 31.1, lon: -4.2 });
  });
  it('ne devine rien quand la 4L n’émettait pas', () => {
    expect(positionAt(track, 5800)).toBeNull();
    expect(positionAt(track, -1000)).toBeNull();
    expect(positionAt([], 1000)).toBeNull();
  });
});

describe('parseCoords (coordonnées collées)', () => {
  it('comprend le format de Google Maps', () => {
    expect(parseCoords('49.8466, 3.2875')).toEqual({ lat: 49.8466, lon: 3.2875 });
    expect(parseCoords('31.08,-4.01')).toEqual({ lat: 31.08, lon: -4.01 });
  });
  it('accepte la virgule décimale française', () => {
    expect(parseCoords('49,8466 3,2875')).toEqual({ lat: 49.8466, lon: 3.2875 });
  });
  it('refuse le reste', () => {
    expect(parseCoords('Amiens')).toBeNull();
    expect(parseCoords('95, 3')).toBeNull();
    expect(parseCoords('0, 0')).toBeNull();
  });
});
