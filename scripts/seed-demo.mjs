/**
 * Données de DÉMONSTRATION (développement uniquement) :
 *   node scripts/seed-demo.mjs
 *
 * Crée 3 équipages d'exemple, chacun avec son propre compte (un seul équipage par
 * compte), dont « J4L Club » avec ses vrais sponsors, et une trace GPS réaliste
 * de Biarritz jusqu'au Maroc.
 * Relancer le script remplace les équipages de démo existants.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib-env.mjs';

const env = loadEnv();
const admin = createClient(env.SITE_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const DEMO_EMAIL = 'demo@trophytracker.local';
const DEMO_PASSWORD = `demo-${randomBytes(6).toString('hex')}`;

const sql = (query) =>
  execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A'], {
    input: query,
    encoding: 'utf8',
  });

// ── Comptes démo (un compte = un seul équipage) ──────────────────────────────
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
async function demoAccount(email, displayName, password) {
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password });
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) throw error;
  return data.user;
}
const demo = await demoAccount(DEMO_EMAIL, 'Julien', DEMO_PASSWORD);

// ── Équipages ────────────────────────────────────────────────────────────────
const crews = [
  {
    slug: 'j4l-club', name: 'J4L Club', car_number: '1234', city: 'Saint-Quentin',
    tagline: 'Deux étudiants, une 4L, 6 000 km de solidarité.',
    school: 'Epitech Lille',
    story: "Exemple d'équipage de démonstration.\n\nNous partons de Biarritz pour rejoindre Marrakech à bord de notre fidèle 4L, avec des fournitures scolaires pour les enfants du Maroc.",
    current_rank: 214, supplies_count: 68, logo: 'j4l-club',
  },
  { slug: 'les-sables-mouvants', name: 'Les Sables Mouvants', car_number: '0421', city: 'Lyon', tagline: 'On ne s’ensable jamais (presque).', school: 'INSA Lyon' },
  { slug: 'la-4l-du-nord', name: 'La 4L du Nord', car_number: '0877', city: 'Lille', tagline: 'Des Ch’tis dans le désert.' },
];

const sponsors = [
  ['Auto-école OSR', 'osr', 49.84905, 3.28432, 'Saint-Quentin'], ['Meunier 1905', 'meunier', 49.84611, 3.28993, 'Saint-Quentin'],
  ['SwissLife', 'swisslife', 49.85145, 3.2848, 'Saint-Quentin'], ['Alliot', 'alliot', 49.83638, 3.26791, 'Saint-Quentin'],
  ['Huriez', 'huriez', 49.84778, 3.28413, 'Saint-Quentin'], ['Agrafik', 'agrafik', 49.84694, 3.24944, 'Saint-Quentin'],
  ['Distrissex', 'distrissex', 49.85569, 3.28834, 'Saint-Quentin'], ['GM Concept', 'gm-concept', 49.85139, 3.28466, 'Saint-Quentin'],
  ['Journel', 'journel', 49.82116, 3.15974, 'Saint-Quentin'], ['Gauchy Dépannage', 'gauchy-depannage', 49.83429, 3.28915, 'Gauchy'],
  ["Fier d'être dépanneur", 'fier-d-etre-depanneur', 48.68698, 2.48616, 'Paris'], ['Cavenne Services', 'cavenne', 49.83229, 3.46958, 'Guise'],
  ['Mon aide médical', 'mon-aide-medical', 49.84187, 3.29438, 'Saint-Quentin'], ['Saint Jean et La Croix', 'saint-jean-la-croix', 49.84979, 3.28542, 'Saint-Quentin'],
  ['Points', 'points', 49.84068, 3.28741, 'Saint-Quentin'], ['Kiwanis', 'kiwanis', 49.84566, 3.28384, 'Saint-Quentin'],
  ['Campus Fontaine Coupé', 'campus-fontaine-coupe', 49.84287, 3.28164, 'Saint-Quentin'], ['Epitech', 'epitech', 50.63696, 3.05838, 'Lille'],
];

const upload = async (crewId, folder, name) => {
  const path = `${crewId}/${folder}/${name}.webp`;
  const file = readFileSync(new URL(`../supabase/seed/demo-logos/${name}.webp`, import.meta.url));
  const { error } = await admin.storage.from('crew-media').upload(path, file, { contentType: 'image/webp', upsert: true });
  if (error) throw error;
  return path;
};

const ids = {};
for (const c of crews) {
  const { data: old } = await admin.from('crews').select('id').eq('slug', c.slug).maybeSingle();
  if (old) {
    for (const sub of ['avatar', 'sponsors', 'photos']) {
      const { data: files } = await admin.storage.from('crew-media').list(`${old.id}/${sub}`);
      if (files?.length) await admin.storage.from('crew-media').remove(files.map((f) => `${old.id}/${sub}/${f.name}`));
    }
    await admin.from('crews').delete().eq('id', old.id);
  }
  const { logo, ...row } = c;
  const { data: crew, error } = await admin.from('crews').insert(row).select().single();
  if (error) throw error;
  ids[c.slug] = crew.id;
  // J4L Club appartient au compte démo principal ; les autres ont chacun leur compte.
  const owner = c.slug === 'j4l-club'
    ? demo
    : await demoAccount(`demo-${c.slug}@trophytracker.local`, c.name, `demo-${randomBytes(9).toString('hex')}`);
  const { error: memberError } = await admin.from('crew_members').insert({ crew_id: crew.id, user_id: owner.id, role: 'owner' });
  if (memberError) throw memberError;
  await admin.from('crew_devices').insert({ crew_id: crew.id });
  if (logo) await admin.from('crews').update({ avatar_path: await upload(crew.id, 'avatar', logo) }).eq('id', crew.id);
}

const j4l = ids['j4l-club'];
for (const [i, [name, logo, lat, lon, city]] of sponsors.entries()) {
  await admin.from('sponsors').insert({ crew_id: j4l, name, city, lat, lon, sort_order: i, logo_path: await upload(j4l, 'sponsors', logo) });
}

// ── Traces GPS (via la même fonction d'ingestion que les vrais téléphones) ─────
const route = [[43.464, -1.536], [42.85, -2.67], [41.65, -4.72], [40.968, -5.666], [38.99, -5.8], [37.39, -5.98], [36.129, -5.444],
  [35.76, -5.83], [34.02, -5.0], [33.53, -5.11], [32.883, -4.959], [32.3, -4.6]];

function trackSql(crewId, stops, endAgoMin, hours) {
  const pts = [];
  for (let i = 1; i < stops.length; i++) {
    const [a, b] = [stops[i - 1], stops[i]];
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 60));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push([a[0] + (b[0] - a[0]) * t + Math.sin(k) * 0.004, a[1] + (b[1] - a[1]) * t + Math.cos(k * 1.3) * 0.004]);
    }
  }
  pts.push(stops.at(-1));
  const end = Date.now() - endAgoMin * 60_000;
  const step = (hours * 3600_000) / pts.length;
  return pts.map(([lat, lon], i) => {
    const at = new Date(end - (pts.length - 1 - i) * step).toISOString();
    return `select private.ingest_position('${crewId}', '${at}', ${lat}, ${lon}, ${60 + (i % 30)}, null, null, 10, 80, 'device');`;
  }).join('\n');
}

sql(`\\o /dev/null\n${trackSql(j4l, route, 0.2, 60)}\n${trackSql(ids['les-sables-mouvants'], route.slice(0, 5), 150, 20)}`);

console.log(`✅ Données de démo créées.
   Compte démo : ${DEMO_EMAIL} / ${DEMO_PASSWORD}
   Page d'exemple : ${env.SITE_URL}/equipages/j4l-club`);
