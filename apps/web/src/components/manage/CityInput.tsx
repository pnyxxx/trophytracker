/**
 * « Ville de départ » : un champ texte qui propose des villes pendant la frappe.
 * Choisir une suggestion retient aussi sa position et sa région (drapeau sur la
 * carte, breton si on part de Bretagne). Taper sans choisir efface la position :
 * le formulaire cherche alors la ville tout seul à l'enregistrement (findCity, lib/geocode).
 */
import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchPlaces, type CitySpot, type Place } from '@/lib/geocode';

interface Props {
  id: string;
  value: string;
  spot: CitySpot | null;
  onChange: (city: string, spot: CitySpot | null) => void;
}

const cityName = (p: Place) => p.city ?? p.title;

export function CityInput({ id, value, spot, onChange }: Props) {
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);

  // Suggestions pendant la frappe (pas après un choix : la position est déjà connue).
  useEffect(() => {
    const q = value.trim();
    if (!focused || spot || q.length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      searchPlaces(q, ctrl.signal)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [value, spot, focused]);

  const pick = (p: Place) => {
    onChange(cityName(p), { lat: p.lat, lon: p.lon, region: p.region });
    setResults([]);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        maxLength={80}
        value={value}
        autoComplete="off"
        placeholder="Pédernec, Rennes, Lyon…"
        className="pr-9"
        onChange={(e) => onChange(e.target.value, null)}
        onFocus={() => setFocused(true)}
        // Laisse le temps au clic sur une suggestion d'arriver avant de fermer la liste.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          // Entrée = première suggestion, sans envoyer le formulaire.
          if (e.key === 'Enter' && results[0]) { e.preventDefault(); pick(results[0]); }
        }}
      />
      {/* Centrage sur le conteneur, rotation sur l'icône (voir LocationPicker). */}
      <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2">
        {searching ? <Loader2 className="h-4 w-4 animate-spin text-dust-400" /> : spot && <MapPin className="h-4 w-4 text-primary" />}
      </span>
      {results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 m-0 mt-1 list-none divide-y divide-cream/10 border border-cream/15 bg-ink-900 p-0 shadow-xl">
          {results.map((p, i) => (
            <li key={`${p.lat},${p.lon},${i}`}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-cream/[0.06]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-cream">{p.title}</span>
                  {p.subtitle && <span className="block truncate text-xs text-dust-400">{p.subtitle}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
