/**
 * Accès à la base. Le rôle `tracker` ne peut appeler QUE ces fonctions (GPS,
 * files des emails admin et des relances GPS, liste et aperçu des road trips publics, équipage de
 * démo) : même en cas de faille dans ce service, il ne peut rien lire ni modifier d'autre.
 */
import postgres from 'postgres';
import type { IncomingPoint } from './points.js';
import type { AdminNotification } from './admin-emails.js';
import type { GpsReminder } from './crew-emails.js';
import type { CrewMeta } from './crew-page.js';
import type { TripMail } from './trip-emails.js';

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

    /** Équipages à relancer (« configurez votre GPS »), avec leurs membres et les admins. */
    pendingGpsReminders() {
      return sql<GpsReminder[]>`select * from private.pending_gps_reminders(10)`;
    },

    async gpsReminderDone(crewId: string, error: string | null) {
      await sql`select private.gps_reminder_done(${crewId}::uuid, ${error})`;
    },

    /** Ajoute les résumés du soir à la file (sans effet avant 21 h, heure de Paris). */
    async queueEveningDigests(): Promise<number> {
      const [row] = await sql<{ n: number }[]>`select private.queue_evening_digests() as n`;
      return row?.n ?? 0;
    },

    /** E-mails du voyage à envoyer aux proches (invitation, « C'est parti », résumé du soir). */
    pendingTripMails() {
      return sql<TripMail[]>`select * from private.pending_trip_mails(50)`;
    },

    async tripMailDone(id: number, error: string | null) {
      await sql`select private.trip_mail_done(${id}, ${error})`;
    },

    /** Équipages publics (plan du site). */
    sitemapCrews() {
      return sql<{ slug: string; updated_at: Date }[]>`select * from private.sitemap_crews()`;
    },

    /** Nom, accroche et photos d'un road trip PUBLIC (null sinon) : aperçu de sa page. */
    async crewPageMeta(slug: string): Promise<CrewMeta | null> {
      const [row] = await sql<CrewMeta[]>`select * from private.crew_page_meta(${slug})`;
      return row ?? null;
    },

    /** L'équipage de démonstration et l'heure de sa dernière position (null s'il n'y en a pas). */
    async demoCrew(): Promise<{ id: string; last_fix_at: Date | null } | null> {
      const [row] = await sql<{ id: string; last_fix_at: Date | null }[]>`select * from private.demo_crew()`;
      return row ?? null;
    },

    /** Efface la trace du road trip de démo (et lui seul) pour un nouveau tour. */
    async demoRestart() {
      await sql`select private.demo_restart()`;
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
