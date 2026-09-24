import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

/**
 * En développement, le site tourne sur http://localhost:5173 et Vite relaie les
 * appels Supabase (/auth, /rest, /storage, /realtime) et GPS (/ingest) vers les
 * conteneurs Docker : le navigateur voit une seule origine, comme en production.
 */
const SUPABASE_GATEWAY = 'http://127.0.0.1:8000';

const VENDOR_CHUNKS: Record<string, string[]> = {
  react: ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'],
  supabase: ['@supabase'],
  map: ['leaflet', 'react-leaflet', '@react-leaflet', 'maplibre-gl', '@maplibre'],
  motion: ['framer-motion', 'motion-dom', 'motion-utils'],
  panorama: ['@photo-sphere-viewer', 'three'],
};

/**
 * /config.js expose la configuration publique au navigateur (clé ANON, options).
 * En production, c'est Caddy qui la génère depuis les variables d'environnement :
 * la même image Docker fonctionne donc sur n'importe quel serveur.
 * En développement, ce plugin la sert depuis le .env à la racine du dépôt.
 */
function devRuntimeConfig(env: Record<string, string>): Plugin {
  return {
    name: 'trophystracker-dev-config',
    configureServer(server) {
      server.middlewares.use('/config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(
          `window.__TT_CONFIG__ = ${JSON.stringify({
            anonKey: env.ANON_KEY ?? '',
            googleEnabled: env.GOOGLE_ENABLED === 'true',
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
    plugins: [react(), devRuntimeConfig(env)],
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
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            for (const [chunk, pkgs] of Object.entries(VENDOR_CHUNKS)) {
              if (pkgs.some((p) => id.includes(`/node_modules/${p}/`))) return chunk;
            }
            return undefined;
          },
        },
      },
    },
  };
});
