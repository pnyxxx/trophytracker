/**
 * Le road trip d'EXEMPLE « Route des Grandes Alpes » (/t/exemple), le seul road trip d'exemple du site :
 * du lac Léman à la Méditerranée en van, par les grands cols. Voyageurs, textes, étapes, photos (vues
 * aériennes IGN), sponsors fictifs (« votre marque ici »), journal et encouragements sont inventés.
 * Sa trace, elle, est rejouée en boucle et en temps réel par le service tracker (apps/tracker/src/demo.ts,
 * trajet scripts/build-demo-route.mjs).
 *
 * applyDemo() installe ou remet à neuf ce road trip (idempotent) : utilisé par seed-demo.mjs (en local)
 * et demo-refresh.mjs (en local comme sur le serveur). Les anciennes démos (J4L Club…) sont mises de côté,
 * réservées à leurs voyageurs, SANS RIEN EFFACER.
 */
export const DEMO_SLUG = 'exemple';

/** Anciennes démos (avant le pivot), mises de côté par applyDemo (privées, rien n'est effacé). */
const OLD_DEMO_SLUGS = ['j4l-club', 'les-sables-mouvants', 'la-4l-du-nord'];

export const DEMO_CREW = {
  name: 'Route des Grandes Alpes',
  city: 'Thonon-les-Bains',
  destination: 'Menton',
  start_lat: 46.3705,
  start_lon: 6.4797,
  start_region: 'Auvergne-Rhône-Alpes',
  trip_type: 'van',
  tagline: 'Du lac Léman à la Méditerranée, par les plus hauts cols des Alpes.',
  story: `Ça faisait trois ans qu'on en parlait : la Route des Grandes Alpes, d'une traite, en van. Quatre jours, une quinzaine de cols, et la mer au bout.

On part de Thonon-les-Bains, au bord du Léman. Au programme : la Colombière, les Aravis, le Cormet de Roselend, puis l'Iseran, le plus haut col routier des Alpes. Le Galibier, l'Izoard et sa Casse Déserte, la Bonette… avant de redescendre vers Menton.

Ce road trip est un exemple : Léa et Sam n'existent pas, mais la trace, elle, avance vraiment sur la carte, en temps réel, comme celle d'un vrai voyage.`,
  is_public: true,
  is_listed: false,
  is_demo: true,
  tracking_enabled: true,
  starts_on: null,
  ends_on: null,
  fundraiser_url: null,
  contact_email: null,
};

/** Les voyageurs (fictifs) : comptes sans adresse joignable (.invalid). */
export const DEMO_TRAVELLERS = [
  { email: 'lea@exemple.invalid', name: 'Léa', role: 'owner' },
  { email: 'sam@exemple.invalid', name: 'Sam', role: 'member' },
];

export const DEMO_STAGES = [
  { kind: 'start', name: 'Départ de Thonon-les-Bains', place: 'Thonon-les-Bains', lat: 46.3705, lon: 6.4797, note: 'Le Léman dans le rétro, le plein fait, c’est parti.' },
  { kind: 'highlight', name: 'Col de la Colombière', place: 'Le Reposoir', lat: 45.9948, lon: 6.4704, note: '1 613 m, et les premiers vrais lacets.' },
  { kind: 'highlight', name: 'Cormet de Roselend', place: 'Beaufort', lat: 45.6869, lon: 6.6964, note: 'Le lac turquoise en contrebas, pause photo obligatoire.' },
  { kind: 'night', name: 'Nuit à Bourg-Saint-Maurice', place: 'Bourg-Saint-Maurice', lat: 45.6183, lon: 6.7695 },
  { kind: 'highlight', name: 'Col de l’Iseran', place: 'Val-d’Isère', lat: 45.417, lon: 7.0306, note: '2 764 m : le plus haut col routier des Alpes. Il fait 4 °C.' },
  { kind: 'night', name: 'Nuit à Valloire', place: 'Valloire', lat: 45.1655, lon: 6.4293 },
  { kind: 'highlight', name: 'Col du Galibier', place: 'Valloire', lat: 45.0641, lon: 6.4078, note: 'Le monument aux cyclistes, et un vent à décorner les bœufs.' },
  { kind: 'stop', name: 'Briançon', place: 'Briançon', lat: 44.8986, lon: 6.6436, note: 'Glace dans la vieille ville fortifiée.' },
  { kind: 'highlight', name: 'Col d’Izoard', place: 'Arvieux', lat: 44.8203, lon: 6.735, note: 'La Casse Déserte : un paysage lunaire.' },
  { kind: 'night', name: 'Nuit à Barcelonnette', place: 'Barcelonnette', lat: 44.387, lon: 6.6519 },
  { kind: 'highlight', name: 'Cime de la Bonette', place: 'Jausiers', lat: 44.3214, lon: 6.8076, note: '2 802 m, la route la plus haute de France.' },
  { kind: 'finish', name: 'Arrivée à Menton', place: 'Menton', lat: 43.7747, lon: 7.4977, note: 'Baignade bien méritée.' },
];

