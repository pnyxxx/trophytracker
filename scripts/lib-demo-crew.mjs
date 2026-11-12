/**
 * Le road trip d'EXEMPLE du site (/road-trip/exemple) : J4L Club, l'équipage de Julien, sur la partie Maroc du raid
 * (choix de Julien du 2026-11-12, à la place de l'ancienne « Route des Grandes Alpes » de Léa et Sam, fictive).
 * Sa trace est rejouée en boucle et en temps réel par le service tracker (apps/tracker/src/demo.ts, trajet
 * scripts/build-demo-route.mjs) ; ses vraies photos n'apparaissent qu'une fois la trace passée à leur endroit
 * (apps/web/src/lib/demo-reveal.ts).
 *
 * applyDemo() (idempotent, utilisé par seed-demo.mjs en local et demo-refresh.mjs sur le serveur) :
 *  - retire l'ancien exemple « Route des Grandes Alpes » (road trip, fichiers) et les comptes fictifs de Léa et Sam ;
 *  - fait de J4L Club le road trip d'exemple, à l'adresse /road-trip/exemple, SANS RIEN EFFACER de son contenu
 *    (12 vraies photos de Julien, sponsors) : seuls son adresse, sa visibilité et son suivi changent ;
 *  - en local, où J4L Club n'existe pas, crée un équipage J4L Club de test (photos = vues satellite aux vrais
 *    endroits des photos du raid).
 */
export const DEMO_SLUG = 'exemple';
const J4L_NAME = 'J4L Club';
const J4L_OLD_SLUG = 'j4l-club';
/** Comptes fictifs de l'ancien exemple (Route des Grandes Alpes). */
const OLD_TRAVELLERS = ['lea@exemple.invalid', 'sam@exemple.invalid'];

/** Réglages de J4L Club en road trip d'exemple (son contenu, lui, n'est pas touché). */
const DEMO_SETTINGS = {
  slug: DEMO_SLUG,
  is_demo: true,
  is_public: true,
  is_listed: false,
  tracking_enabled: true,
  trip_type: 'raid',
  destination: 'Marrakech',
};

/** Équipage de test, en local seulement (en production, c'est le vrai J4L Club). */
const LOCAL_J4L = {
  name: J4L_NAME,
  city: 'Saint-Quentin',
  start_lat: 49.8474,
  start_lon: 3.2876,
  start_region: 'Hauts-de-France',
  school: 'Epitech Lille',
  car_number: '1234',
  tagline: 'De Saint-Quentin à Marrakech en 4L.',
};
const LOCAL_OWNER = { email: 'j4l@exemple.invalid', name: 'Julien' };
/** Photos de test : mêmes titres, lieux et heures que les vraies photos du raid de J4L Club. */
const LOCAL_PHOTOS = [
  ['Photo à San Roque', 'San Roque', 36.211, -5.411, '2026-02-21T07:47:18Z'],
  ['Photo à Itzer', 'Itzer', 32.884, -4.988, '2026-02-22T17:03:50Z'],
  ['Photo à Itzer', 'Itzer', 32.886, -4.988, '2026-02-22T20:36:58Z'],
  ['Photo à Er-Rissani', 'Er-Rissani', 31.215, -3.997, '2026-02-23T14:49:39Z'],
  ['Photo à Er-Rissani', 'Er-Rissani', 31.216, -3.996, '2026-02-24T20:48:12Z'],
  ['25 févr. 2026', 'Désert de Merzouga', 31.054, -3.937, '2026-02-25T11:44:12Z'],
  ['26 févr. 2026', 'Tazzarine', 30.694, -5.423, '2026-02-26T15:12:45Z'],
  ['26 févr. 2026', 'N’Kob', 30.843, -5.667, '2026-02-26T17:05:31Z'],
];

const MEDIA = 'crew-media';

async function clearFolder(admin, crewId) {
  for (const sub of ['avatar', 'cover', 'sponsors', 'photos']) {
    const { data: files } = await admin.storage.from(MEDIA).list(`${crewId}/${sub}`, { limit: 1000 });
    if (files?.length) await admin.storage.from(MEDIA).remove(files.map((f) => `${crewId}/${sub}/${f.name}`));
  }
}

