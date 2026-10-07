/**
 * Logo et image de couverture d'un road trip : envoi, suppression et, pour la
 * couverture, cadrage (on fait glisser l'image pour choisir la partie visible).
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Crosshair, ImagePlus, Move, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { mediaUrl, removeCrewImages, uploadCrewImage } from '@/lib/media';
import { keys } from '@/hooks/queries';

type Kind = 'avatar' | 'cover';
type Focus = { x: number; y: number };

const LABELS = {
  avatar: { updated: 'Logo mis à jour', removed: 'Logo supprimé' },
  cover: { updated: 'Image de couverture mise à jour', removed: 'Image de couverture supprimée' },
};

/** Envoi / suppression d'une image (le fichier précédent est effacé du stockage). */
function useCrewImage(crew: Crew, kind: Kind) {
  const queryClient = useQueryClient();
  const current = kind === 'avatar' ? crew.avatar_path : crew.cover_path;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) });
    void queryClient.invalidateQueries({ queryKey: ['my-crews'] });
  };
  // Une nouvelle couverture repart centrée.
  const patch = (path: string | null) =>
    kind === 'avatar' ? { avatar_path: path } : { cover_path: path, cover_focus_x: 50, cover_focus_y: 50 };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { path } = await uploadCrewImage(crew.id, kind, file, kind);
      const { error } = await supabase.from('crews').update(patch(path)).eq('id', crew.id);
      if (error) {
        await removeCrewImages(path);
        throw error;
      }
      await removeCrewImages(current);
    },
    onSuccess: () => { toast.success(LABELS[kind].updated); refresh(); },
    onError: toastError,
  });

  const remove = useMutation({
    mutationFn: async () => {
      unwrap(await supabase.from('crews').update(patch(null)).eq('id', crew.id));
      await removeCrewImages(current);
    },
    onSuccess: () => { toast.success(LABELS[kind].removed); refresh(); },
    onError: toastError,
  });

  return { url: mediaUrl(current), upload, remove, busy: upload.isPending || remove.isPending };
}

/** Zone cliquable qui ouvre le sélecteur de fichier. */
function FileZone({ onFile, className, children }: { onFile: (f: File) => void; className?: string; children: React.ReactNode }) {
  return (
    <label className={`group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-cream/20 bg-cream/5 hover:border-primary ${className ?? ''}`}>
      {children}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
    </label>
  );
}

/** Bouton « Changer » : même sélecteur de fichier, présenté comme un bouton. */
function ChangeButton({ onFile, disabled }: { onFile: (f: File) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => input.current?.click()}>
        <RefreshCw className="h-4 w-4" />Changer
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
    </>
  );
}

function DeleteButton({ label, onConfirm, disabled }: { label: string; onConfirm: () => void; disabled: boolean }) {
  return (
    <Button type="button" size="sm" variant="ghost" disabled={disabled} className="hover:text-primary-light"
      onClick={() => { if (confirm(`Supprimer ${label} ?`)) onConfirm(); }}>
      <Trash2 className="h-4 w-4" />Supprimer
    </Button>
  );
}

const Sending = () => (
  <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-cream">Envoi…</span>
);

export function AvatarPicker({ crew }: { crew: Crew }) {
  const { url, upload, remove, busy } = useCrewImage(crew, 'avatar');
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <FileZone onFile={(f) => upload.mutate(f)} className="h-32 w-32">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (
          <span className="flex flex-col items-center gap-1 text-xs text-dust-400"><ImagePlus className="h-6 w-6" />Logo</span>
        )}
        {busy && <Sending />}
      </FileZone>
      {url && <DeleteButton label="le logo" disabled={busy} onConfirm={() => remove.mutate()} />}
    </div>
  );
}

const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));

/**
 * Cadre où l'on fait glisser l'image (souris, doigt ou flèches du clavier).
 * Le point de cadrage est un object-position en % : glisser l'image vers le bas
 * montre son haut, donc le % diminue — au prorata de ce qui dépasse du cadre.
 */
