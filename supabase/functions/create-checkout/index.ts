/**
 * Edge Function « create-checkout » : démarre le paiement de l'accès équipage.
 *
 *   POST /functions/v1/create-checkout   { termsAccepted: true, immediateStart: true }
 *   (en-tête Authorization : jeton de l'utilisateur connecté)
 *   → { url }  adresse de la page de paiement Stripe Checkout
 *
 * Le prix vient de la base (public.crew_price), jamais du navigateur. Les deux
 * cases cochées par l'acheteur (CGV + exécution immédiate) sont exigées ici et
 * leur date est gardée avec l'achat (preuve pour le droit de rétractation).
 * Sans clé Stripe configurée (STRIPE_SECRET_KEY), répond 503 : le site affiche
 * alors « paiement bientôt disponible ».
 * Codes promo : créés dans le Dashboard Stripe (coupons), saisis sur la page de
 * paiement ; un code à 100 % donne une commande gratuite (voir stripe-webhook).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SUPABASE_PUBLIC_URL')!;
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée' });
  if (!STRIPE_KEY) return json(503, { error: 'Le paiement en ligne ouvre très bientôt.' });

  // 1. Qui achète ?
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user?.email) return json(401, { error: 'Connexion requise' });

  // 2. Les deux cases obligatoires du parcours de commande
  let body: { termsAccepted?: unknown; immediateStart?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'JSON invalide' });
  }
  if (body.termsAccepted !== true || body.immediateStart !== true) {
    return json(400, { error: 'Veuillez accepter les conditions de vente et l’accès immédiat au service.' });
  }

  // 3. Achat « en attente » en base (vérifie : pas déjà d'équipage, pas d'accès inutilisé)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: started, error: startError } = await admin.rpc('purchase_start', { p_user: user.id, p_email: user.email });
  if (startError) return json(400, { error: startError.message });
  const { purchase_id: purchaseId, amount_cents: amount } = started[0];

  // 4. Session Stripe Checkout (API REST, sans SDK)
  const params = new URLSearchParams({
    mode: 'payment',
    locale: 'fr',
    customer_email: user.email,
    allow_promotion_codes: 'true',
    client_reference_id: purchaseId,
    'metadata[purchase_id]': purchaseId,
    'metadata[user_id]': user.id,
    'payment_intent_data[metadata][purchase_id]': purchaseId,
    'payment_intent_data[description]': 'TrophyTracker — accès équipage',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][product_data][name]': 'TrophyTracker — accès équipage',
    'line_items[0][price_data][product_data][description]':
      'Page d’équipage, suivi GPS en direct, photos et sponsors. Paiement unique.',
    success_url: `${SITE_URL}/mon-compte?paiement=ok`,
    cancel_url: `${SITE_URL}/mon-compte?paiement=annule`,
  });
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': purchaseId,
    },
    body: params,
  });
  const session = await res.json();
  if (!res.ok) {
    console.error('Stripe :', session?.error?.message);
    return json(502, { error: 'Le paiement est momentanément indisponible. Réessayez dans quelques minutes.' });
  }

  await admin.rpc('purchase_attach_session', { p_purchase: purchaseId, p_session: session.id });
  return json(200, { url: session.url });
});
