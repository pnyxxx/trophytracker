/**
 * Client minimal pour l'API REST de Traccar (https://www.traccar.org/api-reference/).
 *
 * On utilise l'authentification HTTP Basic, acceptée par Traccar sur chaque requête :
 * pas de cookie de session à gérer ni à renouveler.
 *
 * ⚠️ Traccar exprime la vitesse en NŒUDS (1 nœud = 1,852 km/h).
 * L'ancienne version du site la traitait comme des m/s (×3,6), d'où des vitesses fausses.
 */
import { KNOTS_TO_KMH, type IncomingPoint } from './points.js';

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status?: string;
  lastUpdate?: string | null;
  positionId?: number;
}

interface TraccarPosition {
  deviceId: number;
  fixTime: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  course?: number | null;
  altitude?: number | null;
  accuracy?: number | null;
  valid?: boolean;
  attributes?: { batteryLevel?: number };
}

export class TraccarClient {
  private readonly authHeader: string;

  constructor(
    private readonly baseUrl: string,
    email: string,
    password: string,
  ) {
    this.authHeader = `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(new URL(path, this.baseUrl), {
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Traccar ${path} → HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  listDevices() {
    return this.get<TraccarDevice[]>('/api/devices');
  }

  /** Dernière position connue de chaque appareil accessible. */
  latestPositions() {
    return this.get<TraccarPosition[]>('/api/positions');
  }
}

export function toIncomingPoint(p: TraccarPosition): IncomingPoint | null {
  if (p.valid === false) return null;
  return {
    recordedAt: new Date(p.fixTime),
    lat: p.latitude,
    lon: p.longitude,
    speedKmh: p.speed != null ? p.speed * KNOTS_TO_KMH : null,
    course: p.course ?? null,
    altitude: p.altitude ?? null,
    accuracy: p.accuracy || null,
    battery: p.attributes?.batteryLevel ?? null,
    source: 'traccar',
  };
}

/** Un équipage peut référencer l'appareil par son id numérique, son identifiant unique ou son nom. */
export function matchesDevice(ref: string, d: TraccarDevice): boolean {
  return ref === String(d.id) || ref === d.uniqueId || ref === d.name;
}
