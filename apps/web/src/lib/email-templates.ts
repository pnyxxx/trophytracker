/**
 * Modèles des emails envoyés par Supabase Auth, tous dans la même mise en page « roadbook » :
 * cadre noir sur papier, bandeau logo, étiquette mono, grand titre condensé, route Départ → Arrivée.
 *
 * Ce module ne fait que produire du texte : seo-plugin.ts l'écrit dans dist/email-templates/ à la
 * compilation, où Supabase Auth vient le chercher (infra/supabase.override.yml, apps/web/Caddyfile).
 * Les `{{ .Variable }}` sont remplies par Supabase Auth (modèles Go).
 * Les emails aux admins (apps/tracker/src/admin-emails.ts) reprennent la même mise en page.
 *
 * Tout est en tableaux et en styles en ligne : Gmail et Outlook ignorent presque tout le reste.
 * Ils ne chargent pas non plus les polices du site, d'où les polices de secours condensées.
 */

const C = {
  paper: '#FFF8EC',
  sand: '#F4ECDF',
  coal: '#1A1612',
  text: '#3A3027',
  muted: '#6B6157',
  red: '#DB4740',
  ochre: '#D98A3D',
  ochreDark: '#A8652A',
  dust: '#9E9282',
};
const F = {
  display: `'Big Shoulders Display','Avenir Next Condensed','Roboto Condensed','Arial Narrow',Impact,sans-serif`,
  sans: `Archivo,'Helvetica Neue',Helvetica,Arial,sans-serif`,
  mono: `'JetBrains Mono',Menlo,Consolas,'Courier New',monospace`,
};
const MONO_LABEL = `font-family:${F.mono};font-weight:600;font-size:11px;letter-spacing:.16em;text-transform:uppercase`;

const SIGNATURE = 'Carnet de route en direct';
const TAGLINE = 'Le carnet de route en direct de vos road trips.';

export interface EmailLayout {
  /** Adresse du site (ou `{{ .SiteURL }}`), pour le logo. */
  siteUrl: string;
  /** Étiquette mono au-dessus du titre (« Connexion », « Sécurité »…). */
  kicker: string;
  title: string;
  /** Contenu principal, déjà en HTML. */
  body: string;
  /** Petit texte gris sous le contenu (« Si vous n'êtes pas à l'origine… »), déjà en HTML. */
  note?: string;
  /** Ligne sous la signature. */
  footer?: string;
}

/** Paragraphe de texte courant. Chaque bloc suivant porte sa marge au-dessus : le dernier ne laisse pas de vide. */
export const paragraph = (html: string) =>
  `<p style="margin:0;font-family:${F.sans};font-size:15px;line-height:1.6;color:${C.text}">${html}</p>`;

/** Bouton rouge, comme ceux du site. */
export const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0"><tr><td style="background:${C.red};border-radius:4px">`
  + `<a href="${href}" style="display:inline-block;padding:15px 24px;font-family:${F.sans};font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:4px">${label}</a>`
  + `</td></tr></table>`;

/** Code à recopier, en gros chiffres mono. */
export const codeBox = (code: string) =>
  `<p style="margin:22px 0 0;padding:20px 12px;border:2px solid ${C.coal};background:#ffffff;text-align:center;font-family:${F.mono};font-size:32px;font-weight:600;line-height:1;letter-spacing:8px;color:${C.coal}">${code}</p>`;

