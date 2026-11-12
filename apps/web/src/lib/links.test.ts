import { describe, expect, it } from 'vitest';
import { linkInfo, normalizeLink } from './links';

describe('liens d’un sponsor', () => {
  it('reconnaît les réseaux sociaux et le compte', () => {
    expect(linkInfo('https://www.instagram.com/garagedupont/')).toMatchObject({ kind: 'instagram', name: 'Instagram', account: '@garagedupont' });
    expect(linkInfo('https://m.facebook.com/GarageDupont')).toMatchObject({ kind: 'facebook', name: 'Facebook', account: '@GarageDupont' });
    expect(linkInfo('https://www.tiktok.com/@garagedupont')).toMatchObject({ kind: 'tiktok', account: '@garagedupont' });
    expect(linkInfo('https://www.linkedin.com/company/garage-dupont')).toMatchObject({ kind: 'linkedin', account: '@garage-dupont' });
    expect(linkInfo('https://twitter.com/dupont')).toMatchObject({ kind: 'x', name: 'X' });
  });

  it('un autre lien est un site, nommé par son adresse', () => {
    expect(linkInfo('https://www.garage-dupont.fr/contact')).toMatchObject({ kind: 'site', name: 'garage-dupont.fr', account: null });
  });

  it('complète ce que l’on tape', () => {
    expect(normalizeLink('@garage.dupont')).toBe('https://www.instagram.com/garage.dupont');
    expect(normalizeLink('garage-dupont.fr')).toBe('https://garage-dupont.fr');
    expect(normalizeLink('https://x.com/dupont')).toBe('https://x.com/dupont');
    expect(normalizeLink('   ')).toBeNull();
  });
});
