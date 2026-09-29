/**
 * « La route » : section très haute dont le contenu reste collé à l'écran.
 * Le défilement fait rouler la 4L de Biarritz à Marrakech sur la vue satellite,
 * pendant que le texte de l'étape, le compteur et le roadbook se mettent à jour.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSeen } from '@/hooks/useInView';
import { fmtKm, headingAt, posAt, STOP_FRAC, STOPS, TOTAL_KM } from './journey';

const JourneyMap = lazy(() => import('./JourneyMap'));

const pad = (n: number) => String(n).padStart(2, '0');

export function RouteJourney() {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const seen = useSeen(ref);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      setP(Math.min(1, Math.max(0, -r.top / (travel || 1))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Kilométrage interpolé entre deux étapes, et étape courante.
  let seg = 0;
  while (seg < STOP_FRAC.length - 2 && p > STOP_FRAC[seg + 1]!) seg++;
  const t = Math.min(1, Math.max(0, (p - STOP_FRAC[seg]!) / (STOP_FRAC[seg + 1]! - STOP_FRAC[seg]! || 1)));
  const km = Math.round(STOPS[seg]!.km + (STOPS[seg + 1]!.km - STOPS[seg]!.km) * t);
  let idx = 0;
  STOP_FRAC.forEach((f, i) => {
    if (p >= f - 0.012) idx = i;
  });
  const cur = STOPS[idx]!;
  const num = pad(idx + 1);
  const [lon, lat] = posAt(p);
  const coords = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'O' : 'E'}`;

  return (
    <section ref={ref} aria-label="La route, de Biarritz à Marrakech" className="relative h-[620vh] bg-ink">
      <div className="sticky top-0 grid h-screen grid-cols-1 overflow-hidden min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(380px,1.1fr)_minmax(0,.9fr)]">
        {/* Colonne gauche : l'étape racontée */}
        <div className="relative hidden flex-col justify-center gap-[22px] overflow-hidden py-12 pl-12 pr-10 pt-[100px] min-[1000px]:flex">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-[70px] -left-2.5 font-stencil text-[400px] font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(244,236,223,.08)]">
            {num}
          </div>
          {/* Titre accroché en haut ; le bloc de l'étape reste centré dans l'espace restant. */}
          <div className="relative mb-auto flex flex-col gap-4">
            <h2 className="tt-display m-0 whitespace-nowrap text-[clamp(40px,calc(6vw_-_16px),120px)] leading-[0.88] text-cream">Où sont-ils ?</h2>
          </div>
          <div className="tt-kicker text-xs text-ochre">La route · étape {num} / {pad(STOPS.length)}</div>
          <div className="relative flex flex-col gap-1.5">
            <div className="font-mono text-[13px] uppercase tracking-[0.1em] text-dust-400">{cur.country} — {cur.kind}</div>
            <h3 className="m-0 text-balance font-display text-[clamp(52px,5.6vw,100px)] font-black uppercase leading-[0.96] text-cream">{cur.name}</h3>
          </div>
          <p className="relative m-0 max-w-[420px] text-pretty text-[19px] leading-[1.55] text-dust-100">{cur.text}</p>
          <div className="relative mb-auto font-mono text-xs tracking-[0.08em] text-dust-400">↓ Faites défiler pour rouler</div>
        </div>

        {/* Centre : la vue satellite */}
        <div className="relative overflow-hidden bg-ink-900 shadow-[0_0_60px_rgba(0,0,0,.5)]">
          {seen && (
            <Suspense fallback={null}>
              <JourneyMap progress={p} />
            </Suspense>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,15,12,.9)_0%,rgba(18,15,12,0)_24%,rgba(18,15,12,0)_72%,rgba(18,15,12,.85)_100%),radial-gradient(120%_90%_at_50%_50%,transparent_55%,rgba(0,0,0,.5)_100%)]" />
          <div className="pointer-events-none absolute inset-x-4 top-[84px] flex justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-cream">
            <span className="flex items-center gap-2">
              <span className="h-[7px] w-[7px] rounded-full bg-primary shadow-[0_0_10px_#DB4740]" />
              {coords}
            </span>
            <span className="text-dust-100">Cap {String(Math.round(headingAt(p))).padStart(3, '0')}°</span>
          </div>

          {/* Barre de progression (grand écran) */}
          <div className="pointer-events-none absolute inset-x-5 bottom-[22px] hidden flex-col gap-2.5 min-[1000px]:flex">
            <div className="relative h-[3px] bg-cream/[0.22]">
              <div className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_10px_rgba(219,71,64,.8)]" style={{ width: `${(p * 100).toFixed(2)}%` }} />
              {STOP_FRAC.map((f, i) => (
                <span
                  key={i}
                  className="absolute -top-1 -ml-[5.5px] h-[11px] w-[11px] rounded-full border-2 border-cream"
                  style={{ left: `${(f * 100).toFixed(2)}%`, background: i <= idx ? '#DB4740' : '#120F0C' }}
                />
              ))}
            </div>
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-dust-300">
              <span>{STOPS[0]!.name}</span>
              <span>{fmtKm(km)} / {fmtKm(TOTAL_KM)} km</span>
              <span>{STOPS.at(-1)!.name}</span>
            </div>
          </div>

          {/* Carte de l'étape (petit écran) */}
          <div className="absolute inset-x-3 bottom-3 z-[6] flex flex-col gap-2 border-l-[3px] border-primary bg-ink/[0.94] p-[18px] min-[1000px]:hidden">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-ochre">
              <span>Étape {num} / {pad(STOPS.length)} · {cur.country}</span>
              <span>{fmtKm(km)} km</span>
            </div>
            <div className="font-display text-4xl font-black uppercase leading-none">{cur.name}</div>
            <p className="m-0 text-[15px] leading-normal text-dust-100">{cur.text}</p>
          </div>
        </div>

        {/* Colonne droite : compteur et roadbook */}
        <div className="hidden flex-col justify-center gap-8 py-12 pl-10 pr-12 pt-[100px] min-[1000px]:flex">
          <div className="flex flex-col gap-2.5">
            <div className="tt-kicker text-dust-400">Compteur</div>
            <div className="flex items-end gap-1">
              {String(km).padStart(4, '0').split('').map((d, i) => (
                <div key={i} className="flex h-[70px] w-[50px] items-center justify-center rounded border border-ink-600 bg-[#050403] font-mono text-[42px] font-bold text-cream shadow-[inset_0_12px_16px_rgba(0,0,0,.6)]">
                  {d}
                </div>
              ))}
              <span className="ml-2 pb-2 font-mono text-base text-ochre">km</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px border border-cream/[0.14] bg-cream/[0.14]">
            <div className="bg-ink p-4">
              <div className="tt-kicker text-dust-400">Jour</div>
              <div className="font-display text-[44px] font-black leading-none">
                {1 + Math.floor(p * 9)}
                <span className="text-xl text-dust-400"> / 10</span>
              </div>
            </div>
            <div className="bg-ink p-4">
              <div className="tt-kicker text-dust-400">Pays</div>
              <div className="font-display text-[44px] font-black leading-none">{cur.cc}</div>
            </div>
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {STOPS.map((s, i) => (
              <li key={s.name} className="grid grid-cols-[16px_1fr_auto] items-center gap-3.5 border-b border-cream/[0.08] py-[9px]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: i <= idx ? '#DB4740' : '#3A322A', boxShadow: `0 0 0 3px ${i === idx ? 'rgba(219,71,64,.3)' : 'transparent'}` }}
                />
                <span className={`text-[15px] font-semibold ${i === idx ? 'text-cream' : i < idx ? 'text-dust-400' : 'text-dust-600'}`}>{s.name}</span>
                <span className="font-mono text-xs text-dust-400">km {fmtKm(s.km)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
