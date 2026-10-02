/**
 * Onglet GPS : guide pas à pas pour transformer un téléphone en balise avec
 * l'appli gratuite Traccar Client (réglage par QR code ou à la main), et suivi
 * en direct de la réception des positions.
 *
 * Suivi ARRÊTÉ = mode essai : le téléphone peut envoyer pour tester, seuls les membres
 * voient la position ici, rien n'est publié. On le lance en partant de chez soi (il se
 * lance tout seul le jour du départ officiel s'il a été oublié). La trace s'efface.
 */
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, Eraser, FlaskConical, KeyRound, Play, QrCode as QrCodeIcon, ShieldOff, Smartphone, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QrCode } from '@/components/common/QrCode';
import { LiveDot } from '@/components/common/Brand';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { keys, useEvent, useMyRole } from '@/hooks/queries';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatDateTime, formatRelative, isLive } from '@/lib/format';
import { FAIR_PLAY } from '@/lib/legal';
import { ingestAddress } from '@/lib/ingest';
import { cn } from '@/lib/utils';
import { Panel } from './shared';

// MapLibre n'est chargé qu'à l'ouverture de l'onglet GPS.
const GpsCheckMap = lazy(() => import('./GpsCheckMap'));

/** Réglages conseillés pour le raid (repris dans le tableau ET dans le QR code). */
const SETTINGS = { accuracy: 'high', distance: 50, heartbeat: 300, buffer: true, stopDetection: true };

/** Réglages transmis à Traccar Client (v10) : id, accuracy, distance… (booléens en "true"/"false"). */
function traccarParams(key: string) {
  return new URLSearchParams({
    id: key,
    accuracy: SETTINGS.accuracy,
    distance: String(SETTINGS.distance),
    heartbeat: String(SETTINGS.heartbeat),
    buffer: String(SETTINGS.buffer),
    stop_detection: String(SETTINGS.stopDetection),
  });
}

/**
 * Texte du QR code « Settings → icône QR » de Traccar Client.
 * L'appli prend l'adresse sans ses paramètres comme « Server URL », puis applique les réglages.
 * Le mot de passe, lui, ne peut pas être transmis par QR code.
 */
function traccarConfigLink(serverUrl: string, key: string) {
  return `${serverUrl}?${traccarParams(key).toString()}`;
}

/**
 * Même configuration en lien direct, pour le site ouvert SUR le téléphone à régler
 * (impossible de scanner son propre écran). L'appli déclare le schéma « org.traccar.client » :
 * elle demande « Apply new configuration? » puis lit l'adresse dans le paramètre url.
 */
