/** Petits composants réutilisés pour afficher un équipage. */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-green-500', className)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      En direct
    </span>
  );
}

export function CrewAvatar({ name, path, className }: { name: string; path: string | null; className?: string }) {
  const url = thumbUrl(path, 256);
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 font-bold text-primary', className ?? 'h-14 w-14 text-lg')}>
      {url ? <img src={url} alt={`Logo de ${name}`} className="h-full w-full object-cover" loading="lazy" /> : initials(name)}
    </div>
  );
}

/** Bouton « Suivre » : demande de se connecter si besoin, met à jour instantanément. */
export function FollowButton({ crewId, slug, count, className }: { crewId: string; slug: string; count?: number; className?: string }) {
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
      toast.success(follow ? 'Équipage ajouté à vos favoris' : 'Vous ne suivez plus cet équipage');
    },
    onError: (err) => toastError(err),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['follows'] });
      void queryClient.invalidateQueries({ queryKey: keys.crew(slug) });
    },
  });

  const onClick = () => {
    if (!user) {
      toast.info('Créez un compte gratuit pour suivre vos équipages favoris');
      navigate(`/connexion?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    mutation.mutate(!isFollowed);
  };

  return (
    <Button onClick={onClick} disabled={mutation.isPending} variant={isFollowed ? 'secondary' : 'default'} className={className}>
      <Heart className={cn('mr-2 h-4 w-4', isFollowed && 'fill-current')} />
      {isFollowed ? 'Suivi' : 'Suivre'}
      {count != null && <span className="ml-2 opacity-70">{count}</span>}
    </Button>
  );
}

export function ShareButton({ title, className }: { title: string; className?: string }) {
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, text: `Suivez ${title} en direct sur le 4L Trophy !`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié ! Partagez-le à vos proches et sponsors.');
      }
    } catch {
      /* partage annulé par l'utilisateur */
    }
  };
  return (
    <Button variant="outline" onClick={share} className={className}>
      <Share2 className="mr-2 h-4 w-4" /> Partager
    </Button>
  );
}

export function CrewCard({ crew }: { crew: CrewSummary }) {
  return (
    <Link
      to={`/equipages/${crew.slug}`}
      className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-card p-5 transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="flex items-start gap-4">
        <CrewAvatar name={crew.name} path={crew.avatar_path} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-white group-hover:text-primary">{crew.name}</h3>
            {crew.car_number && <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/70">#{crew.car_number}</span>}
          </div>
          {crew.tagline && <p className="line-clamp-2 text-sm text-white/60">{crew.tagline}</p>}
          {(crew.school || crew.city) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
              <MapPin className="h-3 w-3" /> {[crew.school, crew.city].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3 text-sm">
        <span className="font-mono text-white/80">{formatKm(crew.total_distance_m / 1000)}</span>
        {isLive(crew.last_fix_at) ? (
          <LiveBadge lastFixAt={crew.last_fix_at} />
        ) : (
          <span className="text-xs text-white/40">
            {crew.last_fix_at ? `Vu ${formatRelative(crew.last_fix_at)}` : 'Pas encore parti'}
          </span>
        )}
      </div>
    </Link>
  );
}
