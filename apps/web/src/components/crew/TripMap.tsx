/**
 * Carte en direct d'un road trip (MapLibre) : trace parcourue, balise du voyageur, ville de départ,
 * étapes, sponsors et photos placées. Trois vues : satellite (orthophotos IGN en France, Esri ailleurs),
 * plan (OpenFreeMap) et relief 3D. « Centrer » garde la balise au milieu à chaque nouvelle position.
 * Deux doigts pour déplacer la carte sur téléphone (la page défile normalement).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import { Crosshair, Maximize } from 'lucide-react';
import type { Crew, Photo, Sponsor, TripStage } from '@/lib/supabase';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { inFrance, LIBERTY_STYLE, maplibregl, satelliteStyle, webglAvailable } from '@/lib/maplibre';
import { formatRelative, isLive } from '@/lib/format';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { beaconMarker, escapeHtml, photoMarker, sponsorMarker, stageMarker, stageStyle, startMarker } from './mapIcons';

export type MapView = 'sat' | 'plan' | '3d';
const VIEWS: { id: MapView; label: string }[] = [
  { id: 'sat', label: 'Satellite' },
  { id: 'plan', label: 'Plan' },
  { id: '3d', label: 'Relief 3D' },
];
const FOLLOW_ZOOM = 13;

type LonLat = [number, number];
const line = (coords: LonLat[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } });

/** Bulle : titre + lignes, en texte échappé. */
function popupHtml(kicker: string, title: string, lines: (string | null | undefined)[] = [], link?: { href: string; label: string }, img?: string | null) {
  return `${img ? `<img src="${escapeHtml(img)}" alt="" style="display:block;width:220px;max-width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;margin-bottom:8px" loading="lazy" />` : ''}`
    + `<p style="margin:0;font:500 11px 'DM Mono',monospace;color:#5c5850">${escapeHtml(kicker)}</p>`
    + `<p style="margin:2px 0 0;font-weight:700;font-size:16px">${escapeHtml(title)}</p>`
    + lines.filter(Boolean).map((l) => `<p style="margin:2px 0 0;font-size:14px;color:#3a3832">${escapeHtml(l!)}</p>`).join('')
    + (link ? `<a href="${escapeHtml(link.href)}" style="display:inline-block;margin-top:6px;font-size:14px;font-weight:700;color:#c41e24">${escapeHtml(link.label)}</a>` : '');
}

