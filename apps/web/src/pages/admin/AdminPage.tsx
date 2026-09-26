import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { Container, PageHero } from '@/components/common/Brand';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, Panel, selectClass } from '@/components/manage/shared';
import { WAYPOINT_STYLE, waypointStyle, type WaypointKind } from '@/components/crew/mapIcons';
import { keys, useEvent } from '@/hooks/queries';
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
  const labels: Record<string, string> = { users: 'Comptes', crews: 'Équipages', live_crews: 'En direct', positions: 'Positions GPS', follows: 'Abonnements' };
  return (
    <dl className="m-0 grid grid-cols-2 gap-px border border-cream/[0.14] bg-cream/[0.14] md:grid-cols-5">
      {Object.entries(labels).map(([k, label]) => (
        <div key={k} className="flex flex-col-reverse gap-2 bg-ink p-5">
          <dd className="m-0 font-display text-5xl font-black leading-none text-cream">{data?.[k] ?? '…'}</dd>
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
    <Panel title={`Équipages (${data.length})`} description="Associez un équipage à un appareil du serveur Traccar (identifiant, id numérique ou nom).">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-[0.14em] text-dust-400">
            <tr><th className="py-2">Équipage</th><th>Abonnés</th><th>GPS</th><th className="min-w-[260px]">Appareil Traccar</th></tr>
          </thead>
          <tbody className="divide-y divide-cream/10">
            {data.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4">
                  <Link to={`/equipages/${c.slug}`} className="font-display text-xl font-extrabold uppercase text-cream hover:text-primary">{c.name}</Link>
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
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'purchases'],
    queryFn: async () => unwrap(await supabase.rpc('admin_list_purchases')),
  });
  const grant = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('admin_grant_crew_access', { p_email: email.trim() })),
    onSuccess: () => {
      toast.success('Accès offert : la personne peut créer son équipage depuis « Mon compte »');
      setEmail('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'purchases'] });
    },
    onError: toastError,
  });
  const paid = data.filter((p) => p.status === 'paid' && p.source === 'stripe');
  const total = paid.reduce((sum, p) => sum + p.amount_cents - p.refunded_cents, 0);

  return (
    <div className="space-y-6">
      <Panel title="Offrir un accès équipage" description="Pour un partenaire, un test ou un geste : la personne doit déjà avoir un compte.">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e: FormEvent) => { e.preventDefault(); grant.mutate(); }}>
          <Input type="email" required placeholder="email du compte" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email du compte" />
          <Button type="submit" disabled={grant.isPending}>Offrir l’accès</Button>
        </form>
      </Panel>
      <Panel
        title={`Paiements (${paid.length})`}
        description={`Encaissé : ${euros(total)} (hors frais Stripe). Les remboursements se font depuis le tableau de bord Stripe.`}
      >
        {isLoading ? <Spinner /> : !data.length ? <p className="m-0 text-dust-300">Aucun achat pour l’instant.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[11px] uppercase tracking-[0.14em] text-dust-400">
                <tr><th className="py-2">Date</th><th>Compte</th><th>Montant</th><th>Statut</th><th>Équipage</th></tr>
              </thead>
              <tbody className="divide-y divide-cream/10">
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 text-xs text-dust-300">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                    <td className="pr-4 text-dust-200">{p.customer_email ?? '—'}</td>
                    <td className="pr-4 text-dust-200">
                      {p.source === 'admin' ? 'Offert' : euros(p.amount_cents)}
                      {p.refunded_cents > 0 && <span className="text-xs text-dust-500"> (−{euros(p.refunded_cents)})</span>}
                    </td>
                    <td className="pr-4 text-dust-200">{PURCHASE_STATUS[p.status] ?? p.status}</td>
                    <td>
                      {p.crew_slug ? <Link to={`/equipages/${p.crew_slug}`} className="text-cream hover:text-primary">{p.crew_name}</Link>
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
                <p className="font-display text-xl font-extrabold uppercase leading-tight text-cream">{u.display_name} {u.role === 'admin' && <span className="ml-1 rounded-[3px] bg-primary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white">admin</span>}</p>
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

const emptyWaypoint = { kind: 'stage' as WaypointKind, name: '', description: '', country: '', lat: '', lon: '', sort_order: '' };

function RouteAdmin() {
  const { data: event } = useEvent();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyWaypoint);
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.event });

  const add = useMutation({
    mutationFn: async () => {
      const lat = Number(form.lat), lon = Number(form.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Coordonnées invalides');
      unwrap(await supabase.from('waypoints').insert({
        kind: form.kind, name: form.name.trim(), description: form.description.trim() || null,
        country: form.country.trim() || null, lat, lon,
        sort_order: form.sort_order ? Number(form.sort_order) : ((event?.waypoints.at(-1)?.sort_order ?? 0) + 10),
      }));
    },
    onSuccess: () => { toast.success('Point ajouté'); setForm(emptyWaypoint); void refresh(); },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('waypoints').delete().eq('id', id)),
    onSuccess: () => { void refresh(); },
    onError: toastError,
  });

  return (
    <Panel title="Parcours prévu" description="Points affichés sur toutes les cartes et dans « La route », dans l’ordre croissant.">
      <ul className="mb-6 divide-y divide-cream/10">
        {event?.waypoints.map((w) => (
          <li key={w.id} className="flex items-center gap-3 py-2">
            <span className="w-10 text-xs text-dust-500">{w.sort_order}</span>
            <span className="text-xl">{waypointStyle(w.kind).emoji}</span>
            <span className="flex-1 text-cream">{w.name} <span className="text-xs text-dust-500">{w.country} · {w.lat.toFixed(3)}, {w.lon.toFixed(3)}</span></span>
            <Button size="icon" variant="ghost" className="hover:text-primary-light" aria-label={`Supprimer ${w.name}`}
              onClick={() => { if (confirm(`Supprimer ${w.name} ?`)) remove.mutate(w.id); }}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); add.mutate(); }} className="grid gap-3 md:grid-cols-4">
        <Field id="w-kind" label="Type">
          <select id="w-kind" className={selectClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as WaypointKind })}>
            {Object.entries(WAYPOINT_STYLE).map(([k, s]) => <option key={k} value={k}>{s.emoji} {s.label}</option>)}
          </select>
        </Field>
        <Field id="w-name" label="Nom"><Input id="w-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field id="w-lat" label="Latitude"><Input id="w-lat" required inputMode="decimal" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></Field>
        <Field id="w-lon" label="Longitude"><Input id="w-lon" required inputMode="decimal" value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} /></Field>
        <Field id="w-country" label="Pays"><Input id="w-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        <Field id="w-desc" label="Description"><Input id="w-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field id="w-order" label="Ordre"><Input id="w-order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="auto" /></Field>
        <div className="flex items-end"><Button type="submit" className="w-full" disabled={add.isPending}>Ajouter</Button></div>
      </form>
    </Panel>
  );
}

