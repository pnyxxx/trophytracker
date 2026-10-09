/**
 * Test de bout en bout sur la stack qui tourne (docker compose --profile dev up -d).
 *   node scripts/e2e/smoke.mjs
 * Crée de vrais comptes (connexion par code à 6 chiffres lu dans Mailpit), un équipage, une photo, des positions GPS,
 * et vérifie la sécurité (un autre compte ne peut rien modifier).
 */
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const SITE = env.SITE_URL;
const MAILPIT = `http://127.0.0.1:${env.MAILPIT_UI_PORT || 8025}`;
const run = Date.now().toString(36);
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? '✅' : '❌'} ${label}`); if (!ok) failures++; };
const client = () => createClient(SITE, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Code TOTP (RFC 6238) calculé comme le ferait Google Authenticator. */
function totp(secretBase32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secretBase32.replace(/=+$/, '')) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}

async function waitEmail(to, subjectStart, seconds = 10) {
  for (let i = 0; i < seconds * 2; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(to)}`)).json();
    const found = list.messages?.find((m) => m.Subject.startsWith(subjectStart));
    if (found) return await (await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)).json();
    await sleep(500);
  }
  return null;
}

/** Code à 6 chiffres du dernier e-mail reçu par `to` (sujet commençant par `subjectStart`), puis efface cet e-mail. */
async function takeCode(to, subjectStart) {
  const mail = await waitEmail(to, subjectStart);
  if (!mail) return null;
  await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE', body: JSON.stringify({ IDs: [mail.ID] }), headers: { 'Content-Type': 'application/json' } });
  return mail.Text.match(/\b\d{6}\b/)?.[0] ?? null;
}

/** Demande un code ; Supabase Auth refuse un 2ᵉ e-mail du même type en moins d'une minute : on patiente. */
async function requestCode(c, email, options) {
  for (let i = 0; i < 16; i++) {
    const { error } = await c.auth.signInWithOtp({ email, options });
    if (!error?.message?.includes('For security purposes')) return error;
    await sleep(5000);
  }
  return new Error('code toujours refusé après 80 s');
}

/** Connexion complète par code (le compte doit exister). */
async function signInWithCode(email) {
  const c = client();
  const error = await requestCode(c, email, { shouldCreateUser: false });
  const code = await takeCode(email, 'Ton code de connexion');
  const { data, error: vErr } = await c.auth.verifyOtp({ email, token: code ?? '', type: 'email' });
  return { c, ok: !error && !!code && !vErr && !!data.session, error: error ?? vErr };
}

async function signUpConfirmed(name, { checkCodes = false } = {}) {
  const email = `${name}-${run}@test.local`;
  const c = client();
  const error = await requestCode(c, email, { shouldCreateUser: true, data: { display_name: name } });
  check(!error, `inscription de ${name} : code demandé${error ? ' : ' + error.message : ''}`);
  const code = await takeCode(email, 'Ton code pour créer');
  check(/^\d{6}$/.test(code ?? ''), 'e-mail « Ton code pour créer ton compte » reçu, avec un code à 6 chiffres');
  if (checkCodes) {
    const { error: bad } = await client().auth.verifyOtp({ email, token: code === '000000' ? '111111' : '000000', type: 'email' });
    check(!!bad, 'un mauvais code est refusé');
  }
  const { data, error: e2 } = await c.auth.verifyOtp({ email, token: code ?? '', type: 'email' });
  check(!e2 && !!data.session, `connexion de ${name} avec le code${e2 ? ' : ' + e2.message : ''}`);
  const { data: profile } = await c.from('profiles').select('display_name').eq('id', data.user?.id ?? '').maybeSingle();
  check(profile?.display_name === name, `profil créé avec le prénom « ${profile?.display_name} »`);
  if (checkCodes) {
    const { error: replay } = await client().auth.verifyOtp({ email, token: code ?? '', type: 'email' });
    check(!!replay, 'un code ne sert qu’une fois');
  }
  return { c, email };
}

