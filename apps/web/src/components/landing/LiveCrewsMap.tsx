/**
 * Carte « Où sont-ils ? » : parcours prévu et dernière position connue
 * de chaque équipage public. Même rendu que la carte d'un équipage
 * (fond OpenFreeMap réchauffé, repères d'étapes, 4L en point rouge).
 */
import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize } from 'lucide-react';
import type { CrewSummary } from '@/hooks/queries';
import { formatRelative, isLive } from '@/lib/format';
import { BaseMap } from '@/components/crew/BaseMap';
import { crewIcon, waypointIcon, waypointStyle } from '@/components/crew/mapIcons';

export interface RoutePoint { name: string; kind: string; lat: number; lon: number }

/** Cadre la carte sur tout le parcours, une seule fois. */
function FitRoute({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || coords.length === 0) return;
    done.current = true;
    if (coords.length === 1) map.setView(coords[0]!, 8);
    else map.fitBounds(new LatLngBounds(coords), { padding: [40, 40] });
  }, [map, coords]);
  return null;
}

/**
 * `route` : étapes nommées ; `line` : tracé [lon, lat] qui les relie ;
 * `passages` : lieux traversés sans nom affiché (villes floutées de l'étape marathon).
 */
export default function LiveCrewsMap({ route, line, passages, crews }: {
  route: RoutePoint[];
  line: [number, number][];
  passages: { lat: number; lon: number }[];
  crews: CrewSummary[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const path = useMemo(() => line.map(([lon, lat]) => [lat, lon] as [number, number]), [line]);
  const routeIcons = useMemo(() => route.map((w) => waypointIcon(w)), [route]);
  const placed = useMemo(
    () => crews
      .filter((c) => c.last_lat != null && c.last_lon != null)
      .map((c) => ({ crew: c, live: isLive(c.last_fix_at), icon: crewIcon(isLive(c.last_fix_at), c.car_number ? `#${c.car_number}` : c.name) })),
    [crews],
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <MapContainer center={[37, -4.6]} zoom={5} preferCanvas scrollWheelZoom className="h-full w-full" style={{ zIndex: 0 }}>
        <BaseMap />
        <FitRoute coords={path} />

        {path.length > 1 && (
          // Parcours prévu en pointillés : la trace rouge, elle, est réservée à la page de chaque équipage.
          <Polyline positions={path} pathOptions={{ color: '#1A1612', weight: 2.5, opacity: 0.8, dashArray: '6 6' }} />
        )}

        {passages.map((p) => (
          <CircleMarker
            key={`${p.lat},${p.lon}`}
            center={[p.lat, p.lon]}
            radius={4}
            pathOptions={{ color: '#1A1612', weight: 2, fillColor: '#F4ECDF', fillOpacity: 1 }}
          />
        ))}

        {route.map((w, i) => (
          <Marker key={`${w.name}-${i}`} position={[w.lat, w.lon]} icon={routeIcons[i]}>
            <Popup>
              <p className="text-xs font-semibold uppercase text-black/50">{waypointStyle(w.kind).label}</p>
              <p className="font-bold text-black">{w.name}</p>
            </Popup>
          </Marker>
        ))}

        {placed.map(({ crew, live, icon }) => (
          <Marker key={crew.id} position={[crew.last_lat!, crew.last_lon!]} icon={icon} zIndexOffset={1000}>
            <Popup>
              <p className="font-bold text-black">{crew.name}</p>
              <p className="text-sm text-black/70">
                {live ? '● En direct' : `Dernière position ${formatRelative(crew.last_fix_at)}`}
              </p>
              <Link to={`/equipages/${crew.slug}`} className="text-sm text-primary underline">Suivre sa trace</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute right-3 top-3 z-[500]">
        <button
          onClick={() => containerRef.current?.requestFullscreen?.()}
          className="flex items-center justify-center gap-2 rounded-[4px] bg-ink px-3 py-2.5 text-cream shadow-lg hover:bg-primary"
          aria-label="Carte en plein écran"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
