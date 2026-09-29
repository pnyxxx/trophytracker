/** Plan du site (sitemap.xml) : pages fixes + équipages publics, pour Google et Bing. */

export interface SitemapCrew {
  slug: string;
  updated_at: Date | string;
}

/** Pages fixes, de la plus importante à la moins importante. Les comptes et l'admin n'y figurent pas (noindex). */
const PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/equipages', priority: '0.9', changefreq: 'daily' },
  { path: '/inscription', priority: '0.6', changefreq: 'monthly' },
  { path: '/mentions-legales', priority: '0.2', changefreq: 'yearly' },
  { path: '/confidentialite', priority: '0.2', changefreq: 'yearly' },
  { path: '/conditions-utilisation', priority: '0.2', changefreq: 'yearly' },
  { path: '/conditions-vente', priority: '0.2', changefreq: 'yearly' },
];

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export function buildSitemap(siteUrl: string, crews: SitemapCrew[]): string {
  const base = siteUrl.replace(/\/$/, '');
  const entry = (path: string, priority: string, changefreq: string, lastmod?: Date | string) =>
    `  <url>\n    <loc>${escapeXml(base + path)}</loc>\n${lastmod ? `    <lastmod>${day(lastmod)}</lastmod>\n` : ''}` +
    `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  const urls = [
    ...PAGES.map((p) => entry(p.path, p.priority, p.changefreq)),
    ...crews.map((c) => entry(`/equipages/${c.slug}`, '0.8', 'daily', c.updated_at)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
