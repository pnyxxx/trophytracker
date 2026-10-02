import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, CircleCheck, Flag, Plus, Satellite, Settings, Share2, Users } from 'lucide-react';
import { Container, PageHero } from '@/components/common/Brand';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CrewAvatar, CrewCard } from '@/components/crew/CrewBits';
import { SecuritySection } from '@/components/account/SecuritySection';
import { CrewAccessPurchase } from '@/components/account/CrewAccessPurchase';
import { useAuth } from '@/hooks/auth';
import { useFollowedCrews, useMyCrews } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatRelative } from '@/lib/format';

/** La suite après le paiement, montrée dans la fenêtre de bienvenue. */
const NEXT_STEPS = [
  { icon: Flag, title: 'Créer la page de l’équipage', text: 'Un nom, et c’est parti. Le reste se complète quand vous voulez.' },
  { icon: Users, title: 'Inviter vos coéquipiers', text: 'Onglet « Membres » : ils rejoignent la page gratuitement.' },
  { icon: Satellite, title: 'Brancher le GPS', text: 'Onglet « GPS » : un téléphone dans la 4L suffit, on vous guide pas à pas.' },
  { icon: Share2, title: 'Partager avec vos proches', text: 'Onglet « QR code » : le lien à envoyer à la famille et aux sponsors.' },
];

/**
 * Création de l'équipage. Au retour de Stripe (`welcome`), la fenêtre s'ouvre
 * d'abord sur un remerciement et la suite en quelques étapes, puis le formulaire.
 */
