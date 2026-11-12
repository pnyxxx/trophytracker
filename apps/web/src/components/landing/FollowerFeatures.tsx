/**
 * « Ce que voient tes proches » : une mosaïque, une fonction par tuile, chacune avec un petit visuel (HTML/SVG, et
 * la vraie carte du road trip d'exemple pour la première). Chaque idée n'apparaît qu'ici sur l'accueil.
 */
import { lazy, Suspense, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSeen } from '@/hooks/useInView';
import { EXAMPLE_PATH } from '@/lib/example';
import { cn } from '@/lib/utils';

const ExampleMap = lazy(() => import('./ExampleMap'));

function Tile({ title, text, children, className }: { title: string; text: string; children?: ReactNode; className?: string }) {
  return (
    <li className={cn('tt-glass flex w-[84%] flex-none snap-center flex-col gap-4 overflow-hidden rounded-[24px] border-[1.5px] border-cream/[0.08] p-6 sm:w-auto', className)}>
      {children && <div className="flex flex-1 items-center" aria-hidden="true">{children}</div>}
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-[1.2353rem] font-extrabold leading-tight tracking-[-0.01em] text-cream">{title}</h3>
        <p className="m-0 text-[0.8824rem] leading-normal text-dust-300">{text}</p>
      </div>
    </li>
  );
}

const chip = 'rounded-full bg-[#121316] px-3 py-1.5 font-mono text-[0.7059rem]';

/** Mini-carte : la vraie carte du road trip d'exemple, en gros plan, créée seulement à l'approche de la section. */
function MiniMap() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeen(ref, '50%');
  return (
    <div ref={ref} className="relative h-full min-h-[14rem] w-full overflow-hidden rounded-[18px] bg-[#F1EDE5]">
      <div className="absolute inset-0">
        {seen && (
          <Suspense fallback={null}>
            <ExampleMap mode="close" />
          </Suspense>
        )}
      </div>
      <span className={cn(chip, 'pointer-events-none absolute left-3 top-3 text-cream')}>
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-live" />
        Léa & Sam · il y a 4 s
      </span>
    </div>
  );
}

/** Le passage hors réseau : pointillés, puis la trace rattrapée. */
function Offline() {
  return (
    <div className="flex w-full flex-col gap-3">
      <svg viewBox="0 0 300 60" className="h-[3.5294rem] w-full">
        <path d="M6 44 C60 44 70 20 120 22" fill="none" stroke="#E1262C" strokeWidth="5" strokeLinecap="round" />
        <path d="M120 22 C170 24 190 46 240 40" fill="none" stroke="#E8A33D" strokeWidth="4" strokeDasharray="1 9" strokeLinecap="round" />
        <path d="M240 40 C262 37 278 24 294 18" fill="none" stroke="#E1262C" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span className={cn(chip, 'self-start border-[1.5px] border-gold/40 text-gold-text')}>hors réseau · 14 km en mémoire</span>
    </div>
  );
}

/** Le tableau de bord. */
function Dashboard() {
  const rows = [
    ['distance', '1 284', 'km'],
    ['altitude', '742', 'm'],
    ['dénivelé +', '9 310', 'm'],
    ['au volant', '4 h 10', ''],
  ];
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {rows.map(([l, v, u]) => (
        <div key={l} className="flex flex-col gap-0.5 rounded-[14px] bg-[#121316] px-3 py-2.5">
          <span className="font-mono text-[0.5882rem] uppercase tracking-[0.1em] text-dust-500">{l}</span>
          <span className="font-mono text-[1rem] text-cream">{v}<span className="ml-1 text-[0.6471rem] text-dust-400">{u}</span></span>
        </div>
      ))}
    </div>
  );
}

/** La météo sur place. */
function Weather() {
  return (
    <div className="flex w-full items-center gap-4">
      <svg viewBox="0 0 64 64" className="h-16 w-16 flex-none">
        <g className="tt-wx-spin" stroke="#F2C27A" strokeWidth="4" strokeLinecap="round">
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4;
            return <line key={k} x1={32 + Math.cos(a) * 21} y1={32 + Math.sin(a) * 21} x2={32 + Math.cos(a) * 28} y2={32 + Math.sin(a) * 28} />;
          })}
        </g>
        <circle cx="32" cy="32" r="13" fill="#E8A33D" />
      </svg>
      <div className="flex flex-col">
        <span className="font-display text-[2.5882rem] font-extrabold leading-none text-cream">31°</span>
        <span className="font-mono text-[0.7059rem] text-dust-400">ensoleillé · demain 29°</span>
      </div>
    </div>
  );
}

