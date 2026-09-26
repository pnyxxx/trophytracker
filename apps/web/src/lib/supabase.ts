/**
 * Client Supabase unique pour tout le site.
 *
 * - L'URL est celle du site lui-même : Caddy (prod) ou Vite (dev) relaie
 *   /auth, /rest, /storage et /realtime vers Supabase → pas de CORS, une seule origine.
 * - La clé ANON est PUBLIQUE par conception : elle ne donne que les droits du rôle
 *   `anon`, strictement limités par les règles RLS de la base.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

declare global {
  interface Window {
    __TT_CONFIG__?: {
      anonKey?: string;
      googleEnabled?: boolean;
      /** Paiement en ligne ouvert (clé Stripe configurée sur le serveur). */
      paymentsEnabled?: boolean;
      /** IP du PC sur le réseau local (dev) : pour que le téléphone joigne le service GPS. */
      lanIp?: string;
      /** Port HTTP publié par Caddy en local (WEB_HTTP_PORT). */
      lanPort?: string;
    };
  }
}

const anonKey = window.__TT_CONFIG__?.anonKey;
if (!anonKey) {
  throw new Error('Configuration manquante : /config.js doit définir la clé ANON (voir docs/CONFIGURATION.md).');
}

export const supabase = createClient<Database>(window.location.origin, anonKey, {
  auth: {
    // PKCE : flux recommandé pour les applications web (le jeton ne transite pas dans l'URL).
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const googleEnabled = window.__TT_CONFIG__?.googleEnabled === true;
export const paymentsEnabled = window.__TT_CONFIG__?.paymentsEnabled === true;

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Crew = Tables<'crews'>;
export type Photo = Tables<'photos'>;
export type Sponsor = Tables<'sponsors'>;
export type Waypoint = Tables<'waypoints'>;
export type Profile = Tables<'profiles'>;
