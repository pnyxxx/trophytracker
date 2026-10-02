import { describe, expect, it } from 'vitest';
import { socialUrl } from './social';

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
