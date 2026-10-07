/**
 * Road trip d’exemple de l'accueil, en satellite 3D : la trace se dessine derrière la position, qui monte
 * les lacets du col du Stelvio (Italie) et redescend vers Bormio, en boucle ; la caméra tourne lentement.
 * Tracé routier réel (OSRM), fichier example-trip.json. Chargé à part : MapLibre est volumineux.
 */
import { useEffect, useRef } from 'react';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { useInView } from '@/hooks/useInView';
import { maplibregl, satelliteStyle, webglAvailable } from '@/lib/maplibre';
import TRIP from './example-trip.json';

const PATH = TRIP as [number, number][];
/** Durée d'un aller complet (ms), puis la trace reste affichée un instant avant de recommencer. */
const LOOP_MS = 45_000;
const HOLD_MS = 4_000;

const line = (coords: [number, number][]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } });
const point = (c: [number, number]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: c } });

export default function ExampleTripMap() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, '0px');
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const mapRef = useRef<MlMap | null>(null);

  useEffect(() => {
    if (!ref.current || !webglAvailable()) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bounds = PATH.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(PATH[0], PATH[0]));
    const map = new maplibregl.Map({
      container: ref.current,
      style: satelliteStyle(true),
      bounds,
      fitBoundsOptions: { padding: 60 },
      pitch: 62,
      maxPitch: 75,
      bearing: -35,
      interactive: false,
      attributionControl: { compact: true },
      fadeDuration: 0,
    });
    mapRef.current = map;

    let frame = 0;
    let start = 0;
    let elapsed = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!visibleRef.current) {
        start = now - elapsed; // reprend là où l'animation s'était arrêtée
        return;
      }
      if (!start) start = now;
      elapsed = (now - start) % (LOOP_MS + HOLD_MS);
      const n = Math.max(2, Math.round(Math.min(1, elapsed / LOOP_MS) * PATH.length));
      (map.getSource('done') as GeoJSONSource | undefined)?.setData(line(PATH.slice(0, n)));
      (map.getSource('car') as GeoJSONSource | undefined)?.setData(point(PATH[n - 1]!));
      map.setBearing(-35 + (now / 1000) * 0.8);
    };

    map.on('load', () => {
      try {
        map.setTerrain({ source: 'dem', exaggeration: 1.5 });
        map.setSky({ 'sky-color': '#1B130D', 'horizon-color': '#3A2215', 'fog-color': '#120F0C', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5 });
      } catch {
        /* relief non pris en charge */
      }
      map.addSource('all', { type: 'geojson', data: line(PATH) });
      map.addSource('done', { type: 'geojson', data: line(reduced ? PATH : PATH.slice(0, 2)) });
      map.addSource('car', { type: 'geojson', data: point(reduced ? PATH.at(-1)! : PATH[0]!) });
      map.addLayer({ id: 'all', type: 'line', source: 'all', paint: { 'line-color': '#F4ECDF', 'line-opacity': 0.25, 'line-width': 2 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'done-glow', type: 'line', source: 'done', paint: { 'line-color': '#DB4740', 'line-opacity': 0.35, 'line-width': 10, 'line-blur': 6 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'done', type: 'line', source: 'done', paint: { 'line-color': '#DB4740', 'line-width': 3.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'car-halo', type: 'circle', source: 'car', paint: { 'circle-radius': 14, 'circle-color': '#DB4740', 'circle-opacity': 0.25 } });
      map.addLayer({ id: 'car', type: 'circle', source: 'car', paint: { 'circle-radius': 6, 'circle-color': '#DB4740', 'circle-stroke-color': '#FFF8EC', 'circle-stroke-width': 2.5 } });
      if (!reduced) frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
      mapRef.current = null;
      map.remove();
    };
  }, []);

  return <div ref={ref} className="h-full w-full" />;
}
