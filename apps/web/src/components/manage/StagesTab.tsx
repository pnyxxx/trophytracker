/**
 * Onglet « Étapes » : les étapes du road trip, créées par les voyageurs.
 *  - Suggestions : le site repère dans la trace GPS les arrêts et les nuits, et propose de les
 *    ajouter en un clic (nom du lieu trouvé tout seul) ; on peut aussi les écarter.
 *  - Ajout et modification à la main : type, nom, lieu (recherche ou épingle), dates, note.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileUp, Navigation, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase, type Crew, type TripStage } from '@/lib/supabase';
import { keys, useStages } from '@/hooks/queries';
import { useLiveTrack } from '@/hooks/useLiveTrack';
import { toastError, unwrap } from '@/lib/errors';
import { describePosition } from '@/lib/geocode';
import { detectStays, formatDuration, newStays, stayKey, type Stay } from '@/lib/stage-detect';
import { parseGpx } from '@/lib/gpx';
import { STAGE_STYLE, stageStyle } from '@/components/crew/mapIcons';
import { Field, orNull, Panel, selectClass, textareaClass } from './shared';
import { LocationPicker, type Coords } from './LocationPicker';

// ─── Dates ↔ champ « datetime-local » (heure locale du navigateur) ──────────
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const fromEpoch = (s: number | null) => (s == null ? null : new Date(s * 1000).toISOString());

/** « sam. 12 juil., 18:40 » */
const stageWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

const KIND_OPTIONS = Object.entries(STAGE_STYLE).map(([value, s]) => ({ value, label: `${s.emoji} ${s.label}` }));

