/**
 * Guide « Prêt au départ » : tout ce qu'il faut faire avant de partir, dans l'ordre, avec une barre
 * de progression. Chaque case se coche toute seule (d'après les données du road trip) et mène à
 * l'onglet où la faire. Une fois tout prêt, le guide se replie.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, type Crew } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import { keys, useCrewMembers, useSponsors, useStages } from '@/hooks/queries';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  text: string;
  tab: string;
  done: boolean;
  optional?: boolean;
}

const foldKey = (crewId: string) => `tt-checklist-folded-${crewId}`;

export function LaunchChecklist({ crew, onGo }: { crew: Crew; onGo: (tab: string) => void }) {
  const { data: members = [] } = useCrewMembers(crew.id);
  const { data: sponsors = [] } = useSponsors(crew.id);
  const { data: stages = [] } = useStages(crew.id);
  const { data: tracking } = useQuery({
    queryKey: keys.tracking(crew.id),
    queryFn: async () => unwrap(await supabase.rpc('get_crew_tracking', { p_crew: crew.id }))[0] ?? null,
  });
  const { data: testFix } = useQuery({
    queryKey: ['gps-test', crew.id],
    queryFn: async () =>
      unwrap(await supabase.from('gps_test_fixes').select('lat, lon, speed_kmh, recorded_at').eq('crew_id', crew.id).maybeSingle()),
  });

  const steps: Step[] = [
    { id: 'page', title: 'Présenter le road trip', text: 'Une photo de couverture et une phrase d’accroche : c’est la première chose que verront vos proches.', tab: 'infos', done: !!crew.cover_path && !!crew.tagline },
    { id: 'dates', title: 'Fixer la date de départ', text: 'Le jour J, le suivi GPS se lancera tout seul si vous oubliez.', tab: 'infos', done: !!crew.starts_on },
    { id: 'crew', title: 'Inviter vos compagnons de route', text: 'Ils pourront publier des photos et gérer le GPS avec vous, gratuitement.', tab: 'membres', done: members.length > 1, optional: true },
    { id: 'key', title: 'Brancher le GPS', text: 'Acceptez la charte du voyageur, puis scannez le QR code avec le téléphone qui voyagera.', tab: 'gps', done: !!tracking?.has_device_key },
    { id: 'test', title: 'Faire un essai', text: 'Une première position reçue : vous savez que tout marche avant de partir.', tab: 'gps', done: !!testFix || !!crew.last_fix_at },
    { id: 'stages', title: 'Noter vos premières étapes', text: 'Départ, nuits prévues, coups de cœur… le GPS vous en proposera d’autres en route.', tab: 'etapes', done: stages.length > 0, optional: true },
    { id: 'sponsors', title: 'Mettre en avant vos soutiens', text: 'Sponsors sur la carte, lien de cagnotte en haut de la page.', tab: 'sponsors', done: sponsors.length > 0 || !!crew.fundraiser_url, optional: true },
    { id: 'share', title: 'Partager le lien', text: 'Envoyez-le à la famille et aux sponsors, ou imprimez le QR code.', tab: 'qr', done: !!crew.shared_at },
  ];

  const required = steps.filter((s) => !s.optional);
  const doneCount = steps.filter((s) => s.done).length;
  const ready = required.every((s) => s.done);
  const next = steps.find((s) => !s.done && !s.optional) ?? steps.find((s) => !s.done);
  const pct = Math.round((doneCount / steps.length) * 100);

  const [folded, setFolded] = useState(() => {
    try {
      return localStorage.getItem(foldKey(crew.id)) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () => {
    const v = !folded;
    setFolded(v);
    try {
      localStorage.setItem(foldKey(crew.id), v ? '1' : '0');
    } catch {
      /* stockage indisponible */
    }
  };

  return (
    <section className="mb-8 border border-cream/[0.14] bg-ink-900/60" aria-label="Guide de départ">
      <button type="button" onClick={toggle} className="flex w-full flex-wrap items-center gap-4 p-5 text-left md:p-6" aria-expanded={!folded}>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center', ready ? 'bg-live/15 text-live' : 'bg-primary/15 text-primary')}>
          {ready ? <Check className="h-6 w-6" /> : <Rocket className="h-6 w-6" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="tt-kicker block text-ochre">Guide de départ · {doneCount}/{steps.length}</span>
          <span className="block font-display text-2xl font-extrabold leading-tight text-cream md:text-3xl">
            {ready ? 'Prêts au départ !' : `Prêts à ${pct} %`}
          </span>
          {!ready && next && <span className="block text-sm text-dust-300">Prochaine étape : {next.title.toLowerCase()}.</span>}
        </span>
        <ChevronDown className={cn('h-5 w-5 text-dust-400 transition-transform', !folded && 'rotate-180')} />
        <span className="h-1.5 w-full overflow-hidden bg-cream/10" aria-hidden="true">
          <span className={cn('block h-full transition-all duration-700', ready ? 'bg-live' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </span>
      </button>

      {!folded && (
        <ol className="m-0 grid list-none gap-px border-t border-cream/[0.1] bg-cream/[0.06] p-0 md:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.id} className={cn('flex gap-3 bg-ink p-4', s === next && 'bg-primary/[0.07]')}>
              <span className={cn(
                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-xs',
                s.done ? 'border-live bg-live/15 text-live' : s === next ? 'border-primary text-primary' : 'border-cream/20 text-dust-400',
              )}>
                {s.done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm font-semibold', s.done ? 'text-dust-400 line-through decoration-cream/30' : 'text-cream')}>
                  {s.title}{s.optional && <span className="ml-2 font-normal text-dust-500 no-underline">(facultatif)</span>}
                </span>
                {!s.done && <span className="block text-xs leading-relaxed text-dust-400">{s.text}</span>}
              </span>
              {!s.done && (
                <Button size="sm" variant={s === next ? 'default' : 'ghost'} onClick={() => onGo(s.tab)} aria-label={`${s.title} : y aller`}>
                  <ChevronRight />
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
