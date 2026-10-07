/**
 * Liens Instagram / Facebook saisis par un road trip : on accepte un lien
 * complet, un lien sans « https:// » ou juste le nom du compte (« @j4lclub »),
 * et on le transforme en adresse propre.
 */
export type Network = 'instagram' | 'facebook';

const NETWORKS: Record<Network, { label: string; base: string; hosts: RegExp }> = {
  instagram: { label: 'Instagram', base: 'https://www.instagram.com/', hosts: /^(www\.)?(instagram\.com|instagr\.am)$/i },
  facebook: { label: 'Facebook', base: 'https://www.facebook.com/', hosts: /^([a-z]+\.)?(facebook\.com|fb\.com|fb\.me)$/i },
};

/** Renvoie l'adresse complète (null si vide) ; lève une erreur lisible si ce n'est pas un lien du bon réseau. */
export function socialUrl(network: Network, input: string): string | null {
  const { label, base, hosts } = NETWORKS[network];
  const v = input.trim();
  if (!v) return null;
  // Juste un nom de compte (lettres, chiffres, points, tirets, soulignés), sans « / ».
  const handle = v.replace(/^@/, '');
  if (/^[\w.-]+$/.test(handle) && !hosts.test(handle.replace(/^www\./i, ''))) return base + handle;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    throw new Error(`Lien ${label} invalide`);
  }
  if (!hosts.test(url.hostname) || url.pathname.length < 2) {
    throw new Error(`Le lien ${label} doit ressembler à ${base}votre-compte`);
  }
  url.protocol = 'https:';
  return url.toString();
}

/**
 * Lien vers n'importe quel site (cagnotte Leetchi, HelloAsso, Lydia…) : on
 * ajoute « https:// » s'il manque. Null si vide ; erreur lisible sinon.
 */
export function webUrl(label: string, input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    throw new Error(`Lien ${label} invalide`);
  }
  // Un vrai nom de domaine (« leetchi.com »), pas un mot isolé.
  if (!/^https?:$/.test(url.protocol) || !/\.[a-z]{2,}$/i.test(url.hostname) || url.toString().length > 300) {
    throw new Error(`Le lien ${label} doit ressembler à https://www.leetchi.com/…`);
  }
  return url.toString();
}
