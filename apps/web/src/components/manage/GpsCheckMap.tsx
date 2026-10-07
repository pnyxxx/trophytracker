/**
 * Petite carte de vérification (onglet GPS) : où la dernière position a été reçue.
 * Suit la position à chaque actualisation, sans recréer la carte.
 */
import { useEffect, useRef } from 'react';
import type { Map as MlMap, Marker } from 'maplibre-gl';
import { maplibregl, POSITRON_STYLE, webglAvailable } from '@/lib/maplibre';

export default function GpsCheckMap({ lat, lon, live }: { lat: number; lon: number; live: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const markerEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || !webglAvailable()) return;
    const m = new maplibregl.Map({
      container: ref.current,
      style: POSITRON_STYLE,
      center: [lon, lat],
      zoom: 14,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const el = document.createElement('div');
    el.style.cssText = 'width:22px;height:22px';
    markerEl.current = el;
    marker.current = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(m);
    map.current = m;
    return () => {
      map.current = null;
      m.remove();
    };
    // Carte créée une seule fois ; les nouvelles positions sont gérées ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    marker.current?.setLngLat([lon, lat]);
    map.current?.easeTo({ center: [lon, lat], duration: 800 });
  }, [lat, lon]);

  useEffect(() => {
    if (markerEl.current) markerEl.current.className = `tt-car ${live ? 'tt-car--live' : ''}`;
  }, [live]);

  // Le conteneur MapLibre reçoit « position: relative » de sa feuille de style : on l'enveloppe.
  return (
    <div className="absolute inset-0">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
