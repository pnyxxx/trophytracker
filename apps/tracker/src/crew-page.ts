/**
 * Page d'un road trip telle que l'envoie le serveur : le modèle HTML du site (_shell/crew.html, produit par
 * apps/web/seo-plugin.ts) complété avec le nom, la description et la photo du road trip.
 * Google et les aperçus de partage (WhatsApp, Facebook, iMessage…) les lisent sans exécuter le JavaScript.
 */

export interface CrewMeta {
  name: string;
  tagline: string | null;
  cover_path: string | null;
  avatar_path: string | null;
}

/** Repères du modèle : mêmes valeurs que CREW_TOKENS dans apps/web/seo-plugin.ts. */
const TOKENS = { name: '__SEO_NAME__', description: '__SEO_DESCRIPTION__', url: '__SEO_URL__', image: '__SEO_IMAGE__' };

const MEDIA_BUCKET = 'crew-media';

/** Format des adresses d'équipage (contrainte de la table crews) : tout le reste est introuvable. */
export const CREW_SLUG = /^[a-z0-9][a-z0-9-]{1,59}$/;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const storagePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

export function renderCrewPage(template: string, siteUrl: string, slug: string, crew: CrewMeta): string {
  const base = siteUrl.replace(/\/$/, '');
  // Même texte par défaut que la page React (apps/web/src/pages/CrewPage.tsx).
  const description = crew.tagline ?? `Suivez le road trip ${crew.name} en direct.`;
  // Couverture réduite à 1200 px de large (taille conseillée pour les aperçus, et bien plus légère).
  const image = crew.cover_path
    ? `${base}/storage/v1/render/image/public/${MEDIA_BUCKET}/${storagePath(crew.cover_path)}?width=1200&quality=75`
    : crew.avatar_path
      ? `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath(crew.avatar_path)}`
      : `${base}/og-image.png`;

  const values = { name: crew.name, description, url: `${base}/road-trips/${slug}`, image };
  let html = template;
  for (const key of Object.keys(TOKENS) as (keyof typeof TOKENS)[]) {
    // Fonction de remplacement : un « $ » dans le nom d'un road trip reste un simple caractère.
    html = html.replaceAll(TOKENS[key], () => escapeHtml(values[key]));
  }
  return html;
}
