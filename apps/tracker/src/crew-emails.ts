/**
 * Emails envoyés aux équipages par le service tracker : relance « configurez
 * votre GPS » (aucune position reçue 3 jours après la création de la page).
 * Le nom de l'équipage vient des utilisateurs : échappé dans le HTML et
 * débarrassé des retours à la ligne dans le sujet.
 */
import { button, emailLayout, paragraph } from './email-layout.js';
import type { Email } from './admin-emails.js';

export type GpsReminder = {
  crew_id: string;
  crew_name: string;
  crew_slug: string;
  crew_created_at: Date;
  /** Membres de l'équipage. */
  recipients: string[];
  /** Admins : une réponse à l'email leur arrive. */
  reply_to: string[] | null;
};

const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 120);
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const day = (d: Date) => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' });

export function buildGpsReminderEmail(r: GpsReminder, siteUrl: string): Email {
  const crew = r.crew_name.trim() || 'votre équipage';
  const gpsUrl = `${siteUrl}/mon-compte/equipages/${encodeURIComponent(r.crew_slug)}?onglet=gps`;
  const intro = `La page de ${crew} est en ligne depuis le ${day(r.crew_created_at)}, mais nous n’avons encore reçu aucune position de votre voyage. Sans GPS, vos proches et vos sponsors ne pourront pas vous suivre sur la carte.`;
  const how = 'Ça prend 5 minutes : installez l’appli gratuite Traccar Client sur le téléphone qui restera dans le véhicule, puis scannez le QR code de l’onglet GPS. Vous pouvez faire un essai dès maintenant : en mode essai, rien ne s’affiche sur votre page publique.';
  const help = 'Une question, un souci avec l’appli ? Répondez simplement à cet email.';
  return {
    subject: oneLine(`📡 ${crew} : votre voyage n’apparaît pas encore sur la carte`),
    text: `Bonjour,\n\n${intro}\n\n${how}\n\nConfigurer le GPS : ${gpsUrl}\n\n${help}\n\nL’équipe TrophyTracker`,
    html: emailLayout({
      siteUrl: esc(siteUrl),
      kicker: 'GPS · Rappel',
      title: `Branchez le GPS de ${esc(crew)}`,
      body: paragraph(`${esc(intro)}<br><br>${esc(how)}`) + button(esc(gpsUrl), 'Configurer le GPS'),
      note: esc(help),
      footer: `Vous recevez ce rappel unique parce que vous êtes membre de l’équipage ${esc(crew)} sur TrophyTracker.`,
    }),
  };
}
