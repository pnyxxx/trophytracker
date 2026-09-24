/** Carte d'ensemble : dernière position de tous les équipages publics. */
import { MapContainer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import type { CrewSummary } from '@/hooks/queries';
import { formatRelative, isLive } from '@/lib/format';
import { thumbUrl } from '@/lib/media';
import { crewIcon } from '@/components/crew/mapIcons';
import { BaseMap } from '@/components/crew/BaseMap';

export default function CrewsOverviewMap({ crews }: { crews: CrewSummary[] }) {
  const located = crews.filter((c) => c.last_lat != null && c.last_lon != null);
  return (
    <MapContainer center={[38.5, -3.5]} zoom={5} scrollWheelZoom={false} className="h-full w-full" style={{ zIndex: 0 }}>
      <BaseMap />
      {located.map((c) => (
        <Marker key={c.id} position={[c.last_lat!, c.last_lon!]} icon={crewIcon(c.name, thumbUrl(c.avatar_path, 96), isLive(c.last_fix_at))}>
          <Popup>
            <p className="font-bold text-black">{c.name}</p>
            <p className="text-sm text-black/60">
              {isLive(c.last_fix_at) ? '🟢 En direct' : `Vu ${formatRelative(c.last_fix_at)}`}
            </p>
            <Link to={`/equipages/${c.slug}`} className="text-sm font-semibold text-primary underline">
              Voir la page de l'équipage →
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
