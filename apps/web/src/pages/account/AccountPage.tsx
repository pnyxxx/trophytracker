/**
 * Mon compte : mes road trips (vers leur espace voyageur, et « Créer un road trip » → /creer),
 * les road trips que je suis, mon prénom, la sécurité (e-mail, double authentification) et la suppression.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LogOut, Plus } from 'lucide-react';
import { Panel } from '@/components/manage/shared';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CrewCard } from '@/components/crew/CrewBits';
import { SecuritySection } from '@/components/account/SecuritySection';
import { useAuth } from '@/hooks/auth';
import { useFollowedCrews, useMyCrews } from '@/hooks/queries';
import { mediaUrl } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatKm, isLive } from '@/lib/format';
import { tripStatus } from '@/lib/traveller';
import { cn } from '@/lib/utils';

export default function AccountPage() {
  const { user, profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: followed, isLoading: loadingFollowed } = useFollowedCrews();
  const { data: myCrews, isLoading: loadingMine } = useMyCrews();
  const [name, setName] = useState<string | null>(null);

  // Retour de Stripe sur cette page (paiement lancé ailleurs que dans /creer) : on reprend le parcours.
  const [params, setParams] = useSearchParams();
  const payment = params.get('paiement');
  useEffect(() => {
    if (payment === 'ok') navigate('/creer?paiement=ok', { replace: true });
    if (payment === 'annule') { toast('Paiement annulé : rien n’a été débité.'); setParams({}, { replace: true }); }
  }, [payment, navigate, setParams]);
  const { data: hasAccess } = useQuery({
    queryKey: ['crew-access', user?.id],
    queryFn: async () => unwrap(await supabase.from('crew_purchases').select('id').eq('status', 'paid').is('used_at', null).limit(1)).length > 0,
  });

  const saveName = useMutation({
    mutationFn: async (displayName: string) => {
      unwrap(await supabase.from('profiles').update({ display_name: displayName }).eq('id', user!.id));
      await supabase.auth.updateUser({ data: { display_name: displayName } });
    },
    onSuccess: () => {
      toast.success('Prénom mis à jour');
      setName(null);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: toastError,
  });

  const deleteAccount = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('delete_my_account')),
    onSuccess: async () => {
      await signOut();
      toast.success('Ton compte et tes données ont été supprimés.');
      navigate('/');
    },
    onError: toastError,
  });

  return (
    <PageShell>
      <Seo title="Mon compte" noindex />
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 pb-16 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[14px] text-dust-400">mon compte · {user?.email}</span>
            <h1 className="tt-display m-0 text-[clamp(40px,6vw,80px)] leading-none text-cream">Salut {profile?.display_name ?? ''}</h1>
          </div>
          <Button asChild size="lg"><Link to="/creer"><Plus />{myCrews?.length ? 'Nouveau road trip' : 'Créer mon road trip'}</Link></Button>
        </div>

        <section className="flex flex-col gap-3" aria-label="Mes road trips">
          <h2 className="tt-display m-0 text-[32px] text-cream">Mes road trips</h2>
          {loadingMine ? <Spinner /> : !myCrews?.length ? (
            <div className="flex flex-col items-start gap-3 rounded-[28px] border-[1.5px] border-dashed border-ink-600 p-6">
              <span className="tt-display text-[26px] text-cream">Tu pars bientôt ?</span>
              <span className="max-w-[560px] text-[16px] text-dust-300">
                Crée la page de ton road trip en 5 minutes : position en direct, trace, photos et sponsors, sur un lien privé.
                {hasAccess ? ' Ton accès est déjà réglé.' : ''}
              </span>
              <Button asChild><Link to="/creer">Créer mon road trip →</Link></Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {myCrews.map(({ crew, role }) => {
                const cover = mediaUrl(crew.cover_path);
                const live = isLive(crew.last_fix_at);
                return (
                  <Link key={crew.id} to={`/mon-compte/road-trips/${crew.slug}`} className="group flex min-h-[148px] overflow-hidden rounded-[28px] border-[1.5px] border-ink-700 bg-ink-800 text-cream hover:border-dust-600 hover:text-cream">
                    <div className="relative w-28 flex-none bg-ink-700 sm:w-36">
                      {cover && <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
                      <span className={cn('font-mono text-[13px]', live ? 'text-live-text' : 'text-signal-text')}>{live ? '● en direct' : tripStatus(crew)}</span>
                      <span className="tt-display text-[24px] leading-tight">{crew.name}</span>
                      <span className="text-[14px] text-dust-400">
                        {role === 'owner' ? 'capitaine' : 'compagnon de route'} · {formatKm(crew.total_distance_m / 1000)} · {!crew.is_public ? 'voyageurs seulement' : crew.is_listed ? 'public' : 'privé, par lien'}
                      </span>
                      <span className="mt-auto text-[15px] font-bold text-signal-text group-hover:text-cream">Ouvrir mon espace →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <Panel title="Road trips que je suis">
          {loadingFollowed ? <Spinner /> : !followed?.length ? (
            <p className="m-0 text-dust-300">Tu ne suis aucun road trip. Ouvre le lien qu’un voyageur t’a envoyé, puis « Suivre ».</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">{followed.map((c) => <CrewCard key={c.id} crew={c} />)}</div>
          )}
        </Panel>

        <Panel title="Mon prénom" description="C’est le nom que voient tes compagnons de route et tes proches.">
          <form onSubmit={(e) => { e.preventDefault(); if (name) saveName.mutate(name.trim()); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="display-name">Prénom</Label>
              <Input id="display-name" minLength={2} maxLength={60} value={name ?? profile?.display_name ?? ''} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" className="min-h-14" disabled={!name || saveName.isPending}>Enregistrer</Button>
          </form>
        </Panel>

        <Panel title="Sécurité">
          <SecuritySection />
        </Panel>

        <Panel title="Zone sensible">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={async () => { await signOut(); navigate('/'); }}><LogOut />Me déconnecter</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive">Supprimer mon compte</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer définitivement ton compte ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tes données personnelles et tes abonnements sont effacés. Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteAccount.mutate()} className="bg-destructive hover:bg-destructive/85">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
