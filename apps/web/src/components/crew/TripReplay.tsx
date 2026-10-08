/**
 * « Revivre le road trip » : survol 3D de toute la trace, caméra « drone » qui suit la position,
 * en satellite (orthophotos IGN si le voyage est en France, sinon Esri).
 * Lecture / pause, frise pour se déplacer, trois vitesses, et export en VIDÉO (paysage, story 9:16 ou carré 1:1)
 * avec le nom, la date et les kilomètres incrustés : la carte est recopiée image par image dans un
 * canevas 2D qui porte aussi les textes, et ce canevas est enregistré (MediaRecorder).
 * Chargé à part (MapLibre est volumineux).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { Clapperboard, Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TripStage } from '@/lib/supabase';
import type { TrackPoint } from '@/hooks/useLiveTrack';
import { inFrance, maplibregl, satelliteStyle, webglAvailable } from '@/lib/maplibre';
import { easeAngle, headingAtDist, makeRoute, pathUntil, pointAtDist, type LonLat } from '@/lib/route-anim';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { stageStyle } from './mapIcons';

export type ReplayFormat = 'wide' | 'story' | 'square';
type Format = ReplayFormat;
/** Grossissement des textes incrustés : plus grands sur les formats étroits (lus sur téléphone). */
const TEXT_SCALE: Record<Format, number> = { wide: 1, story: 1.6, square: 1.3 };
const FORMAT_LABEL: Record<Format, string> = { wide: 'Paysage 16:9', story: 'Story 9:16', square: 'Carré 1:1' };
const SPEEDS = [{ label: '×1', seconds: 60 }, { label: '×2', seconds: 30 }, { label: '×4', seconds: 15 }];

/** Trace allégée (≈ 3 000 points au plus) avec l'heure de chaque point, pour l'affichage. */
function prepare(points: readonly TrackPoint[]) {
  const step = Math.max(1, Math.floor(points.length / 3000));
  const kept = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  const route = makeRoute(kept.map((p) => [p[1], p[0]] as LonLat));
  return { route, times: kept.map((p) => p[2]) };
}

const line = (coords: LonLat[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } });
const point = (c: LonLat) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: c } });

function pickRecorderType() {
  const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? null;
}

