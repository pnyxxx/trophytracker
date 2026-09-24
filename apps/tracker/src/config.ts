import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Connexion Postgres avec le rôle limité `tracker`. */
  DATABASE_URL: z.url(),
  /** Derrière Caddy : lire la vraie IP du client dans X-Forwarded-For. */
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  TRACCAR_URL: z.union([z.url(), z.literal('')]).optional(),
  TRACCAR_EMAIL: z.string().optional(),
  TRACCAR_PASSWORD: z.string().optional(),
  TRACCAR_POLL_SECONDS: z.coerce.number().int().min(5).default(10),

  /** Seuils de stockage : distance minimale (m) et silence maximal (s) entre deux points. */
  TRACK_MIN_DISTANCE_M: z.coerce.number().min(0).default(15),
  TRACK_MAX_SILENCE_S: z.coerce.number().min(0).default(300),
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
