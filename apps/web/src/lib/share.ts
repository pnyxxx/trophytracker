import { supabase } from './supabase';

/**
 * Note le premier partage du lien d'un road trip (case « Partager » du guide de départ).
 * Pour un simple visiteur, la base refuse sans bruit (il ne peut pas modifier le road trip).
 */
export function markShared(crewId: string) {
  void supabase.from('crews').update({ shared_at: new Date().toISOString() }).eq('id', crewId).is('shared_at', null).then(() => {});
}
