import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Settings } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CrewAvatar, CrewCard } from '@/components/crew/CrewBits';
import { SecuritySection } from '@/components/account/SecuritySection';
import { useAuth } from '@/hooks/auth';
import { useFollowedCrews, useMyCrews } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatRelative } from '@/lib/format';

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CreateCrewDialog() {
  const [open, setOpen] = useState(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Créer un équipage</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvel équipage</DialogTitle></DialogHeader>
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
  const [name, setName] = useState<string | null>(null);

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
    <PageShell>
      <Seo title="Mon compte" />
      <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
        <div>
          <h1 className="text-4xl font-bold text-white">Bonjour {profile?.display_name ?? ''} 👋</h1>
          <p className="text-white/60">{user?.email}</p>
        </div>

        <Card title="Équipages suivis">
          {loadingFollowed ? <Spinner /> : !followed?.length ? (
            <p className="text-white/60">
              Vous ne suivez aucun équipage. <Link to="/equipages" className="text-primary hover:underline">Trouver un équipage →</Link>
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">{followed.map((c) => <CrewCard key={c.id} crew={c} />)}</div>
          )}
        </Card>

        <Card title="Mes équipages" action={<CreateCrewDialog />}>
          {loadingMine ? <Spinner /> : !myCrews?.length ? (
            <p className="text-white/60">Vous participez au raid ? Créez la page de votre équipage pour la partager à vos proches et sponsors.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {myCrews.map(({ crew, role }) => (
                <li key={crew.id} className="flex items-center gap-4 py-4">
                  <CrewAvatar name={crew.name} path={crew.avatar_path} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/equipages/${crew.slug}`} className="font-semibold text-white hover:text-primary">{crew.name}</Link>
                    <p className="text-xs text-white/50">
                      {role === 'owner' ? 'Propriétaire' : 'Membre'} · {crew.is_public ? 'Public' : 'Privé'} · GPS {crew.last_fix_at ? formatRelative(crew.last_fix_at) : 'jamais reçu'}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="secondary">
                    <Link to={`/mon-compte/equipages/${crew.slug}`}><Settings className="mr-1.5 h-4 w-4" />Gérer</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Profil">
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
        </Card>

        <Card title="Sécurité">
          <SecuritySection />
        </Card>

        <Card title="Zone sensible">
          <p className="mb-4 text-sm text-white/60">
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
                <AlertDialogAction onClick={() => deleteAccount.mutate()} className="bg-destructive hover:bg-destructive/90">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </div>
    </PageShell>
  );
}
