import { describe, expect, it } from 'vitest';
import { socialUrl, webUrl } from './social';

describe('socialUrl', () => {
  it('laisse vide un champ vide', () => {
    expect(socialUrl('instagram', '  ')).toBeNull();
  });

  it('complète un nom de compte', () => {
    expect(socialUrl('instagram', '@j4l.club')).toBe('https://www.instagram.com/j4l.club');
    expect(socialUrl('facebook', 'j4lclub')).toBe('https://www.facebook.com/j4lclub');
  });

  it('ajoute https:// et garde un lien complet', () => {
    expect(socialUrl('instagram', 'instagram.com/j4lclub')).toBe('https://instagram.com/j4lclub');
    expect(socialUrl('facebook', 'http://m.facebook.com/profile.php?id=42')).toBe('https://m.facebook.com/profile.php?id=42');
  });

  it('refuse un lien d’un autre site', () => {
    expect(() => socialUrl('instagram', 'https://facebook.com/j4lclub')).toThrow(/Instagram/);
    expect(() => socialUrl('facebook', 'monsite.fr/equipage')).toThrow(/Facebook/);
    expect(() => socialUrl('facebook', 'https://www.facebook.com/')).toThrow(/Facebook/);
    expect(() => socialUrl('instagram', 'instagram.com')).toThrow(/Instagram/);
  });
});

describe('webUrl', () => {
  it('laisse vide un champ vide', () => {
    expect(webUrl('de la cagnotte', ' ')).toBeNull();
  });

  it('ajoute https:// et garde un lien complet', () => {
    expect(webUrl('de la cagnotte', 'leetchi.com/fr/c/4l-j4l')).toBe('https://leetchi.com/fr/c/4l-j4l');
    expect(webUrl('de la cagnotte', 'https://www.helloasso.com/associations/x')).toBe('https://www.helloasso.com/associations/x');
  });

  it('refuse ce qui n’est pas une adresse web', () => {
    expect(() => webUrl('de la cagnotte', 'cagnotte')).toThrow(/cagnotte/);
    expect(() => webUrl('de la cagnotte', 'javascript:alert(1)')).toThrow(/cagnotte/);
    expect(() => webUrl('de la cagnotte', 'ma cagnotte.fr')).toThrow(/cagnotte/);
  });
});
