/**
 * « Raconte ta journée » : le soir, le voyageur appuie sur le micro et raconte sa journée comme à un ami.
 * La dictée est faite par le navigateur (Web Speech API : Chrome et Android → Google, Safari et iPhone → Apple),
 * le texte s'affiche au fur et à mesure et reste modifiable. « Écrire ma page » l'envoie à l'IA
 * (Edge Function journal-draft, champ `story`), qui en fait une page de carnet sans rien inventer.
 * Sans dictée dans le navigateur (Firefox…), on écrit, ou on dicte avec le micro du clavier du téléphone.
 * Le récit en cours est gardé dans ce navigateur (localStorage) jusqu'à ce que la page soit écrite.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Pause, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { textareaClass } from './shared';

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

const recognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const storyKey = (crewId: string, day: string) => `tt-story-${crewId}-${day}`;
const readStory = (crewId: string, day: string) => { try { return localStorage.getItem(storyKey(crewId, day)) ?? ''; } catch { return ''; } };
export const forgetStory = (crewId: string, day: string) => { try { localStorage.removeItem(storyKey(crewId, day)); } catch { /* stockage indisponible */ } };

const PROMPTS = [
  'Le moment le plus drôle de la journée ?',
  'La plus belle vue ?',
  'Une rencontre, une galère, une panne ?',
  'Qu’est-ce que vous avez mangé ?',
  'Ce que tu veux retenir de ce jour ?',
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function StoryRecorder({ crewId, day, dayLabel, days, onDay, writing, onWrite }: {
  crewId: string;
  day: string;
  dayLabel: string;
  /** Jours proposés dans le sélecteur (le plus récent d'abord). */
  days: { day: string; label: string }[];
  onDay: (day: string) => void;
  writing: boolean;
  onWrite: (story: string) => void;
}) {
  const Ctor = useRef(recognitionCtor()).current;
  const [text, setText] = useState(() => readStory(crewId, day));
  const [interim, setInterim] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);

  // Changement de jour : on reprend le récit gardé pour ce jour.
  useEffect(() => { setText(readStory(crewId, day)); setInterim(''); }, [crewId, day]);
  useEffect(() => {
    try { if (text.trim()) localStorage.setItem(storyKey(crewId, day), text); else localStorage.removeItem(storyKey(crewId, day)); } catch { /* stockage indisponible */ }
  }, [crewId, day, text]);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(() => () => { wanted.current = false; rec.current?.abort(); }, []);

  const stop = () => {
    wanted.current = false;
    rec.current?.stop();
    setRecording(false);
  };

  const start = () => {
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = 'fr-FR';
    // Sur Android, le mode continu répète les phrases : on enchaîne plutôt de courtes écoutes.
    r.continuous = !/Android/i.test(navigator.userAgent);
    r.interimResults = true;
    r.onresult = (e) => {
      let live = '';
      let done = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) done += res[0].transcript;
        else live += res[0].transcript;
      }
      if (done.trim()) setText((t) => `${t}${t && !/\s$/.test(t) ? ' ' : ''}${done.trim()}`);
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      wanted.current = false;
      setRecording(false);
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Le micro est bloqué : autorise-le pour ce site dans ton navigateur, puis réessaie.'
        : e.error === 'network'
          ? 'La dictée a besoin d’Internet. Écris ton récit, ou réessaie quand tu captes.'
          : 'La dictée s’est arrêtée. Appuie à nouveau sur le micro pour continuer.');
    };
    // Le navigateur coupe l'écoute après un silence : on relance tant que le voyageur n'a pas appuyé sur pause.
    r.onend = () => {
      setInterim('');
      if (wanted.current) {
        try { r.start(); } catch { setRecording(false); wanted.current = false; }
      }
    };
    rec.current = r;
    wanted.current = true;
    // Nouvelle prise : nouveau paragraphe.
    setText((t) => (t.trim() ? `${t.trimEnd()}\n\n` : ''));
    try {
      r.start();
      setRecording(true);
    } catch {
      wanted.current = false;
      setError('Impossible de lancer la dictée. Écris ton récit à la place.');
    }
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <section aria-label="Raconte ta journée" className="relative flex flex-col gap-5 overflow-hidden rounded-[28px] bg-ink-800 p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-signal/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[13px] text-dust-300"><Sparkles className="h-4 w-4 text-signal-text" />carnet de bord · avec l’IA</span>
        {days.length > 1 && (
          <select aria-label="Jour à raconter" value={day} onChange={(e) => { stop(); onDay(e.target.value); }}
            className="min-h-11 rounded-full border-2 border-ink-600 bg-ink px-4 text-[15px] text-cream">
            {days.map((d) => <option key={d.day} value={d.day}>{d.label}</option>)}
          </select>
        )}
      </div>
      <div className="relative flex flex-col gap-2">
        <h2 className="tt-display m-0 text-[clamp(34px,6vw,54px)] leading-[1.02] text-cream">Raconte ta <span className="text-signal">journée.</span></h2>
        <p className="m-0 max-w-[620px] text-[17px] leading-relaxed text-dust-200">
          Appuie sur le micro et raconte, comme à un ami au téléphone : les galères, les rencontres, les fous rires.
          L’IA en fait une belle page de carnet pour tes proches. Tu n’as plus qu’à relire.
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-3 py-2">
        {Ctor ? (
          <>
            <button type="button" onClick={recording ? stop : start} disabled={writing} aria-pressed={recording}
              aria-label={recording ? 'Mettre la dictée en pause' : 'Commencer à raconter'}
              className={cn('relative flex h-[120px] w-[120px] items-center justify-center rounded-full text-white shadow-[0_18px_40px_rgba(225,38,44,.35)] transition-transform active:scale-95 disabled:opacity-50',
                recording ? 'bg-signal' : 'bg-signal hover:bg-signal-hover')}>
              {recording && <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-signal/40" aria-hidden="true" />}
              {recording ? <Pause className="relative h-12 w-12" /> : <Mic className="relative h-12 w-12" />}
            </button>
            <span className="font-mono text-[14px] text-dust-300" aria-live="polite">
              {recording ? `je t’écoute · ${mmss(seconds)} · appuie pour faire une pause` : text.trim() ? 'appuie pour continuer ton récit' : 'appuie et parle'}
            </span>
          </>
        ) : (
          <p className="m-0 rounded-2xl bg-ink px-4 py-3 text-[15px] text-dust-200">
            Ton navigateur ne sait pas dicter : appuie sur le <b className="text-cream">micro du clavier</b> de ton téléphone, ou écris simplement ton récit.
          </p>
        )}
      </div>

      {!text.trim() && !recording && (
        <ul className="relative m-0 flex list-none flex-wrap justify-center gap-2 p-0" aria-label="Idées pour raconter">
          {PROMPTS.map((p) => <li key={p} className="rounded-full bg-ink px-3.5 py-2 text-[14px] text-dust-300">{p}</li>)}
        </ul>
      )}

      <div className="relative flex flex-col gap-2">
        <label htmlFor="story-text" className="font-mono text-[13px] text-dust-400">ton récit · {dayLabel.toLowerCase()}{words ? ` · ${words} mots` : ''}</label>
        <textarea id="story-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={12000}
          placeholder="Ce matin, on a quitté le camping vers 9 h…"
          className={cn(textareaClass, 'min-h-[150px] text-[17px] leading-relaxed')} />
        {interim && <p className="m-0 text-[16px] italic text-dust-400" aria-live="polite">{interim}…</p>}
      </div>
      {error && <p role="alert" className="relative m-0 text-[15px] text-signal-text">{error}</p>}

      <div className="relative flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={writing || words < 5} onClick={() => { stop(); onWrite(text.trim()); }}>
          {writing ? <Loader2 className="animate-spin" /> : <Sparkles />}{writing ? 'L’IA écrit ta page…' : 'Écrire ma page'}
        </Button>
        {text.trim() && !writing && (
          <Button variant="ghost" onClick={() => { if (confirm('Effacer ce récit ?')) { stop(); setText(''); } }}>Effacer</Button>
        )}
      </div>
      <p className="relative m-0 text-[13px] leading-relaxed text-dust-500">
        La dictée est faite par ton navigateur (Google ou Apple). Ton récit n’est envoyé à l’IA que quand tu appuies sur « Écrire ma page »,
        et rien n’est publié sans que tu le relises.
      </p>
    </section>
  );
}