// ── Scénario ────────────────────────────────────────────────────────────────
const { c: alice } = await signUpConfirmed('alice', { checkCodes: true });
const { c: bob } = await signUpConfirmed('bob');
const anon = client();

// Inscription payante : sans accès payé, pas d'équipage ; le paiement est confirmé par Stripe (webhook signé).
const { error: unpaid } = await alice.rpc('create_crew', { p_name: `Sans paiement ${run}` });
check(unpaid?.message?.includes('Un accès est nécessaire'), 'alice ne peut pas créer de road trip sans payer');
const { data: aliceUser } = await alice.auth.getUser();
const service = createClient(SITE, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: started } = await service.rpc('purchase_start', { p_user: aliceUser.user.id, p_email: aliceUser.user.email });
await service.rpc('purchase_attach_session', { p_purchase: started[0].purchase_id, p_session: `cs_test_${run}` });
async function stripeEvent(event, secret = env.STRIPE_WEBHOOK_SECRET) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return fetch(`${SITE}/functions/v1/stripe-webhook`, { method: 'POST', body, headers: { 'Stripe-Signature': `t=${t},v1=${sig}`, 'Content-Type': 'application/json' } });
}
const paidEvent = { type: 'checkout.session.completed', data: { object: { id: `cs_test_${run}`, payment_status: 'paid', payment_intent: `pi_test_${run}`, amount_total: started[0].amount_cents, customer_details: { email: aliceUser.user.email } } } };
const forged = await stripeEvent(paidEvent, 'whsec_faux');
check(forged.status === 400, 'un faux événement Stripe (mauvaise signature) est refusé');
const webhook = await stripeEvent(paidEvent);
const webhookBody = await webhook.text();
check(webhook.status === 200 && JSON.parse(webhookBody).result === 'paid', `Stripe confirme le paiement d’alice (webhook signé)${webhook.status === 200 ? '' : ' : ' + webhookBody}`);

const { data: crew, error: ce } = await alice.rpc('create_crew', { p_name: `Les Dunes ${run}`, p_starts_on: '2027-07-01' });
check(!ce && crew?.slug, `alice crée le road trip « ${crew?.name} »`);

const { error: ue } = await alice.from('crews').update({ tagline: 'On roule !', ends_on: '2027-07-14' }).eq('id', crew.id);
check(!ue, 'alice modifie sa page');

const { data: hijack } = await bob.from('crews').update({ name: 'Piraté' }).eq('id', crew.id).select();
check(hijack?.length === 0, 'bob ne peut PAS modifier la page d’alice');

// Image : un PNG 1x1 valide
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const path = `${crew.id}/photos/test-${run}.png`;
const { error: upErr } = await alice.storage.from('crew-media').upload(path, png, { contentType: 'image/png' });
check(!upErr, `alice envoie une photo${upErr ? ' : ' + upErr.message : ''}`);
const { error: bobUp } = await bob.storage.from('crew-media').upload(`${crew.id}/photos/bob-${run}.png`, png, { contentType: 'image/png' });
check(!!bobUp, 'bob ne peut PAS envoyer de fichier dans le dossier d’alice');
const { error: evil } = await alice.storage.from('crew-media').upload(`${crew.id}/photos/x-${run}.html`, Buffer.from('<script>alert(1)</script>'), { contentType: 'text/html' });
check(!!evil, 'un fichier HTML est refusé par le stockage');

const { error: pe } = await alice.from('photos').insert({ crew_id: crew.id, kind: 'classic', title: 'Test', storage_path: path, width: 1, height: 1 });
check(!pe, 'alice publie la photo');
const pub = alice.storage.from('crew-media').getPublicUrl(path).data.publicUrl;
check((await fetch(pub)).status === 200, 'la photo est accessible publiquement via le site');
const thumb = alice.storage.from('crew-media').getPublicUrl(path, { transform: { width: 64 } }).data.publicUrl;
check((await fetch(thumb)).status === 200, 'la miniature est générée à la volée (imgproxy)');

