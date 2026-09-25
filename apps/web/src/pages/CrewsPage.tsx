import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Container, PageHero } from '@/components/common/Brand';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CrewCard } from '@/components/crew/CrewBits';
import { Spinner } from '@/components/common/Spinner';
import { useCrewSearch } from '@/hooks/queries';

const PAGE = 24;

export default function CrewsPage() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(input);
  const [limit, setLimit] = useState(PAGE);
  const liveOnly = params.get('live') === '1';

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

  return (
    <PageShell padTop={false}>
      <Seo title="Équipages" description="Trouvez et suivez en direct les équipages du 4L Trophy." />
      <PageHero kicker="Le plateau · tous les équipages" title="Les équipages">
        Recherchez un équipage par son nom, son numéro, son école ou sa ville.
      </PageHero>

      <section className="border-t border-cream/[0.12] bg-ink py-12 md:py-16">
        <Container>
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-center">
            {/* Champ de recherche façon panneau d'entrée de ville */}
            <div role="search" className="flex-1 rounded-[14px] bg-[#C9CDD2] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.5)]">
              <div className="flex items-center rounded-lg border-[5px] border-primary bg-white px-[18px] py-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nom, numéro, école, ville…"
                  aria-label="Rechercher un équipage"
                  autoFocus
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
