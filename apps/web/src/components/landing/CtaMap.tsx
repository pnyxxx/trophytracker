/** Fond animé de l'appel à l'action : les dunes de Merzouga en satellite, qui tournent lentement. */
import { useEffect, useRef } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import { useInView } from '@/hooks/useInView';
import { maplibregl, satelliteStyle, webglAvailable } from '@/lib/maplibre';

export default function CtaMap() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const visible = useInView(ref, '0px');
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (!ref.current || !webglAvailable()) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: satelliteStyle(false),
      center: [-3.995, 31.095],
      zoom: 12.6,
      pitch: 45,
      bearing: -20,
      interactive: false,
      attributionControl: { compact: true },
      fadeDuration: 0,
    });
    mapRef.current = map;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Rotation lente, uniquement quand la section est visible (économise batterie et GPU).
    const drift = () => {
      if (visibleRef.current) map.easeTo({ bearing: map.getBearing() + 40, duration: 90_000, easing: (t: number) => t });
    };
    map.on('load', () => {
      try {
        map.setTerrain({ source: 'dem', exaggeration: 2.2 });
      } catch {
        /* relief non pris en charge */
      }
      if (!reduced) {
        map.on('moveend', drift);
        drift();
      }
    });
    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (visible) map.easeTo({ bearing: map.getBearing() + 40, duration: 90_000, easing: (t: number) => t });
    else map.stop();
  }, [visible]);

  return (
    <div className="absolute inset-0">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
