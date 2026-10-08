/**
 * Import d'un fichier GPX (export Komoot, Google My Maps, Calimoto, OsmAnd…) en étapes de road trip.
 * On garde les points nommés : points d'intérêt (<wpt>), sinon points de l'itinéraire (<rtept>) ;
 * une simple trace (<trk>) donne son départ et son arrivée. Analyse sans DOM (testable), volontairement
 * tolérante : un fichier mal formé donne simplement moins de points.
 */
export interface GpxStage {
  kind: 'start' | 'stop' | 'finish';
  name: string;
  lat: number;
  lon: number;
}

/** Au-delà, un fichier GPX est une trace détaillée, pas une liste d'étapes. */
export const GPX_MAX_STAGES = 100;

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();

interface RawPoint { lat: number; lon: number; name: string | null }

function points(xml: string, tag: 'wpt' | 'rtept' | 'trkpt'): RawPoint[] {
  const re = new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, 'g');
  const out: RawPoint[] = [];
  for (const m of xml.matchAll(re)) {
    const attrs = m[1] ?? '';
    const lat = Number(/\blat\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1]);
    const lon = Number(/\blon\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const name = /<name>([\s\S]*?)<\/name>/.exec(m[2] ?? '')?.[1];
    out.push({ lat, lon, name: name ? decode(name).slice(0, 80) || null : null });
  }
  return out;
}

export function parseGpx(xml: string): GpxStage[] {
  let raw = points(xml, 'wpt');
  if (!raw.length) raw = points(xml, 'rtept');
  if (!raw.length) {
    const trk = points(xml, 'trkpt');
    raw = trk.length >= 2 ? [trk[0]!, trk.at(-1)!] : trk;
  }
  const kept = raw.slice(0, GPX_MAX_STAGES);
  return kept.map((p, i) => {
    const kind = kept.length > 1 && i === 0 ? 'start' : kept.length > 1 && i === kept.length - 1 ? 'finish' : 'stop';
    const fallback = kind === 'start' ? 'Départ' : kind === 'finish' ? 'Arrivée' : `Étape ${i + 1}`;
    return { kind, name: p.name ?? fallback, lat: Math.round(p.lat * 1e6) / 1e6, lon: Math.round(p.lon * 1e6) / 1e6 };
  });
}
