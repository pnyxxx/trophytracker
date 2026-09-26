/**
 * Contenu des emails envoyés aux admins (nouveau compte, nouvel abonnement).
 * Les noms viennent des utilisateurs : ils sont échappés dans le HTML et
 * débarrassés des retours à la ligne dans le sujet.
 */

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

/** Mise en page commune, dans le style des emails du site. */
function layout(title: string, lines: string[], link: { href: string; label: string }) {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px 12px;background:#f4efe8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#120F0C;padding:16px 28px;color:#F4ECDF;font-size:18px;font-weight:800;letter-spacing:.02em">TROPHY<span style="color:#DB4740">TRACKER</span> · admin</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5;color:#444">${l}</p>`).join('\n')}
<p style="margin:20px 0 0"><a href="${esc(link.href)}" style="display:inline-block;background:#DB4740;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${esc(link.label)}</a></p>
</td></tr></table>
<p style="text-align:center;font-size:12px;color:#999;margin-top:14px">Vous recevez cet email parce que vous êtes administrateur de TrophyTracker.</p>
</body></html>`;
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
      html: layout(title, [
        `<strong>${esc(name)}</strong> (${esc(email)}) vient de créer un compte.`,
        esc(detail),
        `Le ${esc(when(n.created_at))}.`,
      ], { href: `${siteUrl}/admin`, label: 'Ouvrir l’administration' }),
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
    html: layout(title, [
      `<strong>${esc(name)}</strong> (${esc(email)}) suit maintenant l’équipage « ${esc(crew)} ».`,
      ...(count ? [esc(count)] : []),
      `Le ${esc(when(n.created_at))}.`,
    ], { href: crewUrl, label: 'Voir l’équipage' }),
  };
}
