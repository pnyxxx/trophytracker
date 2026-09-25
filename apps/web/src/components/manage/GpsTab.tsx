/**
 * Onglet GPS : guide pas à pas pour transformer un téléphone en balise avec
 * l'appli gratuite Traccar Client (réglage par QR code ou à la main), et suivi
 * en direct de la réception des positions.
 */
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, KeyRound, QrCode as QrCodeIcon, ShieldOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QrCode } from '@/components/common/QrCode';
import { LiveDot } from '@/components/common/Brand';
import { keys } from '@/hooks/queries';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatDateTime, formatRelative, isLive } from '@/lib/format';
import { ingestAddress } from '@/lib/ingest';
import { cn } from '@/lib/utils';
import { Panel } from './shared';

// MapLibre n'est chargé qu'à l'ouverture de l'onglet GPS.
const GpsCheckMap = lazy(() => import('./GpsCheckMap'));

/** Réglages conseillés pour le raid (repris dans le tableau ET dans le QR code). */
const SETTINGS = { accuracy: 'high', distance: 50, heartbeat: 300, buffer: true, stopDetection: true };

/**
 * Texte du QR code « Settings → icône QR » de Traccar Client (v10).
 * L'appli prend l'adresse sans ses paramètres comme « Server URL », puis applique
 * id, accuracy, distance, heartbeat, buffer et stop_detection (booléens en "true"/"false").
 * Le mot de passe, lui, ne peut pas être transmis par QR code.
 */
function traccarConfigLink(serverUrl: string, key: string) {
  const params = new URLSearchParams({
    id: key,
    accuracy: SETTINGS.accuracy,
    distance: String(SETTINGS.distance),
    heartbeat: String(SETTINGS.heartbeat),
    buffer: String(SETTINGS.buffer),
    stop_detection: String(SETTINGS.stopDetection),
  });
  return `${serverUrl}?${params.toString()}`;
}

