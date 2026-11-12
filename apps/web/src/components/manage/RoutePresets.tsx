/**
 * « Tu participes à un raid connu ? » : ajoute d'un geste toutes les étapes d'un itinéraire tout prêt
 * (lib/route-presets.ts), et le départ / l'arrivée s'ils ne sont pas encore indiqués.
 * Montré seulement aux road trips de type « Raid ou rallye ».
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { keys, useStages } from '@/hooks/queries';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { ROUTE_PRESETS, type RoutePreset } from '@/lib/route-presets';

export function RoutePresets({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const { data: stages = [] } = useStages(crew.id);
  const names = new Set(stages.map((s) => s.name));
  const added = (p: RoutePreset) => p.stages.every((s) => names.has(s.name));

  const apply = useMutation({
    mutationFn: async (p: RoutePreset) => {
      // On n'ajoute que les étapes qui n'y sont pas déjà (un deuxième geste ne fait pas de doublons).
      const missing = p.stages.filter((s) => !names.has(s.name));
      if (missing.length) {
        unwrap(await supabase.from('trip_stages').insert(missing.map((s) => ({ ...s, crew_id: crew.id, source: 'manual' as const }))));
      }
      const start = p.stages[0]!;
      const patch = {
        ...(crew.city ? {} : { city: p.from, start_lat: start.lat, start_lon: start.lon, start_region: null }),
        ...(crew.destination ? {} : { destination: p.to }),
      };
      if (Object.keys(patch).length) unwrap(await supabase.from('crews').update(patch).eq('id', crew.id));
      return missing.length;
    },
    onSuccess: (n, p) => {
      toast.success(n ? `${n} étape${n > 1 ? 's' : ''} du ${p.name} ajoutée${n > 1 ? 's' : ''}` : 'Ces étapes sont déjà dans ton itinéraire');
      void queryClient.invalidateQueries({ queryKey: keys.stages(crew.id) });
      void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) });
    },
    onError: toastError,
  });

  if (crew.trip_type !== 'raid') return null;

  return (
    <section className="tt-glass flex flex-col gap-3.5 rounded-[24px] border-[1.5px] border-signal/30 p-5" aria-label="Itinéraires tout prêts">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[0.7647rem] text-signal-text">raid ou rallye</span>
        <h3 className="tt-display m-0 text-[1.4rem] leading-tight text-cream">Tu participes à un raid connu ?</h3>
        <p className="m-0 text-[0.8824rem] leading-relaxed text-dust-300">
          Ajoute toutes ses étapes d’un coup. Tu pourras les modifier, en retirer ou en ajouter ensuite.
        </p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {ROUTE_PRESETS.map((p) => {
          const done = added(p);
          return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink/70 px-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-signal/15 text-signal-text"><Flag className="h-5 w-5" /></span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold text-cream">{p.name}</span>
                  <span className="text-[0.8235rem] text-dust-400">{p.summary}</span>
                </span>
              </span>
              {done ? (
                <span className="flex items-center gap-1.5 font-mono text-[0.7647rem] text-live-text"><Check className="h-4 w-4" />étapes ajoutées</span>
              ) : (
                <Button size="sm" disabled={apply.isPending} onClick={() => apply.mutate(p)}>
                  {apply.isPending ? 'Ajout…' : `Ajouter les ${p.stages.length} étapes`}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-[0.7647rem] leading-relaxed text-dust-500">
        trophytracker n’est pas fait pour tricher : respecte le règlement de ton raid.
      </p>
    </section>
  );
}
