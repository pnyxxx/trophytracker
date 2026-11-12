import { describe, expect, it } from 'vitest';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { photosPassed } from './demo-reveal';

// Trace : de Boulajoul (32,884 N) vers Merzouga, arrêtée à mi-chemin (Midelt).
const TRACE: TrackPoint[] = [
  [32.884, -4.988, 0, 1500],
  [32.8, -4.9, 60, 1500],
  [32.6852, -4.7457, 120, 1500],
];
const photo = (title: string, lat: number | null, lon: number | null) => ({ title, lat, lon });

describe('démo : photos visibles seulement une fois la trace passée', () => {
  it('montre une photo prise sur la trace déjà parcourue', () => {
    expect(photosPassed([photo('Itzer', 32.886, -4.988)], TRACE).map((p) => p.title)).toEqual(['Itzer']);
  });

  it('cache une photo plus loin sur la route (pas encore passée)', () => {
    expect(photosPassed([photo('Er-Rissani', 31.215, -3.997)], TRACE)).toEqual([]);
  });

  it('cache une photo sans position, et tout tant qu’il n’y a pas de trace', () => {
    expect(photosPassed([photo('Sans lieu', null, null)], TRACE)).toEqual([]);
    expect(photosPassed([photo('Itzer', 32.886, -4.988)], [])).toEqual([]);
  });

  it('une photo à 2 km de la trace compte comme passée, pas à 10 km', () => {
    expect(photosPassed([photo('Près', 32.884 + 0.018, -4.988)], TRACE)).toHaveLength(1);
    expect(photosPassed([photo('Loin', 32.884 + 0.09, -4.988 - 0.05)], TRACE)).toHaveLength(0);
  });
});
