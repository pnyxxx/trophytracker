/**
 * Onglet « Journal » : une page de journal de bord par jour de road trip.
 * Pour chaque journée où le GPS a roulé, « Rédiger » propose un brouillon (écrit par l'IA à partir des
 * kilomètres, étapes et photos du jour, ou un brouillon simple sans IA) que l'on relit, corrige et
 * publie. Rien n'est publié sans validation d'un voyageur.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, PenLine, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase, type Crew, type JournalEntry } from '@/lib/supabase';
import { keys, useJournal } from '@/hooks/queries';
import { useLiveTrack } from '@/hooks/useLiveTrack';
import { toastError, unwrap } from '@/lib/errors';
import { localDate } from '@/lib/days';
import { Field, Panel, textareaClass } from './shared';

interface Draft { day: string; title: string; body: string; ai: boolean; entry: JournalEntry | null }

const dayLabel = (day: string) => {
  const s = new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
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
            {draft.ai
              ? 'Brouillon rédigé par l’IA à partir de vos kilomètres, étapes et photos du jour. Relisez-le : vous seuls savez ce qui s’est vraiment passé.'
              : 'Brouillon écrit à partir des chiffres du jour : racontez la suite !'}
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

  // Les journées du road trip : celles où le GPS a enregistré des positions, plus celles déjà écrites.
  const days = useMemo(() => {
    const set = new Set(points.map((p) => localDate(p[2])));
    for (const e of entries) set.add(e.day);
    return [...set].sort().reverse();
  }, [points, entries]);
  const byDay = useMemo(() => new Map(entries.map((e) => [e.day, e])), [entries]);

  const write = async (day: string) => {
    setWriting(day);
    try {
      const { data, error } = await supabase.functions.invoke<{ title: string; body: string; ai: boolean }>('journal-draft', {
        body: { crewId: crew.id, day, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      if (error || !data) {
        const body = await (error as { context?: Response } | null)?.context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error?.message ?? 'Brouillon indisponible');
      }
      setDraft({ day, ...data, entry: null });
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
      <Panel
        title="Journal de bord"
        description={<>Une page par jour, publiée dans le carnet de route de votre page. Cliquez sur <strong className="text-cream">Rédiger</strong> : un
          brouillon est écrit pour vous à partir des kilomètres, des étapes et des photos du jour. Vous le relisez et le publiez.</>}
      >
        {days.length === 0 ? (
          <p className="m-0 text-dust-300">Les journées apparaîtront ici dès que le GPS aura enregistré vos premiers kilomètres.</p>
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
                  {entry ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDraft({ day, title: entry.title, body: entry.body, ai: entry.ai_generated, entry })}><PenLine />Modifier</Button>
                      <Button size="sm" variant="ghost" aria-label="Supprimer la page" onClick={() => { if (confirm('Supprimer cette page du journal ?')) remove.mutate(entry.id); }}><Trash2 /></Button>
                    </div>
                  ) : (
                    <Button size="sm" disabled={writing !== null} onClick={() => void write(day)}>
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