function FocusFrame({ src, focus, onMove, onRelease, label, className }: {
  src: string; focus: Focus; onMove: (f: Focus) => void; onRelease: () => void; label: string; className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; start: Focus; over: { x: number; y: number } } | null>(null);

  // Combien l'image recadrée dépasse du cadre, en pixels, sur chaque axe.
  const overflow = () => {
    const box = frame.current?.getBoundingClientRect();
    const el = img.current;
    if (!box || !el?.naturalWidth) return { x: 0, y: 0 };
    const scale = Math.max(box.width / el.naturalWidth, box.height / el.naturalHeight);
    return { x: el.naturalWidth * scale - box.width, y: el.naturalHeight * scale - box.height };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, start: focus, over: overflow() };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    onMove({
      x: d.over.x > 1 ? clamp(d.start.x - ((e.clientX - d.px) / d.over.x) * 100) : d.start.x,
      y: d.over.y > 1 ? clamp(d.start.y - ((e.clientY - d.py) / d.over.y) * 100) : d.start.y,
    });
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    onRelease();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, Focus> = {
      ArrowLeft: { x: focus.x - step, y: focus.y }, ArrowRight: { x: focus.x + step, y: focus.y },
      ArrowUp: { x: focus.x, y: focus.y - step }, ArrowDown: { x: focus.x, y: focus.y + step },
    };
    const next = moves[e.key];
    if (!next) return;
    e.preventDefault();
    onMove({ x: clamp(next.x), y: clamp(next.y) });
  };

  return (
    <div
      ref={frame}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={`${focus.x} % horizontal, ${focus.y} % vertical`}
      className={`relative cursor-grab touch-none select-none overflow-hidden rounded-full border border-cream/20 bg-black active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => { if (e.key.startsWith('Arrow')) onRelease(); }}
    >
      <img
        ref={img}
        src={src}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
        style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
      />
      {/* Le bas de la bannière se fond dans la page : le montrer aide à cadrer. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(18,15,12,.75)_100%)]" />
    </div>
  );
}

export function CoverPicker({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const { url, upload, remove, busy } = useCrewImage(crew, 'cover');
  const [focus, setFocus] = useState<Focus>({ x: crew.cover_focus_x, y: crew.cover_focus_y });
  const latest = useRef(focus);
  latest.current = focus;
  useEffect(() => setFocus({ x: crew.cover_focus_x, y: crew.cover_focus_y }), [crew.cover_focus_x, crew.cover_focus_y]);

  const save = useMutation({
    mutationFn: async (f: Focus) =>
      unwrap(await supabase.from('crews').update({ cover_focus_x: f.x, cover_focus_y: f.y }).eq('id', crew.id)),
    onSuccess: () => {
      toast.success('Cadrage enregistré', { id: 'cover-focus' });
      void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) });
    },
    onError: toastError,
  });
  const commit = (f: Focus = latest.current) => {
    if (f.x !== crew.cover_focus_x || f.y !== crew.cover_focus_y) save.mutate(f);
  };
  const frameProps = { focus, onMove: setFocus, onRelease: () => commit() };

  if (!url) {
    return (
      <FileZone onFile={(f) => upload.mutate(f)} className="h-32 w-full">
        <span className="flex flex-col items-center gap-1 text-xs text-dust-400"><ImagePlus className="h-6 w-6" />Couverture</span>
        {busy && <Sending />}
      </FileZone>
    );
  }

  const centered = focus.x === 50 && focus.y === 50;
  return (
    <div className="min-w-0 flex-1 space-y-3">
      <div className="flex items-end gap-3">
        <figure className="m-0 min-w-0 flex-1 space-y-1">
          <div className="relative">
            <FocusFrame src={url} label="Cadrage de la couverture sur ordinateur" className="aspect-[2/1] w-full" {...frameProps} />
            {busy && <Sending />}
          </div>
          <figcaption className="text-[11px] uppercase tracking-[0.12em] text-dust-500">Ordinateur</figcaption>
        </figure>
        <figure className="m-0 w-16 shrink-0 space-y-1 sm:w-20">
          <FocusFrame src={url} label="Cadrage de la couverture sur téléphone" className="aspect-[3/5] w-full" {...frameProps} />
          <figcaption className="text-[11px] uppercase tracking-[0.12em] text-dust-500">Téléphone</figcaption>
        </figure>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-dust-400">
        <Move className="h-3.5 w-3.5 shrink-0" />
        Faites glisser l’image pour choisir la partie visible ; le cadrage s’enregistre tout seul.
      </p>
      <div className="flex flex-wrap gap-2">
        <ChangeButton onFile={(f) => upload.mutate(f)} disabled={busy} />
        <Button type="button" size="sm" variant="ghost" disabled={busy || centered}
          onClick={() => { const c = { x: 50, y: 50 }; setFocus(c); commit(c); }}>
          <Crosshair className="h-4 w-4" />Recentrer
        </Button>
        <DeleteButton label="l’image de couverture" disabled={busy} onConfirm={() => remove.mutate()} />
      </div>
    </div>
  );
}
