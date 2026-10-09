import { chromium } from 'playwright';
const base = process.argv[2];
const b = await chromium.launch();
for (const path of ['/', '/road-trip/exemple', '/connexion', '/inscription', '/creer', '/confidentialite', '/page-inexistante']) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(base + path, { waitUntil: 'networkidle' }).catch((e) => errs.push('goto ' + e.message.slice(0, 100)));
  await p.waitForTimeout(1500);
  const len = (await p.locator('#root').innerHTML().catch(() => '')).length;
  console.log(path.padEnd(22), len > 500 ? 'OK ' : 'VIDE', len, errs.join(' | '));
  await p.close();
}
await b.close();
