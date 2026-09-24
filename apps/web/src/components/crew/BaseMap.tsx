/**
 * Fond de carte vectoriel OpenFreeMap (https://openfreemap.org) :
 * gratuit, sans clé d'API, sans limite, et auto-hébergeable plus tard.
 * Rendu par MapLibre GL à l'intérieur de la carte Leaflet.
 */
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// Le « worker » MapLibre (décodage des tuiles en arrière-plan) est empaqueté à part par Vite.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

export function BaseMap() {
  const map = useMap();
  useEffect(() => {
    const layer = maplibreGL({ style: MAP_STYLE, attributionControl: false });
    layer.addTo(map);
    map.attributionControl?.addAttribution(MAP_ATTRIBUTION);
    return () => {
      map.attributionControl?.removeAttribution(MAP_ATTRIBUTION);
      layer.remove();
    };
  }, [map]);
  return null;
}
