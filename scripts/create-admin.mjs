/**
 * Donne les droits administrateur à un compte existant.
 *   node scripts/create-admin.mjs moi@exemple.fr
 * (Le compte doit d'abord être créé normalement via le site.)
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib-env.mjs';

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error('Usage : node scripts/create-admin.mjs <email>');
  process.exit(1);
}
const env = loadEnv();
const admin = createClient(env.SITE_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let page = 1;
let user;
while (!user) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (data.users.length < 1000) break;
  page++;
}
if (!user) {
  console.error(`Aucun compte avec l'email ${email}. Inscrivez-vous d'abord sur le site.`);
  process.exit(1);
}
const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
if (error) throw error;
console.log(`✅ ${email} est maintenant administrateur.`);
