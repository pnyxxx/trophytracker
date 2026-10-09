/**
 * Gabarit de l'espace voyageur (/mon-compte/road-trips/:slug) : barre latérale sur ordinateur (logo, road trip
 * en cours et ses autres road trips, navigation, voyageur connecté), barre d'onglets défilante sur téléphone.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus } from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import { useAuth } from '@/hooks/auth';
import { useMyCrews } from '@/hooks/queries';
import type { Crew } from '@/lib/supabase';
import { SECTIONS, tripStatus, type Section } from '@/lib/traveller';
import { cn } from '@/lib/utils';

export function TravellerShell({ crew, section, badges, onSection, children }: {
  crew: Crew;
  section: Section;
  badges: Partial<Record<Section, ReactNode>>;
  onSection: (s: Section) => void;
  children: ReactNode;
}) {
  const { profile } = useAuth();
  const { data: mine = [] } = useMyCrews();
  const role = mine.find((m) => m.crew.id === crew.id)?.role;
  const others = mine.filter((m) => m.crew.id !== crew.id);
  const name = profile?.display_name ?? '';

  const nav = (mobile: boolean) => SECTIONS.map((s) => (
    <button
      key={s.id}
      type="button"
      onClick={() => onSection(s.id)}
      aria-current={section === s.id ? 'page' : undefined}
      className={cn(
        'flex items-center justify-between gap-2.5 rounded-[14px] font-bold',
        mobile ? 'min-h-11 flex-none whitespace-nowrap rounded-full px-4 text-[15px]' : 'min-h-[46px] px-3 text-left text-[16px]',
        section === s.id ? 'bg-signal text-white' : mobile ? 'bg-ink-800 text-dust-100' : 'text-dust-100 hover:bg-ink-800 hover:text-white',
      )}
    >
      {s.label}
      {badges[s.id] && <span className="font-mono text-[12px] font-normal opacity-85">{badges[s.id]}</span>}
    </button>
  ));

  return (
    <div className="min-h-screen bg-ink text-cream lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-5 overflow-y-auto border-r-[1.5px] border-ink-700 bg-ink-900 px-3.5 py-5 lg:flex">
        <Link to="/" aria-label="trophytracker, accueil" className="flex items-center gap-[9px] px-2 text-cream hover:text-cream"><LogoMark /><Wordmark /></Link>
        <div className="flex flex-col gap-0.5 rounded-[18px] bg-ink-800 px-3.5 py-3">
          <span className="font-mono text-[12px] text-dust-400">road trip</span>
          <span className="text-[17px] font-bold leading-snug">{crew.name}</span>
          <span className="font-mono text-[13px] text-signal-text">{tripStatus(crew)}</span>
          <Link to={`/road-trip/${crew.slug}`} className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] font-bold text-dust-200 hover:text-white">Voir ma page <ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>
        <nav aria-label="Espace voyageur" className="flex flex-col gap-1">{nav(false)}</nav>
        {others.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="px-3 font-mono text-[12px] text-dust-500">mes autres road trips</span>
            {others.map((m) => (
              <Link key={m.crew.id} to={`/mon-compte/road-trips/${m.crew.slug}`} className="truncate rounded-[14px] px-3 py-2 text-[15px] text-dust-200 hover:bg-ink-800 hover:text-white">{m.crew.name}</Link>
            ))}
          </div>
        )}
        <Link to="/creer" className="flex items-center gap-2 rounded-[14px] px-3 py-2 text-[15px] font-bold text-dust-300 hover:bg-ink-800 hover:text-white"><Plus className="h-4 w-4" />Nouveau road trip</Link>
        <Link to="/mon-compte" className="mt-auto flex items-center gap-2.5 rounded-[14px] px-2 py-1.5 text-cream hover:bg-ink-800 hover:text-cream">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal font-bold">{(name[0] ?? '?').toUpperCase()}</span>
          <span className="flex flex-col">
            <span className="text-[15px] font-bold">{name || 'Mon compte'}</span>
            <span className="text-[13px] text-dust-400">{role === 'owner' ? 'capitaine' : 'compagnon de route'} · mon compte</span>
          </span>
        </Link>
      </aside>

      {/* Barre du haut (téléphone) */}
      <div className="sticky top-0 z-[900] flex flex-col gap-2.5 border-b-[1.5px] border-ink-700 bg-ink/[0.94] px-4 py-3 backdrop-blur-[14px] lg:hidden">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="trophytracker, accueil"><LogoMark /></Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[16px] font-bold">{crew.name}</span>
            <span className="font-mono text-[12px] text-signal-text">{tripStatus(crew)}</span>
          </div>
          <Link to={`/road-trip/${crew.slug}`} className="flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-cream/40 px-3.5 text-[14px] font-bold text-cream hover:text-cream">Ma page <ExternalLink className="h-3.5 w-3.5" /></Link>
          <Link to="/mon-compte" aria-label="Mon compte" className="flex h-10 w-10 items-center justify-center rounded-full bg-signal font-bold text-white hover:text-white">{(name[0] ?? '?').toUpperCase()}</Link>
        </div>
        <nav aria-label="Espace voyageur" className="-mx-4 flex gap-1.5 overflow-x-auto px-4">{nav(true)}</nav>
      </div>

      <main id="contenu" className="min-w-0 max-w-[1180px] px-4 py-6 lg:px-12 lg:py-10">{children}</main>
    </div>
  );
}
