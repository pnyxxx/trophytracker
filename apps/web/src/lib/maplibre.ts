/**
 * MapLibre GL prêt à l'emploi : feuille de style, « worker » empaqueté par Vite
 * et styles de carte partagés (fond OpenFreeMap, imagerie satellite en relief).
 */
import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// Le « worker » MapLibre (décodage des tuiles en arrière-plan) est empaqueté à part par Vite.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

maplibregl.setWorkerUrl(workerUrl);

export { maplibregl };

/** Fond vectoriel clair OpenFreeMap (gratuit, sans clé), teinté « parchemin » en CSS. */
export const POSITRON_STYLE = 'https://tiles.openfreemap.org/styles/positron';

/**
 * Imagerie satellite Esri + relief (tuiles d'altitude Terrarium d'AWS Open Data).
 * Utilisée pour les vues « immersives » de l'accueil.
 */
export function satelliteStyle(hillshade: boolean): StyleSpecification {
  const dem = {
    type: 'raster-dem' as const,
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium' as const,
    tileSize: 256,
    maxzoom: 12,
  };
  return {
    version: 8,
    sources: {
      sat: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics',
      },
      dem,
      demh: dem,
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#1A1510' } },
      { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': 0.08, 'raster-contrast': 0.14, 'raster-brightness-max': 0.9 } },
      ...(hillshade
        ? [{
            id: 'hill',
            type: 'hillshade' as const,
            source: 'demh',
            paint: {
              'hillshade-exaggeration': 0.3,
              'hillshade-shadow-color': '#140C06',
              'hillshade-highlight-color': '#FFE9C8',
              'hillshade-accent-color': '#3A2415',
            },
          }]
        : []),
    ],
  };
}

/** Le navigateur sait-il afficher une carte WebGL ? (sinon on garde un fond uni) */
export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
