/**
 * Fait de J4L Club le road trip d'exemple (en local comme sur le serveur) :
 *   node scripts/demo-refresh.mjs
 *
 * Supprime l'ancien exemple « Route des Grandes Alpes » et les comptes fictifs de Léa et Sam, puis met J4L Club à
 * l'adresse /road-trip/exemple, sans rien effacer de son contenu (scripts/lib-demo-crew.mjs) ;
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
