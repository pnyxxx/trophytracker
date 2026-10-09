import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { seoPages } from './seo-plugin';
import { emailTemplates } from './email-plugin';

/**
 * En développement, le site tourne sur http://localhost:5173 et Vite relaie les
 * appels Supabase (/auth, /rest, /storage, /realtime) et GPS (/ingest) vers les
 * conteneurs Docker : le navigateur voit une seule origine, comme en production.
 */
const SUPABASE_GATEWAY = 'http://127.0.0.1:8000';

const VENDOR_CHUNKS: Record<string, string[]> = {
  // Sans react-router : il contient des import() dynamiques, dont l'aide de préchargement de Vite vit dans un
  // autre fichier → dépendance circulaire entre fichiers et page blanche en production (9 octobre 2026).
  react: ['react', 'react-dom', 'scheduler'],
  supabase: ['@supabase'],
  map: ['maplibre-gl', '@maplibre'],
  motion: ['framer-motion', 'motion-dom', 'motion-utils'],
  panorama: ['@photo-sphere-viewer', 'three'],
};

/**
 * IP de ce PC sur le réseau local (celle de la route par défaut), pour que la page
 * GPS affiche une adresse joignable depuis un téléphone. Vide si introuvable.
 */
function lanIp(): string {
  try {
    const out = execSync('ip route get 1.1.1.1', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(/src (\d+\.\d+\.\d+\.\d+)/);
    if (m) return m[1]!;
  } catch {
    /* pas de commande `ip` (macOS, Windows) : repli ci-dessous */
  }
  const candidates = Object.entries(os.networkInterfaces())
    .filter(([name]) => !/^(docker|br-|veth|virbr|lo)/.test(name))
    .flatMap(([, list]) => list ?? [])
    .filter((a) => a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
  return candidates.find((a) => a.startsWith('192.168.')) ?? candidates.find((a) => a.startsWith('10.')) ?? candidates[0] ?? '';
}

/**
 * /config.js expose la configuration publique au navigateur (clé ANON, options).
 * En production, c'est Caddy qui la génère depuis les variables d'environnement :
 * la même image Docker fonctionne donc sur n'importe quel serveur.
 * En développement, ce plugin la sert depuis le .env à la racine du dépôt.
 */
function devRuntimeConfig(env: Record<string, string>): Plugin {
  return {
    name: 'trophytracker-dev-config',
    configureServer(server) {
      server.middlewares.use('/config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(
          `window.__TT_CONFIG__ = ${JSON.stringify({
            anonKey: env.ANON_KEY ?? '',
            googleEnabled: env.GOOGLE_ENABLED === 'true',
            paymentsEnabled: !!env.STRIPE_SECRET_KEY,
            // Le téléphone envoie ses positions à Caddy (conteneur web), pas à Vite.
            lanIp: lanIp(),
            lanPort: env.WEB_HTTP_PORT ?? '80',
          })};`,
        );
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname, '../..'), '');
  const proxy = { target: SUPABASE_GATEWAY, changeOrigin: false };

  return {
    plugins: [react(), devRuntimeConfig(env), seoPages(), emailTemplates()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
    server: {
      port: 5173,
      proxy: {
        '/auth/v1': proxy,
        '/rest/v1': proxy,
        '/storage/v1': proxy,
        '/realtime/v1': { ...proxy, ws: true },
        '/functions/v1': proxy,
      },
    },
    // Workers en modules ES (requis par MapLibre GL v6).
    worker: { format: 'es' },
    build: {
      sourcemap: false,
      // MapLibre (carte vectorielle) pèse ~1,3 Mo mais n'est chargé qu'avec les cartes.
      chunkSizeWarningLimit: 1400,
      rolldownOptions: {
        output: {
          // Découpe les grosses bibliothèques en fichiers séparés (mieux mis en cache).
          // Sans includeDependenciesRecursively: false, le groupe « map » aspirerait React
          // et MapLibre serait préchargé sur toutes les pages.
          codeSplitting: {
            includeDependenciesRecursively: false,
            groups: Object.entries(VENDOR_CHUNKS).map(([name, pkgs]) => ({
              name,
              test: (id: string) => pkgs.some((p) => id.includes(`/node_modules/${p}/`)),
            })),
          },
        },
      },
    },
  };
});
