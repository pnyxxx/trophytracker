/**
 * « Soutenir » sur la page d'un road trip : le lien de la cagnotte (pas de montant affiché), les sponsors
 * et le mur d'encouragements (bientôt). N'affiche que ce que les voyageurs ont rempli.
 */
import type { ReactNode } from 'react';
import type { Sponsor } from '@/lib/supabase';
import { mediaUrl } from '@/lib/media';
import { Button } from '@/components/ui/button';

function Card({ label, children, dashed = false }: { label: ReactNode; children: ReactNode; dashed?: boolean }) {
  return (
    <div className={`flex flex-col gap-3.5 rounded-[28px] tt-glass border-[1.5px] border-cream/[0.08] p-6 ${dashed ? 'border-[1.5px] border-dashed border-ink-600' : ''}`}>
      <span className="font-mono text-[0.7647rem] text-dust-400">{label}</span>
      {children}
    </div>
  );
}

export function TripSupport({ fundraiserUrl, sponsors, contactEmail, wall }: {
  fundraiserUrl: string | null;
  sponsors: Sponsor[];
  contactEmail: string | null;
  /** Mur d'encouragements (phase F) ; sans lui, une carte « bientôt ». */
  wall?: ReactNode;
}) {
  return (
    <>
    <section id="soutenir" className="grid scroll-mt-24 grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-stretch gap-4">
      {fundraiserUrl && (
        <Card label="cagnotte">
          <span className="tt-display text-[2rem] leading-none text-cream">Un coup de pouce pour le voyage ?</span>
          <span className="text-[0.9412rem] leading-normal text-dust-300">Les voyageurs ont ouvert une cagnotte en ligne. Le lien mène directement chez eux.</span>
          <Button asChild variant="secondary" className="mt-auto self-start">
            <a href={fundraiserUrl} target="_blank" rel="noopener noreferrer">Participer</a>
          </Button>
        </Card>
      )}
      {sponsors.length > 0 && (
        <Card label="ils soutiennent ce voyage">
          <div className="grid grid-cols-2 gap-2">
            {sponsors.map((s) => {
              const logo = mediaUrl(s.logo_path);
              const inner = logo
                ? <img src={logo} alt={s.name} loading="lazy" className="max-h-12 max-w-[80%] object-contain" />
                : <span className="px-2 text-center text-[1rem] font-bold">{s.name}</span>;
              const cls = 'flex h-[4.2353rem] items-center justify-center rounded-2xl bg-cream text-ink hover:bg-white hover:text-ink';
              return s.website_url
                ? <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer sponsored" className={cls} title={s.name}>{inner}</a>
                : <div key={s.id} className={cls} title={s.name}>{inner}</div>;
            })}
          </div>
        </Card>
      )}
      {wall ?? (
        <Card dashed label={<span className="flex items-center justify-between gap-3">mur d’encouragements <span className="rounded-full bg-ink-700 px-2.5 py-1 text-[0.7059rem] text-dust-300">bientôt</span></span>}>
          <span className="tt-display text-[1.5294rem] leading-[1.1] text-cream">Laisse un mot aux voyageurs, ils le liront au bivouac.</span>
          {contactEmail && (
            <Button asChild variant="outline" className="mt-auto self-start">
              <a href={`mailto:${contactEmail}`}>En attendant, leur écrire</a>
            </Button>
          )}
        </Card>
      )}
    </section>
    {wall && contactEmail && (
      <p className="m-0 mt-4 text-[0.8824rem] text-dust-400">
        Un message plus personnel ? <a href={`mailto:${contactEmail}`} className="font-bold text-signal-text hover:text-cream">Écrire aux voyageurs</a>
      </p>
    )}
    </>
  );
}
