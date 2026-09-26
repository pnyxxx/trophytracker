/**
 * Test de bout en bout sur la stack qui tourne (docker compose --profile dev up -d).
 *   node scripts/e2e/smoke.mjs
 * Crée de vrais comptes (confirmés via Mailpit), un équipage, une photo, des positions GPS,
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

async function waitEmail(to, subjectStart) {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(to)}`)).json();
    const found = list.messages?.find((m) => m.Subject.startsWith(subjectStart));
    if (found) return await (await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)).json();
    await sleep(500);
  }
  return null;
}

async function latestEmailLink(to) {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(to)}`)).json();
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      const link = msg.HTML.match(/href="([^"]*verify[^"]*)"/)?.[1];
      return { subject: msg.Subject, link: link?.replaceAll('&amp;', '&') };
    }
    await sleep(500);
  }
  return {};
}

async function signUpConfirmed(name) {
  const email = `${name}-${run}@test.local`;
  const password = 'motdepasse-solide-42';
  const c = client();
  const { error } = await c.auth.signUp({ email, password, options: { data: { display_name: name } } });
  check(!error, `inscription de ${name}${error ? ' : ' + error.message : ''}`);
  const mail = await latestEmailLink(email);
  check(mail.subject === 'Confirmez votre inscription sur TrophyTracker', `email de confirmation reçu en français (« ${mail.subject} »)`);
  const res = await fetch(mail.link, { redirect: 'manual' });
  check(res.status === 303 || res.status === 302, 'lien de confirmation valide');
  const { error: e2 } = await c.auth.signInWithPassword({ email, password });
  check(!e2, `connexion de ${name}`);
  return { c, email };
}

// ── Scénario ────────────────────────────────────────────────────────────────
const { c: alice } = await signUpConfirmed('alice');
const { c: bob } = await signUpConfirmed('bob');
const anon = client();

// Inscription payante : sans accès payé, pas d'équipage ; le paiement est confirmé par Stripe (webhook signé).
const { error: unpaid } = await alice.rpc('create_crew', { p_name: `Sans paiement ${run}` });
check(unpaid?.message?.includes('Paiement requis'), 'alice ne peut pas créer d’équipage sans payer');
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
check(webhook.status === 200 && (await webhook.json()).result === 'paid', 'Stripe confirme le paiement d’alice (webhook signé)');

const { data: crew, error: ce } = await alice.rpc('create_crew', { p_name: `Les Dunes ${run}`, p_car_number: '42' });
check(!ce && crew?.slug, `alice crée l'équipage « ${crew?.name} »`);

const { error: ue } = await alice.from('crews').update({ tagline: 'On roule !', current_rank: 12 }).eq('id', crew.id);
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
check(!followErr, 'bob suit l’équipage');
const { data: found } = await anon.rpc('search_crews', { p_query: `dunes ${run}` });
check(found?.total === 1 && found.items[0].followers_count === 1, 'un visiteur trouve l’équipage (1 abonné)');

// GPS + temps réel
const { error: fairPlayErr } = await alice.rpc('accept_fair_play', { p_crew: crew.id });
check(!fairPlayErr, 'charte fair-play acceptée');
const { data: key } = await alice.rpc('regenerate_device_key', { p_crew: crew.id });
check(key?.startsWith('tt_'), 'clé GPS générée');

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

// Page privée
await alice.from('crews').update({ is_public: false }).eq('id', crew.id);
const { data: hidden } = await anon.from('crews').select('id').eq('id', crew.id);
const { data: hiddenTrack } = await anon.rpc('get_track', { p_crew: crew.id });
check(hidden?.length === 0 && hiddenTrack?.length === 0, 'page privée : invisible, trace comprise, pour un visiteur');

// Mot de passe oublié
await anon.auth.resetPasswordForEmail(`bob-${run}@test.local`, { redirectTo: `${SITE}/nouveau-mot-de-passe` });
await sleep(1000);
const reset = await latestEmailLink(`bob-${run}@test.local`);
check(reset.subject?.startsWith('Réinitialisation'), `email « mot de passe oublié » reçu (« ${reset.subject} »)`);

// ── Emails intégrés à Supabase ─────────────────────────────────────────────
await alice.from('crews').update({ is_public: true }).eq('id', crew.id);
const aliceEmail = `alice-${run}@test.local`;

// Invitation d'une personne SANS compte (Edge Function + email d'invitation officiel)
const carolEmail = `carol-${run}@test.local`;
const { data: inv, error: invErr } = await alice.functions.invoke('invite-member', { body: { crewId: crew.id, email: carolEmail } });
check(!invErr && inv?.status === 'invited', `invitation envoyée à carol${invErr ? ' : ' + invErr.message : ''}`);
const invMail = await waitEmail(carolEmail, 'Vous êtes invité');
const tokenHash = invMail?.HTML.match(/token_hash=([^&"]+)/)?.[1];
check(!!tokenHash && invMail.HTML.includes(`${SITE}/invitation?token_hash=`), 'email d’invitation reçu, avec lien vers notre page /invitation');
const carol = client();
const { error: vErr } = await carol.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' });
check(!vErr, 'carol accepte l’invitation (lien à usage unique)');
const { error: cpErr } = await carol.auth.updateUser({ password: 'carol-mot-de-passe-42' });
check(!cpErr, `carol choisit son mot de passe${cpErr ? ' : ' + cpErr.message : ''}`);
const { data: { user: carolUser0 } } = await carol.auth.getUser();
const { data: carolCrew, error: ccErr } = await carol.from('crew_members').select('role').eq('crew_id', crew.id).eq('user_id', carolUser0.id);
check(carolCrew?.[0]?.role === 'member', `carol est membre de l’équipage${ccErr ? ' : ' + ccErr.message : ` (${JSON.stringify(carolCrew)})`}`);
const { error: replay } = await client().auth.verifyOtp({ token_hash: tokenHash, type: 'invite' });
check(!!replay, 'le lien d’invitation ne peut pas être réutilisé');

// Invitation d'une personne AVEC compte
const { data: inv2 } = await alice.functions.invoke('invite-member', { body: { crewId: crew.id, email: `bob-${run}@test.local` } });
check(inv2?.status === 'added', 'bob (compte existant) est ajouté directement');
const { error: bobInv } = await bob.functions.invoke('invite-member', { body: { crewId: crew.id, email: `mallory-${run}@test.local` } });
check(!!bobInv, 'un simple membre ne peut pas inviter');

// Changement de mot de passe → alerte de sécurité (avec code par email si demandé)
let { error: pwErr } = await alice.auth.updateUser({ password: 'nouveau-mot-de-passe-43' });
if (pwErr?.code === 'reauthentication_needed') {
  await alice.auth.reauthenticate();
  const codeMail = await waitEmail(aliceEmail, 'Votre code');
  const nonce = codeMail?.Text.match(/\b\d{6}\b/)?.[0];
  ({ error: pwErr } = await alice.auth.updateUser({ password: 'nouveau-mot-de-passe-43', nonce }));
}
check(!pwErr, `alice change son mot de passe${pwErr ? ' : ' + pwErr.message : ''}`);
check(!!(await waitEmail(aliceEmail, 'Votre mot de passe a été modifié')), 'email d’alerte « mot de passe modifié » reçu');

// Double authentification
const { data: enr, error: enrErr } = await alice.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'e2e' });
check(!enrErr, 'alice démarre l’activation de la double authentification');
const { error: mfaErr } = await alice.auth.mfa.challengeAndVerify({ factorId: enr.id, code: totp(enr.totp.secret) });
check(!mfaErr, 'code TOTP accepté : double authentification activée');
check(!!(await waitEmail(aliceEmail, 'Double authentification activée')), 'email d’alerte « double authentification activée » reçu');

const alice2 = client();
await alice2.auth.signInWithPassword({ email: aliceEmail, password: 'nouveau-mot-de-passe-43' });
const { data: noMfa } = await alice2.from('crews').update({ tagline: 'sans code' }).eq('id', crew.id).select();
check(noMfa?.length === 0, 'nouvelle connexion SANS le code : aucune modification possible');
await alice2.auth.mfa.challengeAndVerify({ factorId: enr.id, code: totp(enr.totp.secret) });
const { data: withMfa } = await alice2.from('crews').update({ tagline: 'avec code' }).eq('id', crew.id).select();
check(withMfa?.length === 1, 'avec le code : modifications autorisées');
await alice.auth.refreshSession();

// Carol quitte l'équipage puis supprime son compte
const { data: carolUser } = await carol.auth.getUser();
await carol.rpc('remove_crew_member', { p_crew: crew.id, p_user: carolUser.user.id });
await carol.rpc('delete_my_account');

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
