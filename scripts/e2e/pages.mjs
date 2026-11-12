/**
 * Ouvre les pages publiques du site construit (Caddy, comme en production) dans un vrai navigateur et vérifie
 * qu'elles s'affichent sans erreur JavaScript. Garde-fou contre la page blanche du 9 octobre 2026 (dépendance
 * circulaire entre fichiers JS, invisible en développement et pour les autres tests).
 *   node scripts/e2e/pages.mjs            (stack lancée : make up)
 */
import { chromium } from 'playwright';
import { loadEnv } from '../lib-env.mjs';

const env = loadEnv();
const SITE = env.SITE_URL.replace(/\/$/, '');
const PAGES = ['/', '/road-trip/exemple', '/connexion', '/inscription', '/creer', '/confidentialite', '/conditions-vente', '/page-inexistante'];

// CHROMIUM_PATH : utiliser un Chromium déjà installé (ex. /usr/bin/chromium-browser) plutôt que celui de Playwright.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failed = 0;
for (const path of PAGES) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // « load » + délai, pas « networkidle » : une page en direct (positions, tuiles de carte) n'est jamais
  // silencieuse sur le réseau. Les erreurs JavaScript et la page blanche restent détectées.
  await page.goto(SITE + path, { waitUntil: 'load' }).catch((e) => errors.push(e.message));
  await page.waitForTimeout(2500);
  const size = (await page.locator('#root').innerHTML().catch(() => '')).length;
  const ok = size > 500 && errors.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${path} s’affiche${ok ? '' : ` (contenu : ${size} caractères${errors.length ? `, erreur : ${errors[0].slice(0, 160)}` : ''})`}`);
  await page.close();
}
await browser.close();
if (failed) {
  console.error(`❌ ${failed} page(s) ne s’affichent pas`);
  process.exit(1);
}
console.log('✅ Toutes les pages s’affichent dans le navigateur');
