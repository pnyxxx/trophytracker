import { describe, expect, it } from 'vitest';
import { isSetupRequest, renderSetupPage, traccarAppLink } from '../src/setup-page.js';

const QUERY = { id: 'tt_abcdef123456', accuracy: 'high', distance: '50', heartbeat: '300', buffer: 'true', stop_detection: 'true' };
const HTML = 'text/html,application/xhtml+xml,*/*;q=0.8';

describe('isSetupRequest', () => {
  it('reconnaît un navigateur qui ouvre le QR code', () => {
    expect(isSetupRequest(QUERY, HTML)).toBe(true);
  });

  it('laisse passer les positions envoyées par l’appli', () => {
    expect(isSetupRequest({ ...QUERY, lat: '48.1', lon: '2.3' }, HTML)).toBe(false);
    expect(isSetupRequest(QUERY, undefined)).toBe(false);
    expect(isSetupRequest(QUERY, '*/*')).toBe(false);
    expect(isSetupRequest({ accuracy: 'high' }, HTML)).toBe(false);
  });
});

describe('traccarAppLink', () => {
  it('reprend la configuration et ajoute l’adresse du serveur', () => {
    const link = traccarAppLink('https://exemple.fr/ingest/osmand', { ...QUERY, autre: 'x' });
    expect(link.startsWith('org.traccar.client://config?')).toBe(true);
    const params = new URLSearchParams(link.split('?')[1]);
    expect(params.get('id')).toBe('tt_abcdef123456');
    expect(params.get('url')).toBe('https://exemple.fr/ingest/osmand');
    expect(params.get('heartbeat')).toBe('300');
    expect(params.has('autre')).toBe(false);
  });
});

describe('renderSetupPage', () => {
  it('affiche le bouton sans montrer la clé en clair', () => {
    const html = renderSetupPage(traccarAppLink('https://exemple.fr/ingest/osmand', QUERY), true);
    expect(html).toContain('Ouvrir dans Traccar Client');
    expect(html).toContain('href="org.traccar.client://config?id=tt_abcdef123456&amp;');
    expect(html.replace(/href="[^"]*"/g, '')).not.toContain('tt_abcdef123456');
  });

  it('prévient quand la clé a été remplacée', () => {
    const html = renderSetupPage('org.traccar.client://config?id=x', false);
    expect(html).toContain('QR code périmé');
    expect(html).not.toContain('Ouvrir dans Traccar Client');
  });

  it('échappe le lien', () => {
    const html = renderSetupPage(traccarAppLink('https://exemple.fr/ingest/osmand', { id: '"><script>' }), true);
    expect(html).not.toContain('<script>');
  });
});
