/**
 * Edge Function « journal-draft » : propose un brouillon de page du journal de bord pour une journée.
 *
 *   POST /functions/v1/journal-draft   { crewId, day: "AAAA-MM-JJ", tz: "Europe/Paris" }
 *   (en-tête Authorization : jeton du voyageur connecté)
 *   → { title, body, ai }   ai = true si le texte a été rédigé par Claude
 *
 * Les faits de la journée viennent de public.get_day_summary, appelée AVEC le jeton du voyageur :
 * la base refuse si la personne n'est pas voyageuse du road trip. Rien n'est enregistré ici : le
 * voyageur relit, corrige et publie lui-même depuis son espace.
 * Sans clé ANTHROPIC_API_KEY (ou si l'IA ne répond pas), on renvoie un brouillon simple écrit à
 * partir des chiffres : la fonctionnalité marche toujours.
 */
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

interface Summary {
  road_trip: string;
  day: string;
  day_number: number | null;
  distance_km: number;
  first_position_at: string | null;
  last_position_at: string | null;
  max_altitude_m: number | null;
  min_altitude_m: number | null;
  max_speed_kmh: number | null;
  stages: { kind: string; name: string; place: string | null; note: string | null; arrived: string | null; left: string | null }[];
  photos: { title: string; location: string | null; description: string | null }[];
}

const SYSTEM = `Tu écris le journal de bord d'un road trip, en français, à la première personne du pluriel (« nous »).
On te donne les faits d'une seule journée (kilomètres, heures, altitudes, étapes, photos, notes des voyageurs).
Écris un texte chaleureux et vivant de 80 à 160 mots, comme une carte postale envoyée aux proches et aux sponsors.
N'invente aucun fait, aucun lieu, aucune rencontre, aucune météo : appuie-toi uniquement sur les données fournies.
S'il y a peu de données, écris un texte court et simple. Pas de titre dans le texte, pas de liste, pas d'emoji, pas de hashtag.
Réponds exactement sous cette forme :
TITRE: <un titre de 3 à 8 mots>
TEXTE:
<le texte>`;

/** Brouillon sans IA, à partir des chiffres de la journée. */
function plainDraft(s: Summary) {
  const date = new Date(`${s.day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const day = s.day_number && s.day_number > 0 ? `Jour ${s.day_number}` : date.charAt(0).toUpperCase() + date.slice(1);
  const places = s.stages.map((st) => st.place ?? st.name).filter(Boolean);
  const parts: string[] = [];
  if (s.distance_km > 0) {
    parts.push(`${day} : ${String(s.distance_km).replace('.', ',')} km au compteur${s.first_position_at && s.last_position_at ? `, de ${s.first_position_at} à ${s.last_position_at}` : ''}.`);
  } else {
    parts.push(`${day} : une journée sans bouger, ou presque.`);
  }
  if (places.length) parts.push(`Au programme : ${places.join(', ')}.`);
  if (s.max_altitude_m != null && s.max_altitude_m > 800) parts.push(`Point culminant du jour : ${s.max_altitude_m} m.`);
  for (const st of s.stages) if (st.note) parts.push(st.note);
  return { title: places.at(-1) ? `${day} · ${places.at(-1)}` : day, body: parts.join('\n\n') };
}

/** « TITRE: … / TEXTE: … » → { title, body } ; null si la réponse ne suit pas la forme. */
function parseDraft(text: string) {
  const m = text.match(/TITRE\s*:\s*(.+)\s*\n+\s*TEXTE\s*:\s*\n?([\s\S]+)/i);
  if (!m) return null;
  return { title: m[1]!.trim().slice(0, 120), body: m[2]!.trim().slice(0, 4000) };
}

async function aiDraft(s: Summary) {
  const client = new Anthropic({ apiKey: API_KEY });
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 2000,
    output_config: { effort: 'low' },
    // Si la demande était refusée par erreur, l'API la reprend toute seule sur un autre modèle.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: `Faits de la journée (JSON) :\n${JSON.stringify(s)}` }],
  } as Parameters<typeof client.beta.messages.create>[0]) as Anthropic.Beta.BetaMessage;
  if (response.stop_reason === 'refusal') return null;
  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n');
  return parseDraft(text);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée' });

  let body: { crewId?: unknown; day?: unknown; tz?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'JSON invalide' });
  }
  if (typeof body.crewId !== 'string' || typeof body.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.day)) {
    return json(400, { error: 'Road trip ou jour manquant' });
  }

  // Les faits de la journée, lus avec le jeton du voyageur (la base vérifie qu'il en fait partie).
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.rpc('get_day_summary', {
    p_crew: body.crewId, p_day: body.day, p_tz: typeof body.tz === 'string' ? body.tz : 'Europe/Paris',
  });
  if (error) return json(error.code === '42501' ? 403 : 400, { error: error.message });
  const summary = data as Summary;

  if (API_KEY) {
    try {
      const draft = await aiDraft(summary);
      if (draft) return json(200, { ...draft, ai: true });
    } catch (e) {
      console.error('journal-draft : IA indisponible', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    }
  }
  return json(200, { ...plainDraft(summary), ai: false });
});
