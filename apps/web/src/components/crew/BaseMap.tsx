/**
 * Fond de carte vectoriel OpenFreeMap (https://openfreemap.org) :
 * gratuit, sans clé d'API, sans limite, et auto-hébergeable plus tard.
 * Rendu par MapLibre GL à l'intérieur de la carte Leaflet : style « Liberty », légèrement réchauffé en CSS
 * (le style « Positron » teinté parchemin manquait de contraste une fois zoomé).
 */
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { LIBERTY_STYLE } from '@/lib/maplibre';

export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

export function BaseMap() {
  const map = useMap();
  useEffect(() => {
    const layer = maplibreGL({ style: LIBERTY_STYLE, attributionControl: false });
    layer.addTo(map);

    map.attributionControl?.addAttribution(MAP_ATTRIBUTION);
    return () => {
      map.attributionControl?.removeAttribution(MAP_ATTRIBUTION);
      layer.remove();
    };
  }, [map]);
  return null;
}