export function TripMap({ crew, points, stages, sponsors, photos = [], overlay, className }: {
  crew: Crew;
  points: TrackPoint[];
  stages: TripStage[];
  sponsors: Sponsor[];
  photos?: Photo[];
  /** Carte de lieu posée en bas à gauche (« J9 · près de… »). */
  overlay?: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const beaconRef = useRef<Marker | null>(null);
  const extras = useRef<Marker[]>([]);
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<MapView>('sat');
  const [follow, setFollow] = useState(false);
  /** Fond actuellement chargé (le relief 3D se pose sur le satellite). */
  const baseRef = useRef<'sat' | 'plan'>('sat');
  const live = isLive(crew.last_fix_at);

  const car = useMemo<LonLat | null>(() => {
    if (crew.last_lat != null && crew.last_lon != null) return [crew.last_lon, crew.last_lat];
    const last = points.at(-1);
    return last ? [last[1], last[0]] : null;
  }, [crew.last_lat, crew.last_lon, points]);

  const coords = useMemo(() => {
    const c = points.map((p) => [p[1], p[0]] as LonLat);
    if (car && c.length && (c.at(-1)![0] !== car[0] || c.at(-1)![1] !== car[1])) c.push(car);
    return c;
  }, [points, car]);

  const around = car ?? (crew.start_lon != null && crew.start_lat != null ? [crew.start_lon, crew.start_lat] as LonLat : null);
  const imagery = around && inFrance(around[0], around[1]) ? 'ign' : 'esri';
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  // Couches de la trace : à recréer à chaque changement de fond (setStyle efface tout sauf les marqueurs HTML).
  const addTrace = (map: MlMap) => {
    if (map.getSource('trace')) return;
    map.addSource('trace', { type: 'geojson', data: line(coordsRef.current) });
    const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
    map.addLayer({ id: 'trace-edge', type: 'line', source: 'trace', layout: round, paint: { 'line-color': '#15161A', 'line-width': 7.5 } });
    map.addLayer({ id: 'trace', type: 'line', source: 'trace', layout: round, paint: { 'line-color': '#E1262C', 'line-width': 4.5 } });
  };

  // Création de la carte.
  useEffect(() => {
    if (!mapEl.current || !webglAvailable()) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: satelliteStyle(imagery),
      center: around ?? [2.5, 46.6],
      zoom: around ? 9 : 4.5,
      maxPitch: 75,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    map.on('style.load', () => { addTrace(map); setReady(true); });
    mapRef.current = map;
    baseRef.current = 'sat';
    return () => {
      mapRef.current = null;
      beaconRef.current = null;
      extras.current = [];
      map.remove();
    };
    // Créée une seule fois (le fond se change avec setStyle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changement de vue : fond satellite ou plan, relief 3D.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const base = view === 'plan' ? 'plan' : 'sat';
    const restyle = base !== baseRef.current;
    if (restyle) {
      baseRef.current = base;
      setReady(false);
      // Rechargement complet : sans lui, MapLibre « fusionne » les styles sans prévenir (style.load), et la trace disparaît.
      map.setStyle(base === 'plan' ? LIBERTY_STYLE : satelliteStyle(imagery), { diff: false });
    }
    const apply = () => {
      if (view === '3d') {
        try { map.setTerrain({ source: 'dem', exaggeration: 1.4 }); } catch { /* relief non pris en charge */ }
        map.easeTo({ pitch: 62, bearing: map.getBearing() || 25, zoom: Math.max(map.getZoom(), 11), center: car ?? map.getCenter(), duration: 1200 });
      } else {
        try { map.setTerrain(null); } catch { /* rien */ }
        map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      }
    };
    if (!restyle && map.isStyleLoaded()) apply();
    else if (restyle || view === '3d') map.once('style.load', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Trace en direct.
  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource('trace') as GeoJSONSource | undefined)?.setData(line(coords));
  }, [coords, ready]);

  // Balise du voyageur.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !car) return;
    beaconRef.current?.remove();
    beaconRef.current = new maplibregl.Marker({ element: beaconMarker(live) })
      .setLngLat(car)
      .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(popupHtml(
        live ? '● en direct' : 'dernière position',
        crew.name,
        [live && crew.last_speed_kmh != null ? `${Math.round(crew.last_speed_kmh)} km/h` : formatRelative(crew.last_fix_at)],
      )))
      .addTo(map);
    if (follow) map.easeTo({ center: car, zoom: Math.max(map.getZoom(), FOLLOW_ZOOM), duration: 800 });
  }, [car, live, follow, crew.name, crew.last_speed_kmh, crew.last_fix_at]);

  // Départ, étapes, sponsors, photos.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    extras.current.forEach((m) => m.remove());
    const add = (element: HTMLElement, at: LonLat, html: string, anchor: 'center' | 'bottom-left' = 'center') =>
      new maplibregl.Marker({ element, anchor }).setLngLat(at).setPopup(new maplibregl.Popup({ offset: 16, maxWidth: '260px' }).setHTML(html)).addTo(map);
    const list: Marker[] = [];
    if (crew.start_lat != null && crew.start_lon != null) {
      list.push(add(startMarker(crew.city, crew.start_region), [crew.start_lon, crew.start_lat], popupHtml('ville de départ', crew.city || 'Départ', [`C’est d’ici que part ${crew.name}.`]), 'bottom-left'));
    }
    for (const w of stages) {
      list.push(add(stageMarker(w), [w.lon, w.lat], popupHtml(`${stageStyle(w.kind).emoji} ${stageStyle(w.kind).label}`, w.name, [w.place !== w.name ? w.place : null, w.note], { href: '#carnet', label: 'Voir le carnet de route' })));
    }
    for (const s of sponsors.filter((x) => x.lat != null && x.lon != null)) {
      list.push(add(sponsorMarker(mediaUrl(s.logo_path), s.name), [s.lon!, s.lat!], popupHtml('sponsor', s.name, [s.city], s.website_url ? { href: s.website_url, label: 'Site web' } : undefined)));
    }
    for (const p of photos.filter((x) => x.lat != null && x.lon != null)) {
      list.push(add(photoMarker(thumbUrl(p.storage_path, 160), p.kind === 'panorama', p.title), [p.lon!, p.lat!],
        popupHtml('photo', p.title, [[p.location, p.taken_label].filter(Boolean).join(' · ')], { href: '#photos', label: 'Voir les photos' }, thumbUrl(p.storage_path, 480))));
    }
    extras.current = list;
  }, [crew.start_lat, crew.start_lon, crew.city, crew.start_region, crew.name, stages, sponsors, photos]);

  // Cadrage initial : toute la trace (avec le départ et les étapes).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitted.current) return;
    const all: LonLat[] = [...coords, ...stages.map((w) => [w.lon, w.lat] as LonLat)];
    if (crew.start_lon != null && crew.start_lat != null) all.push([crew.start_lon, crew.start_lat]);
    if (!all.length) return;
    fitted.current = true;
    if (all.length === 1) { map.jumpTo({ center: all[0]!, zoom: 11 }); return; }
    const b = all.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(all[0]!, all[0]!));
    map.fitBounds(b, { padding: 50, maxZoom: 13, duration: 0 });
  }, [coords, stages, crew.start_lon, crew.start_lat]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden rounded-[28px] border-[1.5px] border-ink-700 bg-ink-800', className)}>
      {/* MapLibre impose « position: relative » à son conteneur : on le met dans une boîte positionnée. */}
      <div className="absolute inset-0">
        <div ref={mapEl} className="h-full w-full" role="img" aria-label="Carte du road trip avec la trace parcourue et la position actuelle" />
      </div>

      <div className="absolute left-3 top-3 flex gap-1 rounded-full border-[1.5px] border-cream/[0.14] bg-ink/[0.82] p-1 backdrop-blur-[10px]" role="group" aria-label="Fond de carte">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
            className={cn('flex min-h-9 items-center rounded-full px-3.5 text-[15px] font-bold', view === v.id ? 'bg-signal text-white' : 'text-dust-100 hover:text-white')}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="absolute right-3 top-[120px] flex flex-col gap-2">
        {car && (
          <button
            type="button"
            onClick={() => setFollow((f) => !f)}
            aria-pressed={follow}
            title={follow ? 'Ne plus centrer sur la position' : 'Centrer sur la position'}
            aria-label={follow ? 'Ne plus centrer sur la position' : 'Centrer sur la position'}
            className={cn('flex h-11 w-11 items-center justify-center rounded-full shadow-lg', follow ? 'bg-signal text-white' : 'bg-ink text-cream hover:bg-ink-700')}
          >
            <Crosshair className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => containerRef.current?.requestFullscreen?.()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-cream shadow-lg hover:bg-ink-700"
          aria-label="Carte en plein écran"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2.5">
        {car ? overlay : (
          <div className="rounded-[20px] bg-cream px-4 py-3 text-[15px] font-bold text-ink shadow-[0_14px_30px_rgba(0,0,0,.35)]">
            Pas encore de position : le suivi démarre le jour du départ.
          </div>
        )}
      </div>
    </div>
  );
}
