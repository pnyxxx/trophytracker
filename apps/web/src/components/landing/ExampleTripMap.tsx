/**
 * Road trip d'exemple de l'accueil, en satellite 3D : la montée du col du Galibier depuis Valloire,
 * puis la descente vers le Lautaret, en boucle. La caméra suit la position de près (on voit chaque lacet)
 * en tournant doucement autour d'elle ; la trace se dessine derrière.
 * Orthophotos IGN + relief AWS ; tracé routier réel (OSRM), fichier example-trip.json.
 * Chargé à part : MapLibre est volumineux.
 */
import { useEffect, useRef } from 'react';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { useInView } from '@/hooks/useInView';
import { maplibregl, satelliteStyle, webglAvailable } from '@/lib/maplibre';
import { easeAngle, headingAtDist, makeRoute, pathUntil, pointAtDist, type LonLat } from '@/lib/route-anim';
import TRIP from './example-trip.json';

const ROUTE = makeRoute(TRIP as LonLat[]);
/** Vitesse de l'animation (mètres de trajet par seconde) et pause à l'arrivée. */
const SPEED_MPS = 260;
const HOLD_MS = 5_000;
const LOOP_MS = (ROUTE.total / SPEED_MPS) * 1000;

const line = (coords: LonLat[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } });
const point = (c: LonLat) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: c } });

export default function ExampleTripMap() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, '0px');
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const mapRef = useRef<MlMap | null>(null);

  useEffect(() => {
    if (!ref.current || !webglAvailable()) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = ROUTE.path[0]!;
    const map = new maplibregl.Map({
      container: ref.current,
      style: satelliteStyle('ign'),
      center: start,
      zoom: 13.6,
      pitch: 66,
      maxPitch: 78,
      bearing: headingAtDist(ROUTE, 0),
      interactive: false,
      attributionControl: { compact: true },
      fadeDuration: 0,
      maxTileCacheSize: 400,
    });
    mapRef.current = map;

    let frame = 0;
    let t0 = 0;
    let elapsed = 0;
    let camBearing = headingAtDist(ROUTE, 0);
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!visibleRef.current) {
        t0 = now - elapsed; // reprend là où l'animation s'était arrêtée
        return;
      }
      if (!t0) t0 = now;
      elapsed = (now - t0) % (LOOP_MS + HOLD_MS);
      const d = Math.min(ROUTE.total, (elapsed / 1000) * SPEED_MPS);
      const pos = pointAtDist(ROUTE, d);
      (map.getSource('done') as GeoJSONSource | undefined)?.setData(line(pathUntil(ROUTE, d)));
      (map.getSource('car') as GeoJSONSource | undefined)?.setData(point(pos));
      // Regard porté 1,5 km devant, plus une lente rotation : un vrai travelling de drone.
      const target = (headingAtDist(ROUTE, d, 1500) + 25 * Math.sin(now / 9000) + 360) % 360;
      camBearing = easeAngle(camBearing, target, 0.02);
      map.jumpTo({ center: pos, bearing: camBearing });
    };

    map.on('load', () => {
      try {
        map.setTerrain({ source: 'dem', exaggeration: 1.25 });
        map.setSky({ 'sky-color': '#8FB4D9', 'horizon-color': '#E9DCC8', 'fog-color': '#C9C2B4', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.85 });
      } catch {
        /* relief non pris en charge */
      }
      map.addSource('all', { type: 'geojson', data: line(ROUTE.path) });
      map.addSource('done', { type: 'geojson', data: line(reduced ? ROUTE.path : ROUTE.path.slice(0, 2)) });
      map.addSource('car', { type: 'geojson', data: point(reduced ? ROUTE.path.at(-1)! : start) });
      const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
      map.addLayer({ id: 'all', type: 'line', source: 'all', paint: { 'line-color': '#FFF8EC', 'line-opacity': 0.35, 'line-width': 2 }, layout: round });
      map.addLayer({ id: 'done-glow', type: 'line', source: 'done', paint: { 'line-color': '#DB4740', 'line-opacity': 0.35, 'line-width': 12, 'line-blur': 6 }, layout: round });
      map.addLayer({ id: 'done', type: 'line', source: 'done', paint: { 'line-color': '#DB4740', 'line-width': 4 }, layout: round });
      map.addLayer({ id: 'car-halo', type: 'circle', source: 'car', paint: { 'circle-radius': 16, 'circle-color': '#DB4740', 'circle-opacity': 0.25, 'circle-pitch-alignment': 'map' } });
      map.addLayer({ id: 'car', type: 'circle', source: 'car', paint: { 'circle-radius': 7, 'circle-color': '#DB4740', 'circle-stroke-color': '#FFF8EC', 'circle-stroke-width': 3, 'circle-pitch-alignment': 'map' } });
      if (reduced) {
        const b = ROUTE.path.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(start, start));
        map.fitBounds(b, { padding: 60, pitch: 55, duration: 0 });
      } else {
        frame = requestAnimationFrame(tick);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      mapRef.current = null;
      map.remove();
    };
  }, []);

  return <div ref={ref} className="h-full w-full" />;
}
