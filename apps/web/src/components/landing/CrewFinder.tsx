/**
 * Recherche d'équipage façon instrument de bord de rallye (« tripmaster ») :
 * écran noir, saisie en mono, exemples tapés automatiquement, voyant d'état,
 * et résultats instantanés à parcourir au clavier (↑ ↓ ⏎ Échap, « / » pour y accéder).
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrewSearch, type CrewSummary } from '@/hooks/queries';
import { formatKm, initials, isLive } from '@/lib/format';
import { cn } from '@/lib/utils';

const EXAMPLES = ['J4L Club', '#1234', 'Epitech', 'Lille', 'Les Ensablés'];
const MAX = 5;

/** Fait « taper » les exemples les uns après les autres (texte fixe si mouvements réduits). */
function useTypewriter(active: boolean) {
  const [text, setText] = useState(EXAMPLES[0]!);
  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let word = 0;
    let len = 0;
    let erasing = false;
    let pause = 0;
    const t = setInterval(() => {
      const target = EXAMPLES[word]!;
      if (pause > 0) return void pause--;
      if (!erasing) {
        len++;
        if (len >= target.length) {
          erasing = true;
          pause = 18; // ~1,6 s affiché en entier
        }
      } else {
        len--;
        if (len <= 0) {
          erasing = false;
          word = (word + 1) % EXAMPLES.length;
          pause = 3;
        }
      }
      setText(EXAMPLES[word]!.slice(0, Math.max(0, len)));
    }, 90);
    return () => clearInterval(t);
  }, [active]);
  return text;
}

