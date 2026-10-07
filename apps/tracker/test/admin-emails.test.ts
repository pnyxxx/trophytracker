import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('nouveau compte invité dans un road trip', () => {
    const e = buildAdminEmail({ id: 2, kind: 'new_account', payload: { name: 'Léo', email: 'leo@exemple.fr', invited_to_crew: 'J4L Club' }, created_at: at }, 'https://site.fr');
    expect(e.text).toContain('Invité dans le road trip « J4L Club »');
  });

  it('nouvel abonnement : équipage, nombre d’abonnés, lien vers sa page', () => {
    const e = buildAdminEmail({ id: 3, kind: 'new_follow', payload: { name: 'Mamie', email: 'm@exemple.fr', crew_name: 'J4L Club', crew_slug: 'j4l-club', followers: 12 }, created_at: at }, 'https://site.fr');
    expect(e.subject).toBe('⭐ Nouvel abonné pour J4L Club');
    expect(e.text).toContain('12 abonnés');
    expect(e.html).toContain('href="https://site.fr/road-trips/j4l-club"');
  });

  it('paiement Stripe : montant, total des ventes, lien vers l’administration', () => {
    const e = buildAdminEmail({ id: 5, kind: 'new_purchase', payload: { name: 'Camille', email: 'c@exemple.fr', source: 'stripe', amount_cents: 1500, currency: 'eur', paid_count: 3 }, created_at: at }, 'https://site.fr');
    expect(e.subject).toMatch(/^💶 Paiement reçu : 15,00\s€$/); // Intl met une espace insécable fine
    expect(e.text).toMatch(/Camille \(c@exemple\.fr\) a payé 15,00\s€/);
    expect(e.text).toContain('3 accès payés au total.');
    expect(e.text).not.toContain('Code :');
    expect(e.html).toContain('href="https://site.fr/admin"');
  });

  it('code d’accès utilisé : le code et sa note', () => {
    const e = buildAdminEmail({ id: 6, kind: 'new_purchase', payload: { name: 'Léo', email: 'leo@exemple.fr', source: 'code', amount_cents: 0, currency: 'eur', code: '4L-K7QM-2XRP', code_note: 'Partenaire', paid_count: 1 }, created_at: at }, 'https://site.fr');
    expect(e.subject).toBe('🎟️ Code d’accès utilisé : Léo');
    expect(e.text).toContain('Code : 4L-K7QM-2XRP (Partenaire)');
    expect(e.text).toContain('1 accès obtenu par code au total.');
  });

  it('un nom piégé ne peut ni injecter du HTML ni casser le sujet', () => {
    const e = buildAdminEmail({ id: 4, kind: 'new_account', payload: { name: '<img src=x onerror=alert(1)>\r\nBcc: x@y.z', email: 'a@b.c' }, created_at: at }, 'https://site.fr');
    expect(e.html).not.toContain('<img src=x');
    expect(e.html).toContain('&lt;img');
    expect(e.subject).not.toMatch(/[\r\n]/);
  });
});

describe('mise en page des emails', () => {
  it('reste identique à celle des emails du site', () => {
    const block = (s: string) => s.slice(s.indexOf('const C = {'), s.indexOf('</html>'));
    const web = readFileSync(new URL('../../web/src/lib/email-templates.ts', import.meta.url), 'utf8');
    const tracker = readFileSync(new URL('../src/email-layout.ts', import.meta.url), 'utf8');
    expect(block(tracker).length).toBeGreaterThan(1000);
    expect(block(tracker)).toBe(block(web));
  });
});
