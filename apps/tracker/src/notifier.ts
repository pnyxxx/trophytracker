/**
 * Envoi des emails automatiques, toutes les `pollSeconds`, par SMTP (le même
 * serveur que les emails du site) :
 *   - relances « configurez votre GPS » aux road trips (private.pending_gps_reminders),
 *     dont l'envoi ajoute une notification pour les admins ;
 *   - emails aux admins (file private.admin_notifications).
 * Un échec est retenté au tour suivant (5 essais au plus, compté par la base) ;
 * les tours ne se chevauchent jamais.
 */
import nodemailer from 'nodemailer';
import type { Db } from './db.js';
import { buildAdminEmail } from './admin-emails.js';
import { buildGpsReminderEmail } from './crew-emails.js';

export type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  fromName: string;
};

export function startAdminNotifier(db: Db, smtp: SmtpConfig, siteUrl: string, pollSeconds: number, log: (msg: string) => void) {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;

  async function tick() {
    // Les relances d'abord : leur envoi crée la notification admin, envoyée dans la foulée.
    try {
      for (const r of await db.pendingGpsReminders()) {
        const email = buildGpsReminderEmail(r, siteUrl);
        try {
          await transport.sendMail({
            from: { name: smtp.fromName, address: smtp.from },
            to: r.recipients,
            replyTo: r.reply_to ?? undefined,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
          await db.gpsReminderDone(r.crew_id, null);
          log(`relance GPS envoyée (équipage ${r.crew_id.slice(0, 8)})`);
        } catch (e) {
          await db.gpsReminderDone(r.crew_id, (e as Error).message);
          log(`relance GPS ${r.crew_id.slice(0, 8)} non envoyée : ${(e as Error).message}`);
        }
      }
    } catch (e) {
      log(`relances GPS illisibles : ${(e as Error).message}`);
    }
    try {
      for (const n of await db.pendingAdminNotifications()) {
        const email = buildAdminEmail(n, siteUrl);
        try {
          await transport.sendMail({
            from: { name: smtp.fromName, address: smtp.from },
            to: n.recipients,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
          await db.adminNotificationDone(n.id, null);
          log(`email admin envoyé (${n.kind} #${n.id})`);
        } catch (e) {
          await db.adminNotificationDone(n.id, (e as Error).message);
          log(`email admin #${n.id} non envoyé : ${(e as Error).message}`);
        }
      }
    } catch (e) {
      log(`file des emails admin illisible : ${(e as Error).message}`);
    }
    if (!stopped) timer = setTimeout(tick, pollSeconds * 1000);
  }

  timer = setTimeout(tick, 5_000);
  return () => {
    stopped = true;
    clearTimeout(timer);
    transport.close();
  };
}