// ─── Arrêts écartés : mémorisés sur cet appareil (simple confort) ───────────
const dismissedKey = (crewId: string) => `tt-dismissed-stays-${crewId}`;
function readDismissed(crewId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(dismissedKey(crewId)) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function writeDismissed(crewId: string, keysList: string[]) {
  try {
    localStorage.setItem(dismissedKey(crewId), JSON.stringify(keysList.slice(-200)));
  } catch {
    /* stockage indisponible : tant pis */
  }
}

// ─── Fenêtre d'ajout / modification ─────────────────────────────────────────
interface Draft {
  kind: string; name: string; note: string; place: string;
  coords: Coords | null; arrived: string; left: string; source: 'manual' | 'detected';
}
const emptyDraft: Draft = { kind: 'stop', name: '', note: '', place: '', coords: null, arrived: '', left: '', source: 'manual' };
const draftOf = (s: TripStage): Draft => ({
  kind: s.kind, name: s.name, note: s.note ?? '', place: s.place ?? '', coords: { lat: s.lat, lon: s.lon },
  arrived: toLocalInput(s.arrived_at), left: toLocalInput(s.left_at), source: s.source as Draft['source'],
});

function StageDialog({ crew, stage, initial, last, onClose }: {
  crew: Crew; stage: TripStage | null; initial: Draft; last: Coords | null; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [d, setD] = useState<Draft>(initial);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setD((x) => ({ ...x, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      if (!d.coords) throw new Error('Choisissez où se trouve l’étape');
      const row = {
        kind: d.kind, name: d.name.trim(), note: orNull(d.note), place: orNull(d.place),
        lat: d.coords.lat, lon: d.coords.lon, arrived_at: fromLocalInput(d.arrived), left_at: fromLocalInput(d.left),
      };
      if (stage) unwrap(await supabase.from('trip_stages').update(row).eq('id', stage.id));
      else unwrap(await supabase.from('trip_stages').insert({ ...row, crew_id: crew.id, source: d.source }));
    },
    onSuccess: () => {
      toast.success(stage ? 'Étape modifiée' : 'Étape ajoutée');
      void queryClient.invalidateQueries({ queryKey: keys.stages(crew.id) });
      onClose();
    },
    onError: toastError,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto">
        <DialogHeader><DialogTitle>{stage ? 'Modifier l’étape' : 'Nouvelle étape'}</DialogTitle></DialogHeader>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <Field id="st-kind" label="Type">
              <select id="st-kind" className={selectClass} value={d.kind} onChange={set('kind')}>
                {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field id="st-name" label="Nom"><Input id="st-name" required maxLength={80} placeholder="ex. Nuit au lac d’Annecy" value={d.name} onChange={set('name')} /></Field>
          </div>
          <Field id="st-where" label="Où ?">
            <LocationPicker
              id="st-where"
              value={d.coords}
              onChange={(coords, place) => setD((x) => ({
                ...x, coords,
                place: place ? place.city ?? place.title : x.place,
                name: x.name || (place ? place.city ?? place.title : ''),
              }))}
              shortcuts={last && (
                <button type="button" className="inline-flex items-center gap-1.5 text-xs text-ochre hover:text-cream"
                  onClick={async () => {
                    const p = await describePosition(last.lat, last.lon);
                    setD((x) => ({ ...x, coords: last, place: p?.city ?? p?.title ?? x.place, name: x.name || (p?.city ?? p?.title ?? '') }));
                  }}>
                  <Navigation className="h-3.5 w-3.5" />Dernière position du road trip
                </button>
              )}
            />
          </Field>
          <Field id="st-place" label="Lieu affiché" hint="Ville ou région, rempli tout seul."><Input id="st-place" maxLength={120} value={d.place} onChange={set('place')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="st-arr" label="Arrivée" hint="Facultatif."><Input id="st-arr" type="datetime-local" value={d.arrived} onChange={set('arrived')} /></Field>
            <Field id="st-left" label="Départ" hint="Facultatif."><Input id="st-left" type="datetime-local" min={d.arrived || undefined} value={d.left} onChange={set('left')} /></Field>
          </div>
          <Field id="st-note" label="Note" hint="Un souvenir, une anecdote, un conseil… affiché dans le carnet de route.">
            <textarea id="st-note" maxLength={1000} className={textareaClass} value={d.note} onChange={set('note')} />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : stage ? 'Enregistrer' : 'Ajouter l’étape'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Une suggestion d'arrêt détecté ─────────────────────────────────────────
function Suggestion({ stay, onAdd, onDismiss, busy }: { stay: Stay; onAdd: (place: string) => void; onDismiss: () => void; busy: boolean }) {
  const [place, setPlace] = useState<string | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    void describePosition(stay.lat, stay.lon, ctrl.signal).then((p) => setPlace(p?.city ?? p?.title ?? 'Lieu inconnu'));
    return () => ctrl.abort();
  }, [stay.lat, stay.lon]);
  const style = stageStyle(stay.kind);
  return (
    <li className="flex flex-wrap items-center gap-3 border border-cream/[0.12] bg-black/20 p-3">
      <span className="text-2xl" aria-hidden="true">{style.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="m-0 font-semibold text-cream">{style.label} · {place ?? '…'}</p>
        <p className="m-0 text-xs text-dust-400">
          {stageWhen(fromEpoch(stay.arrivedAt))} · {stay.leftAt ? formatDuration(stay.duration) : 'en ce moment'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || place == null} onClick={() => onAdd(place ?? '')}><Plus />Ajouter</Button>
        <Button size="sm" variant="ghost" onClick={onDismiss} aria-label="Ignorer cette suggestion"><X /></Button>
      </div>
    </li>
  );
}

export function StagesTab({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const { data: stages = [] } = useStages(crew.id);
  const { points } = useLiveTrack(crew);
  const [dialog, setDialog] = useState<{ stage: TripStage | null; initial: Draft } | null>(null);
  const [dismissed, setDismissed] = useState(() => readDismissed(crew.id));
  const last = crew.last_lat != null && crew.last_lon != null ? { lat: crew.last_lat, lon: crew.last_lon } : null;

  const suggestions = useMemo(
    () => newStays(detectStays(points), stages).filter((s) => !dismissed.includes(stayKey(s))).reverse(),
    [points, stages, dismissed],
  );

  const addStay = useMutation({
    mutationFn: async ({ stay, place }: { stay: Stay; place: string }) =>
      unwrap(await supabase.from('trip_stages').insert({
        crew_id: crew.id, kind: stay.kind, source: 'detected', lat: stay.lat, lon: stay.lon, place: place || null,
        name: stay.kind === 'night' ? `Nuit à ${place || 'l’étape'}` : stay.kind === 'start' ? `Départ de ${place || 'la maison'}` : place || 'Arrêt',
        arrived_at: fromEpoch(stay.arrivedAt), left_at: fromEpoch(stay.leftAt),
      })),
    onSuccess: () => {
      toast.success('Étape ajoutée au carnet de route');
      void queryClient.invalidateQueries({ queryKey: keys.stages(crew.id) });
    },
    onError: toastError,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('trip_stages').delete().eq('id', id)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.stages(crew.id) }),
    onError: toastError,
  });

  // Import d'un fichier GPX (Komoot, Google My Maps…) : ses points nommés deviennent des étapes.
  const importGpx = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 20 * 1024 * 1024) throw new Error('Fichier trop lourd (20 Mo maximum)');
      const found = parseGpx(await file.text());
      if (!found.length) throw new Error('Aucun point trouvé dans ce fichier GPX');
      if (!confirm(`Ajouter ${found.length} étape${found.length > 1 ? 's' : ''} depuis « ${file.name} » ?`)) return 0;
      unwrap(await supabase.from('trip_stages').insert(found.map((g) => ({ ...g, crew_id: crew.id, source: 'manual' as const }))));
      return found.length;
    },
    onSuccess: (n) => {
      if (!n) return;
      toast.success(`${n} étape${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}`);
      void queryClient.invalidateQueries({ queryKey: keys.stages(crew.id) });
    },
    onError: toastError,
  });

  const dismiss = (s: Stay) => {
    const next = [...dismissed, stayKey(s)];
    setDismissed(next);
    writeDismissed(crew.id, next);
  };

  return (
    <div className="space-y-6">
      {suggestions.length > 0 && (
        <Panel
          title="Étapes repérées par le GPS"
          description="Le site a remarqué ces arrêts dans votre trace. Ajoutez-les en un clic : le lieu, l’heure et la durée sont déjà remplis."
        >
          <ul className="m-0 list-none space-y-2 p-0">
            {suggestions.slice(0, 8).map((s) => (
              <Suggestion key={stayKey(s)} stay={s} busy={addStay.isPending} onAdd={(place) => addStay.mutate({ stay: s, place })} onDismiss={() => dismiss(s)} />
            ))}
          </ul>
          {suggestions.length > 8 && <p className="mb-0 mt-3 text-xs text-dust-400">Et {suggestions.length - 8} autres plus anciennes.</p>}
        </Panel>
      )}

      <Panel
        title="Le carnet de route"
        description={<>Vos étapes, dans l’ordre du voyage : elles apparaissent sur la carte et dans le carnet de route de votre page. C’est vous qui décidez de tout : rien n’est imposé.</>}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog({ stage: null, initial: emptyDraft })}><Plus />Ajouter une étape</Button>
            <Button asChild variant="outline" disabled={importGpx.isPending}>
              <label className="cursor-pointer">
                <FileUp />{importGpx.isPending ? 'Import…' : 'Importer un GPX'}
                <input type="file" accept=".gpx,application/gpx+xml" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) importGpx.mutate(f); e.target.value = ''; }} />
              </label>
            </Button>
          </div>
        }
      >
        {stages.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border border-dashed border-cream/20 p-6 text-dust-300">
            <Sparkles className="h-6 w-6 text-ochre" />
            <p className="m-0 max-w-[560px]">
              Pas encore d’étape. Ajoutez votre point de départ, vos nuits prévues ou vos coups de cœur… ou laissez le GPS les repérer pendant le
              voyage : elles s’afficheront ici en suggestions.
            </p>
          </div>
        ) : (
          <ol className="m-0 list-none space-y-2 p-0">
            {stages.map((s, i) => {
              const style = stageStyle(s.kind);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 border border-cream/[0.12] p-3">
                  <span className="w-8 font-mono text-xs text-dust-500">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xl" aria-hidden="true">{style.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-semibold text-cream">{s.name}</p>
                    <p className="m-0 text-xs text-dust-400">
                      {[style.label, s.place !== s.name ? s.place : null, stageWhen(s.arrived_at)].filter(Boolean).join(' · ')}
                      {s.source === 'detected' && <span className="ml-2 text-ochre">· repérée par le GPS</span>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ stage: s, initial: draftOf(s) })} aria-label={`Modifier ${s.name}`}><Pencil /></Button>
                    <Button size="sm" variant="ghost" aria-label={`Supprimer ${s.name}`}
                      onClick={() => { if (confirm(`Supprimer l’étape « ${s.name} » ?`)) remove.mutate(s.id); }}><Trash2 /></Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      {dialog && <StageDialog crew={crew} stage={dialog.stage} initial={dialog.initial} last={last} onClose={() => setDialog(null)} />}
    </div>
  );
}
