/**
 * Petit serveur HTTP :
 *   GET|POST /ingest/osmand   ← positions envoyées par les téléphones
 *   GET      /health          ← santé du service (Docker healthcheck)
 *
 * Exposé publiquement via Caddy sous /ingest/.
 */
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Db } from './db.js';
import { parseDeviceRequest } from './parse.js';

export async function buildHttp(db: Db, opts: { trustProxy: boolean; logger: boolean; log?: (msg: string) => void }) {
  const log = opts.log ?? (() => {});
  const app = Fastify({ logger: opts.logger, trustProxy: opts.trustProxy, bodyLimit: 16 * 1024 });

  // Traccar Client peut envoyer du application/x-www-form-urlencoded.
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
    done(null, Object.fromEntries(new URLSearchParams(body as string)));
  });

  // Limite par IP : un téléphone envoie au plus une position toutes les quelques secondes.
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.get('/health', async () => {
    await db.ping();
    return { status: 'ok' };
  });

  // Seuls les refus sont journalisés (jamais la clé en entier ni les coordonnées) :
  // de quoi dépanner un équipage sans noyer les journaux sous les positions normales.
  const ingest = async (req: { query: unknown; body: unknown; ip: string }, reply: import('fastify').FastifyReply) => {
    const parsed = parseDeviceRequest(req.query, req.body);
    if ('error' in parsed) {
      log(`position refusée (400 ${parsed.error}) depuis ${req.ip}`);
      return reply.status(400).send({ error: parsed.error });
    }

    const crewId = await db.crewForDeviceKey(parsed.key);
    if (!crewId) {
      log(`position refusée (401 clé inconnue ${parsed.key.slice(0, 7)}…) depuis ${req.ip}`);
      return reply.status(401).send({ error: "Clé d'appareil inconnue" });
    }

    const result = await db.ingest(crewId, parsed.point);
    if (result === 'glitch' || result === 'invalid') {
      log(`position écartée (${result === 'glitch' ? 'saut impossible depuis le point précédent' : 'coordonnées invalides'}) pour l'équipage ${crewId.slice(0, 8)} depuis ${req.ip}`);
    }
    // Un point écarté (doublon, glitch…) répond quand même 200 :
    // sinon l'application le renverrait indéfiniment.
    return reply.send({ result });
  };

  app.get('/ingest/osmand', ingest);
  app.post('/ingest/osmand', ingest);

  return app;
}
