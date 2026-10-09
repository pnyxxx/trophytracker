/**
 * Onglet « Journal » : une page de journal de bord par jour de road trip.
 * En haut, « Raconte ta journée » (StoryRecorder) : le voyageur raconte sa journée à voix haute, l'IA en fait
 * la page. Pour chaque journée, « Rédiger » propose aussi un brouillon sans récit (écrit par l'IA à partir des
 * kilomètres, étapes et photos du jour, ou un brouillon simple sans IA). On relit, on corrige, on publie :
 * rien n'est publié sans validation d'un voyageur.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Mic, PenLine, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase, type Crew, type JournalEntry } from '@/lib/supabase';
import { keys, useJournal } from '@/hooks/queries';
import { useLiveTrack } from '@/hooks/useLiveTrack';
import { toastError, unwrap } from '@/lib/errors';
import { localDate } from '@/lib/days';
import { Field, Panel, textareaClass } from './shared';
import { forgetStory, StoryRecorder } from './StoryRecorder';

interface Draft { day: string; title: string; body: string; ai: boolean; entry: JournalEntry | null; fromStory?: boolean }

const dayLabel = (day: string) => {
  const s = new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const shortDayLabel = (day: string, today: string) => {
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === today) return 'Aujourd’hui';
  if (day === localDate(yesterday.getTime() / 1000)) return 'Hier';
  return dayLabel(day);
};

function Editor({ crew, draft, onClose }: { crew: Crew; draft: Draft; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);

  const save = useMutation({
    mutationFn: async (published: boolean) => {
      const row = { title: title.trim(), body: body.trim(), ai_generated: draft.ai, published };
      if (draft.entry) unwrap(await supabase.from('journal_entries').update(row).eq('id', draft.entry.id));
      else unwrap(await supabase.from('journal_entries').insert({ ...row, crew_id: crew.id, day: draft.day }));
      return published;
    },
    onSuccess: (published) => {
      if (draft.fromStory) forgetStory(crew.id, draft.day);
      toast.success(published ? 'Page publiée dans le carnet de route' : 'Brouillon enregistré');
      void queryClient.invalidateQueries({ queryKey: keys.journal(crew.id) });
      onClose();
    },
    onError: toastError,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dayLabel(draft.day)}</DialogTitle>
          <DialogDescription>
            {draft.fromStory
              ? draft.ai
                ? 'L’IA a mis ton récit en forme, avec les chiffres du jour. Relis-le et corrige ce qui ne va pas.'
                : 'L’IA n’est pas disponible : voici ton récit, nettoyé. Relis-le avant de le publier.'
              : draft.ai
                ? 'Brouillon rédigé par l’IA à partir de tes kilomètres, étapes et photos du jour. Relis-le : toi seul sais ce qui s’est vraiment passé.'
                : 'Brouillon écrit à partir des chiffres du jour : raconte la suite !'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(true); }} className="space-y-4">
          <Field id="j-title" label="Titre"><Input id="j-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field id="j-body" label="Texte">
            <textarea id="j-body" required maxLength={4000} className={`${textareaClass} min-h-[240px]`} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending}><Eye />Publier</Button>
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => save.mutate(false)}><EyeOff />Garder en brouillon</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JournalTab({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const { data: entries = [] } = useJournal(crew.id);
  const { points } = useLiveTrack(crew);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [writing, setWriting] = useState<string | null>(null);
  const today = localDate(Date.now() / 1000);
  const [storyDay, setStoryDay] = useState(today);

  // Les journées du road trip : celles où le GPS a enregistré des positions, plus celles déjà écrites.
  const days = useMemo(() => {
    const set = new Set(points.map((p) => localDate(p[2])));
    for (const e of entries) set.add(e.day);
    return [...set].sort().reverse();
  }, [points, entries]);
  // Jours que l'on peut raconter : aujourd'hui et les journées du road trip.
  const storyDays = useMemo(
    () => [...new Set([today, ...days])].sort().reverse().slice(0, 60).map((day) => ({ day, label: shortDayLabel(day, today) })),
    [days, today],
  );
  const byDay = useMemo(() => new Map(entries.map((e) => [e.day, e])), [entries]);

  const write = async (day: string, story?: string) => {
    setWriting(day);
    try {
      const { data, error } = await supabase.functions.invoke<{ title: string; body: string; ai: boolean }>('journal-draft', {
        body: { crewId: crew.id, day, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, story },
      });
      if (error || !data) {
        const body = await (error as { context?: Response } | null)?.context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error?.message ?? 'Brouillon indisponible');
      }
      // Un récit sur un jour déjà écrit remplace le texte de sa page (on relit avant d'enregistrer).
      setDraft({ day, ...data, entry: byDay.get(day) ?? null, fromStory: !!story });
    } catch (e) {
      toastError(e);
    } finally {
      setWriting(null);
    }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('journal_entries').delete().eq('id', id)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.journal(crew.id) }),
    onError: toastError,
  });

  return (
    <div className="space-y-6">
      <StoryRecorder
        crewId={crew.id}
        day={storyDay}
        dayLabel={shortDayLabel(storyDay, today)}
        days={storyDays}
        onDay={setStoryDay}
        writing={writing === storyDay}
        onWrite={(story) => void write(storyDay, story)}
      />
      <Panel
        title="Tes pages"
        description={<>Une page par jour, publiée dans le carnet de route de ta page. Le plus simple : <strong className="text-cream">raconte</strong> ta
          journée au micro. Pas le temps ? <strong className="text-cream">Rédiger</strong> écrit un brouillon à partir des kilomètres, des étapes et des photos du jour.</>}
      >
        {days.length === 0 ? (
          <p className="m-0 text-dust-300">Les journées apparaîtront ici dès que le GPS aura enregistré tes premiers kilomètres.</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {days.map((day) => {
              const entry = byDay.get(day);
              return (
                <li key={day} className="flex flex-wrap items-center gap-3 border border-cream/[0.12] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-mono text-[11px] uppercase tracking-[0.14em] text-ochre">{dayLabel(day)}</p>
                    {entry ? (
                      <p className="m-0 font-semibold text-cream">
                        {entry.title}
                        {!entry.published && <span className="ml-2 text-xs font-normal text-dust-400">(brouillon)</span>}
                        {entry.ai_generated && <span className="ml-2 text-xs font-normal text-dust-500">· rédigé avec l’IA</span>}
                      </p>
                    ) : <p className="m-0 text-sm text-dust-400">Pas encore de page pour ce jour.</p>}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => { setStoryDay(day); document.querySelector('[aria-label="Raconte ta journée"]')?.scrollIntoView({ behavior: 'smooth' }); }}>
                    <Mic />Raconter
                  </Button>
                  {entry ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDraft({ day, title: entry.title, body: entry.body, ai: entry.ai_generated, entry })}><PenLine />Modifier</Button>
                      <Button size="sm" variant="ghost" aria-label="Supprimer la page" onClick={() => { if (confirm('Supprimer cette page du journal ?')) remove.mutate(entry.id); }}><Trash2 /></Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={writing !== null} onClick={() => void write(day)}>
                      {writing === day ? <Loader2 className="animate-spin" /> : <Sparkles />}{writing === day ? 'Rédaction…' : 'Rédiger'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      {draft && <Editor crew={crew} draft={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}
