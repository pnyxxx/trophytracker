/**
 * Choisir une position, le plus simplement possible :
 *  1. on tape une adresse, une ville ou un nom de commerce → suggestions → un clic ;
 *  2. on ajuste au besoin en faisant glisser l'épingle sur la petite carte ;
 *  3. sinon, mode manuel : on colle des coordonnées (« 49.84, 3.28 » depuis Google Maps).
 */
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Loader2, MapPin, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { parseCoords, searchPlaces, type Place } from '@/lib/geocode';

const PickerMap = lazy(() => import('./PickerMap'));

export interface Coords {
  lat: number;
  lon: number;
}

interface Props {
  id: string;
  value: Coords | null;
  /** `place` : le lieu choisi dans les suggestions (null après un ajustement à la main). */
  onChange: (value: Coords | null, place: Place | null) => void;
  placeholder?: string;
  /** Raccourcis supplémentaires (ex. « Position de la 4L »), affichés sous la recherche. */
  shortcuts?: ReactNode;
}

export function LocationPicker({ id, value, onChange, placeholder = 'Adresse, ville ou nom du commerce…', shortcuts }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [coordsText, setCoordsText] = useState('');

  // Recherche pendant la frappe, un peu retardée (on n'interroge pas à chaque lettre).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      searchPlaces(q, ctrl.signal)
        .then((r) => { setResults(r); setError(r.length ? null : 'Aucun lieu trouvé : essayez avec la ville, ou placez le point à la main.'); })
        .catch((e: Error) => { if (e.name !== 'AbortError') setError(e.message); })
        .finally(() => setSearching(false));
    }, 350);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  const pick = (p: Place) => {
    onChange({ lat: p.lat, lon: p.lon }, p);
    setQuery('');
    setResults([]);
  };

  const coordsError = coordsText.trim() && !parseCoords(coordsText) ? 'Format attendu : 49.8466, 3.2875' : null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dust-500" />
        <Input
          id={id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={value ? 'Chercher un autre lieu…' : placeholder}
          autoComplete="off"
          className="pl-9 pr-9"
          onKeyDown={(e) => {
            // Entrée = premier résultat, sans envoyer le formulaire.
            if (e.key === 'Enter') { e.preventDefault(); if (results[0]) pick(results[0]); }
          }}
        />
        {/* Centrage sur le conteneur, rotation sur l'icône : animate-spin remplace tout le transform
            de l'élément animé, il effacerait le -translate-y (l'icône sauterait de haut en bas). */}
        {searching && (
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-dust-400" />
          </span>
        )}
      </div>

      {results.length > 0 && (
        <ul className="m-0 list-none divide-y divide-cream/10 border border-cream/15 bg-black/40 p-0">
          {results.map((p, i) => (
            <li key={`${p.lat},${p.lon},${i}`}>
              <button type="button" onClick={() => pick(p)} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-cream/[0.06]">
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
      {error && <p className="m-0 text-xs text-dust-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {shortcuts}
        <button type="button" onClick={() => setManual((m) => !m)} className="inline-flex items-center gap-1.5 text-dust-300 underline-offset-2 hover:text-cream hover:underline">
          <Keyboard className="h-3.5 w-3.5" />{manual ? 'Masquer la saisie manuelle' : 'Saisir les coordonnées à la main'}
        </button>
      </div>

      {manual && (
        <div className="flex gap-2">
          <Input
            aria-label="Coordonnées (latitude, longitude)"
            inputMode="decimal"
            value={coordsText}
            onChange={(e) => setCoordsText(e.target.value)}
            placeholder="49.8466, 3.2875"
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!parseCoords(coordsText)}
            onClick={() => { const c = parseCoords(coordsText); if (c) { onChange(c, null); setCoordsText(''); } }}
          >
            Placer
          </Button>
        </div>
      )}
      {manual && (
        <p className="m-0 text-xs text-dust-500">
          {coordsError ?? 'Latitude puis longitude. Astuce : dans Google Maps, un clic droit sur le lieu affiche ses coordonnées, à copier ici.'}
        </p>
      )}

      {value && (
        <div className="border border-cream/15">
          <div className="relative h-48 bg-ink-800">
            <Suspense fallback={null}>
              <PickerMap lat={value.lat} lon={value.lon} onMove={(lat, lon) => onChange({ lat, lon }, null)} />
            </Suspense>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-dust-300">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 font-mono">{value.lat.toFixed(5)}, {value.lon.toFixed(5)}</span>
            <span className="hidden text-dust-500 sm:inline">Glissez l’épingle pour ajuster</span>
            <button type="button" onClick={() => onChange(null, null)} className="inline-flex items-center gap-1 text-dust-400 hover:text-primary-light">
              <X className="h-3.5 w-3.5" />Retirer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
