/**
 * Page « Régler Traccar Client », servie quand on scanne le QR code de configuration avec
 * l'APPAREIL PHOTO au lieu du scanner de l'appli.
 *
 * Le QR code du site contient l'adresse de réception GPS suivie des réglages
 * (…/ingest/osmand?id=<clé>&accuracy=high…) : c'est le format prévu par le scanner de
 * Traccar Client. Ouverte dans un navigateur, cette adresse renvoyait une erreur ; elle
 * affiche maintenant un bouton qui ouvre l'appli avec la même configuration
 * (org.traccar.client://config?url=…&id=…). Un seul QR code marche donc dans les deux cas.
 */

/** Réglages transmis à l'appli (les autres paramètres de l'adresse sont ignorés). */
const SETTINGS = ['id', 'accuracy', 'distance', 'heartbeat', 'buffer', 'stop_detection'] as const;

/** Un navigateur qui ouvre l'adresse : pas de position, et une page HTML demandée. */
export function isSetupRequest(query: unknown, accept: string | undefined): query is Record<string, string> & { id: string } {
  if (!query || typeof query !== 'object' || !accept?.includes('text/html')) return false;
  const q = query as Record<string, unknown>;
  return typeof q.id === 'string' && q.lat === undefined && q.lon === undefined;
}

/** Lien qui ouvre Traccar Client et lui propose la configuration (« Apply new configuration? »). */
export function traccarAppLink(serverUrl: string, query: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const k of SETTINGS) if (typeof query[k] === 'string') params.set(k, query[k]);
  params.set('url', serverUrl);
  return `org.traccar.client://config?${params.toString()}`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const STORES = [
  { label: 'Android · Google Play', href: 'https://play.google.com/store/apps/details?id=org.traccar.client' },
  { label: 'iPhone · App Store', href: 'https://apps.apple.com/app/traccar-client/id843156974' },
];

/** Page autonome (aucune ressource externe) ; la clé n'y est jamais affichée en clair. */
export function renderSetupPage(appLink: string, keyKnown: boolean): string {
  const body = keyKnown
    ? `<h1>Régler le suivi GPS</h1>
  <p>Ce téléphone va envoyer la position du road trip. Touchez le bouton, puis répondez <strong>OK</strong> à « Apply new configuration? ».</p>
  <a class="btn" href="${escapeHtml(appLink)}">Ouvrir dans Traccar Client</a>
  <p class="small">Rien ne se passe ? Installez d’abord l’appli gratuite <strong>Traccar Client</strong>, puis scannez à nouveau le QR code.</p>
  <p class="stores">${STORES.map((s) => `<a href="${s.href}">${s.label}</a>`).join('')}</p>`
    : `<h1>QR code périmé</h1>
  <p>Cette clé n’est plus active : une nouvelle clé a sans doute été générée depuis.</p>
  <p>Ouvrez l’onglet <strong>GPS</strong> de votre espace road trip sur trophytracker.fr et scannez le nouveau QR code.</p>`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Régler Traccar Client · trophytracker</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px;
         box-sizing: border-box; background: #120F0C; color: #F3EADB; font: 16px/1.5 system-ui, -apple-system, sans-serif; }
  main { max-width: 420px; width: 100%; }
  .brand { font-weight: 900; letter-spacing: .02em; text-transform: uppercase; margin: 0 0 32px; }
  .brand span { color: #DB4740; }
  h1 { font-size: 32px; line-height: 1.05; text-transform: uppercase; margin: 0 0 16px; }
  p { color: #D6C8B4; margin: 0 0 20px; }
  strong { color: #F3EADB; }
  .btn { display: block; text-align: center; background: #DB4740; color: #fff; text-decoration: none; font-weight: 700;
         text-transform: uppercase; letter-spacing: .08em; padding: 18px; border-radius: 4px; margin: 0 0 24px; }
  .small { font-size: 14px; }
  .stores { display: flex; flex-direction: column; gap: 8px; }
  .stores a { color: #F3EADB; border: 1px solid rgba(243,234,219,.25); border-radius: 4px; padding: 10px 12px; text-decoration: none; font-size: 14px; }
</style>
</head>
<body>
<main>
  <p class="brand">Trophy<span>Tracker</span></p>
  ${body}
</main>
</body>
</html>`;
}
