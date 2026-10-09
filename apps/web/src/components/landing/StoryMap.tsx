/**
 * Carte satellite 3D du récit de l'accueil (imagerie Esri, couleurs homogènes à tous les zooms, + relief) : la caméra suit le défilement de la page
 * (`prog`, voir story.ts), la trace rouge se dessine derrière le voyageur, un tronçon pointillé figure le passage
 * hors réseau, et les photos apparaissent au col. Sans animation propre : tout dépend de `prog`.
 * Chargé à part : MapLibre est volumineux.
 */
import { useEffect, useRef } from 'react';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import { maplibregl, satelliteStyle, webglAvailable } from '@/lib/maplibre';
import { pathUntil, pointAtDist, type LonLat } from '@/lib/route-anim';
import { cameraAt, distAt, offlineAt, photosAt, PHOTOS, ROUTE, STILL_CAMERA } from './story';

const EXAGGERATION = 1.4;

const line = (coords: LonLat[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } });

export default function StoryMap({ prog, wide, onAltitude }: {
  prog: number;
  /** Grand écran : la carte laisse la place aux chapitres à gauche. */
  wide: boolean;
  /** Altitude (m) sous le voyageur, lue dans le relief, ou null tant qu'il n'est pas chargé. */
  onAltitude?: (m: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  const markerRef = useRef<Marker | null>(null);
  const photoEls = useRef<HTMLElement[]>([]);
  const latest = useRef({ prog, wide, onAltitude });
  latest.current = { prog, wide, onAltitude };

  const apply = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const { prog: p, wide: w } = latest.current;
    map.jumpTo(w ? cameraAt(p) : STILL_CAMERA);
    const d = distAt(p);
    const pos = pointAtDist(ROUTE, d);
    markerRef.current?.setLngLat(pos);
    (map.getSource('done') as GeoJSONSource | undefined)?.setData(line(pathUntil(ROUTE, d)));
    // Hors réseau : les 800 derniers mètres, gardés en mémoire par le téléphone, en pointillés.
    const off = offlineAt(p) ? pathUntil(ROUTE, d).filter((_, k, all) => k === all.length - 1 || ROUTE.cum[k]! > d - 800) : [pos, pos];
    (map.getSource('off') as GeoJSONSource | undefined)?.setData(line(off));
    const show = photosAt(p);
    photoEls.current.forEach((el, k) => {
      el.style.opacity = show ? '1' : '0';
      el.style.transform = `rotate(${PHOTOS[k]!.tilt}deg) scale(${show ? 1 : 0.6})`;
      el.style.transitionDelay = show ? `${k * 90}ms` : '0ms';
    });
    readAltitude();
  };

  const readAltitude = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const elevation = map.queryTerrainElevation(pointAtDist(ROUTE, distAt(latest.current.prog)));
    latest.current.onAltitude?.(elevation == null ? null : Math.round(elevation / EXAGGERATION));
  };

  const applyPadding = () => {
    const map = mapRef.current;
    const el = ref.current;
    if (!map || !el) return;
    const W = el.clientWidth;
    const H = el.clientHeight;
    map.setPadding(latest.current.wide ? { left: Math.round(W * 0.38), right: 0, top: 0, bottom: 0 } : { left: 0, right: 0, top: 0, bottom: Math.round(H * 0.4) });
  };

  useEffect(() => {
    if (!ref.current || !webglAvailable()) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: satelliteStyle('esri'),
      ...(latest.current.wide ? cameraAt(latest.current.prog) : STILL_CAMERA),
      maxPitch: 80,
      interactive: false,
      attributionControl: { compact: true },
      fadeDuration: 0,
      maxTileCacheSize: 400,
    });
    mapRef.current = map;

    map.on('load', () => {
      try {
        map.setTerrain({ source: 'dem', exaggeration: EXAGGERATION });
        map.setSky({ 'sky-color': '#121316', 'horizon-color': '#4A3A44', 'fog-color': '#22232A', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.5 });
      } catch {
        /* relief non pris en charge */
      }
      const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
      map.addSource('all', { type: 'geojson', data: line(ROUTE.path) });
      map.addSource('done', { type: 'geojson', data: line(ROUTE.path.slice(0, 2)) });
      map.addSource('off', { type: 'geojson', data: line([ROUTE.path[0]!, ROUTE.path[0]!]) });
      map.addLayer({ id: 'all', type: 'line', source: 'all', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#F5F1EA', 'line-opacity': 0.55, 'line-width': 2, 'line-dasharray': [1, 2] } });
      map.addLayer({ id: 'done-glow', type: 'line', source: 'done', layout: round, paint: { 'line-color': '#E1262C', 'line-width': 14, 'line-blur': 9, 'line-opacity': 0.45 } });
      map.addLayer({ id: 'done-edge', type: 'line', source: 'done', layout: round, paint: { 'line-color': '#121316', 'line-width': 7.5 } });
      map.addLayer({ id: 'done', type: 'line', source: 'done', layout: round, paint: { 'line-color': '#E1262C', 'line-width': 4.5 } });
      map.addLayer({ id: 'off', type: 'line', source: 'off', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#F5F1EA', 'line-width': 4, 'line-dasharray': [0.6, 1.6] } });

      // La balise : le même point rouge que le logo.
      const beacon = document.createElement('div');
      beacon.className = 'relative h-6 w-6';
      beacon.innerHTML = '<span class="absolute inset-0 animate-ping rounded-full bg-signal"></span><span class="absolute inset-0 rounded-full border-[3px] border-white bg-signal shadow-[0_6px_16px_rgba(0,0,0,.5)]"></span>';
      markerRef.current = new maplibregl.Marker({ element: beacon }).setLngLat(ROUTE.path[0]!).addTo(map);

      photoEls.current = PHOTOS.map((ph) => {
        const card = document.createElement('div');
        card.style.cssText = `width:${ph.w}px;background:#fff;border-radius:12px;padding:5px 5px 0;box-shadow:0 14px 30px rgba(0,0,0,.5);opacity:0;transform:rotate(${ph.tilt}deg) scale(.6);transition:opacity .4s,transform .4s cubic-bezier(.2,1.4,.4,1)`;
        const img = document.createElement('img');
        img.src = ph.src;
        img.alt = ph.alt;
        img.style.cssText = `display:block;width:100%;height:${Math.round(ph.w * 0.8)}px;object-fit:cover;border-radius:8px`;
        card.append(img, Object.assign(document.createElement('div'), { style: 'height:16px' }));
        const wrap = document.createElement('div');
        wrap.append(card);
        new maplibregl.Marker({ element: wrap, anchor: 'bottom' }).setLngLat(ph.at).addTo(map);
        return card;
      });

      readyRef.current = true;
      applyPadding();
      apply();
    });
    // Le relief arrive après coup : on relit l'altitude quand ses tuiles sont là.
    map.on('idle', readAltitude);

    const onResize = () => { applyPadding(); apply(); };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      readyRef.current = false;
      mapRef.current = null;
      map.remove();
    };
    // Créée une seule fois ; `apply` lit les dernières valeurs dans `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyPadding();
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prog, wide]);

  return <div ref={ref} className="h-full w-full" />;
}