const STORES = [
  { label: 'Android · Google Play', href: 'https://play.google.com/store/apps/details?id=org.traccar.client' },
  { label: 'iPhone · App Store', href: 'https://apps.apple.com/app/traccar-client/id843156974' },
];

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copier ${label}`}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        toast.success(`${label} copié`);
        setTimeout(() => setDone(false), 1500);
      }}
      className="shrink-0 rounded-[3px] p-1.5 text-dust-300 hover:bg-cream/10 hover:text-cream"
    >
      {done ? <Check className="h-4 w-4 text-live" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

/** Valeur à saisir, en mono ; copiable si c'est un texte à recopier. */
function Value({ children, copy, label, tone = 'plain' }: { children: ReactNode; copy?: string; label?: string; tone?: 'plain' | 'secret' | 'on' | 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-[4px] border px-2.5 py-1.5 font-mono text-[13px]',
        tone === 'secret' && 'border-primary/60 bg-primary/10 text-cream',
        tone === 'plain' && 'border-cream/15 bg-black/30 text-cream',
        tone === 'on' && 'border-live/40 bg-live/10 font-bold text-live',
        tone === 'muted' && 'border-cream/10 text-dust-400',
      )}
    >
      <span className="break-all">{children}</span>
      {copy && <CopyButton value={copy} label={label ?? 'Valeur'} />}
    </span>
  );
}

/** Une ligne du tableau des réglages : nom exact dans l'appli, valeur, explication. */
function SettingRow({ name, fr, value, why, must }: { name: string; fr: string; value: ReactNode; why: ReactNode; must?: boolean }) {
  return (
    <li className="grid gap-x-6 gap-y-2 border-b border-cream/[0.08] py-4 last:border-b-0 md:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <p className="m-0 font-mono text-[13px] font-bold text-cream">{name}</p>
        <p className="m-0 mt-0.5 text-xs text-dust-400">{fr}</p>
        {must && (
          <span className="mt-1.5 inline-block rounded-[3px] bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white">
            À changer
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        {value}
        <p className="m-0 text-sm leading-relaxed text-dust-300">{why}</p>
      </div>
    </li>
  );
}

/** Étape numérotée façon roadbook. */
function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border border-cream/[0.14] bg-ink-800 p-6 md:grid-cols-[88px_minmax(0,1fr)] md:p-8">
      <span className="font-stencil text-[64px] font-black leading-[0.85] text-primary md:text-[80px]">{n}</span>
      <div className="min-w-0">
        <h2 className="m-0 mb-4 font-display text-[32px] font-black uppercase leading-none text-cream md:text-[38px]">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function GpsTab({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);
  const address = ingestAddress();

  const { data: tracking } = useQuery({
    queryKey: keys.tracking(crew.id),
    queryFn: async () => unwrap(await supabase.rpc('get_crew_tracking', { p_crew: crew.id }))[0] ?? null,
  });

  // Dernière position, rafraîchie toutes les 5 s : on voit le téléphone « répondre » en direct.
  const { data: status } = useQuery({
    queryKey: ['gps-status', crew.id],
    refetchInterval: 5_000,
    queryFn: async () =>
      unwrap(await supabase.from('crews').select('last_fix_at, last_lat, last_lon, last_speed_kmh').eq('id', crew.id).single()),
  });
  const lastFix = status?.last_fix_at ?? crew.last_fix_at;
  const lastLat = status ? status.last_lat : crew.last_lat;
  const lastLon = status ? status.last_lon : crew.last_lon;
  const lastSpeed = status ? status.last_speed_kmh : crew.last_speed_kmh;
  const live = isLive(lastFix);

  const generate = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('regenerate_device_key', { p_crew: crew.id })),
    onSuccess: (key) => { setNewKey(key); void queryClient.invalidateQueries({ queryKey: keys.tracking(crew.id) }); },
    onError: toastError,
  });
  const revoke = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('revoke_device_key', { p_crew: crew.id })),
    onSuccess: () => { setNewKey(null); toast.success('Clé désactivée'); void queryClient.invalidateQueries({ queryKey: keys.tracking(crew.id) }); },
    onError: toastError,
  });

  const hasKey = !!newKey || !!tracking?.has_device_key;

  return (
    <div className="space-y-6">
      {/* ── État en direct ─────────────────────────────────────────────── */}
      <Panel title="État du suivi">
        <div className="grid gap-px border border-cream/[0.14] bg-cream/[0.14] sm:grid-cols-3">
          <div className="flex flex-col gap-2 bg-ink p-5">
            <p className="tt-kicker m-0 text-dust-400">Statut</p>
            <p className="m-0 flex items-center gap-3 font-display text-3xl font-black uppercase leading-none text-cream">
              {live ? <><LiveDot className="h-2.5 w-2.5" /><span className="text-live">En direct</span></> : lastFix ? 'En pause' : 'Jamais reçu'}
            </p>
          </div>
          <div className="flex flex-col gap-2 bg-ink p-5">
            <p className="tt-kicker m-0 text-dust-400">Dernière position</p>
            <p className="m-0 font-display text-3xl font-black uppercase leading-none text-cream">{formatRelative(lastFix)}</p>
            <p className="m-0 text-xs text-dust-500">{formatDateTime(lastFix)}</p>
          </div>
          <div className="flex flex-col gap-2 bg-ink p-5">
            <p className="tt-kicker m-0 text-dust-400">Source</p>
            <p className="m-0 font-display text-3xl font-black uppercase leading-none text-cream">
              {tracking?.traccar_device_id ? 'Serveur Traccar' : tracking?.has_device_key ? 'Téléphone' : 'Non configurée'}
            </p>
          </div>
        </div>
        <p className="mb-0 mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-dust-500">Actualisé automatiquement toutes les 5 secondes</p>
      </Panel>

      {/* ── 01 Installer ───────────────────────────────────────────────── */}
      <Step n="01" title="Installer Traccar Client">
        <p className="mb-4 mt-0 text-dust-200">
          Sur le téléphone qui restera <strong className="text-cream">dans la 4L</strong> (idéalement un téléphone dédié, branché sur
          l’allume-cigare), installez l’appli gratuite <strong className="text-cream">Traccar Client</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {STORES.map((s) => (
            <Button key={s.href} asChild variant="outline">
              <a href={s.href} target="_blank" rel="noopener noreferrer">{s.label} ↗</a>
            </Button>
          ))}
        </div>
      </Step>

      {/* ── 02 Clé ─────────────────────────────────────────────────────── */}
      <Step n="02" title="Générer la clé de l’équipage">
        <p className="mb-4 mt-0 text-dust-200">
          La clé identifie votre équipage : c’est elle que le téléphone envoie avec chaque position. Sans elle, les positions sont refusées.
        </p>

        {newKey ? (
          <div className="mb-5 grid gap-6 border border-primary/40 bg-black/30 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="flex min-w-0 flex-col gap-3">
              <p className="tt-kicker m-0 text-ochre">Votre clé secrète</p>
              <Value tone="secret" copy={newKey} label="Clé">{newKey}</Value>
              <p className="m-0 text-sm text-gold">
                ⚠️ Elle ne sera plus jamais affichée : configurez le téléphone maintenant (étape 03). Ne la partagez pas, elle permet
                d’envoyer des positions au nom de votre équipage.
              </p>
            </div>
            <figure className="m-0 flex flex-col items-center gap-2">
              <QrCode value={traccarConfigLink(address.url, newKey)} label="QR code de configuration de Traccar Client" className="w-full max-w-[220px] rounded-[4px]" />
              <figcaption className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-dust-400">
                Configuration express · étape 03
              </figcaption>
            </figure>
          </div>
        ) : (
          // Emplacement du QR code tant qu'aucune clé n'a été générée sur cette page.
          <div className="mb-5 grid gap-6 border border-dashed border-cream/20 bg-black/20 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <p className="m-0 text-sm leading-relaxed text-dust-300">
              {tracking?.has_device_key ? (
                <>
                  ✅ Une clé est déjà active. Pour configurer un téléphone (ou si la clé est perdue), générez-en une nouvelle :
                  la clé et son <strong className="text-cream">QR code</strong> s’afficheront ici. L’ancienne clé cessera immédiatement de fonctionner.
                </>
              ) : (
                <>
                  Cliquez sur « Générer la clé » : la clé et son <strong className="text-cream">QR code de configuration</strong> s’afficheront ici.
                </>
              )}
            </p>
            <div className="flex aspect-square w-full max-w-[220px] flex-col items-center justify-center gap-2 justify-self-center border-2 border-dashed border-cream/20 p-4 text-center">
              <QrCodeIcon className="h-10 w-10 text-dust-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dust-500">Le QR code apparaîtra ici</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              if (!tracking?.has_device_key || confirm('Générer une nouvelle clé ? L’ancienne cessera immédiatement de fonctionner.')) generate.mutate();
            }}
            disabled={generate.isPending}
          >
            <KeyRound />{tracking?.has_device_key || newKey ? 'Générer une nouvelle clé' : 'Générer la clé'}
          </Button>
          {hasKey && (
            <Button variant="ghost" className="hover:text-primary-light" onClick={() => { if (confirm('Désactiver la clé ? Le téléphone ne pourra plus envoyer de position.')) revoke.mutate(); }}>
              <ShieldOff />Désactiver
            </Button>
          )}
        </div>
      </Step>

      {/* ── 03 Réglages ────────────────────────────────────────────────── */}
      <Step n="03" title="Régler l’appli">
        <div className="mb-6 border-l-[3px] border-live bg-live/[0.06] p-4">
          <p className="m-0 font-mono text-xs font-bold uppercase tracking-[0.12em] text-live">Le plus rapide : le QR code</p>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-dust-200">
            Dans Traccar Client, ouvrez <strong className="text-cream">Settings</strong> (⚙), touchez l’icône{' '}
            <strong className="text-cream">QR code en haut à droite</strong> et scannez le code affiché à l’étape 02.
            Tous les réglages ci-dessous sont remplis d’un coup, sauf le mot de passe (facultatif).
            {!newKey && ' Le QR code apparaît à l’étape 02 quand vous cliquez sur « Générer la clé ».'}
          </p>
        </div>

        <p className="tt-kicker mb-1 mt-0 text-dust-400">Ou à la main · Settings</p>
        <ul className="m-0 list-none p-0">
          <SettingRow
            name="Device identifier"
            fr="Identifiant de l’appareil"
            must
            value={newKey ? <Value tone="secret" copy={newKey} label="Clé">{newKey}</Value> : <Value tone="muted">La clé de l’étape 02</Value>}
            why="Effacez le numéro rempli par défaut et collez votre clé. C’est l’erreur la plus fréquente : avec le numéro par défaut, rien n’arrive."
          />
          <SettingRow
            name="Server URL"
            fr="Adresse du serveur"
            must
            value={<Value copy={address.known ? address.url : undefined} label="Adresse">{address.url}</Value>}
            why={
              address.local ? (
                <>
                  Adresse de ce PC sur votre réseau : le téléphone doit être <strong className="text-cream">sur le même Wi-Fi</strong>.
                  {!address.known && <> Remplacez <code className="text-cream">IP-DE-VOTRE-PC</code> par l’IP du PC (commande <code className="text-cream">hostname -I</code>).</>}
                  {' '}Si rien n’arrive, ouvrez le port dans le pare-feu du PC (<code className="text-cream">sudo ufw allow {window.__TT_CONFIG__?.lanPort ?? '80'}/tcp</code>).
                </>
              ) : (
                'Copiez-la telle quelle, en entier (avec https:// et /ingest/osmand).'
              )
            }
          />
          <SettingRow
            name="Location accuracy"
            fr="Précision de la position"
            must
            value={<Value>High</Value>}
            why="Par défaut l’appli est sur « Medium » : passez sur « High » pour une trace propre qui suit la route. Évitez « Highest », qui ignore le réglage de distance et vide la batterie."
          />
          <SettingRow
            name="Distance"
            fr="Distance entre deux positions (mètres)"
            value={<Value>{SETTINGS.distance}</Value>}
            why="Par défaut 75. Une position tous les 50 m quand la 4L roule (environ toutes les 2 secondes à 90 km/h) : une trace fidèle qui suit bien les virages, pour environ 20 Mo de forfait par journée de route."
          />
          <SettingRow
            name="Stationary heartbeat"
            fr="Signal de vie à l’arrêt (secondes)"
            must
            value={<Value>{SETTINGS.heartbeat}</Value>}
            why="Désactivé par défaut ! À l’arrêt (pause, bivouac), il envoie une position toutes les 5 minutes pour que la page reste « En direct ». Le site considère l’équipage hors ligne après 10 minutes sans nouvelles : restez entre 60 et 600."
          />
        </ul>

        <p className="tt-kicker mb-1 mt-6 text-dust-400">Advanced settings</p>
        <ul className="m-0 list-none p-0">
          <SettingRow
            name="Offline buffering"
            fr="Mémoire hors ligne"
            value={<Value tone="on">Activé</Value>}
            why="Activé par défaut, à vérifier. Indispensable : sans réseau (Espagne rurale, désert marocain), les positions sont gardées dans le téléphone puis envoyées dès que ça capte. La trace se complète toute seule."
          />
          <SettingRow
            name="Stop detection"
            fr="Détection d’arrêt"
            value={<Value tone="on">Activé</Value>}
            why="Activé par défaut, à vérifier. Met le GPS en veille quand la 4L ne bouge plus pour économiser la batterie ; le suivi reprend dès qu’elle roule."
          />
          <SettingRow
            name="Password"
            fr="Mot de passe (facultatif)"
            value={<Value tone="muted">Conseillé · au choix</Value>}
            why={
              <>
                Un verrou <strong className="text-cream">sur le téléphone uniquement</strong> : il est demandé pour couper le suivi ou ouvrir
                les réglages. Pratique pour qu’un équipier ne désactive pas le suivi par erreur. Il n’est jamais envoyé, n’a rien à voir avec
                votre compte TrophyTracker, et le QR code ne le remplit pas : à saisir à la main si vous en voulez un.
              </>
            }
          />
        </ul>
      </Step>

      {/* ── 04 Autorisations ───────────────────────────────────────────── */}
      <Step n="04" title="Autoriser le suivi en permanence">
        <p className="mb-5 mt-0 text-dust-200">
          Sans ces autorisations, le téléphone coupe l’appli dès que l’écran s’éteint : la 4L « disparaît » de la carte.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              os: 'iPhone',
              items: [
                'Réglages → Traccar Client → Position : « Toujours »',
                'Position exacte : activée',
                'Mouvements et forme : activé (pour la détection d’arrêt)',
                'Actualisation en arrière-plan : activée',
                'Ne fermez pas l’appli en la balayant vers le haut',
              ],
            },
            {
              os: 'Android',
              items: [
                'Autorisation de localisation : « Toujours autoriser »',
                'Position précise : activée',
                'Batterie → Traccar Client : « Non restreinte » (pas d’optimisation)',
                'Notifications autorisées (le suivi affiche une notification permanente)',
                'Samsung / Xiaomi : ne pas fermer l’appli depuis les applis récentes',
              ],
            },
          ].map((b) => (
            <div key={b.os} className="border border-cream/[0.14] bg-black/20 p-5">
              <p className="m-0 mb-3 font-display text-2xl font-black uppercase text-cream">{b.os}</p>
              <ul className="m-0 list-none space-y-2 p-0">
                {b.items.map((it) => (
                  <li key={it} className="flex gap-2 text-sm leading-snug text-dust-200">
                    <span className="text-primary">◆</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Step>

      {/* ── 05 Vérifier ────────────────────────────────────────────────── */}
      <Step n="05" title="Démarrer et vérifier">
        <p className="mb-5 mt-0 text-dust-200">
          Sur l’écran principal de Traccar Client, <strong className="text-cream">activez l’interrupteur de suivi</strong>, puis touchez
          le bouton d’envoi de position pour en envoyer une tout de suite (ou marchez une centaine de mètres). Ce voyant passe au vert dès
          qu’une position arrive :
        </p>
        <div
          aria-live="polite"
          className={cn(
            'flex items-center gap-4 border p-5',
            live ? 'border-live/40 bg-live/[0.07]' : 'border-cream/[0.14] bg-black/30',
          )}
        >
          {live ? <LiveDot className="h-3 w-3" /> : <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-ochre" />}
          <div>
            <p className={cn('m-0 font-display text-2xl font-black uppercase leading-none', live ? 'text-live' : 'text-cream')}>
              {live ? 'Position reçue !' : 'En attente d’une position…'}
            </p>
            <p className="mb-0 mt-1 text-sm text-dust-300">
              {live
                ? `Dernière position ${formatRelative(lastFix)}. Votre 4L apparaît sur la page de l’équipage.`
                : 'Rien après 2 minutes ? Vérifiez la clé (Device identifier), l’adresse (Server URL) et les autorisations.'}
            </p>
          </div>
        </div>

        {/* Où la dernière position a été reçue */}
        <div className="mt-4 border border-cream/[0.14]">
          <div className="relative h-[320px] bg-[#E8E2D8]">
            {lastLat != null && lastLon != null ? (
              <Suspense fallback={null}>
                <GpsCheckMap lat={lastLat} lon={lastLon} live={live} />
              </Suspense>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-ink p-6 text-center">
                <p className="m-0 max-w-[360px] font-mono text-xs uppercase leading-relaxed tracking-[0.12em] text-dust-400">
                  Aucune position reçue pour l’instant : la carte s’affichera ici dès la première.
                </p>
              </div>
            )}
          </div>
          {lastLat != null && lastLon != null && (
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-cream/[0.14] bg-ink px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-dust-300">
              <span className="flex items-center gap-2">
                <span className="h-[7px] w-[7px] rounded-full bg-primary shadow-[0_0_10px_#DB4740]" />
                {Math.abs(lastLat).toFixed(5)}°{lastLat >= 0 ? 'N' : 'S'} · {Math.abs(lastLon).toFixed(5)}°{lastLon < 0 ? 'O' : 'E'}
              </span>
              <span>
                {formatDateTime(lastFix)}
                {lastSpeed != null && ` · ${Math.round(lastSpeed)} km/h`}
              </span>
            </div>
          )}
        </div>
        <p className="mb-0 mt-2 text-xs text-dust-400">
          Le point n’est pas où est le téléphone ? Vérifiez que la localisation est en « Position exacte » et que l’appli n’envoie pas une ancienne position gardée en mémoire.
        </p>
      </Step>

      <Panel title="Vous avez un boîtier GPS ou un serveur Traccar ?">
        <p className="m-0 flex items-start gap-2 text-sm text-dust-200">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          {tracking?.traccar_device_id
            ? <>Votre équipage est relié à l’appareil Traccar <code className="rounded bg-black/40 px-1.5">{tracking.traccar_device_id}</code>.</>
            : <>Un administrateur de la plateforme peut relier votre équipage à un appareil existant sur un serveur Traccar. Contactez-le en indiquant son identifiant.</>}
        </p>
      </Panel>
    </div>
  );
}
