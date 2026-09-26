/**
 * Remplace UNIQUEMENT la trace GPS de l'équipage de démo « J4L Club » par le vrai tracé
 * routier de la page d'accueil (Biarritz → Merzouga), sans toucher au reste
 * (page, photos, sponsors, abonnés). Utilisable en local comme sur le serveur :
 *   node scripts/demo-trace.mjs
 */
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib-env.mjs';
import { clearTraceSql, MERZOUGA, roadUntil, traceSql } from './lib-demo-trace.mjs';

const env = loadEnv();
const admin = createClient(env.SITE_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: crew, error } = await admin.from('crews').select('id, name').eq('slug', 'j4l-club').maybeSingle();
if (error || !crew) throw new Error(`Équipage « j4l-club » introuvable${error ? ` : ${error.message}` : ''}`);

execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A'], {
  input: `begin;\n${clearTraceSql(crew.id)}\n\\o /dev/null\n${traceSql(crew.id, roadUntil(...MERZOUGA), 0.2, 60)}\n\\o\ncommit;`,
  encoding: 'utf8',
});

const { data: after } = await admin.from('crews').select('total_distance_m, last_fix_at').eq('id', crew.id).single();
const { count } = await admin.from('positions').select('id', { count: 'exact', head: true }).eq('crew_id', crew.id);
console.log(`✅ Trace de ${crew.name} remplacée : ${count} positions, ${Math.round(after.total_distance_m / 1000)} km, dernière ${after.last_fix_at}`);
