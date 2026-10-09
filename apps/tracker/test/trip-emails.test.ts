import { describe, expect, it } from 'vitest';
import { buildTripEmail, heroUrl, names, type TripMail } from '../src/trip-emails.js';

const base = {
  name: 'Bergen → Lofoten', slug: 'bergen-lofoten-k7f2', city: 'Bergen', destination: 'Lofoten',
  starts_on: '2026-08-02', ends_on: '2026-08-15', trip_type: 'van', start_lat: 60.39, start_lon: 5.32, travellers: ['Léa', 'Sam', 'Noé'],
};
const mail = (kind: TripMail['kind'], extra = {}): TripMail => ({ id: 1, kind, email: 'mamie@exemple.fr', unsub_token: 'tok-123', payload: { ...base, ...extra } });

describe('e-mails du voyage', () => {
  it('nomme les voyageurs', () => {
    expect(names(['Léa'])).toBe('Léa');
    expect(names(['Léa', 'Sam'])).toBe('Léa et Sam');
    expect(names(['Léa', 'Sam', 'Noé'])).toBe('Léa, Sam et Noé');
    expect(names([])).toBe('Les voyageurs');
  });

  it('invitation d’un proche : qui, où, le lien et la désinscription', () => {
    const e = buildTripEmail(mail('invite', { inviter: 'Léa' }), 'https://site.fr');
    expect(e.subject).toBe('Léa t’invite à suivre son road trip');
    expect(e.text).toContain('Léa part de Bergen le 2 août pour Lofoten en van.');
    expect(e.html).toContain('href="https://site.fr/t/bergen-lofoten-k7f2"');
    expect(e.unsubscribeUrl).toBe('https://site.fr/desabonnement?t=tok-123');
    expect(e.html).toContain('Ne plus rien recevoir');
  });

  it('« C’est parti » : fond nuit, image du départ, durée', () => {
    const e = buildTripEmail(mail('departure'), 'https://site.fr', new Date('2026-08-02T06:14:00Z'));
    expect(e.subject).toBe('C’est parti ! Bergen → Lofoten a pris la route');
    expect(e.text).toContain('Léa, Sam et Noé viennent de partir de Bergen. Direction Lofoten, 14 jours de route.');
    expect(e.html).toContain('dimanche 2 août · 08:14 · Bergen');
    expect(e.html).toContain('World_Imagery/MapServer/export?bbox=4.670,60.110,5.970,60.670');
    expect(heroUrl({ ...base, start_lat: null })).toBeUndefined();
  });

  it('résumé du soir : étapes, chiffres, journal', () => {
    const e = buildTripEmail(mail('evening', {
      day: '2026-08-10', day_number: 9, total_days: 14, distance_km: 84, max_altitude_m: 1434, photos: 18,
      stages: ['Geiranger', 'Trollstigen'], journal: { title: 'Onze lacets', body: 'Le brouillard s’est ouvert.' },
    }), 'https://site.fr');
    expect(e.subject).toBe('Bergen → Lofoten · jour 9 / 14 : 84 km aujourd’hui');
    expect(e.html).toContain('Geiranger → Trollstigen');
    expect(e.html).toContain('jour 9 / 14');
    expect(e.html).toMatch(/1\s434 m/); // Intl met une espace insécable fine
    expect(e.html).toContain('Onze lacets');
    expect(e.html).toContain('href="https://site.fr/t/bergen-lofoten-k7f2#carnet"');
    expect(e.html).toContain('Ne plus le recevoir');
  });

  it('échappe ce qui vient des voyageurs et garde les sujets sur une ligne', () => {
    const e = buildTripEmail(mail('invite', { inviter: '<b>Léa</b>\nnuit', name: '<script>x</script>' }), 'https://site.fr');
    expect(e.html).not.toContain('<script>');
    expect(e.html).not.toContain('<b>Léa</b>');
    expect(e.subject).not.toMatch(/[\r\n]/);
  });
});
