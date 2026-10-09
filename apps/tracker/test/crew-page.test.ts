import { describe, expect, it } from 'vitest';
import { renderCrewPage, type CrewMeta } from '../src/crew-page.js';

// Extrait du modèle produit par apps/web/seo-plugin.ts.
const TEMPLATE = [
  '<title>__SEO_NAME__ · TrophyTracker</title>',
  '<meta name="description" content="__SEO_DESCRIPTION__" />',
  '<link rel="canonical" href="__SEO_URL__" />',
  '<meta property="og:title" content="__SEO_NAME__ · TrophyTracker" />',
  '<meta property="og:image" content="__SEO_IMAGE__" />',
].join('\n');

const crew: CrewMeta = { name: 'J4L Club', tagline: 'De Paris au désert', cover_path: null, avatar_path: null };

describe('renderCrewPage', () => {
  it('remplit le titre, la description et l\'adresse canonique', () => {
    const html = renderCrewPage(TEMPLATE, 'https://exemple.fr/', 'j4l-club', crew);
    expect(html).toContain('<title>J4L Club · TrophyTracker</title>');
    expect(html).toContain('<meta property="og:title" content="J4L Club · TrophyTracker" />');
    expect(html).toContain('content="De Paris au désert"');
    expect(html).toContain('href="https://exemple.fr/road-trip/j4l-club"');
    expect(html).not.toContain('__SEO_');
  });

  it('a une description par défaut', () => {
    const html = renderCrewPage(TEMPLATE, 'https://exemple.fr', 'a-b', { ...crew, tagline: null });
    expect(html).toContain('content="Suis le road trip J4L Club en direct."');
  });

  it('échappe le texte saisi par l\'équipage', () => {
    const html = renderCrewPage(TEMPLATE, 'https://exemple.fr', 'a-b', { ...crew, name: '"><script>alert(1)</script> $& $1', tagline: null });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; $&amp; $1 · TrophyTracker');
  });

  it('choisit la couverture réduite, sinon l\'avatar, sinon l\'image du site', () => {
    const img = (c: Partial<CrewMeta>) =>
      renderCrewPage(TEMPLATE, 'https://exemple.fr', 'a-b', { ...crew, ...c }).match(/og:image" content="([^"]*)"/)?.[1];
    expect(img({ cover_path: 'id/cover 1.webp', avatar_path: 'id/a.webp' })).toBe(
      'https://exemple.fr/storage/v1/render/image/public/crew-media/id/cover%201.webp?width=1200&amp;quality=75',
    );
    expect(img({ avatar_path: 'id/a.webp' })).toBe('https://exemple.fr/storage/v1/object/public/crew-media/id/a.webp');
    expect(img({})).toBe('https://exemple.fr/og-image.png');
  });
});
