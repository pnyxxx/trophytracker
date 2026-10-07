import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Connexion Postgres avec le rôle limité `tracker`. */
  DATABASE_URL: z.url(),
  /** Derrière Caddy : lire la vraie IP du client dans X-Forwarded-For. */
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  /** Pause du service : ni démo, ni synchronisation Traccar, ni emails (le site public n'affiche qu'une page « pause »). */
  SITE_PAUSED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  TRACCAR_URL: z.union([z.url(), z.literal('')]).optional(),
  TRACCAR_EMAIL: z.string().optional(),
  TRACCAR_PASSWORD: z.string().optional(),
  TRACCAR_POLL_SECONDS: z.coerce.number().int().min(5).default(10),

  /** Emails aux admins (nouveau compte, abonné, accès payé, relance GPS) et relances GPS aux équipages : même SMTP que le site. Vide = désactivé. */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Docker Compose passe une chaîne vide quand la variable n'est pas définie : même effet qu'absente.
  SMTP_ADMIN_EMAIL: z.string().optional().transform((v) => v || 'noreply@trophytracker.local'),
  SMTP_SENDER_NAME: z.string().optional().transform((v) => v || 'TrophyTracker'),
  /** Adresse publique du site (liens dans les emails). */
  SITE_URL: z.string().optional().transform((v) => v || 'http://localhost'),
  /** Site web vu depuis le réseau Docker : modèles HTML des pages équipage (/_shell/…). */
  WEB_INTERNAL_URL: z.string().optional().transform((v) => v || 'http://web'),
  NOTIFY_POLL_SECONDS: z.coerce.number().int().min(5).default(30),

  /** Seuils de stockage : distance minimale (m) et silence maximal (s) entre deux points à l'arrêt. */
  TRACK_MIN_DISTANCE_M: z.coerce.number().min(0).default(15),
  TRACK_MAX_SILENCE_S: z.coerce.number().min(0).default(1800),
});

export type Config = z.infer<typeof schema>;

/** Lit et valide la configuration ; arrête le processus avec un message clair si elle est invalide. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    console.error('Configuration invalide :\n' + parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'));
    process.exit(1);
  }
  return parsed.data;
}