// Suivi
const { data: followErr } = await bob.from('follows').insert({ crew_id: crew.id }).then((r) => ({ data: r.error }));
check(!followErr, 'bob suit le road trip');
const { data: seen } = await anon.from('crews').select('followers_count').eq('slug', crew.slug).maybeSingle();
check(seen?.followers_count === 1, 'un visiteur qui a le lien voit le road trip (1 abonné)');

// GPS + temps réel
const { error: fairPlayErr } = await alice.rpc('accept_fair_play', { p_crew: crew.id });
check(!fairPlayErr, 'charte du voyageur acceptée');
const { data: key } = await alice.rpc('regenerate_device_key', { p_crew: crew.id });
check(key?.startsWith('tt_'), 'clé GPS générée');

// Suivi arrêté (par défaut) : mode essai, rien n'est publié.
const tryNow = Math.floor(Date.now() / 1000);
const tryRes = await fetch(`${SITE}/ingest/osmand?id=${key}&lat=48.85&lon=2.35&timestamp=${tryNow - 300}`);
const { data: tryFix } = await alice.from('gps_test_fixes').select('lat').eq('crew_id', crew.id).maybeSingle();
const { data: tryTrack } = await anon.rpc('get_track', { p_crew: crew.id });
check(tryRes.ok && tryFix?.lat === 48.85 && tryTrack?.length === 0, 'suivi arrêté : la position d’essai est reçue, mais pas publiée');
// Un proche invité par e-mail (sans compte) reçoit le lien, puis « C'est parti » au lancement du suivi.
const mamie = `mamie-${run}@test.local`;
const { data: invited, error: invRelErr } = await alice.rpc('invite_relatives', { p_crew: crew.id, p_emails: [mamie, 'pas-une-adresse'] });
check(!invRelErr && invited === 1, `alice invite un proche par e-mail${invRelErr ? ' : ' + invRelErr.message : ''}`);
const { error: strangerInv } = await bob.rpc('invite_relatives', { p_crew: crew.id, p_emails: [`spam-${run}@test.local`] });
check(!!strangerInv, 'bob ne peut pas inviter de proches dans le road trip d’alice');

const { error: startErr } = await alice.rpc('set_tracking', { p_crew: crew.id, p_enabled: true });
check(!startErr, 'suivi lancé');
// Le service tracker relève la file toutes les 30 s.
const inviteMail = await waitEmail(mamie, 'alice t’invite', 90);
check(!!inviteMail && inviteMail.HTML.includes(`${SITE}/t/${crew.slug}`), 'le proche reçoit l’invitation avec le lien du voyage');
const departMail = await waitEmail(mamie, 'C’est parti', 90);
check(!!departMail, 'le proche reçoit « C’est parti » au lancement du suivi');
const unsubToken = departMail?.HTML.match(/desabonnement\?t=([0-9a-f-]{36})/)?.[1];
const { data: unsub } = await client().rpc('unsubscribe', { p_token: unsubToken ?? '00000000-0000-0000-0000-000000000000' });
check(unsub?.status === 'ok', 'il se désinscrit en un clic, sans compte (lien de l’e-mail)');

let realtimeHit = false;
const channel = anon.channel('t').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crews', filter: `id=eq.${crew.id}` }, () => { realtimeHit = true; });
await new Promise((resolve) => channel.subscribe((s) => s === 'SUBSCRIBED' && resolve()));
// Au tout premier abonnement, Realtime crée son slot de réplication : on lui laisse le temps.
await sleep(4000);

