import { describe, expect, it } from 'vitest';
import { buildAdminEmail } from '../src/admin-emails.js';

const at = new Date('2026-10-02T14:30:00Z');

describe('emails aux admins', () => {
  it('nouveau compte : nom, email, lien vers l’administration', () => {
    const e = buildAdminEmail({ id: 1, kind: 'new_account', payload: { name: 'Camille', email: 'camille@exemple.fr' }, created_at: at }, 'https://site.fr');
    expect(e.subject).toBe('👤 Nouveau compte : Camille');
    expect(e.text).toContain('Camille (camille@exemple.fr)');
    expect(e.text).toContain('2 octobre 2026 à 16:30'); // heure de Paris
    expect(e.html).toContain('href="https://site.fr/admin"');
  });

  it('nouveau compte invité dans un équipage', () => {
    const e = buildAdminEmail({ id: 2, kind: 'new_account', payload: { name: 'Léo', email: 'leo@exemple.fr', invited_to_crew: 'J4L Club' }, created_at: at }, 'https://site.fr');
    expect(e.text).toContain('Invité dans l’équipage « J4L Club »');
  });

  it('nouvel abonnement : équipage, nombre d’abonnés, lien vers sa page', () => {
    const e = buildAdminEmail({ id: 3, kind: 'new_follow', payload: { name: 'Mamie', email: 'm@exemple.fr', crew_name: 'J4L Club', crew_slug: 'j4l-club', followers: 12 }, created_at: at }, 'https://site.fr');
    expect(e.subject).toBe('⭐ Nouvel abonné pour J4L Club');
    expect(e.text).toContain('12 abonnés');
    expect(e.html).toContain('href="https://site.fr/equipages/j4l-club"');
  });

  it('un nom piégé ne peut ni injecter du HTML ni casser le sujet', () => {
    const e = buildAdminEmail({ id: 4, kind: 'new_account', payload: { name: '<img src=x onerror=alert(1)>\r\nBcc: x@y.z', email: 'a@b.c' }, created_at: at }, 'https://site.fr');
    expect(e.html).not.toContain('<img');
    expect(e.html).toContain('&lt;img');
    expect(e.subject).not.toMatch(/[\r\n]/);
  });
});
