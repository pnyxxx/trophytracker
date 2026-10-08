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

  it('connexion et inscription : un code à 6 chiffres, jamais de lien', () => {
    for (const f of ['confirmation.html', 'recovery.html', 'magic-link.html', 'reauthentication.html']) {
      expect(AUTH_EMAIL_TEMPLATES[f]).toContain('{{ .Token }}');
      expect(AUTH_EMAIL_TEMPLATES[f]).not.toContain('{{ .ConfirmationURL }}');
    }
  });

  it('chaque email d’action contient son lien', () => {
    expect(AUTH_EMAIL_TEMPLATES['email-change.html']).toContain('href="{{ .ConfirmationURL }}"');
    expect(AUTH_EMAIL_TEMPLATES['invite.html']).toContain('href="{{ .SiteURL }}/invitation?token_hash={{ .TokenHash }}&type=invite"');
  });

  it('plus aucune mention de mot de passe', () => {
    for (const html of Object.values(AUTH_EMAIL_TEMPLATES).filter((h) => !h.includes('Mot de passe modifié'))) {
      expect(html).not.toMatch(/mot de passe/i);
    }
  });

  it('mise en page commune : logo, nom en minuscules, pied de page, sans emoji', () => {
    for (const html of Object.values(AUTH_EMAIL_TEMPLATES)) {
      expect(html).toContain('src="{{ .SiteURL }}/email-logo.png"');
      expect(html).toContain('trophy<span style="color:#E1262C">tracker</span>');
      expect(html).toContain('le carnet de route en direct de vos road trips');
      expect(html).not.toContain('TrophyTracker');
      expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