/** Lignes « étiquette : valeur » (emails admin). */
export const rows = (items: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-collapse:collapse">`
  + items.map(([k, v]) =>
    `<tr><td width="32%" style="padding:9px 10px 9px 0;border-bottom:1px dashed #C9BDAC;vertical-align:top;${MONO_LABEL};font-size:10px;line-height:1.9;color:${C.ochreDark}">${k}</td>`
    + `<td style="padding:9px 0;border-bottom:1px dashed #C9BDAC;vertical-align:top;font-family:${F.sans};font-size:14px;line-height:1.5;color:${C.coal}">${v}</td></tr>`).join('')
  + `</table>`;

/** Lien rouge dans un texte. */
export const link = (href: string, label: string) => `<a href="${href}" style="color:${C.red};text-decoration:underline">${label}</a>`;

const dottedLine = `<td width="50%" style="vertical-align:middle"><div style="height:0;line-height:0;font-size:0;border-top:2px dotted ${C.ochre}">&nbsp;</div></td>`;

export function emailLayout(e: EmailLayout): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;700&family=Big+Shoulders+Display:wght@900&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
  @media (max-width: 520px) {
    .tt-pad { padding: 24px 18px !important; }
    .tt-title { font-size: 34px !important; }
    .tt-tagline { display: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.sand}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:${C.paper};border:2px solid ${C.coal};border-collapse:separate">
    <tr><td style="background:${C.coal};padding:14px 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;white-space:nowrap">
          <img src="${e.siteUrl}/email-logo.png" width="34" height="34" alt="" style="vertical-align:middle;border:0;margin-right:10px"><span style="vertical-align:middle;font-family:${F.display};font-size:24px;font-weight:900;line-height:1;text-transform:uppercase;color:${C.sand}">TROPHY<span style="color:${C.red}">TRACKER</span></span>
        </td>
        <td class="tt-tagline" align="right" style="vertical-align:middle;${MONO_LABEL};font-size:10px;color:${C.dust}">Suivi en direct · Carnet de route</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:12px 24px;border-bottom:2px solid ${C.coal};${MONO_LABEL};color:${C.coal}">${e.kicker}</td></tr>
    <tr><td class="tt-pad" style="padding:30px 24px">
      <h1 class="tt-title" style="margin:0 0 18px;font-family:${F.display};font-size:42px;font-weight:900;line-height:1;text-transform:uppercase;color:${C.coal}">${e.title}</h1>
      ${e.body}
      ${e.note ? `<p style="margin:24px 0 0;font-family:${F.sans};font-size:13px;line-height:1.55;color:${C.muted}">${e.note}</p>` : ''}
    </td></tr>
    <tr><td style="padding:14px 20px;border-top:2px solid ${C.coal}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:10px;${MONO_LABEL};font-size:10px;color:${C.muted}">Départ</td>
        ${dottedLine}
        <td style="vertical-align:middle;padding:0 8px;line-height:0"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${C.red};border:3px solid #F6C9C5"></span></td>
        ${dottedLine}
        <td style="vertical-align:middle;padding-left:10px;${MONO_LABEL};font-size:10px;color:${C.muted}">Arrivée</td>
      </tr></table>
    </td></tr>
  </table>
  <p style="margin:16px 0 0;${MONO_LABEL};font-size:10px;letter-spacing:.2em;color:${C.ochreDark}">${SIGNATURE}</p>
  <p style="margin:6px 0 0;font-family:${F.sans};font-size:12px;line-height:1.5;color:#8C8176">${e.footer ?? TAGLINE}</p>
</td></tr>
</table>
</body>
</html>
`;
}

// ─── Les modèles de Supabase Auth ───────────────────────────────────────────

import { EDITOR } from './legal';

const SITE = '{{ .SiteURL }}';
const NOT_YOU = 'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.';
/** Pied des alertes de sécurité : que faire si quelqu'un d'autre a touché au compte. */
const ALERT = `Si ce n’est pas vous, écrivez-nous sans attendre à ${link(`mailto:${EDITOR.email}`, EDITOR.email)}.`;
/** Note des e-mails contenant un code de connexion. */
const CODE_NOTE = `Ce code expire dans 10 minutes et ne sert qu’une fois. Ne le communiquez à personne : nous ne vous le demanderons jamais. ${NOT_YOU}`;

const action = (kicker: string, title: string, text: string, href: string, label: string, note = NOT_YOU) =>
  emailLayout({ siteUrl: SITE, kicker, title, body: paragraph(text) + button(href, label), note });
/** E-mail « code à 6 chiffres » : connexion et création de compte (pas de mot de passe sur le site). */
const code = (kicker: string, title: string, text: string) =>
  emailLayout({ siteUrl: SITE, kicker, title, body: paragraph(text) + codeBox('{{ .Token }}'), note: CODE_NOTE });
const alert = (title: string, text: string) =>
  emailLayout({ siteUrl: SITE, kicker: 'Sécurité', title, body: paragraph(text), note: ALERT });

/** Nom du fichier (servi sous /email-templates/) → HTML. */
export const AUTH_EMAIL_TEMPLATES: Record<string, string> = {
  'confirmation.html': code(
    'Inscription', 'Votre code',
    'Bienvenue ! Pour créer votre compte, saisissez ce code sur la page ouverte dans votre navigateur :',
  ),
  'magic-link.html': code(
    'Connexion', 'Votre code de connexion',
    'Pour vous connecter, saisissez ce code sur la page ouverte dans votre navigateur :',
  ),
  // Aucun écran du site ne demande de « mot de passe oublié » : si l'API est appelée, l'e-mail sert de connexion.
  'recovery.html': code(
    'Connexion', 'Votre code de connexion',
    'Pour vous connecter, saisissez ce code sur la page ouverte dans votre navigateur :',
  ),
  'email-change.html': action(
    'Adresse email', 'Confirmez le changement d’adresse',
    'Vous avez demandé à changer l’adresse email de votre compte TrophyTracker ({{ .Email }} → {{ .NewEmail }}). Confirmez ce changement.',
    '{{ .ConfirmationURL }}', 'Confirmer le changement',
  ),
  'invite.html': action(
    'Invitation', 'Vous êtes invité dans un road trip',
    'Un compagnon de route vous a ajouté à son road trip sur trophytracker, le carnet de route en direct. Acceptez l’invitation pour gérer la page du road trip avec lui.',
    `${SITE}/invitation?token_hash={{ .TokenHash }}&type=invite`, 'Accepter l’invitation',
    `Ce bouton marche pendant 10 minutes. Ensuite, connectez-vous simplement sur ${link(`${SITE}/connexion`, 'trophytracker')} avec cette adresse e-mail : vous recevrez un code. Vous ne connaissez pas l’expéditeur ? Ignorez cet e-mail.`,
  ),
  'reauthentication.html': emailLayout({
    siteUrl: SITE,
    kicker: 'Sécurité',
    title: 'Votre code de confirmation',
    body: paragraph('Pour confirmer une modification sensible de votre compte, saisissez ce code sur le site :') + codeBox('{{ .Token }}'),
    note: `Ce code expire rapidement. ${NOT_YOU}`,
  }),
  'password-changed.html': alert('Mot de passe modifié', 'Le mot de passe de votre compte TrophyTracker ({{ .Email }}) vient d’être modifié.'),
  'email-changed.html': alert('Adresse email modifiée', 'L’adresse email de votre compte TrophyTracker a été modifiée. Elle est désormais {{ .Email }}.'),
  'phone-changed.html': alert('Téléphone modifié', 'Le numéro de téléphone associé à votre compte TrophyTracker ({{ .Email }}) a été modifié.'),
  'identity-linked.html': alert('Nouvelle méthode de connexion', 'Une nouvelle méthode de connexion a été ajoutée à votre compte trophytracker ({{ .Email }}).'),
  'identity-unlinked.html': alert('Méthode de connexion retirée', 'Une méthode de connexion a été retirée de votre compte TrophyTracker ({{ .Email }}).'),
  'mfa-enrolled.html': alert('Double authentification activée', 'La double authentification a été activée sur votre compte TrophyTracker ({{ .Email }}). Votre compte est mieux protégé.'),
  'mfa-unenrolled.html': alert('Double authentification désactivée', 'La double authentification a été désactivée sur votre compte TrophyTracker ({{ .Email }}).'),
};