/** Met en rouge la partie du nom qui correspond à la recherche. */
function highlight(text: string, query: string): ReactNode {
  const q = query.trim().replace(/^#/, '');
  if (!q) return text;
  const i = text.toLocaleLowerCase('fr').indexOf(q.toLocaleLowerCase('fr'));
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-primary">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function CrewFinder() {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [maxH, setMaxH] = useState(400);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [touched, setTouched] = useState(false); // ne rien charger tant que personne n'a cliqué

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  // « / » n'importe où sur la page place le curseur dans la recherche.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data, isFetching } = useCrewSearch(debounced, false, MAX, touched);
  const results: CrewSummary[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const pending = touched && (isFetching || query.trim() !== debounced);
  const typed = useTypewriter(!focused && !query);
  const showList = open && touched && (results.length > 0 || (!!debounced && !pending));

  useEffect(() => setActive(-1), [debounced]);

  // La liste ne dépasse jamais du bas de l'écran : au-delà, elle défile.
  useEffect(() => {
    if (!showList) return;
    const fit = () => {
      const bottom = formRef.current?.getBoundingClientRect().bottom ?? 0;
      setMaxH(Math.max(140, window.innerHeight - bottom - 8 - 16)); // 8 = mt-2, 16 = marge
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', fit, { passive: true });
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('scroll', fit);
    };
  }, [showList]);

  const goSearch = () => navigate(query.trim() ? `/equipages?q=${encodeURIComponent(query.trim())}` : '/equipages');
  const goCrew = (c: CrewSummary) => navigate(`/equipages/${c.slug}`);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = results[active];
      if (showList && c) goCrew(c);
      else goSearch();
    }
  };

  const status = pending ? 'Recherche…' : !touched || !debounced ? 'Prêt' : total === 0 ? 'Aucun résultat' : `${total} résultat${total > 1 ? 's' : ''}`;

  return (
    <div>
      {/* La liste s'ancre sous l'instrument (et recouvre l'aide clavier) */}
      <div className="relative">
        <form
          ref={formRef}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            goSearch();
          }}
          className={cn(
            'relative scroll-mt-[84px] rounded-md border bg-[#050403] shadow-[inset_0_12px_16px_rgba(0,0,0,.6),0_20px_50px_rgba(0,0,0,.45)] transition-[border-color,box-shadow] duration-300',
            focused ? 'border-primary shadow-[inset_0_12px_16px_rgba(0,0,0,.6),0_0_0_4px_rgba(219,71,64,.18),0_20px_50px_rgba(0,0,0,.45)]' : 'border-ink-600',
          )}
        >
          {/* Bandeau de l'instrument : nom + voyant d'état */}
          <div className="flex items-center justify-between gap-3 border-b border-cream/[0.08] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em]">
            <span className="text-dust-400">Recherche · équipage</span>
            <span className={cn('flex items-center gap-2', pending ? 'text-ochre' : debounced && total === 0 && touched ? 'text-primary' : 'text-live')} aria-live="polite">
              <span className={cn('h-1.5 w-1.5 rounded-full bg-current', pending && 'animate-pulse')} />
              {status}
            </span>
          </div>

          <div className="flex items-center gap-3 py-2 pl-4 pr-2">
            {/* Radar : balaie en continu, s'accélère pendant la recherche */}
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-primary" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
              <g className={cn('origin-center', pending ? 'animate-[spin_.8s_linear_infinite]' : 'animate-[spin_4s_linear_infinite]')} style={{ transformBox: 'fill-box' }}>
                <path d="M12 12 L12 2 A10 10 0 0 1 20.7 7 Z" fill="currentColor" fillOpacity=".45" />
              </g>
              <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            </svg>

            <div className="relative min-w-0 flex-1">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => {
                  setFocused(true);
                  setTouched(true);
                  setOpen(true);
                  // Petit écran : on remonte l'instrument en haut pour laisser la place aux résultats (et au clavier).
                  if (window.innerWidth < 1024) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                onBlur={() => {
                  setFocused(false);
                  setOpen(false);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-label="Rechercher un équipage par nom, numéro, école ou ville"
                aria-expanded={showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                autoComplete="off"
                spellCheck={false}
                className="h-12 w-full border-0 bg-transparent font-mono text-lg font-semibold uppercase tracking-[0.06em] text-cream caret-primary outline-none"
              />
              {/* Exemple tapé automatiquement + curseur bloc (quand le champ est vide) */}
              {!query && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-nowrap font-mono text-lg font-semibold uppercase tracking-[0.06em] text-dust-600">
                  {focused ? 'Nom, n°, ville…' : typed}
                  <span className="ml-0.5 inline-block h-[1.1em] w-[0.55em] animate-[pulse_1s_steps(2,start)_infinite] bg-primary" />
                </div>
              )}
            </div>

            {/* Touche « Trouver » qui s'enfonce */}
            <button
              type="submit"
              className="flex h-12 shrink-0 items-center gap-2 rounded-[4px] border-b-4 border-primary-dark bg-primary px-4 font-mono text-xs font-bold uppercase tracking-[0.12em] text-white transition-all hover:brightness-110 active:translate-y-[2px] active:border-b-2"
            >
              Trouver
              <kbd className="rounded-[3px] bg-black/25 px-1.5 py-0.5 font-mono text-[11px]">⏎</kbd>
            </button>
          </div>
        </form>

        {/* Résultats instantanés, façon lignes de roadbook */}
        {showList && (
          <div
            style={{ maxHeight: maxH }}
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-y-auto overscroll-contain border border-cream/[0.14] border-t-[3px] border-t-primary bg-ink-800 shadow-[0_24px_60px_rgba(0,0,0,.6)]"
          >
            <div className="flex justify-between border-b border-cream/[0.08] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dust-400">
              <span>{debounced ? 'Résultats' : 'Sur la route'}</span>
              {debounced && total > 0 && <span>{Math.min(total, MAX)} / {total}</span>}
            </div>
            <ul id={listId} role="listbox" aria-label="Équipages trouvés" className="m-0 list-none p-0">
              {results.length === 0 ? (
                <li className="px-4 py-5 text-sm text-dust-300">
                  Aucun équipage ne correspond. Essayez un numéro, une école ou une ville.
                </li>
              ) : (
                results.map((c, i) => {
                  const live = isLive(c.last_fix_at);
                  return (
                    <li
                      key={c.id}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      // mousedown (et non click) : passe avant la perte du focus du champ
                      onMouseDown={(e) => {
                        e.preventDefault();
                        goCrew(c);
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={cn(
                        'grid cursor-pointer grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-l-[3px] border-b-cream/[0.06] px-4 py-2.5 last:border-b-0',
                        i === active ? 'border-l-primary bg-cream/[0.05]' : 'border-l-transparent',
                      )}
                    >
                      <span className="rounded-[3px] bg-primary px-1.5 py-0.5 text-center font-mono text-[11px] font-bold text-white">
                        {c.car_number ? `#${c.car_number}` : initials(c.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-xl font-extrabold uppercase leading-tight text-cream">
                          {highlight(c.name, debounced)}
                        </span>
                        {(c.school || c.city) && (
                          <span className="block truncate text-xs text-dust-400">{[c.school, c.city].filter(Boolean).join(' · ')}</span>
                        )}
                      </span>
                      <span className="flex flex-col items-end gap-0.5 font-mono text-[11px]">
                        <span className="text-cream">{formatKm(c.total_distance_m / 1000)}</span>
                        {live && <span className="uppercase tracking-[0.12em] text-live">● Direct</span>}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
            {debounced && total > MAX && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  goSearch();
                }}
                className="w-full border-t border-cream/[0.08] px-4 py-3 text-left font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary hover:bg-cream/[0.05]"
              >
                Voir les {total} résultats →
              </button>
            )}
          </div>
        )}

      </div>

      {/* Aide clavier (grand écran) */}
      <div className="mt-2 hidden gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-dust-500 lg:flex" aria-hidden="true">
        <span><kbd className="rounded-[3px] border border-cream/20 px-1 text-dust-300">/</kbd> rechercher</span>
        <span><kbd className="rounded-[3px] border border-cream/20 px-1 text-dust-300">↑↓</kbd> naviguer</span>
        <span><kbd className="rounded-[3px] border border-cream/20 px-1 text-dust-300">⏎</kbd> ouvrir</span>
      </div>
    </div>
  );
}
