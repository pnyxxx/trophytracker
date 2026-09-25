/**
 * Adresse à saisir dans l'appli Traccar Client (« Server URL »).
 *
 * - En production (HTTPS) : le domaine du site, tout simplement.
 * - En local : « localhost » ne veut rien dire pour un téléphone. On affiche l'IP
 *   du PC sur le Wi-Fi (détectée par `make up` / `make dev`) et le port de Caddy.
 */
export interface IngestAddress {
  url: string;
  /** Site ouvert en local (HTTP) : le téléphone doit être sur le même Wi-Fi. */
  local: boolean;
  /** Faux si l'IP du PC n'a pas pu être détectée (l'adresse contient alors un modèle à compléter). */
  known: boolean;
}

const PATH = '/ingest/osmand';

export function ingestAddress(): IngestAddress {
  const { protocol, hostname, origin } = window.location;
  if (protocol === 'https:') return { url: `${origin}${PATH}`, local: false, known: true };

  const cfg = window.__TT_CONFIG__ ?? {};
  const port = cfg.lanPort && cfg.lanPort !== '80' ? `:${cfg.lanPort}` : '';
  if (cfg.lanIp) return { url: `http://${cfg.lanIp}${port}${PATH}`, local: true, known: true };
  // Site déjà ouvert via une IP du réseau : elle convient aussi au téléphone.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && !hostname.startsWith('127.')) {
    return { url: `http://${hostname}${port}${PATH}`, local: true, known: true };
  }
  return { url: `http://IP-DE-VOTRE-PC${port}${PATH}`, local: true, known: false };
}
