/**
 * Vraie carte du road trip d'exemple (« Route des Grandes Alpes ») pour l'accueil, au thème « sable de nuit »
 * (baliseStyle, lib/maplibre.ts). Carte FIXE : pas de déplacement ni de 3D, les tuiles se chargent une fois et
 * la page reste fluide. Chargée à part (MapLibre est volumineux) : en attendant, le cadre montre les dunes.
 *
 *  - `overview` : tout le trajet parcouru, de Thonon jusqu'à la position actuelle ;
 *  - `close`    : zoom sur les derniers kilomètres, autour de la balise.
 * Tracé : example-route.json (scripts/build-landing-route.mjs).
 */
import { useEffect, useRef, useState } from 'react';
import type { LngLatBoundsLike } from 'maplibre-gl';
import { baliseStyle, maplibregl, webglAvailable } from '@/lib/maplibre';
import { stageStyle } from '@/components/crew/mapIcons';
import { cn } from '@/lib/utils';
import ROUTE from './example-route.json';

type LonLat = [number, number];
const path = ROUTE.path as LonLat[];
const here = ROUTE.here as LonLat;

const line = (coords: LonLat[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } });

function bounds(pts: LonLat[]): LngLatBoundsLike {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

/** Étiquette d'étape, comme sur une vraie page de road trip (DM Mono en capitales), à droite ou à gauche du point. */
function stopLabel(text: string, kind: string, side: 'left' | 'right') {
  const el = document.createElement('div');
  el.className = cn('flex items-center gap-2', side === 'left' && 'flex-row-reverse');
  el.innerHTML = `<span style="background:${stageStyle(kind).color}" class="h-3 w-3 flex-none rounded-full border-2 border-cream"></span>`
    + '<span class="whitespace-nowrap rounded-md bg-[#121316]/85 px-2 py-1 font-mono text-[0.5882rem] uppercase tracking-[0.08em] text-cream"></span>';
  el.lastElementChild!.textContent = text;
  return el;
}

export default function ExampleMap({ mode, className }: { mode: 'overview' | 'close'; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !webglAvailable()) return;
    const close = mode === 'close';
    const tail = path.slice(-Math.round(path.length * 0.16));
    const pad = Math.round(Math.min(el.clientWidth, el.clientHeight) * 0.12);
    const map = new maplibregl.Map({
      container: el,
      style: baliseStyle(),
      bounds: close ? bounds(tail) : bounds(path),
      // Marges : place pour les pastilles en haut et le nom du road trip en bas (LiveScene).
      fitBoundsOptions: { padding: close ? { top: 56, bottom: pad * 1.5, left: pad, right: pad * 1.5 } : { top: 52, bottom: 76, left: 28, right: 28 } },
      interactive: false,
      attributionControl: { compact: true },
      fadeDuration: 0,
      // Une carte fixe n'a pas besoin de plus : moins de mémoire et de calcul.
      maxTileCacheSize: 60,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    });

    map.on('load', () => {
      const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
      map.addSource('trace', { type: 'geojson', data: line(path) });
      map.addLayer({ id: 'trace-glow', type: 'line', source: 'trace', layout: round, paint: { 'line-color': '#E1262C', 'line-width': 12, 'line-blur': 8, 'line-opacity': 0.45 } });
      map.addLayer({ id: 'trace-edge', type: 'line', source: 'trace', layout: round, paint: { 'line-color': '#121316', 'line-width': 6.5 } });
      map.addLayer({ id: 'trace', type: 'line', source: 'trace', layout: round, paint: { 'line-color': '#E1262C', 'line-width': 3.6 } });

      for (const s of ROUTE.stops) {
        const labelled = 'label' in s && s.label && (!close || s.kind !== 'night');
        if (!labelled) {
          const dot = Object.assign(document.createElement('span'), { className: 'block h-2.5 w-2.5 rounded-full border-2 border-cream' });
          dot.style.background = stageStyle(s.kind).color;
          new maplibregl.Marker({ element: dot }).setLngLat([s.lon, s.lat]).addTo(map);
          continue;
        }
        // Étiquette du côté où il y a de la place : jamais coupée par le bord de la carte.
        const side = map.project([s.lon, s.lat]).x > el.clientWidth * 0.5 ? 'left' : 'right';
        new maplibregl.Marker({ element: stopLabel(s.label as string, s.kind, side), anchor: side === 'right' ? 'left' : 'right', offset: [side === 'right' ? -6 : 6, 0] })
          .setLngLat([s.lon, s.lat])
          .addTo(map);
      }
      // Crédits de la carte repliés derrière le petit « i » (ouverts par défaut, ils cachent le bas de la carte).
      const attrib = el.querySelector('.maplibregl-ctrl-attrib');
      attrib?.classList.remove('maplibregl-compact-show');
      attrib?.removeAttribute('open');

      const beacon = document.createElement('div');
      beacon.className = 'relative h-6 w-6';
      beacon.innerHTML = '<span class="absolute inset-0 animate-ping rounded-full bg-signal"></span><span class="absolute inset-0 rounded-full border-[3px] border-white bg-signal shadow-[0_6px_16px_rgba(0,0,0,.5)]"></span>';
      new maplibregl.Marker({ element: beacon }).setLngLat(here).addTo(map);
    });
    // Affichée seulement une fois le fond dessiné : pas de carte qui se remplit morceau par morceau.
    map.once('idle', () => setReady(true));

    return () => map.remove();
  }, [mode]);

  return <div ref={ref} className={cn('h-full w-full transition-opacity duration-700', ready ? 'opacity-100' : 'opacity-0', className)} />;
}