/** Photos rangées sur la carte. */
function Photos() {
  const shots = [
    { r: -6, bg: 'linear-gradient(160deg,#E8A33D 0%,#B4612A 55%,#3A2416 100%)' },
    { r: 4, bg: 'linear-gradient(170deg,#7FB6D9 0%,#D9B98A 60%,#8A5A33 100%)' },
    { r: -2, bg: 'linear-gradient(150deg,#F2C27A 0%,#C9813F 50%,#5C3A22 100%)' },
  ];
  return (
    <div className="relative flex h-[6.4706rem] w-full items-center justify-center">
      {shots.map((s, k) => (
        <span
          key={k}
          className="absolute h-[5.4118rem] w-[4.7059rem] rounded-[10px] bg-white p-1 pb-4 shadow-[0_12px_24px_rgba(0,0,0,.45)]"
          style={{ transform: `translateX(${(k - 1) * 58}px) rotate(${s.r}deg)` }}
        >
          <span className="block h-full w-full rounded-[7px]" style={{ background: s.bg }} />
        </span>
      ))}
      <span className="absolute -bottom-1 right-2 rounded-full bg-cream px-2 py-0.5 font-mono text-[0.6471rem] text-coal">360°</span>
    </div>
  );
}

/** Le résumé du soir par e-mail. */
function Evening() {
  return (
    <div className="flex w-full flex-col gap-2 rounded-[16px] bg-cream p-4 text-coal">
      <span className="font-mono text-[0.6471rem] text-dust-700">ce soir, 21 h · jour 6</span>
      <span className="text-[1.0588rem] font-extrabold leading-tight">312 km aujourd’hui</span>
      <span className="font-mono text-[0.7059rem] text-dust-700">altitude max 1 204 m · 7 photos</span>
      <span className="text-[0.8235rem] italic leading-snug text-dust-800">« Crevaison, puis bivouac sous les étoiles »</span>
    </div>
  );
}

/** Le mur d'encouragements. */
function Cheers() {
  const msgs = [
    { who: 'Mamie', text: 'Soyez prudents mes chéris, on vous suit tous les soirs ❤️', side: 'self-start' },
    { who: 'Tom', text: '312 km aujourd’hui ?! Respect 🔥', side: 'self-end' },
  ];
  return (
    <div className="flex w-full flex-col gap-2">
      {msgs.map((m) => (
        <div key={m.who} className={cn('max-w-[85%] rounded-[16px] bg-[#121316] px-3.5 py-2.5', m.side)}>
          <span className="block font-mono text-[0.6471rem] text-signal-text">{m.who}</span>
          <span className="text-[0.8824rem] text-dust-100">{m.text}</span>
        </div>
      ))}
    </div>
  );
}

export function FollowerFeatures() {
  return (
    // Téléphone : un carrousel qu'on fait glisser (la carte suivante dépasse) ; plus grand : une mosaïque.
    <ul className="-mx-5 m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3.5 sm:overflow-visible sm:p-0 lg:grid-cols-3">
      <Tile
        className="sm:col-span-2 lg:row-span-2"
        title="La carte en direct"
        text="Ta position mise à jour en quelques secondes, ta trace complète et tes étapes, sur fond satellite ou plan."
      >
        <MiniMap />
      </Tile>
      <Tile title="Même sans réseau" text="Ton téléphone garde chaque point en mémoire et complète la trace dès qu’il capte à nouveau.">
        <Offline />
      </Tile>
      <Tile title="La météo sur place" text="Le temps qu’il fait là où tu es, heure par heure, et ce qui t’attend demain.">
        <Weather />
      </Tile>
      <Tile title="Le tableau de bord" text="Distance, vitesse, altitude, dénivelé et temps au volant, jour après jour.">
        <Dashboard />
      </Tile>
      <Tile title="Tes photos sur la carte" text="Photos et 360° se rangent d’elles-mêmes, pile là où tu les as prises.">
        <Photos />
      </Tile>
      <Tile title="Le résumé du soir" text="S’ils le veulent, tes proches reçoivent chaque soir ta journée par e-mail.">
        <Evening />
      </Tile>
      <Tile className="sm:col-span-2" title="Les encouragements" text="Un mur où ils te laissent leurs messages, à lire le soir au bivouac.">
        <Cheers />
      </Tile>
      <li className="flex w-[84%] flex-none snap-center sm:w-auto">
        <Link
          to={EXAMPLE_PATH}
          className="group flex w-full flex-col justify-between gap-6 rounded-[24px] bg-cream p-6 text-coal hover:bg-white hover:text-coal"
        >
          <span className="font-mono text-[0.7059rem] text-dust-700">road trip d’exemple</span>
          <span className="tt-display text-[1.8824rem] leading-[1.02]">
            Voir une vraie page,
            <br />
            en direct
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>
      </li>
    </ul>
  );
}
