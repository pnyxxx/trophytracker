/**
 * MapLibre GL prêt à l'emploi : feuille de style, « worker » empaqueté par Vite
 * et styles de carte partagés (fond OpenFreeMap, imagerie satellite en relief).
 */
import * as maplibregl from 'maplibre-gl';
import type { FilterSpecification, StyleSpecification } from 'maplibre-gl';
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
 *  - « esri » : imagerie mondiale Esri, utilisée partout : couleurs homogènes d'un zoom à l'autre ;
 *  - « ign » : orthophotos de l'IGN (France, ~20 cm, Licence Ouverte), très nettes mais faites d'une mosaïque
 *    de prises de vue qui changent de couleur selon le zoom : plus utilisées pour les cartes animées (choix de Julien).
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

/**
 * Thème « sable de nuit » de l'accueil : fond vectoriel OpenFreeMap (gratuit, sans clé) redessiné aux couleurs du
 * site, avec le relief ombré en tons sable (sans 3D) : sombre, chaud, et la trace rouge ressort.
 * Pensé pour une carte fixe : peu de tuiles, chargées une seule fois.
 */
export function baliseStyle(): StyleSpecification {
  const omt = 'omt';
  const roads = (classes: string[]) => ['match', ['get', 'class'], classes, true, false] as unknown as FilterSpecification;
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      [omt]: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      dem: {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 11,
        attribution: 'Relief : Mapzen / AWS Terrain Tiles',
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#1C1611' } },
      { id: 'wood', type: 'fill', source: omt, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': '#1F1A13', 'fill-opacity': 0.7 } },
      { id: 'ice', type: 'fill', source: omt, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'ice'], paint: { 'fill-color': '#3A342C', 'fill-opacity': 0.55 } },
      {
        id: 'relief', type: 'hillshade', source: 'dem',
        paint: {
          'hillshade-exaggeration': 0.6,
          'hillshade-shadow-color': '#0B0806',
          'hillshade-highlight-color': '#7A5C3A',
          'hillshade-accent-color': '#2E2218',
          'hillshade-illumination-direction': 315,
        },
      },
      { id: 'town', type: 'fill', source: omt, 'source-layer': 'landuse', minzoom: 9, filter: ['match', ['get', 'class'], ['residential', 'suburb', 'neighbourhood', 'commercial', 'industrial'], true, false], paint: { 'fill-color': '#2A2119', 'fill-opacity': 0.55 } },
      { id: 'water', type: 'fill', source: omt, 'source-layer': 'water', paint: { 'fill-color': '#0E171D' } },
      { id: 'building', type: 'fill', source: omt, 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': '#3A2E22', 'fill-opacity': 0.6 } },
      { id: 'river', type: 'line', source: omt, 'source-layer': 'waterway', minzoom: 8, paint: { 'line-color': '#18252E', 'line-width': 1 } },
      { id: 'border', type: 'line', source: omt, 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': '#F5F1EA', 'line-opacity': 0.28, 'line-width': 1.2, 'line-dasharray': [3, 3] } },
      { id: 'track', type: 'line', source: omt, 'source-layer': 'transportation', minzoom: 12, filter: roads(['track', 'path']), paint: { 'line-color': '#4A3B2C', 'line-width': 1, 'line-dasharray': [2, 2] } },
      { id: 'road-small', type: 'line', source: omt, 'source-layer': 'transportation', minzoom: 11, filter: roads(['minor', 'service']), paint: { 'line-color': '#3A2E22', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 16, 4] } },
      { id: 'road-minor', type: 'line', source: omt, 'source-layer': 'transportation', minzoom: 8, filter: roads(['secondary', 'tertiary']), paint: { 'line-color': '#4A3B2C', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 6] } },
      { id: 'road-major', type: 'line', source: omt, 'source-layer': 'transportation', filter: roads(['motorway', 'trunk', 'primary']), paint: { 'line-color': '#6A5238', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 16, 8] } },
      {
        id: 'places', type: 'symbol', source: omt, 'source-layer': 'place',
        filter: ['any', ['match', ['get', 'class'], ['city', 'town'], true, false], ['all', ['>=', ['zoom'], 10], ['==', ['get', 'class'], 'village']], ['all', ['>=', ['zoom'], 13], ['==', ['get', 'class'], 'hamlet']]] as unknown as FilterSpecification,
        layout: {
          'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['match', ['get', 'class'], 'city', 12, 'town', 10.5, 9.5],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
        },
        paint: { 'text-color': '#CDBBA0', 'text-opacity': 0.75, 'text-halo-color': '#1C1611', 'text-halo-width': 1.4 },
      },
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
