/**
 * Met à jour l'équipage de démonstration « J4L Club » existant (en local comme sur le serveur) :
 *   node scripts/demo-refresh.mjs
 *
 * Applique le contenu de scripts/lib-demo-crew.mjs (texte « Notre aventure », ville de départ…) et
 * le marque comme équipage de démo, sans toucher au reste (photos, sponsors, logo, réseaux,
 * abonnés). Le service tracker reprend alors sa trace depuis le début du tour en cours
 * (apps/tracker/src/demo.ts) dans les 15 secondes.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib-env.mjs';
import { DEMO_CREW, DEMO_SLUG } from './lib-demo-crew.mjs';

const env = loadEnv();
const admin = createClient(env.SITE_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: crew, error } = await admin.from('crews').select('id, name').eq('slug', DEMO_SLUG).maybeSingle();
if (error || !crew) throw new Error(`Équipage « ${DEMO_SLUG} » introuvable${error ? ` : ${error.message}` : ''}`);

// Un seul équipage de démo possible : on retire la marque d'un éventuel autre avant.
const { error: e1 } = await admin.from('crews').update({ is_demo: false }).eq('is_demo', true).neq('id', crew.id);
if (e1) throw e1;
const { error: e2 } = await admin.from('crews').update(DEMO_CREW).eq('id', crew.id);
if (e2) throw e2;

console.log(`✅ ${crew.name} est l'équipage de démo : contenu à jour, sa trace sera rejouée par le tracker.
   ${env.SITE_URL}/road-trips/${DEMO_SLUG}`);
