import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Copy, KeyRound, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { Container, PageHero } from '@/components/common/Brand';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, Panel, selectClass } from '@/components/manage/shared';
import { keys } from '@/hooks/queries';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatDateTime, formatRelative } from '@/lib/format';
import { euros } from '@/lib/legal';

function Overview() {
  const { data } = useQuery({
    queryKey: ['admin', 'overview'],
    refetchInterval: 30_000,
    queryFn: async () => unwrap(await supabase.rpc('admin_overview')) as Record<string, number>,
  });
  const labels: Record<string, string> = { users: 'Comptes', crews: 'Road trips', live_crews: 'En direct', positions: 'Positions GPS', follows: 'Abonnements' };
  return (
    <dl className="m-0 grid grid-cols-2 gap-px border border-cream/[0.14] bg-cream/[0.14] md:grid-cols-5">
      {Object.entries(labels).map(([k, label]) => (
        <div key={k} className="flex flex-col-reverse gap-2 bg-ink p-5">
          <dd className="m-0 font-display text-5xl font-extrabold leading-none text-cream">{data?.[k] ?? '…'}</dd>
          <dt className="tt-kicker text-dust-400">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

function CrewsAdmin() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'crews'],
    queryFn: async () => unwrap(await supabase.rpc('admin_list_crews')),
  });
  const [devices, setDevices] = useState<Record<string, string>>({});

  const setDevice = useMutation({
    mutationFn: async ({ crewId, device }: { crewId: string; device: string }) =>
      unwrap(await supabase.rpc('admin_set_traccar_device', { p_crew: crewId, p_device: device })),
    onSuccess: () => { toast.success('Appareil Traccar enregistré'); void queryClient.invalidateQueries({ queryKey: ['admin', 'crews'] }); },
    onError: toastError,
  });

  if (isLoading) return <Spinner />;
  return (
    <Panel title={`Road trips (${data.length})`} description="Associez un road trip à un appareil du serveur Traccar (identifiant, id numérique ou nom).">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-[0.14em] text-dust-400">
            <tr><th className="py-2">Road trip</th><th>Abonnés</th><th>GPS</th><th className="min-w-[260px]">Appareil Traccar</th></tr>
          </thead>
          <tbody className="divide-y divide-cream/10">
            {data.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4">
                  <Link to={`/road-trips/${c.slug}`} className="font-display text-xl font-extrabold text-cream hover:text-primary">{c.name}</Link>
                  <p className="text-xs text-dust-500">{c.car_number ? `#${c.car_number} · ` : ''}{c.is_public ? 'Public' : 'Privé'}</p>
                </td>
                <td className="pr-4 text-dust-200">{c.followers_count}</td>
                <td className="pr-4 text-xs text-dust-300">
                  {c.last_fix_at ? formatRelative(c.last_fix_at) : '—'}
                  {c.has_device_key && <span className="ml-1" title="Clé téléphone active">📱</span>}
                </td>
                <td>
                  <form className="flex gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); setDevice.mutate({ crewId: c.id, device: devices[c.id] ?? c.traccar_device_id ?? '' }); }}>
                    <Input className="h-9" placeholder="Aucun" value={devices[c.id] ?? c.traccar_device_id ?? ''} onChange={(e) => setDevices({ ...devices, [c.id]: e.target.value })} aria-label={`Appareil Traccar de ${c.name}`} />
                    <Button size="sm" type="submit" variant="secondary">OK</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const PURCHASE_STATUS: Record<string, string> = { pending: 'En attente', paid: 'Payé', refunded: 'Remboursé' };

function PurchasesAdmin() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'purchases'],
    queryFn: async () => unwrap(await supabase.rpc('admin_list_purchases')),
  });
  const paid = data.filter((p) => p.status === 'paid' && p.source === 'stripe');
  const total = paid.reduce((sum, p) => sum + p.amount_cents - p.refunded_cents, 0);

  return (
    <div className="space-y-6">
      <Panel
        title={`Paiements (${paid.length})`}
        description={`Encaissé : ${euros(total)} (hors frais Stripe). Les remboursements se font depuis le tableau de bord Stripe.`}
      >
        {isLoading ? <Spinner /> : !data.length ? <p className="m-0 text-dust-300">Aucun achat pour l’instant.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[11px] uppercase tracking-[0.14em] text-dust-400">
                <tr><th className="py-2">Date</th><th>Compte</th><th>Montant</th><th>Statut</th><th>Road trip</th></tr>
              </thead>
              <tbody className="divide-y divide-cream/10">
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 text-xs text-dust-300">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                    <td className="pr-4 text-dust-200">{p.customer_email ?? '—'}</td>
                    <td className="pr-4 text-dust-200">
                      {p.source === 'admin' ? 'Offert'
                        : p.source === 'code' ? <>Offert · <span className="font-mono text-xs">{p.access_code ?? 'code supprimé'}</span></>
                        : p.amount_cents === 0 ? 'Code promo Stripe (0 €)' : euros(p.amount_cents)}
                      {p.refunded_cents > 0 && <span className="text-xs text-dust-500"> (−{euros(p.refunded_cents)})</span>}
                    </td>
                    <td className="pr-4 text-dust-200">{PURCHASE_STATUS[p.status] ?? p.status}</td>
                    <td>
                      {p.crew_slug ? <Link to={`/road-trips/${p.crew_slug}`} className="text-cream hover:text-primary">{p.crew_name}</Link>
                        : <span className="text-xs text-dust-500">{p.status === 'paid' ? 'Pas encore créé' : '—'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/** État lisible d'un code d'accès. */
function codeState(c: { uses: number; max_uses: number; expires_at: string | null; revoked_at: string | null }) {
  if (c.revoked_at) return { label: 'Désactivé', active: false };
  if (c.expires_at && new Date(c.expires_at) <= new Date()) return { label: 'Expiré', active: false };
  if (c.uses >= c.max_uses) return { label: 'Épuisé', active: false };
  return { label: 'Actif', active: true };
}

function AccessCodesAdmin() {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [until, setUntil] = useState('');
  const [email, setEmail] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'access-codes'],
    queryFn: async () => unwrap(await supabase.rpc('admin_list_access_codes')),
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'access-codes'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] });
  };

  const create = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.rpc('admin_create_access_code', {
        p_note: note.trim() || undefined,
        p_max_uses: Number(maxUses) || 1,
        // Valable jusqu'à la fin de la journée choisie.
        p_expires_at: until ? new Date(`${until}T23:59:59`).toISOString() : undefined,
      })),
    onSuccess: (code) => { setCreated(code); setNote(''); setMaxUses('1'); setUntil(''); refresh(); },
    onError: toastError,
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.rpc('admin_revoke_access_code', { p_id: id })),
    onSuccess: () => { toast.success('Code désactivé'); refresh(); },
    onError: toastError,
  });
  const grant = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('admin_grant_crew_access', { p_email: email.trim() })),
    onSuccess: () => {
      toast.success('Accès offert : la personne peut créer son road trip depuis « Mon compte »');
      setEmail('');
      refresh();
    },
    onError: toastError,
  });
  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success(`${code} copié`);
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Générer un code"
        description={<>La personne le saisit dans <strong className="text-cream">Mon compte</strong> (avec ou sans compte au moment où vous le lui donnez) et peut créer son road trip sans payer.</>}
      >
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_180px_auto] md:items-end" onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(); }}>
          <Field id="code-note" label="Pour qui ? (note)">
            <Input id="code-note" maxLength={200} placeholder="ex. Road trip du sponsor Dupont" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Field id="code-uses" label="Utilisations">
            <Input id="code-uses" type="number" min={1} max={500} required value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </Field>
          <Field id="code-until" label="Valable jusqu’au">
            <Input id="code-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
          <Button type="submit" disabled={create.isPending}><KeyRound />Générer</Button>
        </form>
        {created && (
          <div className="mt-5 flex flex-wrap items-center gap-4 border-l-[3px] border-live bg-live/[0.06] p-4">
            <span className="font-mono text-2xl font-bold tracking-[0.08em] text-cream">{created}</span>
            <Button size="sm" variant="secondary" onClick={() => copy(created)}><Copy />Copier</Button>
            <span className="text-xs text-dust-300">À envoyer à la personne : elle le saisit dans « Mon compte ».</span>
          </div>
        )}
      </Panel>

      <Panel title={`Codes (${data.length})`} description="Un code utilisé ne peut plus être annulé : désactivez-le pour empêcher les prochaines utilisations.">
        {isLoading ? <Spinner /> : !data.length ? <p className="m-0 text-dust-300">Aucun code pour l’instant.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[11px] uppercase tracking-[0.14em] text-dust-400">
                <tr><th className="py-2">Code</th><th>Note</th><th>Utilisé</th><th>Jusqu’au</th><th>État</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-cream/10">
                {data.map((c) => {
                  const state = codeState(c);
                  return (
                    <tr key={c.id}>
                      <td className="py-3 pr-4">
                        <button type="button" onClick={() => copy(c.code)} className="flex items-center gap-1.5 font-mono font-bold text-cream hover:text-primary" title="Copier">
                          {c.code}<Copy className="h-3.5 w-3.5 text-dust-400" />
                        </button>
                        <p className="m-0 text-xs text-dust-500">Créé le {formatDateTime(c.created_at)}</p>
                      </td>
                      <td className="pr-4 text-dust-200">{c.note ?? '—'}</td>
                      <td className="pr-4 text-dust-200">
                        {c.uses} / {c.max_uses}
                        {c.used_by.length > 0 && <p className="m-0 text-xs text-dust-500">{c.used_by.join(', ')}</p>}
                      </td>
                      <td className="pr-4 text-xs text-dust-300">{c.expires_at ? formatDateTime(c.expires_at) : 'Sans limite'}</td>
                      <td className={state.active ? 'pr-4 text-live' : 'pr-4 text-dust-500'}>{state.label}</td>
                      <td className="text-right">
                        {state.active && (
                          <Button size="sm" variant="ghost" className="hover:text-primary-light" disabled={revoke.isPending}
                            onClick={() => { if (confirm(`Désactiver ${c.code} ? Il ne pourra plus être utilisé.`)) revoke.mutate(c.id); }}>
                            <Ban />Désactiver
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Offrir à un compte existant" description="Sans code : l’accès est ajouté directement au compte qui a cet email.">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e: FormEvent) => { e.preventDefault(); grant.mutate(); }}>
          <Input type="email" required placeholder="email du compte" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email du compte" />
          <Button type="submit" disabled={grant.isPending}>Offrir l’accès</Button>
        </form>
      </Panel>
    </div>
  );
}

function UsersAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', debounced],
    queryFn: async () => unwrap(await supabase.rpc('admin_list_users', { p_search: debounced || undefined })),
  });
  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => unwrap(await supabase.rpc('admin_set_role', { p_user: id, p_role: role })),
    onSuccess: () => { toast.success('Rôle modifié'); void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    onError: toastError,
  });

  return (
    <Panel title="Comptes">
      <Input className="mb-4" placeholder="Rechercher par email ou nom…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher un compte" />
      {isLoading ? <Spinner /> : (
        <ul className="divide-y divide-cream/10">
          {data.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-extrabold leading-tight text-cream">{u.display_name} {u.role === 'admin' && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white">admin</span>}</p>
                <p className="truncate text-xs text-dust-400">{u.email} · inscrit {formatRelative(u.created_at)} · vu {formatRelative(u.last_sign_in_at)}</p>
              </div>
              {u.id !== user?.id && (
                <Button size="sm" variant="ghost" onClick={() => {
                  const role = u.role === 'admin' ? 'user' : 'admin';
                  if (confirm(role === 'admin' ? `Donner les droits admin à ${u.display_name} ?` : `Retirer les droits admin de ${u.display_name} ?`)) setRole.mutate({ id: u.id, role });
                }}>
                  {u.role === 'admin' ? 'Retirer admin' : 'Nommer admin'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function AdminPage() {
  return (
    <PageShell>
      <Seo title="Administration" noindex />
      <PageHero kicker="Direction de course" title="Administration">
        Pour les opérations avancées sur la base, utilisez Supabase Studio (voir docs/ADMINISTRATION.md).
      </PageHero>
      <Container className="max-w-6xl space-y-8 pb-16">
        <Overview />
        <Tabs defaultValue="crews">
          <TabsList className="mb-8 flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="crews">Road trips</TabsTrigger>
            <TabsTrigger value="purchases">Paiements</TabsTrigger>
            <TabsTrigger value="codes">Accès offerts</TabsTrigger>
            <TabsTrigger value="users">Comptes</TabsTrigger>
          </TabsList>
          <TabsContent value="crews"><CrewsAdmin /></TabsContent>
          <TabsContent value="purchases"><PurchasesAdmin /></TabsContent>
          <TabsContent value="codes"><AccessCodesAdmin /></TabsContent>
          <TabsContent value="users"><UsersAdmin /></TabsContent>
        </Tabs>
      </Container>
    </PageShell>
  );
}
