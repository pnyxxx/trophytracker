/**
 * Petit serveur HTTP :
 *   GET|POST /ingest/osmand   ← positions envoyées par les téléphones
 *                                (ouverte dans un navigateur : page « Régler Traccar Client », cf. setup-page.ts)
 *   GET      /health          ← santé du service (Docker healthcheck)
 *   GET      /sitemap.xml     ← plan du site pour Google (équipages publics)
 *   GET      /road-trip/:slug ← HTML d'une page équipage, avec son titre et son aperçu de partage
 *
 * Exposé publiquement via Caddy sous /ingest/, /sitemap.xml et /road-trip/….
 */
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Db } from './db.js';
import { parseDeviceRequest } from './parse.js';
import { buildSitemap } from './sitemap.js';
import { CREW_SLUG, renderCrewPage } from './crew-page.js';
import { isSetupRequest, renderSetupPage, traccarAppLink } from './setup-page.js';

export async function buildHttp(db: Db, opts: { trustProxy: boolean; logger: boolean; siteUrl?: string; webUrl?: string; log?: (msg: string) => void }) {
  const log = opts.log ?? (() => {});
  const app = Fastify({ logger: opts.logger, trustProxy: opts.trustProxy, bodyLimit: 16 * 1024 });

  // Traccar Client peut envoyer du application/x-www-form-urlencoded.
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
    done(null, Object.fromEntries(new URLSearchParams(body as string)));
  });

  // Limite par IP. Un téléphone réglé sur 50 m envoie ~30 positions/min à 90 km/h (~45 à 130 km/h) ;
  // la marge couvre le renvoi des positions gardées hors réseau et plusieurs équipages derrière
  // la même IP d'opérateur mobile (fréquent au Maroc).
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  app.get('/health', async () => {
    await db.ping();
    return { status: 'ok' };
  });

  app.get('/sitemap.xml', async (_req, reply) => {
    const xml = buildSitemap(opts.siteUrl ?? 'http://localhost', await db.sitemapCrews());
    return reply.header('Content-Type', 'application/xml; charset=utf-8').header('Cache-Control', 'public, max-age=3600').send(xml);
  });

  /** Modèle HTML servi par Caddy (relu à chaque fois : il change à chaque mise à jour du site). */
  const shell = async (name: 'app' | 'crew') => {
    const res = await fetch(`${opts.webUrl ?? 'http://web'}/_shell/${name}.html`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`modèle ${name}.html indisponible (${res.status})`);
    return res.text();
  };

  // Équipage privé ou inconnu : coquille neutre, la page React affiche ce qu'il faut (sans rien révéler ici).
  // En cas d'erreur, Caddy sert lui-même la coquille neutre (apps/web/Caddyfile).
  app.get<{ Params: { slug: string } }>('/road-trip/:slug', async (req, reply) => {
    const { slug } = req.params;
    const crew = CREW_SLUG.test(slug) ? await db.crewPageMeta(slug) : null;
    const html = crew ? renderCrewPage(await shell('crew'), opts.siteUrl ?? 'http://localhost', slug, crew) : await shell('app');
    return reply.header('Content-Type', 'text/html; charset=utf-8').header('Cache-Control', 'no-cache').send(html);
  });

  // Seuls les refus sont journalisés (jamais la clé en entier ni les coordonnées) :
  // de quoi dépanner un road trip sans noyer les journaux sous les positions normales.
  const ingest = async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    // QR code de configuration scanné avec l'appareil photo : page avec un bouton qui ouvre l'appli.
    if (req.method === 'GET' && isSetupRequest(req.query, req.headers.accept)) {
      const host = req.headers.host ?? '';
      const origin = opts.siteUrl && new URL(opts.siteUrl).host === host ? opts.siteUrl.replace(/\/$/, '') : `http://${host}`;
      const keyKnown = !!(await db.crewForDeviceKey(req.query.id));
      return reply
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .header('Referrer-Policy', 'no-referrer')
        .header('X-Robots-Tag', 'noindex')
        .send(renderSetupPage(traccarAppLink(`${origin}/ingest/osmand`, req.query), keyKnown));
    }

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
