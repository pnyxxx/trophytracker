import { toast } from 'sonner';

/**
 * Messages de la base encore écrits avec « équipage » (fonctions SQL d'avant le passage aux road trips) :
 * on les reformule ici, en attendant que ces fonctions soient réécrites.
 */
const WORDING: [RegExp, string][] = [
  [/L[’']équipage doit/g, 'Le road trip doit'],
  [/quitter l[’']équipage/g, 'quitter le road trip'],
  [/de l[’']équipage/g, 'du road trip'],
  [/d[’']un (autre )?équipage/g, 'd’un $1road trip'],
  [/votre équipage/g, 'votre road trip'],
  [/cet équipage/g, 'ce road trip'],
  [/(\d+) équipages/g, '$1 road trips'],
];
export const reword = (msg: string) => WORDING.reduce((m, [re, by]) => m.replace(re, by), msg);

/** Message d'erreur lisible, en français, à partir d'une erreur Supabase / réseau. */
export function errorMessage(err: unknown): string {
  if (!err) return 'Erreur inconnue';
  const e = err as { message?: string; code?: string; status?: number };
  const msg = e.message ?? String(err);

  // Messages de Supabase Auth (en anglais) → français
  const auth: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'Email not confirmed': 'Confirmez d’abord votre email (vérifiez votre boîte de réception)',
    'User already registered': 'Un compte existe déjà avec cet email',
    'Password should be at least': 'Le mot de passe doit contenir au moins 10 caractères',
    'New password should be different': 'Le nouveau mot de passe doit être différent de l’ancien',
    'Email rate limit exceeded': 'Trop d’emails envoyés, réessayez dans quelques minutes',
    'For security purposes': 'Par sécurité, patientez quelques secondes avant de réessayer',
    'Failed to fetch': 'Connexion au serveur impossible. Vérifiez votre connexion Internet.',
  };
  for (const [en, fr] of Object.entries(auth)) if (msg.includes(en)) return fr;

  if (e.code === '42501') return 'Vous n’avez pas les droits pour cette action';
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
