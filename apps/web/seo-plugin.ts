/**
 * Référencement sans JavaScript : écrit dans le HTML envoyé par le serveur le titre, la description,
 * l'adresse canonique et l'aperçu de partage de chaque page.
 *
 * Google finit par exécuter le JavaScript, mais il lit d'abord ce HTML ; WhatsApp, Facebook, iMessage
 * ou LinkedIn, eux, ne lisent QUE lui. À la compilation, ce module produit (dans dist/) :
 *   - index.html et une page par adresse fixe (equipages.html, mentions-legales.html…), cf. seo-pages.ts ;
 *   - _shell/app.html : coquille neutre (pages de compte, page introuvable, secours) ;
 *   - _shell/crew.html : modèle des pages équipage, complété à chaque visite par le service tracker
 *     (apps/tracker/src/crew-page.ts) avec le nom, la description et la photo de l'équipage.
 * Caddy choisit le bon fichier selon l'adresse (apps/web/Caddyfile). Le composant Seo.tsx prend le relais
 * lors de la navigation dans le site.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, PAGES, SITE_NAME, SITE_URL, fullTitle, type PageSeo } from './src/lib/seo-pages';

/** Bloc remplacé dans index.html : tout ce qui se trouve entre ces deux commentaires. */
const BLOCK = /<!-- seo -->[\s\S]*?<!-- \/seo -->/;

/** Repères remplacés par le service tracker dans _shell/crew.html (jamais échappés : que des lettres). */
export const CREW_TOKENS = { name: '__SEO_NAME__', description: '__SEO_DESCRIPTION__', url: '__SEO_URL__', image: '__SEO_IMAGE__' };

interface Head {
  title: string;
  description: string;
  /** Adresse canonique ; absente pour la coquille neutre (le JavaScript la fixe). */
  url?: string;
  /** Image de partage ; par défaut celle du site (1200 × 630). */
  image?: string;
  jsonLd?: object[];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderHead(h: Head): string {
  const tags = [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    h.url && `<link rel="canonical" href="${esc(h.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    h.url && `<meta property="og:url" content="${esc(h.url)}" />`,
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.description)}" />`,
    `<meta property="og:image" content="${esc(h.image ?? `${SITE_URL}/og-image.png`)}" />`,
    ...(h.image
      ? []
      : [
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${esc(DEFAULT_TITLE)}" />`,
        ]),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(h.title)}" />`,
    `<meta name="twitter:description" content="${esc(h.description)}" />`,
    `<meta name="twitter:image" content="${esc(h.image ?? `${SITE_URL}/og-image.png`)}" />`,
    // « < » échappé : un texte ne peut pas refermer la balise <script>.
    ...(h.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ];
  return `<!-- seo -->\n    ${tags.filter(Boolean).join('\n    ')}\n    <!-- /seo -->`;
}

const pageHead = (p: string, seo: PageSeo): Head => ({
  title: fullTitle(seo.title),
  description: seo.description ?? DEFAULT_DESCRIPTION,
  url: p === '/' ? `${SITE_URL}/` : SITE_URL + p,
});

/**
 * Le site lui-même, décrit sur l'accueil : c'est là que Google cherche le nom du site.
 * alternateName lui apprend que « Trophy Tracker » (en deux mots) désigne aussi TrophyTracker.
 */
const SITE_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'Trophy Tracker',
    url: `${SITE_URL}/`,
    inLanguage: 'fr-FR',
    description: 'Suivi en direct des équipages du 4L Trophy : position, trace, photos et sponsors.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: 'Trophy Tracker',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/apple-touch-icon.png`,
  },
];

export function seoPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'trophytracker-seo',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    // En développement comme à la compilation : l'accueil.
    transformIndexHtml(html) {
      if (!BLOCK.test(html)) throw new Error('index.html : bloc <!-- seo --> … <!-- /seo --> introuvable');
      return html.replace(BLOCK, renderHead({ ...pageHead('/', PAGES['/']), jsonLd: SITE_JSON_LD }));
    },
    async writeBundle() {
      const index = await readFile(path.join(outDir, 'index.html'), 'utf8');
      const write = async (file: string, head: Head) => {
        await mkdir(path.dirname(path.join(outDir, file)), { recursive: true });
        await writeFile(path.join(outDir, file), index.replace(BLOCK, renderHead(head)));
      };

      for (const [p, seo] of Object.entries(PAGES)) {
        if (p !== '/') await write(`${p.slice(1)}.html`, pageHead(p, seo));
      }
      await write('_shell/app.html', { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION });
      await write('_shell/crew.html', {
        title: fullTitle(CREW_TOKENS.name),
        description: CREW_TOKENS.description,
        url: CREW_TOKENS.url,
        image: CREW_TOKENS.image,
      });
    },
  };
}
