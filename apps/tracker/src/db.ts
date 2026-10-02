/**
 * Accès à la base. Le rôle `tracker` ne peut appeler QUE ces fonctions (GPS,
 * file des emails admin, liste et aperçu des équipages publics) : même en cas de faille dans ce service, il ne peut rien
 * lire ni modifier d'autre.
 */
import postgres from 'postgres';
import type { IncomingPoint } from './points.js';
import type { AdminNotification } from './admin-emails.js';
import type { CrewMeta } from './crew-page.js';

/** « test » : suivi arrêté, position gardée comme essai (hors trace). */
export type IngestResult = 'stored' | 'skipped' | 'stale' | 'invalid' | 'glitch' | 'test';

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

    /** Équipages publics (plan du site). */
    sitemapCrews() {
      return sql<{ slug: string; updated_at: Date }[]>`select * from private.sitemap_crews()`;
    },

    /** Nom, accroche et photos d'un équipage PUBLIC (null sinon) : aperçu de sa page. */
    async crewPageMeta(slug: string): Promise<CrewMeta | null> {
      const [row] = await sql<CrewMeta[]>`select * from private.crew_page_meta(${slug})`;
      return row ?? null;
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
