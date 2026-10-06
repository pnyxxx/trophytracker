/** Point d'entrée du service tracker. */
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { buildHttp } from './http.js';
import { TraccarClient } from './traccar.js';
import { startTraccarSync } from './traccar-sync.js';
import { startAdminNotifier } from './notifier.js';
import { loadDemoRoute, startDemoDriver } from './demo.js';

const config = loadConfig();
const log = (msg: string) => console.log(`[tracker] ${new Date().toISOString()} ${msg}`);

const db = createDb(config.DATABASE_URL, {
  minDistanceM: config.TRACK_MIN_DISTANCE_M,
  maxSilenceS: config.TRACK_MAX_SILENCE_S,
});

const app = await buildHttp(db, { trustProxy: config.TRUST_PROXY, siteUrl: config.SITE_URL, webUrl: config.WEB_INTERNAL_URL, logger: config.NODE_ENV !== 'production', log });
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

let stopNotifier = () => {};
if (config.SMTP_HOST) {
  stopNotifier = startAdminNotifier(
    db,
    { host: config.SMTP_HOST, port: config.SMTP_PORT, user: config.SMTP_USER || undefined, pass: config.SMTP_PASS, from: config.SMTP_ADMIN_EMAIL, fromName: config.SMTP_SENDER_NAME },
    config.SITE_URL.replace(/\/$/, ''),
    config.NOTIFY_POLL_SECONDS,
    log,
  );
  log(`emails aux admins et relances GPS activés (${config.SMTP_HOST}:${config.SMTP_PORT}, toutes les ${config.NOTIFY_POLL_SECONDS}s)`);
} else {
  log('SMTP non configuré : pas d’emails aux admins ni de relances GPS');
}

// Équipage de démo : rejoue son trajet en boucle (rien à faire s'il n'y en a pas en base).
const stopDemo = startDemoDriver(db, loadDemoRoute(), log);

// Arrêt propre (docker stop).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    log(`${signal} reçu, arrêt`);
    stopSync();
    stopNotifier();
    stopDemo();
    await app.close();
    await db.close();
    process.exit(0);
  });
}
