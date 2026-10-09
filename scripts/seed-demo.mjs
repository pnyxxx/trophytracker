/**
 * Données de DÉMONSTRATION (développement uniquement) :
 *   node scripts/seed-demo.mjs
 *
 * Crée le compte admin de test (demo@trophystracker.local, connexion par code lu dans Mailpit) et
 * installe le road trip d'exemple « Route des Grandes Alpes » (/t/exemple, scripts/lib-demo-crew.mjs),
 * dont la trace est rejouée en boucle par le service tracker (apps/tracker/src/demo.ts).
 * Relancer le script remet l'exemple à neuf.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib-env.mjs';
import { applyDemo, DEMO_SLUG } from './lib-demo-crew.mjs';

const env = loadEnv();
const admin = createClient(env.SITE_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ADMIN_EMAIL = 'demo@trophystracker.local';

// Compte admin de test : pas de mot de passe, on se connecte avec un code reçu par e-mail.
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = list.users.find((u) => u.email === ADMIN_EMAIL);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email: ADMIN_EMAIL, email_confirm: true, user_metadata: { display_name: 'Julien' } });
  if (error) throw error;
  user = data.user;
}
const { error: roleError } = await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
if (roleError) throw roleError;

await applyDemo(admin);

console.log(`✅ Données de démo créées.
   Compte admin : ${ADMIN_EMAIL} (connexion par code, à lire dans Mailpit : http://localhost:${env.MAILPIT_UI_PORT || 8025})
   Road trip d'exemple : ${env.SITE_URL}/t/${DEMO_SLUG} (la trace apparaît dans les 15 secondes)`);
