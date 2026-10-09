import { toast } from 'sonner';

/**
 * Messages de la base encore écrits avec « équipage » ou au « vous » (fonctions SQL d'avant la refonte) :
 * on les reformule ici en « road trip » et au « tu », en attendant que ces fonctions soient réécrites.
 */
const WORDING: [RegExp, string][] = [
  [/L[’']équipage doit/g, 'Le road trip doit'],
  [/quitter l[’']équipage/g, 'quitter le road trip'],
  [/de l[’']équipage/g, 'du road trip'],
  [/d[’']un (autre )?équipage/g, 'd’un $1road trip'],
  [/votre équipage/g, 'ton road trip'],
  [/cet équipage/g, 'ce road trip'],
  [/(\d+) équipages/g, '$1 road trips'],
  // Tutoiement
  [/Vous avez déjà un accès( payé| non utilisé)? : créez/g, 'Tu as déjà un accès$1 : crée'],
  [/Vous gérez déjà/g, 'Tu gères déjà'],
  [/Vous ne gérez pas/g, 'Tu ne gères pas'],
  [/Vous faites déjà partie/g, 'Tu fais déjà partie'],
  [/Vous êtes le seul propriétaire/g, 'Tu es le seul propriétaire'],
  [/Vous ne pouvez pas retirer vos propres droits/g, 'Tu ne peux pas retirer tes propres droits'],
  [/Vous n[’']êtes/g, 'Tu n’es'],
  [/supprimez-en un/g, 'supprimes-en un'],
  [/Donnez un nom à votre road trip/g, 'Donne un nom à ton road trip'],
  [/votre road trip/g, 'ton road trip'],
];
export const reword = (msg: string) => WORDING.reduce((m, [re, by]) => m.replace(re, by), msg);

/** Message d'erreur lisible, en français, à partir d'une erreur Supabase / réseau. */
export function errorMessage(err: unknown): string {
  if (!err) return 'Erreur inconnue';
  const e = err as { message?: string; code?: string; status?: number };
  const msg = e.message ?? String(err);

  // Messages de Supabase Auth (en anglais) → français
  const auth: Record<string, string> = {
    'Token has expired or is invalid': 'Code incorrect ou expiré. Vérifie les chiffres, ou demande un nouveau code.',
    'Unable to validate email address': 'Cette adresse e-mail n’est pas valide',
    'Email rate limit exceeded': 'Trop d’e-mails envoyés, réessaie dans quelques minutes',
    'Request rate limit reached': 'Trop de tentatives, réessaie dans quelques minutes',
    'For security purposes': 'Par sécurité, patiente une minute avant de redemander un code',
    'Failed to fetch': 'Connexion au serveur impossible. Vérifie ta connexion Internet.',
  };
  for (const [en, fr] of Object.entries(auth)) if (msg.includes(en)) return fr;

  if (e.code === '42501') return 'Tu n’as pas les droits pour cette action';
  if (e.code === '23505') return msg.includes('duplicate') ? 'Cet élément existe déjà' : msg;
  if (e.code === '23514') return 'Valeur invalide';
  if (msg.includes('Payload too large') || e.status === 413) return 'Fichier trop volumineux';
  return reword(msg);
}

export const toastError = (err: unknown) => toast.error(errorMessage(err));

/**
 * Déballe une réponse Supabase `{ data, error }` : lève l'erreur si présente.
 * Sans erreur, `data` est toujours défini (sauf pour les fonctions « void »,
 * dont on n'utilise pas le résultat).
 */
export function unwrap<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error;
  return res.data as NonNullable<T>;
}
