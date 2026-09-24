import type { Sponsor } from '@/lib/supabase';
import { mediaUrl } from '@/lib/media';

export function CrewSponsors({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {sponsors.map((s) => {
        const logo = mediaUrl(s.logo_path);
        const content = (
          <>
            <div className="flex h-20 items-center justify-center">
              {logo ? (
                <img src={logo} alt={s.name} loading="lazy" className="max-h-20 max-w-full object-contain" />
              ) : (
                <span className="text-center text-lg font-bold text-black/70">{s.name}</span>
              )}
            </div>
            <p className="mt-3 truncate text-center text-sm font-semibold text-black/80">{s.name}</p>
            {s.city && <p className="truncate text-center text-xs text-black/50">{s.city}</p>}
          </>
        );
        const cls = 'block rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl';
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
