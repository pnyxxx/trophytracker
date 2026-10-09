import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Copy, KeyRound, Trash2 } from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import { Seo } from '@/components/common/Seo';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Panel, selectClass } from '@/components/manage/shared';
import { keys } from '@/hooks/queries';
import { useAuth } from '@/hooks/auth';
import { paymentsEnabled, supabase } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatDateTime, formatNumber, formatRelative, isLive } from '@/lib/format';
import { cn } from '@/lib/utils';
import { euros } from '@/lib/legal';

type TripRow = {
  id: string; slug: string; name: string; owner_name: string | null; owner_email: string | null; is_public: boolean; is_listed: boolean;
  is_demo: boolean; tracking_enabled: boolean; last_fix_at: string | null; total_distance_m: number; starts_on: string | null;
  ends_on: string | null; followers_count: number; has_device_key: boolean; traccar_device_id: string | null;
};
interface Dashboard {
  live: number; offline: number; preparing: number; crews: number; users: number; follows: number;
  sales_month: number; revenue_month_cents: number; codes_month: number; last_position_at: string | null;
  hourly: number[]; todo: { level: string; kind: string; slug: string | null; name: string; at: string | null; text: string }[];
}
type Status = 'live' | 'off' | 'pause' | 'prep' | 'done';
const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  live: { label: 'en direct', cls: 'bg-live/[0.16] text-live-text', dot: 'bg-live' },
  off: { label: 'hors réseau', cls: 'bg-gold/[0.16] text-gold-text', dot: 'bg-gold' },
  pause: { label: 'suivi arrêté', cls: 'bg-ink-700 text-dust-200', dot: 'bg-dust-500' },
  prep: { label: 'en préparation', cls: 'bg-ink-700 text-dust-300', dot: 'bg-dust-400' },
  done: { label: 'terminé', cls: 'bg-cream text-ink', dot: 'bg-ink' },
};
const today = () => new Date().toISOString().slice(0, 10);
function statusOf(t: TripRow): Status {
  if (isLive(t.last_fix_at)) return 'live';
  if (t.ends_on && t.ends_on < today() && !t.tracking_enabled) return 'done';
  if (t.tracking_enabled && t.last_fix_at) return 'off';
  return t.last_fix_at ? 'pause' : 'prep';
}

function useTrips() {
  return useQuery({
    queryKey: ['admin', 'trips'],
    refetchInterval: 30_000,
    queryFn: async () => unwrap(await supabase.rpc('admin_list_trips')) as TripRow[],
  });
}

function StatusPill({ s }: { s: Status }) {
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 font-mono text-[13px]', STATUS[s].cls)}>
      <span className={cn('h-2 w-2 rounded-full', STATUS[s].dot)} />{STATUS[s].label}
    </span>
  );
}

