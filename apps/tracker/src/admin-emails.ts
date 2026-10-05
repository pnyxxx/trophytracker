/**
 * Contenu des emails envoyés aux admins (nouveau compte, nouvel abonnement,
 * accès équipage payé ou obtenu avec un code, relance GPS envoyée à un équipage).
 * Les noms viennent des utilisateurs : ils sont échappés dans le HTML et
 * débarrassés des retours à la ligne dans le sujet.
 */
import { button, emailLayout, paragraph, rows } from './email-layout.js';

export type AdminNotification = {
  id: number;
  kind: 'new_account' | 'new_follow' | 'new_purchase' | 'gps_reminder';
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

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

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

  if (n.kind === 'new_purchase') {
    const byCode = p.source === 'code';
    const amount = money(typeof p.amount_cents === 'number' ? p.amount_cents : 0, str(p.currency, 'eur'));
    const count = typeof p.paid_count === 'number' ? p.paid_count : null;
    const code = byCode ? `${str(p.code)}${typeof p.code_note === 'string' && p.code_note.trim() ? ` (${p.code_note.trim()})` : ''}` : null;
    const title = byCode ? `Code d’accès utilisé : ${name}` : `Paiement reçu : ${amount}`;
    const intro = byCode ? 'a obtenu un accès équipage avec un code.' : `a payé ${amount} pour créer la page de son équipage.`;
    const total = count === null ? null : byCode ? `${count} accès obtenu${count > 1 ? 's' : ''} par code au total.` : `${count} accès payé${count > 1 ? 's' : ''} au total.`;
    const details: [string, string][] = [
      ['Email', email],
      byCode ? ['Code', code!] : ['Montant', amount],
      ...(total === null ? [] : [['Total', total] as [string, string]]),
      ['Date', when(n.created_at)],
    ];
    return {
      subject: oneLine(`${byCode ? '🎟️' : '💶'} ${title}`),
      text: [`${name} (${email}) ${intro}`, code && `Code : ${code}`, total, `Le ${when(n.created_at)}.`, '', `${siteUrl}/admin`]
        .filter((l) => l !== null).join('\n'),
      html: layout(siteUrl, byCode ? 'Admin · Code d’accès' : 'Admin · Paiement', title, `<strong>${esc(name)}</strong> ${esc(intro)}`, details, `${siteUrl}/admin`, 'Voir les achats'),
    };
  }

  if (n.kind === 'gps_reminder') {
    const crew = str(p.crew_name, 'Un équipage');
    const members = str(p.members);
    const created = typeof p.crew_created_at === 'string' ? when(new Date(p.crew_created_at)) : '—';
    const title = `Relance GPS envoyée : ${crew}`;
    const crewUrl = `${siteUrl}/equipages/${encodeURIComponent(str(p.crew_slug, ''))}`;
    return {
      subject: oneLine(`📡 ${title}`),
      text: `« ${crew} » n’a envoyé aucune position GPS depuis la création de sa page (${created}) : un rappel vient d’être envoyé à ${members}.\nLe ${when(n.created_at)}.\n\n${crewUrl}`,
      html: layout(siteUrl, 'Admin · Relance GPS', title, `L’équipage « ${esc(crew)} » n’a encore envoyé aucune position : un rappel vient de partir à ses membres.`, [
        ['Membres', members],
        ['Page créée', created],
        ['Relancé le', when(n.created_at)],
      ], crewUrl, 'Voir l’équipage'),
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
