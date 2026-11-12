/**
 * Liens d'un sponsor (sites et réseaux sociaux) : reconnaître le réseau d'une adresse pour afficher le bon logo
 * et un nom lisible (« Instagram · @garagedupont », « garage-dupont.fr »), et transformer ce qu'on tape
 * (« @compte », « monsite.fr ») en adresse complète.
 */
export type LinkKind = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'x' | 'site';

const NETWORKS: { kind: Exclude<LinkKind, 'site'>; name: string; hosts: string[] }[] = [
  { kind: 'instagram', name: 'Instagram', hosts: ['instagram.com'] },
  { kind: 'facebook', name: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me'] },
  { kind: 'tiktok', name: 'TikTok', hosts: ['tiktok.com'] },
  { kind: 'youtube', name: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { kind: 'linkedin', name: 'LinkedIn', hosts: ['linkedin.com'] },
  { kind: 'x', name: 'X', hosts: ['x.com', 'twitter.com'] },
];

export interface LinkInfo {
  url: string;
  kind: LinkKind;
  /** Nom du réseau, ou le site sans « www. ». */
  name: string;
  /** Le compte (« @garagedupont ») quand on le reconnaît dans l'adresse. */
  account: string | null;
}

/** Ce que l'on sait d'un lien : réseau, nom à afficher, compte. */
export function linkInfo(url: string): LinkInfo {
  let host = '';
  let path: string[] = [];
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^(www|m|mobile)\./, '').toLowerCase();
    path = u.pathname.split('/').filter(Boolean);
  } catch {
    return { url, kind: 'site', name: url, account: null };
  }
  const net = NETWORKS.find((n) => n.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
  if (!net) return { url, kind: 'site', name: host, account: null };
  const first = path[0] && !['p', 'reel', 'watch', 'channel', 'company', 'in', 'pages', 'profile.php'].includes(path[0]) ? path[0] : path[1] ?? null;
  const account = first ? (first.startsWith('@') ? first : `@${first}`) : null;
  return { url, kind: net.kind, name: net.name, account };
}

/** « @compte » → Instagram ; « monsite.fr » → « https://monsite.fr » ; vide → null. */
export function normalizeLink(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/^@[\w.]{1,30}$/.test(v)) return `https://www.instagram.com/${v.slice(1)}`;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/** Les liens d'un sponsor : sa liste, ou à défaut ses anciens champs (site, Instagram, Facebook). */
export function sponsorLinks(s: { links?: unknown; website_url?: string | null; instagram_url?: string | null; facebook_url?: string | null }): string[] {
  const list = Array.isArray(s.links) ? s.links.filter((x): x is string => typeof x === 'string') : [];
  if (list.length) return list;
  return [s.website_url, s.instagram_url, s.facebook_url].filter((x): x is string => !!x);
}
