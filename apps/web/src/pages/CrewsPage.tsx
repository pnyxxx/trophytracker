import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Input } from '@/components/ui/input';
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
    <PageShell>
      <Seo title="Équipages" description="Trouvez et suivez en direct les équipages du 4L Trophy." />
      <section className="container mx-auto px-4 py-12">
        <h1 className="mb-2 text-4xl font-bold text-white md:text-5xl">Les équipages</h1>
        <p className="mb-8 text-white/60">Recherchez un équipage par son nom, son numéro, son école ou sa ville.</p>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Rechercher…"
              className="h-12 pl-11"
              aria-label="Rechercher un équipage"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
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
            <Label htmlFor="live" className="text-white">En direct uniquement</Label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-20 text-center text-white/60">
            {debounced || liveOnly ? 'Aucun équipage ne correspond à votre recherche.' : 'Aucun équipage inscrit pour le moment.'}
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-white/50">{data.total} équipage{data.total > 1 ? 's' : ''}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((c) => <CrewCard key={c.id} crew={c} />)}
            </div>
            {data.items.length < data.total && (
              <div className="mt-10 text-center">
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)} disabled={isFetching}>
                  {isFetching ? 'Chargement…' : 'Afficher plus'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}
