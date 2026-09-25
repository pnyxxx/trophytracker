/**
 * Décodage des positions envoyées par l'application gratuite « Traccar Client »
 * (Android / iOS) ou toute appli compatible avec le protocole OsmAnd.
 *
 * Deux formats sont acceptés :
 *   1. OsmAnd (paramètres d'URL ou formulaire) :
 *        ?id=<clé>&lat=…&lon=…&timestamp=…&speed=…(NŒUDS)&bearing=…&altitude=…&accuracy=…&batt=…
 *   2. JSON (anciennes versions 9.x de Traccar Client ; la version 10 envoie un formulaire POST au format 1) :
 *        { device_id, location: { timestamp, coords: { latitude, longitude, speed (m/s), … }, battery: { level } } }
 */
import { z } from 'zod';
import { KNOTS_TO_KMH, MS_TO_KMH, type IncomingPoint } from './points.js';

const num = z.coerce.number().refine(Number.isFinite, 'nombre attendu');
// Champ optionnel : une valeur absente ou illisible est simplement ignorée.
const optNum = z.coerce.number().refine(Number.isFinite).optional().catch(undefined);
const key = z.string().min(8).max(100);

const osmand = z.object({
  id: key,
  lat: num,
  lon: num,
  timestamp: z.string().max(40).optional(),
  speed: optNum,
  bearing: optNum,
  heading: optNum,
  altitude: optNum,
  accuracy: optNum,
  batt: optNum,
});

const json = z.object({
  device_id: key,
  location: z.object({
    timestamp: z.string().max(40),
    coords: z.object({
      latitude: num,
      longitude: num,
      speed: optNum,
      heading: optNum,
      altitude: optNum,
      accuracy: optNum,
    }),
    battery: z.object({ level: optNum }).optional(),
  }),
});

/** OsmAnd envoie des secondes Unix, des millisecondes, ou une date ISO. */
export function parseTimestamp(raw: string | undefined, now = new Date()): Date {
  if (!raw) return now;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    return new Date(n > 1e12 ? n : n * 1000);
  }
  return new Date(raw);
}

const nonNegative = (v: number | undefined) => (v != null && v >= 0 ? v : null);

export type ParsedRequest = { key: string; point: IncomingPoint } | { error: string };

export function parseDeviceRequest(query: unknown, body: unknown): ParsedRequest {
  if (body && typeof body === 'object' && 'location' in body) {
    const r = json.safeParse(body);
    if (!r.success) return { error: 'Position JSON invalide' };
    const { coords, timestamp, battery } = r.data.location;
    const speed = nonNegative(coords.speed);
    const level = battery?.level;
    return {
      key: r.data.device_id,
      point: {
        recordedAt: parseTimestamp(timestamp),
        lat: coords.latitude,
        lon: coords.longitude,
        speedKmh: speed == null ? null : speed * MS_TO_KMH,
        course: coords.heading ?? null,
        altitude: coords.altitude ?? null,
        accuracy: coords.accuracy ?? null,
        // Traccar Client envoie 0..1 ; certaines applis envoient déjà un pourcentage.
        battery: level == null ? null : level <= 1 ? level * 100 : level,
        source: 'device',
      },
    };
  }

  const params = {
    ...(query && typeof query === 'object' ? query : {}),
    ...(body && typeof body === 'object' ? body : {}),
  };
  const r = osmand.safeParse(params);
  if (!r.success) {
    // Noms des champs en cause (jamais leurs valeurs) : aide au dépannage.
    const fields = [...new Set(r.error.issues.map((i) => i.path.join('.') || '?'))].join(', ');
    return { error: `Position invalide (${fields})` };
  }
  const q = r.data;
  const speed = nonNegative(q.speed);
  return {
    key: q.id,
    point: {
      recordedAt: parseTimestamp(q.timestamp),
      lat: q.lat,
      lon: q.lon,
      speedKmh: speed == null ? null : speed * KNOTS_TO_KMH,
      course: q.bearing ?? q.heading ?? null,
      altitude: q.altitude ?? null,
      accuracy: q.accuracy ?? null,
      battery: q.batt ?? null,
      source: 'device',
    },
  };
}