/** Vue satellite Esri autour d'un point (1200 × 900), à la place d'une vraie photo (local seulement). */
async function satellite(lat, lon) {
  const half = 0.01;
  const k = Math.cos((lat * Math.PI) / 180);
  const bbox = [lon - (half * 4) / 3 / k, lat - half, lon + (half * 4) / 3 / k, lat + half].map((n) => n.toFixed(5)).join(',');
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=1200,900&format=jpg&f=image`;
  const res = await fetch(url);
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) throw new Error(`Esri : ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Équipage J4L Club de test (local) : propriétaire fictif et photos aux vrais endroits du raid. */
async function createLocalJ4l(admin, users, log) {
  let owner = users.find((u) => u.email === LOCAL_OWNER.email);
  if (!owner) {
    const { data, error } = await admin.auth.admin.createUser({ email: LOCAL_OWNER.email, email_confirm: true, user_metadata: { display_name: LOCAL_OWNER.name } });
    if (error) throw error;
    owner = data.user;
  }
  const { data: crew, error } = await admin.from('crews').insert({ ...LOCAL_J4L, slug: J4L_OLD_SLUG }).select().single();
  if (error) throw error;
  await admin.from('crew_members').insert({ crew_id: crew.id, user_id: owner.id, role: 'owner' });
  for (const [i, [title, location, lat, lon, taken]] of LOCAL_PHOTOS.entries()) {
    try {
      const img = await satellite(lat, lon);
      const path = `${crew.id}/photos/raid-${i + 1}.jpg`;
      const { error: up } = await admin.storage.from(MEDIA).upload(path, img, { contentType: 'image/jpeg', upsert: true });
      if (up) throw up;
      const { error: e } = await admin.from('photos').insert({ crew_id: crew.id, kind: 'classic', title, location, lat, lon, taken_at: taken, storage_path: path, width: 1200, height: 900 });
      if (e) throw e;
    } catch (e) {
      log(`  photo « ${title} » non ajoutée : ${e.message}`);
    }
  }
  log('  J4L Club de test créé (local)');
  return crew;
}

/** Fait de J4L Club le road trip d'exemple. Retourne son id. */
export async function applyDemo(admin, log = console.log) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = list.users;

  // 1. L'ancien exemple « Route des Grandes Alpes » (fictif) : road trip, fichiers et comptes de Léa et Sam.
  const { data: crews } = await admin.from('crews').select('id, slug, name, is_demo').or(`is_demo.eq.true,slug.in.(${DEMO_SLUG},${J4L_OLD_SLUG})`);
  for (const c of crews ?? []) {
    if (c.name === J4L_NAME) continue;
    if (c.slug === DEMO_SLUG) {
      await clearFolder(admin, c.id);
      const { error } = await admin.from('crews').delete().eq('id', c.id);
      if (error) throw error;
      log(`  ancien exemple supprimé : ${c.name}`);
    } else if (c.is_demo) {
      const { error } = await admin.from('crews').update({ is_demo: false }).eq('id', c.id);
      if (error) throw error;
    }
  }
  for (const email of OLD_TRAVELLERS) {
    const u = users.find((x) => x.email === email);
    if (!u) continue;
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) throw error;
    log(`  compte fictif supprimé : ${email}`);
  }

  // 2. J4L Club devient l'exemple (rien de son contenu n'est effacé).
  let j4l = (crews ?? []).find((c) => c.name === J4L_NAME);
  if (!j4l) j4l = await createLocalJ4l(admin, users, log);
  const { error } = await admin.from('crews').update(DEMO_SETTINGS).eq('id', j4l.id);
  if (error) throw error;
  await admin.from('crew_devices').upsert({ crew_id: j4l.id }, { onConflict: 'crew_id', ignoreDuplicates: true });
  log('  J4L Club est le road trip d’exemple (/road-trip/exemple)');
  return j4l.id;
}
