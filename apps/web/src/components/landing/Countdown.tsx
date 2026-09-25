import { useEffect, useState } from 'react';
import { departureTime } from '@/lib/format';

function remaining(target: number) {
  const d = Math.max(0, target - Date.now());
  return {
    J: Math.floor(d / 86_400_000),
    H: Math.floor((d / 3_600_000) % 24),
    M: Math.floor((d / 60_000) % 60),
    S: Math.floor((d / 1000) % 60),
  };
}

/** Compte à rebours jusqu'au départ, en cases façon tableau de bord (masqué une fois la date passée). */
export function Countdown({ date }: { date: string }) {
  const target = departureTime(date);
  const [left, setLeft] = useState(() => remaining(target));
  useEffect(() => {
    const t = setInterval(() => setLeft(remaining(target)), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (target <= Date.now()) return null;

  return (
    <div className="grid grid-cols-4 gap-2" role="timer" aria-label="Temps restant avant le départ">
      {Object.entries(left).map(([label, value]) => (
        <div key={label} className="border-l-[3px] border-primary bg-black/35 px-3.5 py-3">
          <div className="font-mono text-[28px] font-bold leading-none text-cream sm:text-[34px]">{String(value).padStart(2, '0')}</div>
          <div className="mt-1.5 font-mono text-[11px] font-bold tracking-[0.2em] text-primary">{label}</div>
        </div>
      ))}
    </div>
  );
}
