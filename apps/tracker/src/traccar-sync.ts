/**
 * Synchronisation périodique avec un serveur Traccar (optionnel).
 * Les tours ne se chevauchent jamais (setTimeout enchaîné) et, si Traccar est
 * indisponible, l'intervalle double à chaque échec (max 5 min).
 */
import type { Db } from './db.js';
import { matchesDevice, toIncomingPoint, TraccarClient, type TraccarDevice } from './traccar.js';

export function startTraccarSync(db: Db, client: TraccarClient, pollSeconds: number, log: (msg: string) => void) {
  let devices: TraccarDevice[] = [];
  let devicesFetchedAt = 0;
  let errors = 0;
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;

  async function tick() {
    try {
      const links = await db.traccarLinks();
      if (links.length > 0) {
        // La liste des appareils change rarement : rafraîchie une fois par minute.
        if (Date.now() - devicesFetchedAt > 60_000) {
          devices = await client.listDevices();
          devicesFetchedAt = Date.now();
        }
        const latest = new Map((await client.latestPositions()).map((p) => [p.deviceId, p]));

        let stored = 0;
        for (const link of links) {
          const device = devices.find((d) => matchesDevice(link.traccar_device_id, d));
          const raw = device && latest.get(device.id);
          const point = raw && toIncomingPoint(raw);
          if (!point) continue;
          const result = await db.ingest(link.crew_id, point);
          if (result === 'stored') stored++;
          else if (result === 'glitch') log(`point GPS aberrant ignoré (équipage ${link.crew_id})`);
        }
        if (stored) log(`${stored} position(s) Traccar enregistrée(s)`);
      }
      if (errors) log('connexion Traccar rétablie');
      errors = 0;
    } catch (err) {
      errors++;
      // Quelques logs au début, puis un de temps en temps pour ne pas inonder.
      if (errors <= 3 || errors % 30 === 0) {
        log(`erreur Traccar (#${errors}) : ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (stopped) return;
    const base = pollSeconds * 1000;
    timer = setTimeout(tick, errors ? Math.min(base * 2 ** Math.min(errors, 5), 300_000) : base);
  }

  void tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