const now = Math.floor(Date.now() / 1000);
for (let i = 0; i < 3; i++) {
  const r = await fetch(`${SITE}/ingest/osmand?id=${key}&lat=${31.08 + i * 0.01}&lon=-4.02&timestamp=${now - 120 + i * 60}&speed=40`);
  check(r.ok, `position ${i + 1} envoyée par le « téléphone » via le site`);
}
const bad = await fetch(`${SITE}/ingest/osmand?id=tt_fausse_cle_123456&lat=1&lon=2`);
check(bad.status === 401, 'une fausse clé GPS est refusée');
for (let i = 0; i < 20 && !realtimeHit; i++) await sleep(500);
check(realtimeHit, 'le visiteur reçoit la mise à jour EN TEMPS RÉEL');
await anon.removeChannel(channel);

const { data: track } = await anon.rpc('get_track', { p_crew: crew.id });
check(track?.length === 3, `trace publique : ${track?.length} points`);
const { data: stats } = await anon.rpc('get_crew_stats', { p_crew: crew.id });
check(stats?.live && stats.total_distance_km > 2, `stats : en direct, ${stats?.total_distance_km} km, ${stats?.current_speed_kmh} km/h`);

// Effacer la trace (après des essais, par exemple)
const { error: resetErr } = await alice.rpc('reset_track', { p_crew: crew.id });
const { data: emptyTrack } = await anon.rpc('get_track', { p_crew: crew.id });
check(!resetErr && emptyTrack?.length === 0, 'le propriétaire efface la trace');

// Page privée
await alice.from('crews').update({ is_public: false }).eq('id', crew.id);
const { data: hidden } = await anon.from('crews').select('id').eq('id', crew.id);
const { data: hiddenTrack } = await anon.rpc('get_track', { p_crew: crew.id });
check(hidden?.length === 0 && hiddenTrack?.length === 0, 'page privée : invisible, trace comprise, pour un visiteur');

// Connexion d'un compte existant : e-mail « Ton code de connexion »
const bobAgain = await signInWithCode(`bob-${run}@test.local`);
check(bobAgain.ok, `bob se reconnecte avec un nouveau code${bobAgain.error ? ' : ' + bobAgain.error.message : ''}`);
const { error: noAccount } = await client().auth.signInWithOtp({ email: `inconnu-${run}@test.local`, options: { shouldCreateUser: false } });
const { data: ghost } = await service.auth.admin.listUsers({ perPage: 1000 });
check(!!noAccount && !ghost.users.some((u) => u.email === `inconnu-${run}@test.local`), 'connexion seule (sans inscription) : aucun compte créé pour une adresse inconnue');

// ── Emails intégrés à Supabase ─────────────────────────────────────────────
await alice.from('crews').update({ is_public: true }).eq('id', crew.id);
const aliceEmail = `alice-${run}@test.local`;

