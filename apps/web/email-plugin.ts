/**
 * Écrit les modèles d'emails de Supabase Auth (src/lib/email-templates.ts) dans dist/email-templates/,
 * d'où le conteneur web les sert à Supabase Auth (Caddyfile, réseau Docker interne).
 */
import type { Plugin } from 'vite';
import { AUTH_EMAIL_TEMPLATES } from './src/lib/email-templates';

export function emailTemplates(): Plugin {
  return {
    name: 'trophytracker-email-templates',
    apply: 'build',
    generateBundle() {
      for (const [file, html] of Object.entries(AUTH_EMAIL_TEMPLATES)) {
        this.emitFile({ type: 'asset', fileName: `email-templates/${file}`, source: html });
      }
    },
  };
}
