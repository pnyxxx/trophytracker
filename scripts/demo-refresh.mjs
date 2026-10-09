/**
 * Installe ou remet à neuf le road trip d'exemple « Route des Grandes Alpes » (en local comme sur le serveur) :
 *   node scripts/demo-refresh.mjs
 *
 * Met de côté les anciennes démos (privées, rien n'est effacé), recrée l'exemple avec son contenu
 * (scripts/lib-demo-crew.mjs) ;
 * le service tracker reprend sa trace depuis le début du tour en cours (apps/tracker/src/demo.ts) dans les
 * 15 secondes.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib-env.mjs';
import { applyDemo, DEMO_SLUG } from './lib-demo-crew.mjs';

const env = loadEnv();
const admin = createClient(env.SITE_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await applyDemo(admin);
console.log(`✅ Road trip d'exemple à jour : ${env.SITE_URL}/road-trip/${DEMO_SLUG}`);