// Invitation d'une personne SANS compte (Edge Function + email d'invitation officiel)
const carolEmail = `carol-${run}@test.local`;
const { data: inv, error: invErr } = await alice.functions.invoke('invite-member', { body: { crewId: crew.id, email: carolEmail } });
check(!invErr && inv?.status === 'invited', `invitation envoyée à carol${invErr ? ' : ' + invErr.message : ''}`);
const invMail = await waitEmail(carolEmail, 'Tu es invité');
const tokenHash = invMail?.HTML.match(/token_hash=([^&"]+)/)?.[1];
check(!!tokenHash && invMail.HTML.includes(`${SITE}/invitation?token_hash=`), 'email d’invitation reçu, avec lien vers notre page /invitation');
const carol = client();
const { error: vErr } = await carol.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' });
check(!vErr, 'carol accepte l’invitation (lien à usage unique)');
const { error: cpErr } = await carol.auth.updateUser({ data: { display_name: 'Carol' } });
check(!cpErr, `carol choisit son prénom${cpErr ? ' : ' + cpErr.message : ''}`);
const { data: { user: carolUser0 } } = await carol.auth.getUser();
const { data: carolCrew, error: ccErr } = await carol.from('crew_members').select('role').eq('crew_id', crew.id).eq('user_id', carolUser0.id);
check(carolCrew?.[0]?.role === 'member', `carol est membre de l’équipage${ccErr ? ' : ' + ccErr.message : ` (${JSON.stringify(carolCrew)})`}`);
const { error: replay } = await client().auth.verifyOtp({ token_hash: tokenHash, type: 'invite' });
check(!!replay, 'le lien d’invitation ne peut pas être réutilisé');

// Invitée qui n'a pas cliqué à temps (lien expiré) : elle se connecte simplement par code.
const daveEmail = `dave-${run}@test.local`;
const { data: inv3 } = await alice.functions.invoke('invite-member', { body: { crewId: crew.id, email: daveEmail } });
check(inv3?.status === 'invited', 'invitation envoyée à dave');
const dave = client();
const daveErr = await requestCode(dave, daveEmail, { shouldCreateUser: true });
const daveCode = await takeCode(daveEmail, 'Ton code');
const { data: daveSession, error: daveVErr } = await dave.auth.verifyOtp({ email: daveEmail, token: daveCode ?? '', type: 'email' });
check(!daveErr && !daveVErr && !!daveSession.session, `dave (invité) se connecte par code, sans le lien${daveErr || daveVErr ? ' : ' + (daveErr ?? daveVErr).message : ''}`);
const { data: daveCrew } = await dave.from('crew_members').select('role').eq('crew_id', crew.id).eq('user_id', daveSession.user?.id ?? '');
check(daveCrew?.[0]?.role === 'member', 'dave retrouve le road trip où il a été invité');

// Invitation d'une personne AVEC compte
const { data: inv2 } = await alice.functions.invoke('invite-member', { body: { crewId: crew.id, email: `bob-${run}@test.local` } });
check(inv2?.status === 'added', 'bob (compte existant) est ajouté directement');
const { error: bobInv } = await bob.functions.invoke('invite-member', { body: { crewId: crew.id, email: `mallory-${run}@test.local` } });
check(!!bobInv, 'un simple membre ne peut pas inviter');

// Double authentification
const { data: enr, error: enrErr } = await alice.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'e2e' });
check(!enrErr, 'alice démarre l’activation de la double authentification');
const { error: mfaErr } = await alice.auth.mfa.challengeAndVerify({ factorId: enr.id, code: totp(enr.totp.secret) });
check(!mfaErr, 'code TOTP accepté : double authentification activée');
check(!!(await waitEmail(aliceEmail, 'Double authentification activée')), 'email d’alerte « double authentification activée » reçu');

const { c: alice2, ok: alice2ok } = await signInWithCode(aliceEmail);
check(alice2ok, 'alice se reconnecte avec un code e-mail');
const { data: noMfa } = await alice2.from('crews').update({ tagline: 'sans code' }).eq('id', crew.id).select();
check(noMfa?.length === 0, 'nouvelle connexion SANS le code : aucune modification possible');
await alice2.auth.mfa.challengeAndVerify({ factorId: enr.id, code: totp(enr.totp.secret) });
const { data: withMfa } = await alice2.from('crews').update({ tagline: 'avec code' }).eq('id', crew.id).select();
check(withMfa?.length === 1, 'avec le code : modifications autorisées');
await alice.auth.refreshSession();

// Carol et dave quittent l'équipage puis suppriment leur compte
for (const c of [carol, dave]) {
  const { data: u } = await c.auth.getUser();
  await c.rpc('remove_crew_member', { p_crew: crew.id, p_user: u.user.id });
  await c.rpc('delete_my_account');
}

// Ménage : suppression des fichiers puis de l'équipage
await alice.storage.from('crew-media').remove([path]);
const { count } = await alice.from('crews').delete({ count: 'exact' }).eq('id', crew.id);
check(count === 1, 'alice supprime son équipage');
for (const c of [alice, bob]) {
  const { error } = await c.rpc('delete_my_account');
  check(!error, `suppression de compte (RGPD)${error ? ' : ' + error.message : ''}`);
}

console.log(failures ? `\n❌ ${failures} échec(s)` : '\n✅ Tous les tests de bout en bout passent');
process.exit(failures ? 1 : 0);
