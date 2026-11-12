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
 * Thème « carnet de route » du site (accueil, page d'un road trip) : fond vectoriel OpenFreeMap (gratuit, sans clé)
 * redessiné en CLAIR, aux couleurs du site : terres crème, eau bleu doux, relief ombré léger, routes blanches ;
 * la trace rouge ressort nettement. (Une première version sombre et brune rendait le site trop sombre.)
 * Pensé pour une carte fixe : peu de tuiles, chargées une seule fois.
 */
export function baliseStyle(): StyleSpecification {
  const omt = 'omt';
  const roads = (classes: string[]) => ['match', ['get', 'class'], classes, true, false] as unknown as FilterSpecification;
  const width = (z0: number, w0: number, z1: number, w1: number) => ['interpolate', ['linear'], ['zoom'], z0, w0, z1, w1] as unknown as number;
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
      { id: 'bg', type: 'background', paint: { 'background-color': '#F1EDE5' } },
      { id: 'wood', type: 'fill', source: omt, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': '#E3E6D8', 'fill-opacity': 0.8 } },
      { id: 'grass', type: 'fill', source: omt, 'source-layer': 'landcover', filter: ['match', ['get', 'class'], ['grass', 'farmland'], true, false] as unknown as FilterSpecification, paint: { 'fill-color': '#ECEBDF', 'fill-opacity': 0.6 } },
      { id: 'sand', type: 'fill', source: omt, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'sand'], paint: { 'fill-color': '#F3E6CC', 'fill-opacity': 0.9 } },
      { id: 'ice', type: 'fill', source: omt, 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'ice'], paint: { 'fill-color': '#FAFAF7' } },
      {
        id: 'relief', type: 'hillshade', source: 'dem',
        paint: {
          'hillshade-exaggeration': 0.35,
          'hillshade-shadow-color': '#8F8676',
          'hillshade-highlight-color': '#FFFFFF',
          'hillshade-accent-color': '#B8AE9C',
          'hillshade-illumination-direction': 315,
        },
      },
      { id: 'town', type: 'fill', source: omt, 'source-layer': 'landuse', minzoom: 9, filter: ['match', ['get', 'class'], ['residential', 'suburb', 'neighbourhood', 'commercial', 'industrial'], true, false], paint: { 'fill-color': '#E6E0D5', 'fill-opacity': 0.8 } },
      { id: 'water', type: 'fill', source: omt, 'source-layer': 'water', paint: { 'fill-color': '#BCD5E2' } },
      { id: 'river', type: 'line', source: omt, 'source-layer': 'waterway', minzoom: 8, paint: { 'line-color': '#A9C8D8', 'line-width': width(8, 0.6, 14, 2) } },
      { id: 'building', type: 'fill', source: omt, 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': '#DCD4C7', 'fill-outline-color': '#CFC6B6' } },
      { id: 'border', type: 'line', source: omt, 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': '#7C766C', 'line-opacity': 0.55, 'line-width': 1.2, 'line-dasharray': [3, 2] } },
      { id: 'track', type: 'line', source: omt, 'source-layer': 'transportation', minzoom: 12, filter: roads(['track', 'path']), paint: { 'line-color': '#B9AF9F', 'line-width': 1, 'line-dasharray': [2, 2] } },
      { id: 'road-casing', type: 'line', source: omt, 'source-layer': 'transportation', minzoom: 9, filter: roads(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#D3CABA', 'line-width': width(9, 1.6, 16, 10) } },
      { id: 'road-small', type: 'line', source: omt, 'source-layer': 'transportation', minzoom: 11, filter: roads(['minor', 'service']), paint: { 'line-color': '#FFFFFF', 'line-width': width(11, 0.6, 16, 5) } },
      { id: 'road-minor', type: 'line', source: omt, 'source-layer': 'transportation', minzoom: 8, filter: roads(['secondary', 'tertiary']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': width(8, 0.6, 16, 7) } },
      { id: 'road-major', type: 'line', source: omt, 'source-layer': 'transportation', filter: roads(['motorway', 'trunk', 'primary']), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#F7DDB0', 'line-width': width(5, 0.5, 16, 8) } },
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
        paint: { 'text-color': '#4E4A43', 'text-halo-color': '#F7F4EE', 'text-halo-width': 1.6 },
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
