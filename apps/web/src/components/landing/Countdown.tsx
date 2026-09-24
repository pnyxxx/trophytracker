import { useEffect, useState } from 'react';

function remaining(target: number) {
  const d = Math.max(0, target - Date.now());
  return {
    J: Math.floor(d / 86_400_000),
    H: Math.floor((d / 3_600_000) % 24),
    M: Math.floor((d / 60_000) % 60),
    S: Math.floor((d / 1000) % 60),
  };
}

/** Compte à rebours jusqu'au départ (masqué une fois la date passée). */
export function Countdown({ date }: { date: string }) {
  const target = new Date(`${date}T00:00:00`).getTime();
  const [left, setLeft] = useState(() => remaining(target));
  useEffect(() => {
    const t = setInterval(() => setLeft(remaining(target)), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (target <= Date.now()) return null;

  return (
    <div className="flex justify-center gap-2 md:gap-4" aria-label="Temps restant avant le départ">
      {Object.entries(left).map(([label, value]) => (
        <div key={label} className="border-l-2 border-primary bg-black/30 px-3 py-2 text-center md:px-4 md:py-3">
          <div className="font-mono text-lg font-bold tracking-wider text-white md:text-2xl">{String(value).padStart(2, '0')}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-primary">{label}</div>
        </div>
      ))}
    </div>
  );
}
