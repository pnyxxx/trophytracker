/** Point d'entrée du service tracker. */
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { buildHttp } from './http.js';
import { TraccarClient } from './traccar.js';
import { startTraccarSync } from './traccar-sync.js';

const config = loadConfig();
const log = (msg: string) => console.log(`[tracker] ${new Date().toISOString()} ${msg}`);

const db = createDb(config.DATABASE_URL, {
  minDistanceM: config.TRACK_MIN_DISTANCE_M,
  maxSilenceS: config.TRACK_MAX_SILENCE_S,
});

const app = await buildHttp(db, { trustProxy: config.TRUST_PROXY, logger: config.NODE_ENV !== 'production' });
await app.listen({ port: config.PORT, host: '0.0.0.0' });
log(`réception GPS prête sur le port ${config.PORT} (/ingest/osmand)`);

let stopSync = () => {};
if (config.TRACCAR_URL && config.TRACCAR_EMAIL && config.TRACCAR_PASSWORD) {
  const client = new TraccarClient(config.TRACCAR_URL, config.TRACCAR_EMAIL, config.TRACCAR_PASSWORD);
  stopSync = startTraccarSync(db, client, config.TRACCAR_POLL_SECONDS, log);
  log(`synchronisation Traccar activée (${config.TRACCAR_URL}, toutes les ${config.TRACCAR_POLL_SECONDS}s)`);
} else {
  log('Traccar non configuré : seule la réception directe des téléphones est active');
}

// Arrêt propre (docker stop).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    log(`${signal} reçu, arrêt`);
    stopSync();
    await app.close();
    await db.close();
    process.exit(0);
  });
}
