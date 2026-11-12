/**
 * « Soutenir » sur la page d'un road trip : le lien de la cagnotte (pas de montant affiché), les sponsors
 * et le mur d'encouragements (bientôt). N'affiche que ce que les voyageurs ont rempli.
 * Un clic sur un sponsor ouvre sa fiche : présentation, adresse, téléphone, e-mail, et tous ses sites et réseaux.
 */
import { useState, type ReactNode } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import type { Sponsor } from '@/lib/supabase';
import { mediaUrl } from '@/lib/media';
import { linkInfo, sponsorLinks } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LinkIcon } from '@/components/common/SocialIcons';

/** Fiche d'un sponsor : tout ce que les voyageurs ont rempli, chaque lien avec son logo et son nom. */
function SponsorSheet({ sponsor: s, onClose }: { sponsor: Sponsor; onClose: () => void }) {
  const logo = mediaUrl(s.logo_path);
  const links = sponsorLinks(s).map(linkInfo);
  const row = 'flex min-h-12 items-center gap-3 rounded-2xl bg-ink px-3.5 py-2.5 text-cream hover:bg-ink-700 hover:text-cream';
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="items-start text-left">
          {logo && (
            <div className="mb-2 flex h-24 w-full items-center justify-center rounded-2xl bg-cream p-3">
              <img src={logo} alt="" className="max-h-full max-w-[80%] object-contain" />
            </div>
          )}
          <DialogTitle>{s.name}</DialogTitle>
          <DialogDescription>{s.description || 'Sponsor de ce voyage.'}</DialogDescription>
        </DialogHeader>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer sponsored" className={row}>
                <LinkIcon kind={l.kind} className="h-5 w-5 flex-none text-signal-text" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold">{l.name}</span>
                  {l.account && <span className="truncate text-[0.8235rem] text-dust-400">{l.account}</span>}
                </span>
              </a>
            </li>
          ))}
          {s.phone && (
            <li><a href={`tel:${s.phone.replace(/[^0-9+]/g, '')}`} className={row}><Phone className="h-5 w-5 flex-none text-signal-text" /><span className="font-bold">{s.phone}</span></a></li>
          )}
          {s.email && (
            <li><a href={`mailto:${s.email}`} className={row}><Mail className="h-5 w-5 flex-none text-signal-text" /><span className="min-w-0 truncate font-bold">{s.email}</span></a></li>
          )}
          {(s.address || s.city) && (
            // L'adresse complète (sinon la ville), qui s'ouvre dans l'appli de cartes du téléphone.
            <li>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address || (s.lat != null && s.lon != null ? `${s.lat},${s.lon}` : s.city!))}`}
                target="_blank" rel="noopener noreferrer" className={row}>
                <MapPin className="h-5 w-5 flex-none text-signal-text" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold leading-snug">{s.address || s.city}</span>
                  <span className="text-[0.8235rem] text-dust-400">ouvrir dans les cartes</span>
                </span>
              </a>
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

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
  const [open, setOpen] = useState<Sponsor | null>(null);
  return (
    <>
    {open && <SponsorSheet sponsor={open} onClose={() => setOpen(null)} />}
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
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
            {sponsors.map((s) => {
              const logo = mediaUrl(s.logo_path);
              // Ses réseaux : petits logos dans le coin en bas à gauche de sa carte (à côté du bouton, pas dedans).
              const social = sponsorLinks(s).map(linkInfo).filter((l) => l.kind !== 'site').slice(0, 3);
              return (
                <li key={s.id} className="relative">
                  <button type="button" onClick={() => setOpen(s)} title={`${s.name} : voir sa fiche`}
                    className="group relative flex aspect-square w-full items-center justify-center rounded-2xl bg-cream pb-6 text-ink hover:bg-white">
                    {/* Carte carrée, comme la plupart des logos. */}
                    {logo
                      ? <img src={logo} alt={s.name} loading="lazy" className="max-h-[62%] max-w-[78%] object-contain" />
                      : <span className="px-2 text-center text-[1rem] font-bold">{s.name}</span>}
                    {/* Invitation discrète à ouvrir la fiche (coordonnées, réseaux, sites). */}
                    <span className="absolute bottom-1.5 right-2.5 font-mono text-[0.6471rem] text-dust-700 group-hover:text-signal-light">voir plus ›</span>
                  </button>
                  {social.length > 0 && (
                    <span className="absolute bottom-1 left-1 flex gap-0.5">
                      {social.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer sponsored" aria-label={`${l.name} de ${s.name}`} title={`${l.name} de ${s.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_2px_6px_rgba(0,0,0,.18)] hover:bg-ink hover:text-white">
                          <LinkIcon kind={l.kind} className="h-[15px] w-[15px]" />
                        </a>
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
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
