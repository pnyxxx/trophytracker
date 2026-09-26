/**
 * Accès à la base. Le rôle `tracker` ne peut appeler QUE ces fonctions (GPS et
 * file des emails admin) : même en cas de faille dans ce service, il ne peut rien
 * lire ni modifier d'autre.
 */
import postgres from 'postgres';
import type { IncomingPoint } from './points.js';
import type { AdminNotification } from './admin-emails.js';

export type IngestResult = 'stored' | 'skipped' | 'stale' | 'invalid' | 'glitch';

export function createDb(url: string, opts: { minDistanceM: number; maxSilenceS: number }) {
  const sql = postgres(url, { max: 5, onnotice: () => {} });

  return {
    sql,

    async ingest(crewId: string, p: IncomingPoint): Promise<IngestResult> {
      const [row] = await sql<{ result: IngestResult }[]>`
        select private.ingest_position(
          ${crewId}::uuid, ${p.recordedAt}, ${p.lat}, ${p.lon},
          ${p.speedKmh ?? null}, ${p.course ?? null}, ${p.altitude ?? null},
          ${p.accuracy ?? null}, ${p.battery ?? null}, ${p.source},
          ${opts.minDistanceM}, ${opts.maxSilenceS}
        ) as result`;
      return row!.result;
    },

    async crewForDeviceKey(key: string): Promise<string | null> {
      const [row] = await sql<{ id: string | null }[]>`select private.crew_for_device_key(${key}) as id`;
      return row?.id ?? null;
    },

    traccarLinks() {
      return sql<{ crew_id: string; traccar_device_id: string }[]>`select * from private.traccar_links()`;
    },

    /** Emails admin en attente, avec la liste des destinataires (les admins). */
    pendingAdminNotifications() {
      return sql<(AdminNotification & { recipients: string[] })[]>`
        select * from private.pending_admin_notifications(20)`;
    },

    async adminNotificationDone(id: number, error: string | null) {
      await sql`select private.admin_notification_done(${id}, ${error})`;
    },

    async ping() {
      await sql`select 1`;
    },

    close() {
      return sql.end({ timeout: 5 });
    },
  };
}

export type Db = ReturnType<typeof createDb>;
