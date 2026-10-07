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
 * Fond vectoriel détaillé OpenFreeMap (routes colorées, relief ombré, pistes) : bien lisible une fois
 * zoomé, pour suivre un road trip de près.
 */
export const LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Imagerie satellite en relief, pour les vues 3D.
 *  - « ign » : orthophotos de l'IGN (France, ~20 cm, Licence Ouverte : usage commercial autorisé), très nettes ;
 *  - « esri » : imagerie mondiale Esri (repli hors de France).
 * Relief : tuiles d'altitude Terrarium d'AWS Open Data, jusqu'au zoom 14 (~10 m).
 */
export type Imagery = 'ign' | 'esri';

const IMAGERY: Record<Imagery, { tiles: string[]; maxzoom: number; attribution: string }> = {
  ign: {
    tiles: ['https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'],
    maxzoom: 19,
    attribution: 'Orthophotos © IGN',
  },
  esri: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    maxzoom: 18,
    attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics',
  },
};

/** France métropolitaine (et Corse), assez large : là, l'IGN couvre tout. */
export const inFrance = (lon: number, lat: number) => lon > -5.3 && lon < 9.7 && lat > 41.3 && lat < 51.2;

export function satelliteStyle(imagery: Imagery = 'esri'): StyleSpecification {
  const src = IMAGERY[imagery];
  return {
    version: 8,
    sources: {
      sat: { type: 'raster', tiles: src.tiles, tileSize: 256, maxzoom: src.maxzoom, attribution: src.attribution },
      dem: {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
        attribution: 'Relief : Mapzen / AWS Terrain Tiles',
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#1A1510' } },
      { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-contrast': 0.06, 'raster-fade-duration': 0 } },
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