/** Vues aériennes IGN (Licence Ouverte), à la place de photos : [titre, lieu, lat, lon, demi-hauteur en degrés]. */
export const DEMO_PHOTOS = [
  ['Les lacets de l’Iseran, vus du ciel', 'Col de l’Iseran', 45.417, 7.0306, 0.008],
  ['Le Galibier, vu du ciel', 'Col du Galibier', 45.0641, 6.4078, 0.007],
  ['La Casse Déserte, vue du ciel', 'Col d’Izoard', 44.8125, 6.7465, 0.008],
  ['Le lac de Roselend, vu du ciel', 'Cormet de Roselend', 45.6955, 6.6345, 0.012],
  ['La Bonette, vue du ciel', 'Cime de la Bonette', 44.3214, 6.8076, 0.007],
  ['La plage de Menton, vue du ciel', 'Menton', 43.7745, 7.4985, 0.0035],
];

export const DEMO_SPONSORS = [
  { name: 'Votre marque ici', city: 'Annecy', lat: 45.8992, lon: 6.1294 },
  { name: 'Et pourquoi pas vous ?', city: 'Briançon', lat: 44.8986, lon: 6.6436 },
];

/** Journal de bord : jours avant aujourd'hui, titre, texte. */
export const DEMO_JOURNAL = [
  [2, 'Le Léman, puis les premiers lacets', 'Départ de Thonon sous un grand ciel bleu. La Colombière nous a mis en jambes, et le Cormet de Roselend nous a cloués sur place : le lac est d’un bleu qu’on ne pensait pas possible. Nuit à Bourg-Saint-Maurice, épuisés et ravis.'],
  [1, 'L’Iseran à 4 °C', 'Montée de l’Iseran au petit matin. Il faisait 4 °C au sommet et Sam a sorti la doudoune. Redescente sur Bonneval, puis la Maurienne jusqu’à Valloire, où on dort au pied du Galibier.'],
];

export const DEMO_CHEERS = [
  ['Mamie Jo', 'Couvrez-vous bien en haut de l’Iseran, il paraît qu’il gèle !'],
  ['Papa', 'Belle trace ! On vous suit tous les soirs avec le résumé.'],
  ['Inès', 'Rapportez-moi un magnet du Galibier.'],
];

