/**
 * Carte en direct d'un road trip : trace complète, position actuelle, ville de départ,
 * étapes ajoutées par les voyageurs, sponsors et photos placées.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Maximize } from 'lucide-react';
import type { Crew, Photo, Sponsor, TripStage } from '@/lib/supabase';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { formatDateTime, formatRelative, isLive } from '@/lib/format';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { BaseMap } from './BaseMap';
import { carIcon, photoIcon, sponsorIcon, stageIcon, stageStyle, startIcon } from './mapIcons';

/** Zoom de « Suivre » : on voit les rues autour du véhicule. */
const FOLLOW_ZOOM = 14;


interface Props {
  crew: Crew;
  points: TrackPoint[];
  stages: TripStage[];
  sponsors: Sponsor[];
  photos?: Photo[];
}

/** Recentre la carte : sur toute la trace au début, puis suit la voiture si demandé. */
function MapController({ car, start, points, stages, follow }: {
  car: [number, number] | null;
  start: [number, number] | null;
  points: TrackPoint[];
  stages: TripStage[];
  follow: boolean;
}) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const coords: [number, number][] = points.length
      ? points.map((p) => [p[0], p[1]])
      : stages.map((w) => [w.lat, w.lon]);
    if (car) coords.push(car);
    if (start) coords.push(start); // la ville de départ fait partie du road trip
    if (coords.length === 0) return;
    initialized.current = true;
    if (coords.length === 1) map.setView(coords[0]!, 12);
    else map.fitBounds(new LatLngBounds(coords), { padding: [40, 40], maxZoom: 13 });
  }, [map, car, start, points, stages]);

  // « Suivre » : on zoome sur le véhicule à l'activation (sans dézoomer si on est déjà
  // plus près), puis la carte la garde au centre à chaque nouvelle position.
  const wasFollowing = useRef(false);
  useEffect(() => {
    const justStarted = follow && !wasFollowing.current;
    wasFollowing.current = follow;
    if (!follow || !car || !initialized.current) return;
    if (justStarted) map.flyTo(car, Math.max(map.getZoom(), FOLLOW_ZOOM), { duration: 1.2 });
    else map.panTo(car, { animate: true, duration: 0.8 });
  }, [map, car, follow]);

  return null;
}