function Card({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3.5 rounded-[24px] bg-ink-800 p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="tt-display m-0 text-[22px] text-cream">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function TripsTable({ trips, filter }: { trips: TripRow[]; filter: Status | 'all' }) {
  const rows = trips.filter((t) => filter === 'all' || statusOf(t) === filter);
  if (!rows.length) return <p className="m-0 text-dust-400">Aucun road trip dans cette catégorie.</p>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
        <thead className="font-mono text-[12px] uppercase tracking-[0.1em] text-dust-400">
          <tr><th className="px-1 py-2 font-normal">Road trip</th><th className="font-normal">Statut</th><th className="font-normal">Véhicule</th><th className="font-normal">Dernier point</th><th className="text-right font-normal">Km</th></tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-t-[1.5px] border-ink-700">
              <td className="px-1 py-3">
                <Link to={`/road-trip/${t.slug}`} className="flex flex-col text-cream hover:text-cream">
                  <span className="font-bold hover:underline">{t.name}{t.is_demo ? ' · exemple' : ''}</span>
                  <span className="text-[14px] text-dust-400">{t.owner_name ?? '—'}{t.owner_email ? ` · ${t.owner_email}` : ''}</span>
                </Link>
              </td>
              <td><StatusPill s={statusOf(t)} /></td>
              <td className="font-mono text-dust-200">1{t.has_device_key || t.traccar_device_id ? '' : ' · sans GPS'}</td>
              <td className="font-mono text-[14px] text-dust-300">{t.last_fix_at ? formatRelative(t.last_fix_at) : t.starts_on ? `départ ${formatDate(t.starts_on)}` : '—'}</td>
              <td className="text-right font-mono text-dust-100">{formatNumber(t.total_distance_m / 1000)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const formatDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

function Overview() {
  const { data: d } = useQuery({
    queryKey: ['admin', 'dashboard'],
    refetchInterval: 30_000,
    queryFn: async () => unwrap(await supabase.rpc('admin_dashboard')) as unknown as Dashboard,
  });
  const { data: trips = [] } = useTrips();
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const lastMs = d?.last_position_at ? Date.now() - new Date(d.last_position_at).getTime() : null;
  const gpsOk = lastMs != null && lastMs < 15 * 60_000;
  const max = Math.max(1, ...(d?.hourly ?? [0]));
  const kpis = [
    { l: 'en direct', v: formatNumber(d?.live), dsc: `${formatNumber(d?.crews)} road trips en tout` },
    { l: 'hors réseau', v: formatNumber(d?.offline), dsc: 'normal en zone isolée' },
    { l: 'en préparation', v: formatNumber(d?.preparing), dsc: 'pas encore partis' },
    { l: 'proches abonnés', v: formatNumber(d?.follows), dsc: `${formatNumber(d?.users)} comptes` },
    { l: 'ventes · mois', v: euros(d?.revenue_month_cents ?? 0), dsc: `${d?.sales_month ?? 0} accès payés · ${d?.codes_month ?? 0} offerts` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[14px] text-dust-400">{new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
          <h1 className="tt-display m-0 text-[clamp(36px,4.5vw,60px)] leading-none text-cream">Vue d’ensemble</h1>
        </div>
        <span className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-[14px]', gpsOk ? 'bg-live/[0.16] text-live-text' : 'bg-gold/[0.16] text-gold-text')}>
          <span className={cn('h-2 w-2 rounded-full', gpsOk ? 'bg-live' : 'bg-gold')} />
          {d?.last_position_at ? `réception GPS · dernier point ${formatRelative(d.last_position_at)}` : 'aucun point GPS reçu'}
        </span>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.l} className="flex flex-col gap-1 rounded-[20px] bg-ink-800 px-4 py-3.5">
            <dt className="font-mono text-[12px] uppercase tracking-[0.1em] text-dust-400">{k.l}</dt>
            <dd className="m-0 font-mono text-[30px] text-cream">{k.v}</dd>
            <span className="text-[13px] text-dust-400">{k.dsc}</span>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Card
          title="Road trips"
          aside={
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-ink p-1" role="group" aria-label="Filtrer">
              {([['all', 'Tous'], ['live', 'En direct'], ['off', 'Hors réseau'], ['prep', 'Préparation'], ['done', 'Terminés']] as const).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
                  className={cn('min-h-9 flex-none whitespace-nowrap rounded-full px-3 text-[14px] font-bold', filter === k ? 'bg-cream text-ink' : 'text-dust-200 hover:text-white')}>{label}</button>
              ))}
            </div>
          }
        >
          <TripsTable trips={trips} filter={filter} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Points GPS reçus · 24 h">
            <div className="flex h-[110px] items-end gap-[3px]" role="img" aria-label={`Points reçus par heure sur 24 heures, au plus ${max} en une heure`}>
              {(d?.hourly ?? Array(24).fill(0)).map((n, i) => (
                <span key={i} className={cn('flex-1 rounded-t-[3px]', i === 23 ? 'bg-signal' : 'bg-signal/45')} style={{ height: `${Math.max(3, (n / max) * 100)}%` }} title={`${n} points`} />
              ))}
            </div>
            <div className="flex justify-between font-mono text-[12px] text-dust-400"><span>il y a 24 h</span><span>maintenant</span></div>
          </Card>
          <Card title="À traiter">
            {!d?.todo.length ? <p className="m-0 text-[15px] text-dust-400">Rien à signaler.</p> : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {d.todo.slice(0, 8).map((t, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-2xl bg-ink px-3.5 py-3">
                    <span className={cn('h-2.5 w-2.5 flex-none rounded-full', t.level === '1' ? 'bg-signal' : t.level === '2' ? 'bg-gold' : 'bg-dust-400')} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-bold text-cream">{t.name}</span>
                      <span className="text-[14px] text-dust-400">{t.text}</span>
                    </span>
                    {t.slug && <Link to={`/road-trip/${t.slug}`} className="whitespace-nowrap text-[14px] font-bold text-signal-text hover:text-cream">Voir</Link>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Services">
            <dl className="m-0 flex flex-col gap-2 text-[15px]">
              {[
                ['Base de données', d ? 'opérationnelle' : '…', !!d],
                ['Réception GPS', d?.last_position_at ? `dernier point ${formatRelative(d.last_position_at)}` : 'aucun point', gpsOk],
                ['Paiement en ligne', paymentsEnabled ? 'ouvert (Stripe)' : 'fermé', paymentsEnabled],
                ['Fonds de carte', 'IGN, Esri, OpenFreeMap', true],
              ].map(([n, v, ok]) => (
                <div key={String(n)} className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-3.5 py-2.5">
                  <dt className="text-dust-200">{n}</dt>
                  <dd className={cn('m-0 text-right font-mono text-[13px]', ok ? 'text-live-text' : 'text-gold-text')}>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Road trips : tous, avec l'association à un appareil du serveur Traccar (boîtier GPS). */
function CrewsAdmin() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useTrips();
  const [devices, setDevices] = useState<Record<string, string>>({});
  const setDevice = useMutation({
    mutationFn: async ({ crewId, device }: { crewId: string; device: string }) =>
      unwrap(await supabase.rpc('admin_set_traccar_device', { p_crew: crewId, p_device: device })),
    onSuccess: () => { toast.success('Appareil Traccar enregistré'); void queryClient.invalidateQueries({ queryKey: ['admin', 'trips'] }); },
    onError: toastError,
  });

  if (isLoading) return <Spinner />;
  return (
    <Panel title={`Road trips (${data.length})`} description="Associe un road trip à un appareil du serveur Traccar (identifiant, id numérique ou nom) s'il voyage avec un boîtier GPS.">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="font-mono text-[12px] uppercase tracking-[0.1em] text-dust-400">
            <tr><th className="px-1 py-2 font-normal">Road trip</th><th className="font-normal">Statut</th><th className="font-normal">Abonnés</th><th className="font-normal">Téléphone</th><th className="min-w-[260px] font-normal">Appareil Traccar</th></tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-t-[1.5px] border-ink-700">
                <td className="px-1 py-3 pr-4">
                  <Link to={`/road-trip/${c.slug}`} className="font-bold text-cream hover:underline">{c.name}</Link>
                  <p className="m-0 text-[13px] text-dust-500">{c.owner_email ?? '—'} · {!c.is_public ? 'voyageurs seulement' : c.is_listed ? 'public' : 'par lien'}</p>
                </td>
                <td className="pr-4"><StatusPill s={statusOf(c)} /></td>
                <td className="pr-4 font-mono text-dust-200">{c.followers_count}</td>
                <td className="pr-4 font-mono text-[13px] text-dust-300">{c.has_device_key ? 'relié' : '—'}</td>
                <td>
                  <form className="flex gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); setDevice.mutate({ crewId: c.id, device: devices[c.id] ?? c.traccar_device_id ?? '' }); }}>
                    <Input className="min-h-11" placeholder="Aucun" value={devices[c.id] ?? c.traccar_device_id ?? ''} onChange={(e) => setDevices({ ...devices, [c.id]: e.target.value })} aria-label={`Appareil Traccar de ${c.name}`} />
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
                      {p.crew_slug ? <Link to={`/road-trip/${p.crew_slug}`} className="text-cream hover:text-primary">{p.crew_name}</Link>
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
      toast.success('Accès offert : la personne peut créer son road trip (« Créer mon trip »)');
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
        description={<>La personne le saisit à l’étape « Accès » du parcours <strong className="text-cream">Créer mon trip</strong> et crée son road trip sans payer.</>}
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
            <span className="text-xs text-dust-300">À envoyer à la personne : elle le saisit à l’étape « Accès » de « Créer mon trip ».</span>
          </div>
        )}
      </Panel>

      <Panel title={`Codes (${data.length})`} description="Un code utilisé ne peut plus être annulé : désactive-le pour empêcher les prochaines utilisations.">
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
                <p className="m-0 font-bold text-cream">{u.display_name} {u.role === 'admin' && <span className="ml-1 rounded-full bg-signal px-2 py-0.5 font-mono text-[11px] text-white">admin</span>}</p>
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

const SECTIONS = [
  { id: 'vue', label: 'Vue d’ensemble' },
  { id: 'trips', label: 'Road trips' },
  { id: 'paiements', label: 'Paiements' },
  { id: 'codes', label: 'Accès offerts' },
  { id: 'comptes', label: 'Comptes' },
] as const;
type AdminSection = (typeof SECTIONS)[number]['id'];

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('section');
  const section: AdminSection = SECTIONS.some((x) => x.id === raw) ? (raw as AdminSection) : 'vue';
  const go = (s: AdminSection) => { setParams(s === 'vue' ? {} : { section: s }, { replace: true }); window.scrollTo(0, 0); };
  const nav = (mobile: boolean) => SECTIONS.map((x) => (
    <button key={x.id} type="button" onClick={() => go(x.id)} aria-current={section === x.id ? 'page' : undefined}
      className={cn('font-bold', mobile ? 'min-h-11 flex-none whitespace-nowrap rounded-full px-4 text-[15px]' : 'min-h-[44px] rounded-[14px] px-3 text-left text-[16px]',
        section === x.id ? 'bg-signal text-white' : mobile ? 'bg-ink-800 text-dust-100' : 'text-dust-100 hover:bg-ink-800 hover:text-white')}>
      {x.label}
    </button>
  ));

  return (
    <div className="min-h-screen bg-ink text-cream lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <Seo title="Administration" noindex />
      <aside className="sticky top-0 hidden h-screen flex-col gap-5 border-r-[1.5px] border-ink-700 bg-ink-900 px-3.5 py-5 lg:flex">
        <Link to="/" aria-label="trophytracker, accueil" className="flex items-center gap-[9px] px-2 text-cream hover:text-cream"><LogoMark /><Wordmark /></Link>
        <span className="px-3 font-mono text-[13px] text-signal-text">admin</span>
        <nav aria-label="Administration" className="flex flex-col gap-1">{nav(false)}</nav>
        <p className="mt-auto px-3 text-[13px] leading-relaxed text-dust-500">Opérations avancées : Supabase Studio (docs/ADMINISTRATION.md).</p>
        <Link to="/mon-compte" className="px-3 text-[14px] font-bold text-dust-300 hover:text-white">← Mon compte</Link>
      </aside>
      <div className="sticky top-0 z-[900] flex flex-col gap-2.5 border-b-[1.5px] border-ink-700 bg-ink/[0.94] px-4 py-3 backdrop-blur-[14px] lg:hidden">
        <div className="flex items-center gap-2.5"><Link to="/" aria-label="trophytracker, accueil"><LogoMark /></Link><span className="font-mono text-[13px] text-signal-text">admin</span></div>
        <nav aria-label="Administration" className="-mx-4 flex gap-1.5 overflow-x-auto px-4">{nav(true)}</nav>
      </div>
      <main id="contenu" className="min-w-0 px-4 py-6 lg:px-9 lg:py-8">
        {section === 'vue' && <Overview />}
        {section === 'trips' && <CrewsAdmin />}
        {section === 'paiements' && <PurchasesAdmin />}
        {section === 'codes' && <AccessCodesAdmin />}
        {section === 'comptes' && <UsersAdmin />}
      </main>
    </div>
  );
}
