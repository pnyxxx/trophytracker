import { describe, expect, it } from 'vitest';
import { AUTH_EMAIL_TEMPLATES } from './email-templates';

/** Fichiers demandés par Supabase Auth (infra/supabase.override.yml). */
const FILES = [
  'confirmation.html', 'recovery.html', 'magic-link.html', 'email-change.html', 'invite.html', 'reauthentication.html',
  'password-changed.html', 'email-changed.html', 'phone-changed.html', 'identity-linked.html', 'identity-unlinked.html',
  'mfa-enrolled.html', 'mfa-unenrolled.html',
];

describe('modèles d’emails de Supabase Auth', () => {
  it('fournit exactement les modèles attendus', () => {
    expect(Object.keys(AUTH_EMAIL_TEMPLATES).sort()).toEqual([...FILES].sort());
  });

  it('chaque email d’action contient son lien', () => {
    for (const f of ['confirmation.html', 'recovery.html', 'magic-link.html', 'email-change.html']) {
      expect(AUTH_EMAIL_TEMPLATES[f]).toContain('href="{{ .ConfirmationURL }}"');
    }
    expect(AUTH_EMAIL_TEMPLATES['invite.html']).toContain('href="{{ .SiteURL }}/invitation?token_hash={{ .TokenHash }}&type=invite"');
    expect(AUTH_EMAIL_TEMPLATES['reauthentication.html']).toContain('{{ .Token }}');
  });

  it('mise en page commune : logo, signature, route, sans emoji', () => {
    for (const html of Object.values(AUTH_EMAIL_TEMPLATES)) {
      expect(html).toContain('src="{{ .SiteURL }}/email-logo.png"');
      expect(html).toContain('Par un trophyste, pour les trophystes');
      expect(html).toContain('Marrakech');
      expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
