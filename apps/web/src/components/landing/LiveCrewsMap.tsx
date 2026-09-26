/**
 * Carte « Où sont-ils ? » : parcours prévu et dernière position connue
 * de chaque équipage public. Un clic sur un équipage ouvre sa page.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import type { CrewSummary } from '@/hooks/queries';
import { isLive } from '@/lib/format';
import { maplibregl, POSITRON_STYLE, webglAvailable } from '@/lib/maplibre';

interface Point { name: string; lat: number; lon: number }

export default function LiveCrewsMap({ route, crews }: { route: Point[]; crews: CrewSummary[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  // Actions en attente du chargement du style (on ne peut rien ajouter avant).
  const loaded = useRef(false);
  const pending = useRef<(() => void)[]>([]);
  const whenLoaded = (fn: () => void) => (loaded.current ? fn() : pending.current.push(fn));
  const crewMarkers = useRef<Marker[]>([]);
  const routeMarkers = useRef<Marker[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ref.current || !webglAvailable()) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: POSITRON_STYLE,
      center: [-4.6, 37],
      zoom: 4.2,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.on('load', () => {
      loaded.current = true;
      pending.current.splice(0).forEach((fn) => fn());
    });
    return () => {
      loaded.current = false;
      pending.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Parcours : trait pointillé + étiquettes des étapes, cadrage sur l'ensemble.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || route.length === 0) return;
    const draw = () => {
      const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: route.map((w) => [w.lon, w.lat]) } };
      const src = map.getSource('route') as GeoJSONSource | undefined;
      if (src) src.setData(data);
      else {
        map.addSource('route', { type: 'geojson', data });
        map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#1A1612', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
      }
      routeMarkers.current.forEach((m) => m.remove());
      routeMarkers.current = route.map((w) => {
        const el = document.createElement('div');
        el.style.cssText = "background:#1A1612;color:#F4ECDF;font:600 10px 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;padding:3px 6px;white-space:nowrap";
        el.textContent = w.name;
        return new maplibregl.Marker({ element: el, anchor: 'left', offset: [8, 0] }).setLngLat([w.lon, w.lat]).addTo(map);
      });
      const bounds = new maplibregl.LngLatBounds();
      route.forEach((w) => bounds.extend([w.lon, w.lat]));
      map.fitBounds(bounds, { padding: 60, duration: 0 });
    };
    whenLoaded(draw);
  }, [route]);

  // Équipages : pastille « #numéro », bord vert s'ils émettent en ce moment.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    crewMarkers.current.forEach((m) => m.remove());
    crewMarkers.current = crews
      .filter((c) => c.last_lat != null && c.last_lon != null)
      .map((c) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.style.cssText = `background:#DB4740;color:#fff;font:700 11px 'JetBrains Mono',monospace;padding:4px 7px;border-radius:3px;border:2px solid ${isLive(c.last_fix_at) ? '#3DD68C' : '#fff'};box-shadow:0 4px 12px rgba(0,0,0,.35);cursor:pointer`;
        el.textContent = c.car_number ? `#${c.car_number}` : c.name;
        el.title = c.name;
        el.setAttribute('aria-label', `Voir l'équipage ${c.name}`);
        el.addEventListener('click', () => navigate(`/equipages/${c.slug}`));
        return new maplibregl.Marker({ element: el }).setLngLat([c.last_lon!, c.last_lat!]).addTo(map);
      });
  }, [crews, navigate]);

  return (
    <div className="tt-parchment absolute inset-0">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