function traccarAppLink(serverUrl: string, key: string) {
  const params = traccarParams(key);
  params.set('url', serverUrl);
  return `org.traccar.client://config?${params.toString()}`;
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
  const [charterChecked, setCharterChecked] = useState(false);
  const address = ingestAddress();

  const { data: tracking } = useQuery({
    queryKey: keys.tracking(crew.id),
    queryFn: async () => unwrap(await supabase.rpc('get_crew_tracking', { p_crew: crew.id }))[0] ?? null,
  });

  const { isOwner } = useMyRole(crew.id);
  const { data: event } = useEvent();

  // Dernière position, rafraîchie toutes les 5 s : on voit le téléphone « répondre » en direct.
  const { data: status } = useQuery({
    queryKey: ['gps-status', crew.id],
    refetchInterval: 5_000,
    queryFn: async () =>
      unwrap(await supabase.from('crews')
        .select('last_fix_at, last_lat, last_lon, last_speed_kmh, tracking_enabled, total_distance_m').eq('id', crew.id).single()),
  });
  const enabled = status?.tracking_enabled ?? crew.tracking_enabled;
  // Suivi arrêté : la position d'essai, visible des seuls membres.
  const { data: testFix } = useQuery({
    queryKey: ['gps-test', crew.id],
    enabled: !enabled,
    refetchInterval: 5_000,
    queryFn: async () =>
      unwrap(await supabase.from('gps_test_fixes').select('lat, lon, speed_kmh, recorded_at').eq('crew_id', crew.id).maybeSingle()),
  });
  const shown = enabled
    ? {
        at: status?.last_fix_at ?? crew.last_fix_at,
        lat: status ? status.last_lat : crew.last_lat,
        lon: status ? status.last_lon : crew.last_lon,
        speed: status ? status.last_speed_kmh : crew.last_speed_kmh,
      }
    : { at: testFix?.recorded_at ?? null, lat: testFix?.lat ?? null, lon: testFix?.lon ?? null, speed: testFix?.speed_kmh ?? null };
  const lastFix = shown.at;
  const lastLat = shown.lat;
  const lastLon = shown.lon;
  const lastSpeed = shown.speed;
  const live = isLive(lastFix);
  const hasTrace = !!(status?.last_fix_at ?? crew.last_fix_at) || (status?.total_distance_m ?? crew.total_distance_m) > 0;
  const startLabel = event?.startDate
    ? new Date(`${event.startDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null;
  const refreshGps = () => {
    void queryClient.invalidateQueries({ queryKey: ['gps-status', crew.id] });
    void queryClient.invalidateQueries({ queryKey: ['gps-test', crew.id] });
    void queryClient.invalidateQueries({ queryKey: keys.crew(crew.slug) });
  };

  const setTracking = useMutation({
    mutationFn: async (on: boolean) => unwrap(await supabase.rpc('set_tracking', { p_crew: crew.id, p_enabled: on })),
    onSuccess: (_, on) => {
      toast.success(on ? 'Suivi lancé : bonne route !' : 'Suivi arrêté : mode essai');
      refreshGps();
    },
    onError: toastError,
  });
  const resetTrack = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('reset_track', { p_crew: crew.id })),
    onSuccess: () => { toast.success('Trace effacée'); refreshGps(); },
    onError: toastError,
  });

  const fairPlayAccepted = !!tracking?.fair_play_accepted_at;

  const generate = useMutation({
    mutationFn: async () => {
      // Première clé : la charte fair-play est acceptée juste avant (le serveur l'exige).
      if (!fairPlayAccepted) unwrap(await supabase.rpc('accept_fair_play', { p_crew: crew.id }));
      return unwrap(await supabase.rpc('regenerate_device_key', { p_crew: crew.id }));
    },
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
      {/* ── Lancer / arrêter ───────────────────────────────────────────── */}
      <section
        className={cn(
          'border-l-[3px] p-6 md:p-8',
          enabled ? 'border-live bg-live/[0.06]' : 'border-ochre bg-black/30',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[560px]">
            <p className={cn('tt-kicker m-0 flex items-center gap-2', enabled ? 'text-live' : 'text-ochre')}>
              {enabled ? <><LiveDot className="h-2 w-2" />Suivi lancé</> : <><FlaskConical className="h-3.5 w-3.5" />Mode essai</>}
            </p>
            <h2 className="m-0 mt-2 font-display text-[32px] font-black uppercase leading-none text-cream md:text-[38px]">
              {enabled ? 'Votre trace s’enregistre' : 'Suivi arrêté'}
            </h2>
            <p className="mb-0 mt-3 text-sm leading-relaxed text-dust-200">
              {enabled ? (
                <>Chaque position envoyée par le téléphone s’ajoute à la trace et apparaît sur la page de l’équipage.</>
              ) : (
                <>
                  Testez votre téléphone tranquillement chez vous : vous seuls voyez sa position ici, rien n’apparaît sur la page de
                  l’équipage. <strong className="text-cream">Lancez le suivi au moment de partir pour de bon.</strong>
                  {startLabel && <> Un oubli ? Il se lancera tout seul le jour du départ officiel, le {startLabel}.</>}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {enabled ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={setTracking.isPending}><Square />Arrêter le suivi</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arrêter le suivi ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Les prochaines positions ne s’ajouteront plus à la trace (retour au mode essai). La trace déjà enregistrée reste
                      visible. Arrêté pendant le raid, il ne se relancera pas tout seul.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setTracking.mutate(false)}>Arrêter</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={() => setTracking.mutate(true)} disabled={setTracking.isPending}><Play />Lancer le suivi</Button>
            )}
            {isOwner && hasTrace && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-dust-300 hover:text-primary-light" disabled={resetTrack.isPending}>
                    <Eraser />Effacer la trace
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Effacer toute la trace ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Toutes les positions enregistrées, les kilomètres parcourus et la dernière position seront supprimés
                      définitivement. Pratique après des essais ; à éviter pendant le raid.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetTrack.mutate()}>Effacer la trace</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </section>

      {/* ── État en direct ─────────────────────────────────────────────── */}
      <Panel title="État du suivi">
        <div className="grid gap-px border border-cream/[0.14] bg-cream/[0.14] sm:grid-cols-3">
          <div className="flex flex-col gap-2 bg-ink p-5">
            <p className="tt-kicker m-0 text-dust-400">Statut</p>
            <p className="m-0 flex items-center gap-3 font-display text-3xl font-black uppercase leading-none text-cream">
              {!enabled
                ? <span className="text-ochre">Essai</span>
                : live ? <><LiveDot className="h-2.5 w-2.5" /><span className="text-live">En direct</span></> : lastFix ? 'En pause' : 'Jamais reçu'}
            </p>
          </div>
          <div className="flex flex-col gap-2 bg-ink p-5">
            <p className="tt-kicker m-0 text-dust-400">{enabled ? 'Dernière position' : 'Dernière position d’essai'}</p>
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

        {!fairPlayAccepted && (
          <div className="mb-5 border-l-[3px] border-primary bg-black/30 p-5 md:p-6">
            <p className="tt-kicker m-0 text-ochre">Charte fair-play · à lire avant d’activer le suivi</p>
            <p className="mb-4 mt-3 text-dust-200">{FAIR_PLAY.spirit}</p>
            <p className="m-0 mb-3 text-sm text-dust-300">En activant le suivi, notre équipage s’engage :</p>
            <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
              {FAIR_PLAY.rules.map((r, i) => (
                <li key={r.title} className="flex gap-3 text-sm leading-relaxed text-dust-200">
                  <span className="font-stencil text-2xl font-black leading-none text-primary">{i + 1}</span>
                  <span><strong className="text-cream">{r.title}.</strong> {r.text}</span>
                </li>
              ))}
            </ol>
            <label className="mt-5 flex cursor-pointer items-start gap-3 border-t border-cream/[0.1] pt-4 text-sm font-semibold text-cream">
              <input
                type="checkbox"
                checked={charterChecked}
                onChange={(e) => setCharterChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              J’ai lu la charte et je l’accepte au nom de l’équipage.
            </label>
          </div>
        )}

        {newKey ? (
          <div className="mb-5 grid gap-6 border border-primary/40 bg-black/30 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="flex min-w-0 flex-col gap-3">
              <p className="tt-kicker m-0 text-ochre">Votre clé secrète</p>
              <Value tone="secret" copy={newKey} label="Clé">{newKey}</Value>
              <p className="m-0 text-sm text-gold">
                ⚠️ Elle ne sera plus jamais affichée : configurez le téléphone maintenant (étape 03). Ne la partagez pas, elle permet
                d’envoyer des positions au nom de votre équipage.
              </p>
              <div className="mt-1 flex flex-col items-start gap-1.5 border-t border-cream/[0.1] pt-4">
                <Button asChild>
                  <a href={traccarAppLink(address.url, newKey)}><Smartphone />Ouvrir dans Traccar Client</a>
                </Button>
                <p className="m-0 text-xs leading-relaxed text-dust-400">
                  Site ouvert sur le téléphone de la 4L ? Ce bouton règle l’appli directement (répondez « OK » à « Apply new
                  configuration? »). Sur un ordinateur, scannez plutôt le QR code.
                </p>
              </div>
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
            disabled={generate.isPending || (!fairPlayAccepted && !charterChecked)}
          >
            <KeyRound />{tracking?.has_device_key || newKey ? 'Générer une nouvelle clé' : 'Générer la clé'}
          </Button>
          {hasKey && (
            <Button variant="ghost" className="hover:text-primary-light" onClick={() => { if (confirm('Désactiver la clé ? Le téléphone ne pourra plus envoyer de position.')) revoke.mutate(); }}>
              <ShieldOff />Désactiver
            </Button>
          )}
        </div>
        {fairPlayAccepted && (
          <p className="mb-0 mt-3 text-xs leading-relaxed text-dust-400">
            ✅ <Link to="/conditions-utilisation#fair-play" className="underline hover:text-cream">Charte fair-play</Link> acceptée
            le {formatDateTime(tracking?.fair_play_accepted_at)}
            {tracking?.fair_play_accepted_by_name && <> par {tracking.fair_play_accepted_by_name}</>}.
          </p>
        )}
      </Step>

      {/* ── 03 Réglages ────────────────────────────────────────────────── */}
      <Step n="03" title="Régler l’appli">
        <div className="mb-6 border-l-[3px] border-live bg-live/[0.06] p-4">
          <p className="m-0 font-mono text-xs font-bold uppercase tracking-[0.12em] text-live">Le plus rapide : réglage automatique</p>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-dust-200">
            <strong className="text-cream">Depuis un ordinateur :</strong> dans Traccar Client, ouvrez{' '}
            <strong className="text-cream">Settings</strong> (⚙), touchez l’icône <strong className="text-cream">QR code en haut à droite</strong>{' '}
            et scannez le code affiché à l’étape 02.
          </p>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-dust-200">
            <strong className="text-cream">Depuis le téléphone de la 4L :</strong> touchez « Ouvrir dans Traccar Client » à l’étape 02,
            puis « OK ».
          </p>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-dust-200">
            Tous les réglages ci-dessous sont remplis d’un coup, sauf le mot de passe (facultatif).
            {!newKey && ' Le QR code et le bouton apparaissent à l’étape 02 quand vous cliquez sur « Générer la clé ».'}
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
              {live ? (enabled ? 'Position reçue !' : 'Position d’essai reçue !') : 'En attente d’une position…'}
            </p>
            <p className="mb-0 mt-1 text-sm text-dust-300">
              {live
                ? enabled
                  ? `Dernière position ${formatRelative(lastFix)}. Votre 4L apparaît sur la page de l’équipage.`
                  : `Dernière position ${formatRelative(lastFix)}. Tout fonctionne ! Elle n’est visible qu’ici : lancez le suivi en partant.`
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
        <p className="mb-0 mt-2 text-xs text-dust-400">
          Tant que le suivi est arrêté, rien n’est publié : testez sans crainte, puis lancez-le en partant de chez vous (en haut de
          cet onglet). Et pendant la course, la carte n’est pas faite pour s’orienter : le règlement du 4L Trophy interdit le GPS.
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
