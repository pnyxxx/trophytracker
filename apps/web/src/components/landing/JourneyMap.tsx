/**
 * Vue satellite 3D qui suit la 4L le long du parcours au rythme du défilement.
 * Chargée à part (MapLibre est volumineux) : la page d'accueil s'affiche sans l'attendre.
 */
import { useEffect, useRef } from 'react';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import { maplibregl, satelliteStyle, webglAvailable } from '@/lib/maplibre';
import { citySignHtml, DENSE, headingAt, idxAt, PATH, posAt, STOP_FRAC, STOPS } from './journey';

interface Scene {
  map: MlMap;
  car: Marker;
  signs: HTMLElement[];
}

function update(scene: Scene, p: number) {
  const { map, car, signs } = scene;
  const pos = posAt(p);
  // Zoom avant en douceur à l'approche de chaque étape.
  const near = Math.min(...STOP_FRAC.map((f) => Math.abs(f - p)));
  let k = Math.max(0, 1 - near / 0.035);
  k = k * k * (3 - 2 * k);
  map.jumpTo({ center: pos, bearing: headingAt(p), pitch: 62 - 8 * k, zoom: 6.5 + 1.4 * k });
  (map.getSource('done') as GeoJSONSource | undefined)?.setData({
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: [...DENSE.slice(0, idxAt(p) + 1), pos] },
  });
  car.setLngLat(pos);
  signs.forEach((el, j) => {
    el.style.opacity = STOP_FRAC[j]! <= p + 0.012 ? '1' : '.6';
  });
}

export default function JourneyMap({ progress }: { progress: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    if (!ref.current || !webglAvailable()) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: satelliteStyle(true),
      center: PATH[0],
      zoom: 6.6,
      pitch: 60,
      maxPitch: 75,
      bearing: headingAt(0),
      interactive: false,
      attributionControl: { compact: true },
      fadeDuration: 0,
    });
    map.on('load', () => {
      try {
        map.setTerrain({ source: 'dem', exaggeration: 1.8 });
        map.setSky({
          'sky-color': '#1B130D',
          'horizon-color': '#6B3E22',
          'fog-color': '#2A1A10',
          'sky-horizon-blend': 0.7,
          'horizon-fog-blend': 0.5,
          'fog-ground-blend': 0.55,
          'atmosphere-blend': 0,
        });
      } catch {
        /* relief non pris en charge : la carte reste à plat */
      }
      map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: DENSE } } });
      map.addSource('done', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [PATH[0]!, PATH[0]!] } } });
      const round = { 'line-join': 'round', 'line-cap': 'round' } as const;
      map.addLayer({ id: 'route', type: 'line', source: 'route', layout: round, paint: { 'line-color': '#F4ECDF', 'line-opacity': 0.55, 'line-width': 1.6, 'line-dasharray': [2, 2.5] } });
      map.addLayer({ id: 'done-glow', type: 'line', source: 'done', layout: round, paint: { 'line-color': '#FF4A3D', 'line-opacity': 0.55, 'line-width': 12, 'line-blur': 9 } });
      map.addLayer({ id: 'done', type: 'line', source: 'done', layout: round, paint: { 'line-color': '#FF6A5E', 'line-width': 3.5 } });

      const signs = STOPS.map((s) => {
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;transition:opacity .4s';
        el.innerHTML = citySignHtml(s.name);
        new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([s.lon, s.lat]).addTo(map);
        return el;
      });

      const carEl = document.createElement('div');
      carEl.className = 'tt-car tt-car--live';
      carEl.style.cssText = 'width:18px;height:18px';
      const car = new maplibregl.Marker({ element: carEl }).setLngLat(PATH[0]!).addTo(map);

      scene.current = { map, car, signs };
      update(scene.current, progressRef.current);
    });
    return () => {
      scene.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (scene.current) update(scene.current, progress);
  }, [progress]);

  // Le conteneur MapLibre reçoit « position: relative » de sa feuille de style : on l'enveloppe.
  return (
    <div className="tt-journey-map absolute inset-0">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
