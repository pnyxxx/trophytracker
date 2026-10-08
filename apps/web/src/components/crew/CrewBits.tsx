/** Petits composants réutilisés pour afficher un road trip. */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LiveDot } from '@/components/common/Brand';
import { useAuth } from '@/hooks/auth';
import { keys, useFollowedIds, type CrewSummary } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { toastError } from '@/lib/errors';
import { formatKm, formatRelative, initials, isLive } from '@/lib/format';
import { thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

export function LiveBadge({ lastFixAt, className }: { lastFixAt: string | null; className?: string }) {
  if (!isLive(lastFixAt)) return null;
  return (
    <span className={cn('inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-live', className)}>
      <LiveDot />
      En direct
    </span>
  );
}

export function CrewAvatar({ name, path, className }: { name: string; path: string | null; className?: string }) {
  const url = thumbUrl(path, 256);
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-ink-700 font-display font-extrabold text-primary', className ?? 'h-[52px] w-[52px] text-xl')}>
      {url ? <img src={url} alt={`Logo de ${name}`} className="h-full w-full bg-white object-cover" loading="lazy" /> : initials(name)}
    </div>
  );
}

/** Bouton « Suivre » : demande de se connecter si besoin, met à jour instantanément. */
export function FollowButton({ crewId, slug, count, className, quiet = false }: {
  crewId: string; slug: string; count?: number; className?: string;
  /** En-tête : contour discret tant qu'on ne suit pas (le bouton rouge, c'est « Partager »). */
  quiet?: boolean;
}) {
  const { user } = useAuth();
  const { data: followed } = useFollowedIds();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isFollowed = followed?.has(crewId) ?? false;

  const mutation = useMutation({
    mutationFn: async (follow: boolean) => {
      const res = follow
        ? await supabase.from('follows').insert({ crew_id: crewId })
        : await supabase.from('follows').delete().eq('crew_id', crewId).eq('user_id', user!.id);
      if (res.error) throw res.error;
    },
    onMutate: (follow) => {
      const key = keys.follows(user!.id);
      queryClient.setQueryData(key, (old: Set<string> | undefined) => {
        const next = new Set(old);
        if (follow) next.add(crewId);
        else next.delete(crewId);
        return next;
      });
    },
    onSuccess: (_d, follow) => {
      toast.success(follow ? 'C’est noté : tu recevras un e-mail au départ et un résumé chaque soir de route' : 'Tu ne suis plus ce road trip');
    },
    onError: (err) => toastError(err),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['follows'] });
      void queryClient.invalidateQueries({ queryKey: keys.crew(slug) });
    },
  });

  const onClick = () => {
    if (!user) {
      toast.info('Un compte gratuit (juste ton e-mail) suffit pour suivre ce road trip');
      navigate(`/connexion?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    mutation.mutate(!isFollowed);
  };

  return (
    <Button onClick={onClick} disabled={mutation.isPending} variant={isFollowed ? 'secondary' : quiet ? 'outline' : 'default'} className={className}>
      <Heart className={cn(isFollowed && 'fill-current')} />
      {isFollowed ? 'Suivi' : 'Suivre'}
      {count != null && <span className="opacity-70">{count}</span>}
    </Button>
  );
}

/** Ligne d'équipage façon roadbook : logo, numéro, nom, kilométrage et statut GPS. */
export function CrewCard({ crew }: { crew: CrewSummary }) {
  const live = isLive(crew.last_fix_at);
  const place = [crew.school, crew.city].filter(Boolean).join(' · ') || crew.tagline;
  return (
    <Link
      to={`/t/${crew.slug}`}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[20px] border-[1.5px] border-ink-700 bg-ink-800 px-4 py-3.5 text-cream transition duration-200 hover:border-dust-600 hover:text-cream"
    >
      <CrewAvatar name={crew.name} path={crew.avatar_path} />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <div className="flex min-w-0 items-center gap-2">
          {crew.car_number && (
            <span className="shrink-0 rounded-full bg-signal px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">#{crew.car_number}</span>
          )}
          <h3 className="tt-display m-0 truncate text-[22px] leading-tight">{crew.name}</h3>
        </div>
        {place && <p className="m-0 truncate text-[13px] text-dust-400">{place}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="whitespace-nowrap font-mono text-sm font-semibold">{formatKm(crew.total_distance_m / 1000)}</span>
        <span className={cn('whitespace-nowrap font-mono text-[12px]', live ? 'text-live-text' : 'text-dust-400')}>
          {live ? '● en direct' : crew.last_fix_at ? `vu ${formatRelative(crew.last_fix_at)}` : 'pas encore parti'}
        </span>
      </div>
    </Link>
  );
}
