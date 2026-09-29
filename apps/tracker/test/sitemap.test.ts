import { describe, expect, it } from 'vitest';
import { buildSitemap } from '../src/sitemap.js';

describe('buildSitemap', () => {
  const xml = buildSitemap('https://exemple.fr/', [
    { slug: 'j4l-club', updated_at: new Date('2026-09-28T10:00:00Z') },
    { slug: 'a-b', updated_at: '2026-09-01T00:00:00Z' },
  ]);

  it('liste les pages fixes avec une adresse absolue', () => {
    expect(xml).toContain('<loc>https://exemple.fr/</loc>');
    expect(xml).toContain('<loc>https://exemple.fr/equipages</loc>');
  });

  it('ajoute chaque équipage avec sa date de mise à jour', () => {
    expect(xml).toContain('<loc>https://exemple.fr/equipages/j4l-club</loc>\n    <lastmod>2026-09-28</lastmod>');
    expect(xml).toContain('<loc>https://exemple.fr/equipages/a-b</loc>\n    <lastmod>2026-09-01</lastmod>');
  });

  it('n\'expose ni les comptes ni l\'administration', () => {
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/mon-compte');
    expect(xml).not.toContain('/connexion');
  });

  it('échappe les caractères spéciaux', () => {
    expect(buildSitemap('https://exemple.fr?a=1&b=2', [])).toContain('&amp;');
  });
});
