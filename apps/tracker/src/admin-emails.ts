/**
 * Contenu des emails envoyés aux admins (nouveau compte, nouvel abonnement).
 * Les noms viennent des utilisateurs : ils sont échappés dans le HTML et
 * débarrassés des retours à la ligne dans le sujet.
 */
import { button, emailLayout, paragraph, rows } from './email-layout.js';

export type AdminNotification = {
  id: number;
  kind: 'new_account' | 'new_follow';
  payload: Record<string, unknown>;
  created_at: Date;
};

export type Email = { subject: string; text: string; html: string };

const str = (v: unknown, fallback = '—') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 120);
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const when = (d: Date) =>
  d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' });

const FOOTER = 'Vous recevez cet email parce que vous êtes administrateur de TrophyTracker.';

/** Mise en page commune : celle des emails du site, avec les détails en lignes « étiquette : valeur ». */
function layout(siteUrl: string, kicker: string, title: string, intro: string, details: [string, string][], href: string, label: string) {
  return emailLayout({
    siteUrl: esc(siteUrl),
    kicker,
    title: esc(title),
    body: paragraph(intro) + rows(details.map(([k, v]) => [k, esc(v)])) + button(esc(href), esc(label)),
    footer: FOOTER,
  });
}

export function buildAdminEmail(n: AdminNotification, siteUrl: string): Email {
  const p = n.payload;
  const name = str(p.name, 'Sans nom');
  const email = str(p.email);

  if (n.kind === 'new_account') {
    const invited = typeof p.invited_to_crew === 'string' && p.invited_to_crew ? p.invited_to_crew : null;
    const via = p.provider === 'google' ? ' (connexion Google)' : '';
    const title = `Nouveau compte : ${name}`;
    const detail = invited ? `Invité dans l’équipage « ${invited} ».` : `Inscription sur le site${via}.`;
    return {
      subject: oneLine(`👤 ${title}`),
      text: `${name} (${email}) vient de créer un compte sur TrophyTracker.\n${detail}\nLe ${when(n.created_at)}.\n\n${siteUrl}/admin`,
      html: layout(siteUrl, 'Admin · Nouveau compte', title, `<strong>${esc(name)}</strong> vient de créer un compte.`, [
        ['Email', email],
        ['Origine', detail],
        ['Date', when(n.created_at)],
      ], `${siteUrl}/admin`, 'Ouvrir l’administration'),
    };
  }

  const crew = str(p.crew_name, 'un équipage');
  const followers = typeof p.followers === 'number' ? p.followers : null;
  const title = `Nouvel abonné pour ${crew}`;
  const count = followers === null ? '' : `L’équipage a maintenant ${followers} abonné${followers > 1 ? 's' : ''}.`;
  const crewUrl = `${siteUrl}/equipages/${encodeURIComponent(str(p.crew_slug, ''))}`;
  return {
    subject: oneLine(`⭐ ${title}`),
    text: `${name} (${email}) suit maintenant l’équipage « ${crew} ».\n${count}\nLe ${when(n.created_at)}.\n\n${crewUrl}`,
    html: layout(siteUrl, 'Admin · Nouvel abonné', title, `<strong>${esc(name)}</strong> suit maintenant l’équipage « ${esc(crew)} ».`, [
      ['Email', email],
      ...(followers === null ? [] : [['Abonnés', String(followers)] as [string, string]]),
      ['Date', when(n.created_at)],
    ], crewUrl, 'Voir l’équipage'),
  };
}
