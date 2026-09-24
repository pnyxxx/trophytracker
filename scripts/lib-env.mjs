// Lecture du .env racine pour les scripts Node (sans dépendance).
import { readFileSync } from 'node:fs';

export function loadEnv() {
  const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  return Object.fromEntries(
    text
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
}
