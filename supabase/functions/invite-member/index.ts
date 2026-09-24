/**
 * Edge Function « invite-member » : ajoute un coéquipier à un équipage.
 *
 *   POST /functions/v1/invite-member   { crewId, email }
 *   (en-tête Authorization : jeton de l'utilisateur connecté)
 *
 * - La personne a déjà un compte → elle devient membre immédiatement.
 * - Sinon → Supabase Auth lui envoie l'email d'invitation officiel ; son compte est
 *   créé et rattaché à l'équipage, elle choisit son mot de passe en cliquant le lien.
 *
 * Pourquoi une Edge Function ? Inviter un utilisateur exige la clé SERVICE_ROLE,
 * qui ne doit JAMAIS se trouver dans le navigateur. Cette fonction la garde côté
 * serveur et vérifie elle-même que l'appelant est bien propriétaire de l'équipage.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SUPABASE_PUBLIC_URL')!;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée' });

  // 1. Qui appelle ? (le jeton est vérifié par Supabase Auth)
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json(401, { error: 'Connexion requise' });

  // 2. Entrées
  let body: { crewId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'JSON invalide' });
  }
  const crewId = String(body.crewId ?? '');
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!UUID_RE.test(crewId) || !EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: 'Équipage ou email invalide' });
  }

  // 3. Compte existant : la fonction SQL vérifie elle-même que l'appelant est propriétaire.
  const { error: addError } = await userClient.rpc('add_crew_member', { p_crew: crewId, p_email: email });
  if (!addError) return json(200, { status: 'added' });
  if (addError.code !== 'P0002') return json(400, { error: addError.message });

  // 4. Pas encore de compte : on vérifie les droits AVANT d'utiliser la clé service.
  const [{ data: membership }, { data: profile }] = await Promise.all([
    userClient.from('crew_members').select('role').eq('crew_id', crewId).eq('user_id', user.id).maybeSingle(),
    userClient.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ]);
  if (membership?.role !== 'owner' && profile?.role !== 'admin') {
    return json(403, { error: "Réservé au propriétaire de l'équipage" });
  }
  const { data: crew } = await userClient.from('crews').select('name').eq('id', crewId).maybeSingle();

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/invitation`,
    data: { invited_to_crew: crew?.name ?? null },
  });
  if (inviteError || !invited.user) {
    return json(400, { error: inviteError?.message ?? "Impossible d'envoyer l'invitation" });
  }

  const { error: memberError } = await admin
    .from('crew_members')
    .insert({ crew_id: crewId, user_id: invited.user.id, role: 'member' });
  if (memberError) return json(500, { error: 'Invitation envoyée mais rattachement impossible' });

  return json(200, { status: 'invited' });
});
