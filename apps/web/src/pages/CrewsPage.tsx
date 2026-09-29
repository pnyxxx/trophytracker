import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Container, PageHero, SectionTitle } from '@/components/common/Brand';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CrewCard } from '@/components/crew/CrewBits';
import { Spinner } from '@/components/common/Spinner';
import { fmtKm, STOPS, TOTAL_KM } from '@/components/landing/journey';
import { useCrewSearch, useEvent } from '@/hooks/queries';
import { useSeen } from '@/hooks/useInView';

// La carte (MapLibre) est chargée à part : la liste s'affiche tout de suite.
const LiveCrewsMap = lazy(() => import('@/components/landing/LiveCrewsMap'));

const PAGE = 24;

export default function CrewsPage() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(input);
  const [limit, setLimit] = useState(PAGE);
  const liveOnly = params.get('live') === '1';
  const searchRef = useRef<HTMLInputElement>(null);

  // Curseur dans la recherche dès l'arrivée, sans faire défiler la page sous la carte.
  useEffect(() => searchRef.current?.focus({ preventScroll: true }), []);

  // Attend 300 ms après la dernière frappe avant de lancer la recherche.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    setLimit(PAGE);
    const next = new URLSearchParams(params);
    if (debounced) next.set('q', debounced);
    else next.delete('q');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data, isLoading, isFetching } = useCrewSearch(debounced, liveOnly, limit);

  // Carte « Où sont-ils ? » : dernière position de tous les équipages, indépendamment de la recherche.
  const mapRef = useRef<HTMLDivElement>(null);
  const mapSeen = useSeen(mapRef);
  const { data: event } = useEvent();
  const { data: all } = useCrewSearch('', false, 60);
  const route = useMemo(
    () => (event?.waypoints.length ? event.waypoints : STOPS).map((w) => ({ name: w.name, lat: w.lat, lon: w.lon })),
    [event],
  );
  const totalKm = fmtKm(event?.totalKm ?? TOTAL_KM);

  return (
    <PageShell padTop={false}>
      <Seo title="Équipages" description="Trouvez et suivez en direct les équipages du 4L Trophy." />
      <PageHero kicker="Le plateau · tous les équipages" title="Les équipages">
        Recherchez un équipage par son nom, son numéro, son école ou sa ville.
      </PageHero>

      <section id="live" className="scroll-mt-[68px] border-t border-cream/[0.12] bg-ink py-12 md:py-16">
        <Container className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3.5">
              <SectionTitle className="leading-[0.88]">Où sont-ils ?</SectionTitle>
            </div>
            <p className="m-0 max-w-[420px] text-base leading-relaxed text-dust-300">
              Dernière position connue de chaque équipage. Cliquez sur un équipage pour suivre sa trace complète.
            </p>
          </div>

          <div ref={mapRef} className="relative min-h-[560px] overflow-hidden border border-cream/[0.14] bg-[#E8E2D8]">
            {mapSeen && (
              <Suspense fallback={null}>
                <LiveCrewsMap route={route} crews={all?.items ?? []} />
              </Suspense>
            )}
            <div className="pointer-events-none absolute left-3.5 top-3.5 z-[2] bg-ink px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-cream">
              {route[0]?.name ?? 'Biarritz'} → {route.at(-1)?.name ?? 'Marrakech'} · {totalKm} km
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-cream/[0.12] bg-ink py-12 md:py-16">
        <Container>
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-center">
            {/* Champ de recherche façon panneau d'entrée de ville */}
            <div role="search" className="flex-1 rounded-[14px] bg-[#C9CDD2] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.5)]">
              <div className="flex items-center rounded-lg border-[5px] border-primary bg-white px-[18px] py-1.5">
                <input
                  ref={searchRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nom, numéro, école, ville…"
                  aria-label="Rechercher un équipage"
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent font-display text-2xl font-extrabold uppercase tracking-[0.04em] text-coal outline-none placeholder:text-dust-500"
                />
                {isFetching && <Spinner className="h-5 w-5 border-2" />}
              </div>
            </div>
            <div className="flex items-center gap-3 border border-cream/[0.14] bg-ink-800 px-5 py-4">
              <Switch
                id="live"
                checked={liveOnly}
                onCheckedChange={(v) => {
                  const next = new URLSearchParams(params);
                  if (v) next.set('live', '1');
                  else next.delete('live');
                  setParams(next, { replace: true });
                }}
              />
              <Label htmlFor="live" className="cursor-pointer text-cream">En direct uniquement</Label>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Spinner /></div>
          ) : !data || data.items.length === 0 ? (
            <div className="border border-cream/[0.08] bg-ink-800 px-6 py-20 text-center">
              <p className="m-0 font-display text-4xl font-black uppercase">Aucun équipage</p>
              <p className="mt-2 text-dust-400">
                {debounced || liveOnly ? 'Aucun équipage ne correspond à votre recherche.' : 'Aucun équipage inscrit pour le moment.'}
              </p>
            </div>
          ) : (
            <>
              <p className="tt-kicker mb-4 text-dust-400">
                {data.total} équipage{data.total > 1 ? 's' : ''}
              </p>
              <div className="grid gap-2 lg:grid-cols-2">
                {data.items.map((c) => <CrewCard key={c.id} crew={c} />)}
              </div>
              {data.items.length < data.total && (
                <div className="mt-10 text-center">
                  <Button variant="secondary" size="lg" onClick={() => setLimit((l) => l + PAGE)} disabled={isFetching}>
                    {isFetching ? 'Chargement…' : 'Afficher plus'}
                  </Button>
                </div>
              )}
            </>
          )}
        </Container>
      </section>
    </PageShell>
  );
}
