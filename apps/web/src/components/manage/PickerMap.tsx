/**
 * Petite carte pour ajuster une position : on fait glisser l'épingle, ou on touche
 * la carte à l'endroit voulu. Chargée à la demande (MapLibre est lourd).
 */
import { useEffect, useRef } from 'react';
import type { Map as MlMap, Marker } from 'maplibre-gl';
import { maplibregl, LIBERTY_STYLE, webglAvailable } from '@/lib/maplibre';

interface Props {
  lat: number;
  lon: number;
  onMove: (lat: number, lon: number) => void;
}

export default function PickerMap({ lat, lon, onMove }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!ref.current || !webglAvailable()) return;
    const m = new maplibregl.Map({
      container: ref.current,
      style: LIBERTY_STYLE,
      center: [lon, lat],
      zoom: 13,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const mk = new maplibregl.Marker({ color: '#DB4740', draggable: true }).setLngLat([lon, lat]).addTo(m);
    mk.on('dragend', () => {
      const p = mk.getLngLat();
      onMoveRef.current(p.lat, p.lng);
    });
    m.on('click', (e) => {
      mk.setLngLat(e.lngLat);
      onMoveRef.current(e.lngLat.lat, e.lngLat.lng);
    });
    map.current = m;
    marker.current = mk;
    return () => {
      map.current = null;
      m.remove();
    };
    // Carte créée une seule fois ; les nouvelles positions sont gérées ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position changée de l'extérieur (recherche, saisie) : on y amène l'épingle et la carte.
  useEffect(() => {
    const mk = marker.current;
    if (!mk) return;
    const cur = mk.getLngLat();
    if (Math.abs(cur.lat - lat) < 1e-7 && Math.abs(cur.lng - lon) < 1e-7) return;
    mk.setLngLat([lon, lat]);
    map.current?.easeTo({ center: [lon, lat], duration: 600 });
  }, [lat, lon]);

  if (!webglAvailable()) {
    return <p className="m-0 p-3 text-xs text-dust-400">Carte indisponible sur ce navigateur : la position est bien enregistrée.</p>;
  }

  // Le conteneur MapLibre reçoit « position: relative » de sa feuille de style : on l'enveloppe.
  return (
    <div className="absolute inset-0">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