function CreateCrewDialog({ welcome = false, onClose }: { welcome?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(welcome);
  const [step, setStep] = useState<'welcome' | 'form'>(welcome ? 'welcome' : 'form');
  const [form, setForm] = useState({ name: '', car: '', tagline: '' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.rpc('create_crew', { p_name: form.name.trim(), p_car_number: form.car.trim(), p_tagline: form.tagline.trim() })),
    onSuccess: (crew) => {
      toast.success('Équipage créé ! Complétez maintenant sa page.');
      void queryClient.invalidateQueries({ queryKey: ['my-crews'] });
      setOpen(false);
      navigate(`/mon-compte/equipages/${crew.slug}`);
    },
    onError: toastError,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) { setStep('form'); onClose?.(); }
      }}
    >
      <DialogTrigger asChild>
        <Button><Plus />Créer mon équipage</Button>
      </DialogTrigger>
      <DialogContent>
        {step === 'welcome' ? (
          <>
            <DialogHeader>
              <p className="tt-kicker m-0 flex items-center justify-center gap-2 text-live sm:justify-start">
                <CircleCheck className="h-4 w-4" />Paiement reçu
              </p>
              <DialogTitle className="font-display text-4xl font-black uppercase leading-none">Merci, et bienvenue&nbsp;!</DialogTitle>
              <DialogDescription className="text-dust-300">
                Votre accès équipage est activé. Stripe vous envoie le reçu par email. Voici la suite :
              </DialogDescription>
            </DialogHeader>
            <ol className="m-0 list-none space-y-3 p-0">
              {NEXT_STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-cream/15 text-ochre">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-cream">{i + 1}. {title}</strong>
                    <span className="text-xs leading-relaxed text-dust-400">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Button className="w-full" onClick={() => setStep('form')}>Créer mon équipage<ArrowRight /></Button>
          </>
        ) : (
          <>
            <DialogHeader><DialogTitle>Mon équipage</DialogTitle></DialogHeader>
            <form
              onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(); }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="crew-name">Nom de l'équipage</Label>
                <Input id="crew-name" required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crew-car">Numéro d'équipage <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input id="crew-car" maxLength={10} value={form.car} onChange={(e) => setForm({ ...form, car: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crew-tagline">Slogan <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input id="crew-tagline" maxLength={140} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? 'Création…' : 'Créer'}</Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AccountPage() {
  const { user, profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: followed, isLoading: loadingFollowed } = useFollowedCrews();
  const { data: myCrews, isLoading: loadingMine } = useMyCrews();
  const myCrew = myCrews?.[0];
  const [name, setName] = useState<string | null>(null);

  // Accès équipage payé et pas encore utilisé ? Au retour de Stripe (?paiement=ok), on
  // réinterroge quelques secondes le temps que Stripe confirme le paiement au serveur.
  const [params, setParams] = useSearchParams();
  const payment = params.get('paiement');
  const [waitingSince] = useState(() => (payment === 'ok' ? Date.now() : 0));
  const { data: hasAccess, isLoading: loadingAccess } = useQuery({
    queryKey: ['crew-access', user?.id],
    queryFn: async () =>
      unwrap(await supabase.from('crew_purchases').select('id').eq('status', 'paid').is('used_at', null).limit(1)).length > 0,
    refetchInterval: (q) => (payment === 'ok' && !q.state.data && Date.now() - waitingSince < 60_000 ? 2_000 : false),
  });
  useEffect(() => {
    if (payment !== 'annule') return;
    toast('Paiement annulé : rien n’a été débité.');
    setParams({}, { replace: true });
  }, [payment, setParams]);

  const saveName = useMutation({
    mutationFn: async (displayName: string) => {
      unwrap(await supabase.from('profiles').update({ display_name: displayName }).eq('id', user!.id));
      // Garde aussi le nom dans les métadonnées du compte.
      await supabase.auth.updateUser({ data: { display_name: displayName } });
    },
    onSuccess: () => {
      toast.success('Nom mis à jour');
      setName(null);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: toastError,
  });

  const deleteAccount = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('delete_my_account')),
    onSuccess: async () => {
      await signOut();
      toast.success('Votre compte et vos données ont été supprimés.');
      navigate('/');
    },
    onError: toastError,
  });

  return (
    <PageShell padTop={false}>
      <Seo title="Mon compte" noindex />
      <PageHero kicker={<>Mon compte · <span className="normal-case tracking-normal text-dust-300">{user?.email}</span></>} title={<>Bonjour<br />{profile?.display_name ?? ''}</>} />
      <Container className="max-w-5xl space-y-6 border-t border-cream/[0.12] py-12 md:py-16">

        {/* Un compte = un seul équipage (règle garantie par la base) */}
        <Panel title="Mon équipage">
          {loadingMine || loadingAccess ? <Spinner /> : !myCrew && (hasAccess || profile?.role === 'admin') ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="m-0 max-w-[520px] text-dust-300">
                {payment === 'ok' ? <><strong className="text-cream">Paiement reçu, merci !</strong> </> : null}
                Votre accès équipage est prêt : créez la page de votre équipage. Vos coéquipiers la rejoindront ensuite par
                invitation, gratuitement.
              </p>
              <CreateCrewDialog welcome={payment === 'ok'} onClose={() => setParams({}, { replace: true })} />
            </div>
          ) : !myCrew && payment === 'ok' ? (
            <div className="flex items-center gap-3 text-dust-200">
              <Spinner />
              Paiement en cours de confirmation… Cela prend quelques secondes. Si rien ne se passe, rechargez la page.
            </div>
          ) : !myCrew ? (
            <CrewAccessPurchase />
          ) : (
            <div className="flex flex-wrap items-center gap-5">
              <CrewAvatar name={myCrew.crew.name} path={myCrew.crew.avatar_path} className="h-16 w-16 text-2xl" />
              <div className="min-w-0 flex-1">
                <Link to={`/equipages/${myCrew.crew.slug}`} className="font-display text-3xl font-black uppercase leading-none text-cream hover:text-primary">
                  {myCrew.crew.name}
                </Link>
                <p className="mb-0 mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-dust-400">
                  {myCrew.role === 'owner' ? 'Propriétaire' : 'Membre'} · {myCrew.crew.is_public ? 'Public' : 'Privé'} · GPS {myCrew.crew.last_fix_at ? formatRelative(myCrew.crew.last_fix_at) : 'jamais reçu'}
                </p>
                {!myCrew.crew.tracking_enabled && (
                  <p className="mb-0 mt-2 text-xs text-dust-300">
                    <span className="text-ochre">Suivi GPS arrêté (mode essai).</span>{' '}
                    <Link to={`/mon-compte/equipages/${myCrew.crew.slug}?onglet=gps`} className="underline hover:text-cream">Le lancer en partant</Link>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to={`/equipages/${myCrew.crew.slug}`}>Voir la page</Link>
                </Button>
                <Button asChild>
                  <Link to={`/mon-compte/equipages/${myCrew.crew.slug}`}><Settings />Gérer</Link>
                </Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Équipages suivis">
          {loadingFollowed ? <Spinner /> : !followed?.length ? (
            <p className="text-dust-300">
              Vous ne suivez aucun équipage. <Link to="/equipages" className="text-primary hover:underline">Trouver un équipage →</Link>
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">{followed.map((c) => <CrewCard key={c.id} crew={c} />)}</div>
          )}
        </Panel>


        <Panel title="Profil">
          <form
            onSubmit={(e) => { e.preventDefault(); if (name) saveName.mutate(name.trim()); }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="display-name">Nom affiché</Label>
              <Input id="display-name" minLength={2} maxLength={60} value={name ?? profile?.display_name ?? ''} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" disabled={!name || saveName.isPending}>Enregistrer</Button>
          </form>
        </Panel>

        <Panel title="Sécurité">
          <SecuritySection />
        </Panel>

        <Panel title="Zone sensible">
          <p className="mb-4 text-sm text-dust-300">
            La suppression de votre compte efface définitivement vos données personnelles et vos abonnements.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive">Supprimer mon compte</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteAccount.mutate()} className="bg-destructive hover:bg-destructive/85">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Panel>
      </Container>
    </PageShell>
  );
}
