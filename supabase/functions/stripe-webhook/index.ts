/**
 * Edge Function « stripe-webhook » : Stripe y annonce les paiements.
 *
 *   POST /functions/v1/stripe-webhook   (appelé par Stripe, pas par le site)
 *
 * La signature (en-tête Stripe-Signature, secret STRIPE_WEBHOOK_SECRET) est
 * vérifiée avant tout : sans elle, n'importe qui pourrait « confirmer » un
 * paiement. Événements traités :
 *   - checkout.session.completed / async_payment_succeeded → accès payé
 *   - checkout.session.expired                             → achat abandonné
 *   - charge.refunded                                      → remboursement
 * Les fonctions SQL sont idempotentes : Stripe peut renvoyer un événement.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const TOLERANCE_S = 300;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Comparaison en temps constant (évite de deviner la signature caractère par caractère). */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Vérifie l'en-tête « t=…,v1=… » : HMAC-SHA256(secret, "t.corps"), horodatage récent. */
async function verifySignature(payload: string, header: string) {
  const pairs = header.split(',').map((p) => {
    const i = p.indexOf('=');
    return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const;
  });
  const t = pairs.find(([k]) => k === 't')?.[1];
  const signatures = pairs.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)));
  return signatures.some((s) => safeEqual(s, expected));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée' });
  if (!WEBHOOK_SECRET) return json(503, { error: 'Webhook non configuré' });

  const payload = await req.text();
  if (!(await verifySignature(payload, req.headers.get('Stripe-Signature') ?? ''))) {
    return json(400, { error: 'Signature invalide' });
  }

  const event = JSON.parse(payload);
  const obj = event.data?.object ?? {};
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  let result: unknown = 'ignored';

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      if (obj.payment_status !== 'paid') break;
      const { data, error } = await admin.rpc('purchase_paid', {
        p_session: obj.id,
        p_payment_intent: obj.payment_intent,
        p_amount: obj.amount_total,
        p_email: obj.customer_details?.email ?? null,
      });
      if (error) return json(500, { error: error.message }); // Stripe réessaiera
      result = data;
      break;
    }
    case 'checkout.session.expired': {
      const { error } = await admin.rpc('purchase_expired', { p_session: obj.id });
      if (error) return json(500, { error: error.message });
      result = 'expired';
      break;
    }
    case 'charge.refunded': {
      const { data, error } = await admin.rpc('purchase_refunded', {
        p_payment_intent: obj.payment_intent,
        p_refunded_cents: obj.amount_refunded,
      });
      if (error) return json(500, { error: error.message });
      result = data;
      break;
    }
  }

  console.log(`Stripe ${event.type} → ${result}`);
  return json(200, { received: true, result });
});
