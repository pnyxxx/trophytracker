/**
 * Carte en direct d'un équipage : trace complète, position actuelle,
 * points du parcours officiel et sponsors.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Maximize } from 'lucide-react';
import type { Crew, Sponsor, Waypoint } from '@/lib/supabase';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { formatDateTime, formatRelative, isLive } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import { BaseMap } from './BaseMap';
import { carIcon, sponsorIcon, waypointIcon, waypointStyle } from './mapIcons';


interface Props {
  crew: Crew;
  points: TrackPoint[];
  waypoints: Waypoint[];
  sponsors: Sponsor[];
}

/** Recentre la carte : sur toute la trace au début, puis suit la voiture si demandé. */
function MapController({ car, points, waypoints, follow }: {
  car: [number, number] | null;
  points: TrackPoint[];
  waypoints: Waypoint[];
  follow: boolean;
}) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const coords: [number, number][] = points.length
      ? points.map((p) => [p[0], p[1]])
      : waypoints.map((w) => [w.lat, w.lon]);
    if (car) coords.push(car);
    if (coords.length === 0) return;
    initialized.current = true;
    if (coords.length === 1) map.setView(coords[0]!, 12);
    else map.fitBounds(new LatLngBounds(coords), { padding: [40, 40], maxZoom: 13 });
  }, [map, car, points, waypoints]);

  useEffect(() => {
    if (follow && car && initialized.current) map.panTo(car, { animate: true, duration: 0.8 });
  }, [map, car, follow]);

  return null;
}

export function CrewMap({ crew, points, waypoints, sponsors }: Props) {
  const [follow, setFollow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const live = isLive(crew.last_fix_at);

  const car = useMemo<[number, number] | null>(() => {
    if (crew.last_lat != null && crew.last_lon != null) return [crew.last_lat, crew.last_lon];
    const last = points.at(-1);
    return last ? [last[0], last[1]] : null;
  }, [crew.last_lat, crew.last_lon, points]);

  const line = useMemo(() => {
    const coords = points.map((p) => [p[0], p[1]] as [number, number]);
    // Relie la trace stockée à la toute dernière position connue.
    if (car && coords.length && (coords.at(-1)![0] !== car[0] || coords.at(-1)![1] !== car[1])) coords.push(car);
    return coords;
  }, [points, car]);

  const mapSponsors = sponsors.filter((s) => s.lat != null && s.lon != null);

  return (
    <div ref={containerRef} className="relative h-[70vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-black/10 shadow-2xl md:h-[560px]">
      <MapContainer center={[40, -3]} zoom={5} preferCanvas scrollWheelZoom className="h-full w-full" style={{ zIndex: 0 }}>
        <BaseMap />
        <MapController car={car} points={points} waypoints={waypoints} follow={follow} />

        {line.length > 1 && (
          <>
            {/* Liseré blanc sous la trace rouge : lisible sur tous les fonds de carte */}
            <Polyline positions={line} pathOptions={{ color: '#fff', weight: 7, opacity: 0.8 }} />
            <Polyline positions={line} pathOptions={{ color: '#DB4740', weight: 4, opacity: 0.95 }} />
          </>
        )}

        {waypoints.map((w) => (
          <Marker key={w.id} position={[w.lat, w.lon]} icon={waypointIcon(w.kind)}>
            <Popup>
              <p className="text-xs font-semibold uppercase text-black/50">{waypointStyle(w.kind).label}</p>
              <p className="font-bold text-black">{w.name}</p>
              {w.description && <p className="text-sm text-black/70">{w.description}</p>}
            </Popup>
          </Marker>
        ))}

        {mapSponsors.map((s) => (
          <Marker key={s.id} position={[s.lat!, s.lon!]} icon={sponsorIcon(mediaUrl(s.logo_path), s.name)}>
            <Popup>
              <p className="text-xs font-semibold uppercase text-black/50">Sponsor</p>
              <p className="font-bold text-black">{s.name}</p>
              {s.city && <p className="text-sm text-black/70">{s.city}</p>}
              {s.website_url && (
                <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                  Site web
                </a>
              )}
            </Popup>
          </Marker>
        ))}

        {car && (
          <Marker position={car} icon={carIcon(live)} zIndexOffset={1000}>
            <Popup>
              <p className="font-bold text-black">{crew.name}</p>
              <p className="text-sm text-black/70">
                {live ? '🟢 En direct' : `Dernière position ${formatRelative(crew.last_fix_at)}`}
              </p>
              {live && crew.last_speed_kmh != null && (
                <p className="text-sm text-black/70">{Math.round(crew.last_speed_kmh)} km/h</p>
              )}
              <p className="text-xs text-black/50">{formatDateTime(crew.last_fix_at)}</p>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
        {car && (
          <button
            onClick={() => setFollow((f) => !f)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-lg transition ${
              follow ? 'bg-primary text-white' : 'bg-white text-black hover:bg-gray-100'
            }`}
            aria-pressed={follow}
          >
            <Crosshair className="h-4 w-4" />
            {follow ? 'Suivi activé' : 'Suivre la 4L'}
          </button>
        )}
        <button
          onClick={() => containerRef.current?.requestFullscreen?.()}
          className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black shadow-lg hover:bg-gray-100"
          aria-label="Carte en plein écran"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>

      {!car && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] mx-auto w-fit rounded-full bg-black/80 px-4 py-2 text-sm text-white">
          Pas encore de position GPS : l'équipage n'a pas démarré son suivi.
        </div>
      )}
    </div>
  );
}
