/**
 * Emails envoyés aux road trips par le service tracker : relance « configure
 * ton GPS » (aucune position reçue 3 jours après la création de la page).
 * Le nom du road trip vient des utilisateurs : échappé dans le HTML et
 * débarrassé des retours à la ligne dans le sujet.
 */
import { button, emailLayout, paragraph } from './email-layout.js';
import type { Email } from './admin-emails.js';

export type GpsReminder = {
  crew_id: string;
  crew_name: string;
  crew_slug: string;
  crew_created_at: Date;
  /** Membres du road trip. */
  recipients: string[];
  /** Admins : une réponse à l'email leur arrive. */
  reply_to: string[] | null;
};

const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 120);
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const day = (d: Date) => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' });

export function buildGpsReminderEmail(r: GpsReminder, siteUrl: string): Email {
  const crew = r.crew_name.trim() || 'ton road trip';
  const gpsUrl = `${siteUrl}/mon-compte/road-trips/${encodeURIComponent(r.crew_slug)}?onglet=gps`;
  const intro = `La page de ${crew} est en ligne depuis le ${day(r.crew_created_at)}, mais nous n’avons encore reçu aucune position de ton road trip. Sans GPS, tes proches et tes sponsors ne pourront pas te suivre sur la carte.`;
  const how = 'Ça prend 5 minutes : installe l’appli gratuite Traccar Client sur le téléphone qui restera dans le véhicule, puis scanne le QR code de l’étape « Suivi GPS » de ton guide « Prêt au départ ». Tu peux faire un essai dès maintenant : tant que tu n’as pas appuyé sur « Je pars », rien ne s’affiche sur ta page.';
  const help = 'Une question, un souci avec l’appli ? Réponds simplement à cet e-mail.';
  return {
    subject: oneLine(`${crew} : ton road trip n’apparaît pas encore sur la carte`),
    text: `Bonjour,\n\n${intro}\n\n${how}\n\nConfigurer le GPS : ${gpsUrl}\n\n${help}\n\nL’équipe trophytracker`,
    html: emailLayout({
      siteUrl: esc(siteUrl),
      kicker: 'suivi GPS · rappel',
      title: `Branche le GPS de ${esc(crew)}`,
      body: paragraph(`${esc(intro)}<br><br>${esc(how)}`) + button(esc(gpsUrl), 'Configurer le GPS'),
      note: esc(help),
      footer: `Tu reçois ce rappel unique parce que tu es membre du road trip ${esc(crew)} sur trophytracker.`,
    }),
  };
}