function SettingsAdmin() {
  const { data: event } = useEvent();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ event_name: '', event_start_date: '', event_end_date: '', event_total_km: '' });
  useEffect(() => {
    if (event) setForm({
      event_name: event.name, event_start_date: event.startDate ?? '', event_end_date: event.endDate ?? '',
      event_total_km: event.totalKm?.toString() ?? '',
    });
  }, [event]);

  const save = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(form) as [keyof typeof form, string][];
      const toUpsert = entries.filter(([, v]) => v.trim()).map(([key, value]) => ({ key, value: value.trim() }));
      const toDelete = entries.filter(([, v]) => !v.trim()).map(([key]) => key);
      if (toUpsert.length) unwrap(await supabase.from('settings').upsert(toUpsert));
      if (toDelete.length) unwrap(await supabase.from('settings').delete().in('key', toDelete));
    },
    onSuccess: () => { toast.success('Réglages enregistrés'); void queryClient.invalidateQueries({ queryKey: keys.event }); },
    onError: toastError,
  });

  return (
    <Panel title="Édition en cours">
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 md:grid-cols-2">
        <Field id="e-name" label="Nom de l’événement"><Input id="e-name" value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} placeholder="4L Trophy 2027" /></Field>
        <Field id="e-km" label="Distance totale (km)"><Input id="e-km" type="number" value={form.event_total_km} onChange={(e) => setForm({ ...form, event_total_km: e.target.value })} /></Field>
        <Field id="e-start" label="Date de départ" hint="Active le compte à rebours et le compteur de jours."><Input id="e-start" type="date" value={form.event_start_date} onChange={(e) => setForm({ ...form, event_start_date: e.target.value })} /></Field>
        <Field id="e-end" label="Date d’arrivée"><Input id="e-end" type="date" value={form.event_end_date} onChange={(e) => setForm({ ...form, event_end_date: e.target.value })} /></Field>
        <div className="md:col-span-2"><Button type="submit" disabled={save.isPending}>Enregistrer</Button></div>
      </form>
    </Panel>
  );
}

export default function AdminPage() {
  return (
    <PageShell padTop={false}>
      <Seo title="Administration" />
      <PageHero kicker="Direction de course" title="Administration">
        Pour les opérations avancées sur la base, utilisez Supabase Studio (voir docs/ADMINISTRATION.md).
      </PageHero>
      <Container className="max-w-6xl space-y-8 pb-16">
        <Overview />
        <Tabs defaultValue="crews">
          <TabsList className="mb-8 flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="crews">Équipages</TabsTrigger>
            <TabsTrigger value="purchases">Paiements</TabsTrigger>
            <TabsTrigger value="users">Comptes</TabsTrigger>
            <TabsTrigger value="route">Parcours</TabsTrigger>
            <TabsTrigger value="settings">Réglages</TabsTrigger>
          </TabsList>
          <TabsContent value="crews"><CrewsAdmin /></TabsContent>
          <TabsContent value="purchases"><PurchasesAdmin /></TabsContent>
          <TabsContent value="users"><UsersAdmin /></TabsContent>
          <TabsContent value="route"><RouteAdmin /></TabsContent>
          <TabsContent value="settings"><SettingsAdmin /></TabsContent>
        </Tabs>
      </Container>
    </PageShell>
  );
}
