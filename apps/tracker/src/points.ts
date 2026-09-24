/**
 * Une position GPS normalisée, prête à être envoyée à private.ingest_position().
 * Toutes les sources (Traccar, appli Traccar Client…) sont converties dans ce format.
 */
export interface IncomingPoint {
  recordedAt: Date;
  lat: number;
  lon: number;
  /** En km/h. */
  speedKmh?: number | null;
  course?: number | null;
  altitude?: number | null;
  accuracy?: number | null;
  /** Pourcentage 0-100. */
  battery?: number | null;
  source: 'traccar' | 'device';
}

export const KNOTS_TO_KMH = 1.852;
export const MS_TO_KMH = 3.6;
