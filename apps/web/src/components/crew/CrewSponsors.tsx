import type { Sponsor } from '@/lib/supabase';
import { mediaUrl } from '@/lib/media';

/** Grille des sponsors : cases blanches cerclées d'encre, façon planche de stickers. */
export function CrewSponsors({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <div className="grid grid-cols-2 border-l-2 border-t-2 border-coal sm:grid-cols-3 lg:grid-cols-5">
      {sponsors.map((s) => {
        const logo = mediaUrl(s.logo_path);
        const content = (
          <>
            <div className="flex h-20 items-center justify-center">
              {logo ? (
                <img src={logo} alt={s.name} loading="lazy" className="max-h-20 max-w-full object-contain" />
              ) : (
                <span className="text-center font-display text-2xl font-extrabold text-coal">{s.name}</span>
              )}
            </div>
            <p className="mt-4 truncate text-center font-display text-lg font-extrabold text-coal">{s.name}</p>
            {s.city && <p className="truncate text-center font-mono text-[11px] uppercase tracking-[0.12em] text-dust-700">{s.city}</p>}
          </>
        );
        const cls = 'block border-b-2 border-r-2 border-coal bg-white p-5 text-coal transition-colors hover:bg-paper hover:text-coal';
        return s.website_url ? (
          <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer sponsored" className={cls}>
            {content}
          </a>
        ) : (
          <div key={s.id} className={cls}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