const MEDIA = 'crew-media';
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Vue aérienne IGN autour d'un point (WMS Géoplateforme, 1200 × 900). */
async function aerial(lat, lon, half) {
  const k = Math.cos((lat * Math.PI) / 180);
  const bbox = [lat - half, lon - (half * 4) / 3 / k, lat + half, lon + (half * 4) / 3 / k].map((n) => n.toFixed(5)).join(',');
  const url = `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&STYLES=&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=1200&HEIGHT=900&FORMAT=image/jpeg`;
  const res = await fetch(url);
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) throw new Error(`IGN : ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function clearFolder(admin, crewId) {
  for (const sub of ['avatar', 'cover', 'sponsors', 'photos']) {
    const { data: files } = await admin.storage.from(MEDIA).list(`${crewId}/${sub}`);
    if (files?.length) await admin.storage.from(MEDIA).remove(files.map((f) => `${crewId}/${sub}/${f.name}`));
  }
}

/** Compte d'un voyageur fictif (créé s'il n'existe pas). */
async function traveller(admin, users, { email, name }) {
  const existing = users.find((u) => u.email === email);
  if (existing) return existing;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name: name } });
  if (error) throw error;
  return data.user;
}

/** Installe ou remet à neuf le road trip d'exemple. Retourne son id. */
export async function applyDemo(admin, log = console.log) {
  // 1. Anciennes démos (J4L Club…) : mises de côté SANS RIEN EFFACER (elles peuvent contenir de vraies photos) :
  //    plus marquées comme démo, réservées à leurs voyageurs, suivi arrêté. Seul l'ancien exemple est recréé.
  const { data: olds } = await admin.from('crews').select('id, slug').or(`is_demo.eq.true,slug.in.(${[...OLD_DEMO_SLUGS, DEMO_SLUG].join(',')})`);
  for (const c of olds ?? []) {
    if (c.slug === DEMO_SLUG) {
      await clearFolder(admin, c.id);
      const { error } = await admin.from('crews').delete().eq('id', c.id);
      if (error) throw error;
      log('  ancien exemple retiré, recréé à neuf');
    } else {
      const { error } = await admin.from('crews').update({ is_demo: false, is_public: false, is_listed: false, tracking_enabled: false }).eq('id', c.id);
      if (error) throw error;
      log(`  ancienne démo mise de côté (privée, rien n’est effacé) : ${c.slug}`);
    }
  }

  // 2. Le road trip et ses voyageurs.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const { data: crew, error } = await admin.from('crews').insert({ slug: DEMO_SLUG, ...DEMO_CREW }).select().single();
  if (error) throw error;
  for (const t of DEMO_TRAVELLERS) {
    const u = await traveller(admin, list.users, t);
    const { error: e } = await admin.from('crew_members').insert({ crew_id: crew.id, user_id: u.id, role: t.role });
    if (e) throw e;
  }
  await admin.from('crew_devices').insert({ crew_id: crew.id });

  // 3. Étapes, sponsors, journal, encouragements.
  const ins = async (table, rows) => {
    const { error: e } = await admin.from(table).insert(rows);
    if (e) throw new Error(`${table} : ${e.message}`);
  };
  await ins('trip_stages', DEMO_STAGES.map((s) => ({ ...s, crew_id: crew.id, source: 'manual' })));
  await ins('sponsors', DEMO_SPONSORS.map((s, i) => ({ ...s, crew_id: crew.id, sort_order: i })));
  const today = new Date();
  await ins('journal_entries', DEMO_JOURNAL.map(([ago, title, body]) => ({
    crew_id: crew.id, day: isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - ago)), title, body, published: true,
  })));
  await ins('cheers', DEMO_CHEERS.map(([author_name, message], i) => ({
    crew_id: crew.id, author_name, message, created_at: new Date(Date.now() - (i + 1) * 3 * 3600_000).toISOString(),
  })));

  // 4. Photos (vues aériennes IGN) et couverture.
  for (const [i, [title, location, lat, lon, half]] of DEMO_PHOTOS.entries()) {
    try {
      const img = await aerial(lat, lon, half);
      const path = `${crew.id}/photos/vue-${i + 1}.jpg`;
      const { error: up } = await admin.storage.from(MEDIA).upload(path, img, { contentType: 'image/jpeg', upsert: true });
      if (up) throw up;
      await ins('photos', [{ crew_id: crew.id, kind: 'classic', title, location, lat, lon, storage_path: path, width: 1200, height: 900 }]);
      if (i === 1) {
        const cover = `${crew.id}/cover/couverture.jpg`;
        await admin.storage.from(MEDIA).upload(cover, img, { contentType: 'image/jpeg', upsert: true });
        await admin.from('crews').update({ cover_path: cover }).eq('id', crew.id);
      }
    } catch (e) {
      log(`  photo « ${title} » non ajoutée : ${e.message}`);
    }
  }
  return crew.id;
}