export function CrewMap({ crew, points, stages, sponsors, photos = [] }: Props) {
  const [follow, setFollow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const live = isLive(crew.last_fix_at);

  const car = useMemo<[number, number] | null>(() => {
    if (crew.last_lat != null && crew.last_lon != null) return [crew.last_lat, crew.last_lon];
    const last = points.at(-1);
    return last ? [last[0], last[1]] : null;
  }, [crew.last_lat, crew.last_lon, points]);

  const start = useMemo<[number, number] | null>(
    () => (crew.start_lat != null && crew.start_lon != null ? [crew.start_lat, crew.start_lon] : null),
    [crew.start_lat, crew.start_lon],
  );
  const startMarker = useMemo(() => startIcon(crew.city, crew.start_region), [crew.city, crew.start_region]);

  const line = useMemo(() => {
    const coords = points.map((p) => [p[0], p[1]] as [number, number]);
    // Relie la trace stockée à la toute dernière position connue.
    if (car && coords.length && (coords.at(-1)![0] !== car[0] || coords.at(-1)![1] !== car[1])) coords.push(car);
    return coords;
  }, [points, car]);

  const mapSponsors = sponsors.filter((s) => s.lat != null && s.lon != null);
  const mapPhotos = useMemo(() => photos.filter((p) => p.lat != null && p.lon != null), [photos]);
  const photoIcons = useMemo(
    () => new Map(mapPhotos.map((p) => [p.id, photoIcon(thumbUrl(p.storage_path, 160), p.kind === 'panorama')])),
    [mapPhotos],
  );
  // Icônes créées une seule fois par étape (la trace, elle, se met à jour en direct).
  const stageIcons = useMemo(() => new Map(stages.map((w) => [w.id, stageIcon(w)])), [stages]);

  return (
    <div ref={containerRef} className="relative h-[70vh] min-h-[420px] w-full overflow-hidden border border-cream/[0.14] bg-[#E8E2D8] md:h-[600px]">
      <MapContainer center={[40, -3]} zoom={5} preferCanvas scrollWheelZoom className="h-full w-full" style={{ zIndex: 0 }}>
        <BaseMap />
        <MapController car={car} start={start} points={points} stages={stages} follow={follow} />

        {line.length > 1 && (
          <>
            {/* Liseré blanc sous la trace rouge : lisible sur tous les fonds de carte */}
            <Polyline positions={line} pathOptions={{ color: '#fff', weight: 7, opacity: 0.8 }} />
            <Polyline positions={line} pathOptions={{ color: '#DB4740', weight: 4, opacity: 0.95 }} />
          </>
        )}

        {stages.map((w) => (
          <Marker key={w.id} position={[w.lat, w.lon]} icon={stageIcons.get(w.id)}>
            <Popup>
              <p className="text-xs font-semibold uppercase text-black/50">{stageStyle(w.kind).emoji} {stageStyle(w.kind).label}</p>
              <p className="font-bold text-black">{w.name}</p>
              {w.place && w.place !== w.name && <p className="text-sm text-black/50">{w.place}</p>}
              {w.note && <p className="text-sm text-black/70">{w.note}</p>}
              <a href="#carnet" className="text-sm text-primary underline">Voir le carnet de route</a>
            </Popup>
          </Marker>
        ))}

        {start && (
          <Marker position={start} icon={startMarker} zIndexOffset={500}>
            <Popup>
              <p className="text-xs font-semibold uppercase text-black/50">Ville de départ</p>
              <p className="font-bold text-black">{crew.city || 'Départ'}</p>
              <p className="text-sm text-black/70">C’est d’ici que part {crew.name}.</p>
            </Popup>
          </Marker>
        )}

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

        {mapPhotos.map((p) => (
          <Marker key={p.id} position={[p.lat!, p.lon!]} icon={photoIcons.get(p.id)}>
            <Popup>
              <img src={thumbUrl(p.storage_path, 480) ?? ''} alt={p.title} className="mb-2 block aspect-[4/3] w-56 max-w-full object-cover" loading="lazy" />
              <p className="font-bold text-black">{p.title}</p>
              {(p.location || p.taken_label) && (
                <p className="text-sm text-black/70">{[p.location, p.taken_label].filter(Boolean).join(' · ')}</p>
              )}
              <a href="#photos" className="text-sm text-primary underline">Voir les photos</a>
            </Popup>
          </Marker>
        ))}

        {car && (
          <Marker position={car} icon={carIcon(live)} zIndexOffset={1000}>
            <Popup>
              <p className="font-bold text-black">{crew.name}</p>
              <p className="text-sm text-black/70">
                {live ? '● En direct' : `Dernière position ${formatRelative(crew.last_fix_at)}`}
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
            className={`flex items-center gap-2 rounded-full px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] shadow-lg transition ${
              follow ? 'bg-primary text-white' : 'bg-ink text-cream hover:bg-primary'
            }`}
            aria-pressed={follow}
          >
            <Crosshair className="h-4 w-4" />
            {follow ? 'Suivi activé' : 'Suivre le road trip'}
          </button>
        )}
        <button
          onClick={() => containerRef.current?.requestFullscreen?.()}
          className="flex items-center justify-center gap-2 rounded-full bg-ink px-3 py-2.5 text-cream shadow-lg hover:bg-primary"
          aria-label="Carte en plein écran"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>

      {!car && (
        <div className="pointer-events-none absolute inset-x-3 bottom-4 z-[500] mx-auto w-fit border-l-[3px] border-primary bg-ink/[0.94] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-cream">
          Pas encore de position GPS : les voyageurs n'ont pas démarré leur suivi.
        </div>
      )}
    </div>
  );
}
