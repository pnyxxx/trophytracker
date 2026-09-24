import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, KeyRound, ShieldOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { keys } from '@/hooks/queries';
import { supabase, type Crew } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { formatDateTime, formatRelative, isLive } from '@/lib/format';
import { Panel } from './shared';

function CopyLine({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm ${secret ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-black/30'}`}>
        <span className="flex-1 break-all text-white">{value}</span>
        <Button size="icon" variant="ghost" aria-label={`Copier ${label}`}
          onClick={async () => { await navigator.clipboard.writeText(value); toast.success('Copié'); }}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function GpsTab({ crew }: { crew: Crew }) {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);
  const serverUrl = `${window.location.origin}/ingest/osmand`;

  const { data: tracking } = useQuery({
    queryKey: keys.tracking(crew.id),
    queryFn: async () => unwrap(await supabase.rpc('get_crew_tracking', { p_crew: crew.id }))[0] ?? null,
  });

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

  return (
    <div className="space-y-6">
      <Panel title="État du suivi">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-black/30 p-4">
            <p className="text-xs uppercase text-white/50">Statut</p>
            <p className="text-lg font-bold text-white">{isLive(crew.last_fix_at) ? '🟢 En direct' : crew.last_fix_at ? '⏸️ En pause' : '⚪ Jamais reçu'}</p>
          </div>
          <div className="rounded-xl bg-black/30 p-4">
            <p className="text-xs uppercase text-white/50">Dernière position</p>
            <p className="text-lg font-bold text-white">{formatRelative(crew.last_fix_at)}</p>
            <p className="text-xs text-white/40">{formatDateTime(crew.last_fix_at)}</p>
          </div>
          <div className="rounded-xl bg-black/30 p-4">
            <p className="text-xs uppercase text-white/50">Source</p>
            <p className="text-lg font-bold text-white">
              {tracking?.traccar_device_id ? 'Serveur Traccar' : tracking?.has_device_key ? 'Téléphone' : 'Non configurée'}
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Envoyer la position avec un téléphone"
        description="La méthode la plus simple : un téléphone Android ou iPhone dans la 4L, avec l’application gratuite Traccar Client."
      >
        <ol className="mb-6 list-decimal space-y-2 pl-5 text-sm text-white/80">
          <li>Installez <strong>Traccar Client</strong> (Play Store / App Store).</li>
          <li>Générez une clé ci-dessous et copiez-la dans « Identifiant de l’appareil ».</li>
          <li>Copiez l’adresse du serveur dans « URL du serveur ».</li>
          <li>Réglez la <strong>fréquence sur 30 secondes</strong>, la précision sur « élevée » et activez la mise en mémoire hors ligne.</li>
          <li>Démarrez le suivi. La position apparaît sur votre page en quelques secondes 🎉</li>
        </ol>

        <div className="space-y-4">
          <CopyLine label="URL du serveur" value={serverUrl} />
          {newKey ? (
            <>
              <CopyLine label="Identifiant de l’appareil (clé secrète)" value={newKey} secret />
              <p className="text-sm text-amber-300">
                ⚠️ Notez cette clé maintenant : pour votre sécurité, elle ne sera plus jamais affichée.
                Ne la partagez pas : elle permet d’envoyer des positions pour votre équipage.
              </p>
            </>
          ) : tracking?.has_device_key ? (
            <p className="text-sm text-white/60">✅ Une clé est active. Si elle a été perdue ou divulguée, générez-en une nouvelle (l’ancienne cessera de fonctionner).</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => {
              if (!tracking?.has_device_key || confirm('Générer une nouvelle clé ? L’ancienne cessera immédiatement de fonctionner.')) generate.mutate();
            }} disabled={generate.isPending}>
              <KeyRound className="mr-2 h-4 w-4" />{tracking?.has_device_key ? 'Générer une nouvelle clé' : 'Générer une clé'}
            </Button>
            {tracking?.has_device_key && (
              <Button variant="ghost" className="hover:text-red-400" onClick={() => { if (confirm('Désactiver la clé ? Le téléphone ne pourra plus envoyer de position.')) revoke.mutate(); }}>
                <ShieldOff className="mr-2 h-4 w-4" />Désactiver
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Vous avez un boîtier GPS ou un serveur Traccar ?">
        <p className="flex items-start gap-2 text-sm text-white/70">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          {tracking?.traccar_device_id
            ? <>Votre équipage est relié à l’appareil Traccar <code className="rounded bg-black/40 px-1.5">{tracking.traccar_device_id}</code>.</>
            : <>Un administrateur de la plateforme peut relier votre équipage à un appareil existant sur le serveur Traccar. Contactez-le en indiquant son identifiant.</>}
        </p>
      </Panel>
    </div>
  );
}