export default function TripReplay({ name, slug, points, stages, onClose, initialFormat = 'wide' }: {
  name: string; slug: string; points: TrackPoint[]; stages: TripStage[]; onClose: () => void; initialFormat?: Format;
}) {
  // Trace figée à l'ouverture : les positions qui arrivent en direct ne relancent pas le film.
  const [{ route, times }] = useState(() => prepare(points));
  const [stagesAtOpen] = useState(stages);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [format, setFormat] = useState<Format>(initialFormat);
  const [speed, setSpeed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0 → 1
  const [recording, setRecording] = useState(false);
  const progressRef = useRef(0);
  const playingRef = useRef(true);
  const speedRef = useRef(SPEEDS[0]!.seconds);
  const recordRef = useRef<{ recorder: MediaRecorder; canvas: HTMLCanvasElement; chunks: Blob[] } | null>(null);
  playingRef.current = playing;
  const formatRef = useRef(format);
  formatRef.current = format;
  speedRef.current = SPEEDS[speed]!.seconds;

  const france = useMemo(() => {
    const sample = route.path.filter((_, i) => i % 50 === 0);
    return sample.filter(([lon, lat]) => inFrance(lon, lat)).length > sample.length / 2;
  }, [route]);

  // Infos affichées (et incrustées dans la vidéo) pour une fraction du trajet.
  const hudAt = useCallback((f: number) => {
    const d = f * route.total;
    let i = route.cum.findIndex((c) => c >= d);
    if (i < 0) i = times.length - 1;
    const t = times[Math.max(0, i)] ?? times[0] ?? 0;
    return {
      date: new Date(t * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      km: formatNumber(d / 1000, 0),
    };
  }, [route, times]);

  useEffect(() => {
    if (!containerRef.current || !webglAvailable() || route.path.length < 2) return;
    const start = route.path[0]!;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: satelliteStyle(france ? 'ign' : 'esri'),
      center: start,
      zoom: 12.8,
      pitch: 64,
      maxPitch: 78,
      bearing: headingAtDist(route, 0, 2000),
      interactive: false,
      attributionControl: { compact: true },
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;

    let frame = 0;
    let last = 0;
    let cam = headingAtDist(route, 0, 2000);
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = last ? Math.min(100, now - last) : 0;
      last = now;
      if (playingRef.current) {
        progressRef.current = Math.min(1, progressRef.current + dt / (speedRef.current * 1000));
        if (progressRef.current >= 1) {
          setPlaying(false);
          if (recordRef.current) recordRef.current.recorder.stop();
        }
      }
      const d = progressRef.current * route.total;
      const pos = pointAtDist(route, d);
      (map.getSource('done') as GeoJSONSource | undefined)?.setData(line(pathUntil(route, d)));
      (map.getSource('car') as GeoJSONSource | undefined)?.setData(point(pos));
      // Plus le road trip est long, plus la caméra prend de la hauteur et regarde loin.
      const ahead = Math.max(800, Math.min(25_000, route.total / 25));
      cam = easeAngle(cam, headingAtDist(route, d, ahead), 0.03);
      map.jumpTo({ center: pos, bearing: cam });
      setProgress(progressRef.current);
      // Enregistrement : carte + incrustations dans le canevas de la vidéo.
      const rec = recordRef.current;
      if (rec) {
        const ctx = rec.canvas.getContext('2d')!;
        const src = map.getCanvas();
        ctx.drawImage(src, 0, 0, rec.canvas.width, rec.canvas.height);
        const w = rec.canvas.width;
        const h = rec.canvas.height;
        const grad = ctx.createLinearGradient(0, 0, 0, h * 0.3);
        grad.addColorStop(0, 'rgba(18,15,12,.75)');
        grad.addColorStop(1, 'rgba(18,15,12,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h * 0.3);
        const hud = hudAt(progressRef.current);
        const s = w / 1280;
        ctx.fillStyle = '#F4ECDF';
        ctx.font = `800 ${Math.round(56 * s * TEXT_SCALE[formatRef.current])}px "Bricolage Grotesque Variable", sans-serif`;
        ctx.fillText(name, 40 * s, 90 * s * (formatRef.current === 'wide' ? 1 : 1.4));
        ctx.fillStyle = '#D98A3D';
        ctx.font = `500 ${Math.round(22 * s * TEXT_SCALE[formatRef.current])}px "DM Mono", monospace`;
        ctx.fillText(`${hud.date} · ${hud.km} km`, 40 * s, 130 * s * (formatRef.current === 'wide' ? 1 : 1.55));
        ctx.fillStyle = 'rgba(244,236,223,.8)';
        ctx.fillText('trophytracker.fr', 40 * s, h - 36 * s);
      }
    };

    map.on('load', () => {
      try {
        map.setTerrain({ source: 'dem', exaggeration: 1.3 });
        map.setSky({ 'sky-color': '#8FB4D9', 'horizon-color': '#E9DCC8', 'fog-color': '#C9C2B4', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.85 });
      } catch {
        /* relief non pris en charge */
      }
      map.addSource('all', { type: 'geojson', data: line(route.path) });
      map.addSource('done', { type: 'geojson', data: line(route.path.slice(0, 2)) });
      map.addSource('car', { type: 'geojson', data: point(start) });
      map.addSource('stages', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: stagesAtOpen.map((s) => ({ type: 'Feature' as const, properties: { label: `${stageStyle(s.kind).emoji} ${s.name}` }, geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] } })) },
      });
      const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
      map.addLayer({ id: 'all', type: 'line', source: 'all', paint: { 'line-color': '#FFF8EC', 'line-opacity': 0.3, 'line-width': 2 }, layout: round });
      map.addLayer({ id: 'done-glow', type: 'line', source: 'done', paint: { 'line-color': '#DB4740', 'line-opacity': 0.35, 'line-width': 12, 'line-blur': 6 }, layout: round });
      map.addLayer({ id: 'done', type: 'line', source: 'done', paint: { 'line-color': '#DB4740', 'line-width': 4 }, layout: round });
      map.addLayer({ id: 'stages', type: 'circle', source: 'stages', paint: { 'circle-radius': 5, 'circle-color': '#F2B45A', 'circle-stroke-color': '#120F0C', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'car-halo', type: 'circle', source: 'car', paint: { 'circle-radius': 16, 'circle-color': '#DB4740', 'circle-opacity': 0.25, 'circle-pitch-alignment': 'map' } });
      map.addLayer({ id: 'car', type: 'circle', source: 'car', paint: { 'circle-radius': 7, 'circle-color': '#DB4740', 'circle-stroke-color': '#FFF8EC', 'circle-stroke-width': 3, 'circle-pitch-alignment': 'map' } });
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (recordRef.current?.recorder.state === 'recording') recordRef.current.recorder.stop();
      mapRef.current = null;
      map.remove();
    };
  }, [route, stagesAtOpen, france, name, hudAt]);

  // Le format change la taille de la carte.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 50);
    return () => clearTimeout(t);
  }, [format]);

  const startRecording = () => {
    const type = pickRecorderType();
    const map = mapRef.current;
    if (!type || !map) {
      alert('Ce navigateur ne sait pas enregistrer de vidéo. Essayez avec Chrome, Edge ou Firefox sur ordinateur.');
      return;
    }
    const src = map.getCanvas();
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      recordRef.current = null;
      setRecording(false);
      const blob = new Blob(chunks, { type: type.split(';')[0] });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${slug}-${format === 'wide' ? 'video' : format === 'story' ? 'story' : 'carre'}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    };
    recordRef.current = { recorder, canvas, chunks };
    progressRef.current = 0;
    setPlaying(true);
    setRecording(true);
    recorder.start(1000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-ink-900" role="dialog" aria-modal="true" aria-label={`Revivre ${name} en 3D`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-cream/10 px-4 py-3">
        <p className="m-0 flex-1 font-display text-2xl font-extrabold leading-none text-cream">Revivre {name}</p>
        <div className="flex gap-1" role="group" aria-label="Format">
          {(['wide', 'story', 'square'] as const).map((f) => (
            <Button key={f} size="sm" variant={format === f ? 'default' : 'ghost'} disabled={recording} onClick={() => setFormat(f)}>
              {FORMAT_LABEL[f]}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Fermer"><X /></Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <div className={cn('relative h-full max-w-full overflow-hidden border border-cream/10', format === 'story' ? 'aspect-[9/16]' : format === 'square' ? 'aspect-square' : 'aspect-video w-full max-h-full')}>
          <div ref={containerRef} className="h-full w-full" />
          <div className="pointer-events-none absolute left-4 top-4 bg-ink/75 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-cream">
            {hudAt(progress).date} · {hudAt(progress).km} km
          </div>
          {recording && (
            <div className="absolute right-4 top-4 flex items-center gap-2 bg-primary px-3 py-1.5 font-mono text-xs font-bold uppercase text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />Enregistrement…
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-cream/10 px-4 py-3">
        <Button size="sm" disabled={recording} onClick={() => {
          if (progressRef.current >= 1) progressRef.current = 0;
          setPlaying((p) => !p);
        }} aria-label={playing ? 'Pause' : 'Lecture'}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <input
          type="range" min={0} max={1000} value={Math.round(progress * 1000)} disabled={recording}
          onChange={(e) => { progressRef.current = Number(e.target.value) / 1000; setProgress(progressRef.current); }}
          className="min-w-[160px] flex-1 accent-[#DB4740]" aria-label="Avancement"
        />
        <div className="flex gap-1" role="group" aria-label="Vitesse">
          {SPEEDS.map((s, i) => (
            <Button key={s.label} size="sm" variant={speed === i ? 'secondary' : 'ghost'} disabled={recording} onClick={() => setSpeed(i)}>{s.label}</Button>
          ))}
        </div>
        <Button size="sm" variant="outline" disabled={recording} onClick={startRecording}>
          <Clapperboard />Enregistrer la vidéo
        </Button>
      </div>
    </div>
  );
}
