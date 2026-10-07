import { describe, expect, it } from 'vitest';
import { buildGpsReminderEmail } from '../src/crew-emails.js';
import { buildAdminEmail } from '../src/admin-emails.js';

const reminder = {
  crew_id: '00000000-0000-0000-0000-00000000aa01',
  crew_name: 'Breizh en sables',
  crew_slug: 'breizh-en-sables',
  crew_created_at: new Date('2026-10-05T19:10:00Z'),
  recipients: ['a@exemple.fr'],
  reply_to: ['admin@exemple.fr'],
};

describe('relance « configurez votre GPS »', () => {
  it('nomme l’équipage, la date de création et mène à l’onglet GPS', () => {
    const e = buildGpsReminderEmail(reminder, 'https://site.fr');
    expect(e.subject).toBe('📡 Breizh en sables : votre voyage n’apparaît pas encore sur la carte');
    expect(e.text).toContain('en ligne depuis le 5 octobre');
    expect(e.text).toContain('https://site.fr/mon-compte/equipages/breizh-en-sables?onglet=gps');
    expect(e.html).toContain('href="https://site.fr/mon-compte/equipages/breizh-en-sables?onglet=gps"');
    expect(e.html).toContain('Traccar Client');
  });

  it('un nom piégé ne peut ni injecter du HTML ni casser le sujet', () => {
    const e = buildGpsReminderEmail({ ...reminder, crew_name: '<script>x</script>\r\nBcc: x@y.z' }, 'https://site.fr');
    expect(e.html).not.toContain('<script>');
    expect(e.subject).not.toMatch(/[\r\n]/);
  });

  it('les admins sont prévenus, avec les membres relancés', () => {
    const e = buildAdminEmail({
      id: 7, kind: 'gps_reminder', created_at: new Date('2026-10-08T08:00:00Z'),
      payload: { crew_name: 'Breizh en sables', crew_slug: 'breizh-en-sables', crew_created_at: '2026-10-05T19:10:00+00:00', members: 'Yann (y@exemple.fr)' },
    }, 'https://site.fr');
    expect(e.subject).toBe('📡 Relance GPS envoyée : Breizh en sables');
    expect(e.text).toContain('Yann (y@exemple.fr)');
    expect(e.html).toContain('href="https://site.fr/equipages/breizh-en-sables"');
  });
});
