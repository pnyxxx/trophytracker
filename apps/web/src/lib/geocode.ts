/**
 * Adresses ↔ coordonnées, avec Photon (https://photon.komoot.io) : géocodeur gratuit
 * construit sur OpenStreetMap (même source que le fond de carte), sans clé d'API.
 * Seul le texte tapé (ou la position à décrire) lui est envoyé.
 */

const PHOTON = 'https://photon.komoot.io';

export interface Place {
  lat: number;
  lon: number;
  /** Première ligne : nom du lieu ou numéro + rue. */
  title: string;
  /** Deuxième ligne : code postal, ville, pays. */
  subtitle: string;
  /** Ville (ou à défaut le lieu) : ce qu'on affiche à côté d'un sponsor ou sous une photo. */
  city: string | null;
  /** Région (ex. « Bretagne ») : choisit le drapeau de la ville de départ. */
  region: string | null;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

function toPlace(f: PhotonFeature): Place {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const isCity = p.type === 'city' || p.type === 'locality';
  const title = p.name ?? (street || p.city || p.county || 'Lieu sans nom');
  const city = p.city ?? (isCity ? p.name : undefined) ?? p.district ?? p.county ?? null;
  const subtitle = [
    p.name && street ? street : null,
    [p.postcode, city !== title ? city : null].filter(Boolean).join(' '),
    p.country,
  ].filter(Boolean).join(', ');
  return { lat, lon, title, subtitle, city: city ?? null, region: p.state ?? null };
}

/** Lieux correspondant au texte tapé (adresse, ville, commerce…), les plus pertinents d'abord. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${PHOTON}/api/?q=${encodeURIComponent(q)}&lang=fr&limit=6`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('La recherche d’adresse est indisponible pour le moment');
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map(toPlace);
}

/** Nom du lieu le plus proche d'une position (ville, village…), ou null. */
export async function describePosition(lat: number, lon: number, signal?: AbortSignal): Promise<Place | null> {
  try {
    const res = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lon}&lang=fr&limit=1`, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: PhotonFeature[] };
    return data.features?.[0] ? toPlace(data.features[0]) : null;
  } catch {
    return null;
  }
}

/** « 49.84, 3.28 » (copié depuis Google Maps) → coordonnées, sinon null. */
export function parseCoords(text: string): { lat: number; lon: number } | null {
  const m = text.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]!.replace(',', '.'));
  const lon = Number(m[2]!.replace(',', '.'));
  return isValidCoords(lat, lon) ? { lat, lon } : null;
}

export const isValidCoords = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);

/** Position et région d'une ville de départ (drapeau sur la carte d'un road trip). */
export interface CitySpot {
  lat: number;
  lon: number;
  region: string | null;
}

/** Première ville trouvée pour ce nom (null si rien, ou si la recherche est indisponible). */
export async function findCity(name: string): Promise<CitySpot | null> {
  try {
    const [p] = await searchPlaces(name);
    return p ? { lat: p.lat, lon: p.lon, region: p.region } : null;
  } catch {
    return null;
  }
}
