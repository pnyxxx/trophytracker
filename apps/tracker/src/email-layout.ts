/**
 * Mise en page « Balise » des e-mails, copie de celle du site (apps/web/src/lib/email-templates.ts) :
 * le conteneur tracker est construit sans le code du site. Toute modification se fait des deux côtés.
 *
 * Tout est en tableaux et en styles en ligne : Gmail et Outlook ignorent presque tout le reste.
 */
const C = {
  cream: '#F5F1EA',
  night: '#15161A',
  nightSoft: '#1F2026',
  text: '#3A3832',
  muted: '#5C5850',
  red: '#E1262C',
  redText: '#C41E24',
  redOnNight: '#FF6B6B',
  line: '#DDD6CA',
  white: '#FFFFFF',
  dust: '#E4DFD6',
};
const F = {
  display: `'Bricolage Grotesque','Helvetica Neue',Helvetica,Arial,sans-serif`,
  sans: `'Atkinson Hyperlegible','Helvetica Neue',Helvetica,Arial,sans-serif`,
  mono: `'DM Mono',Menlo,Consolas,'Courier New',monospace`,
};

const TAGLINE = 'trophytracker · le carnet de route en direct de tes road trips.';

export interface EmailLayout {
  /** Adresse du site (ou `{{ .SiteURL }}`), pour le logo. */
  siteUrl: string;
  /** Petite ligne DM Mono rouge au-dessus du titre (« Connexion », « dimanche 2 août · Bergen »…). */
  kicker: string;
  title: string;
  /** Contenu principal, déjà en HTML. */
  body: string;
  /** Petit texte gris sous le contenu (« Si tu n'es pas à l'origine… »), déjà en HTML. */
  note?: string;
  /** Ligne de pied de page (désinscription…), déjà en HTML. */
  footer?: string;
  /** « night » : fond nuit (e-mail « C'est parti »). Crème par défaut. */
  tone?: 'cream' | 'night';
  /** Texte DM Mono à droite de l'en-tête (« jour 9 / 14 »). */
  headerRight?: string;
  /** Image pleine largeur sous l'en-tête (vue satellite…), adresse absolue. */
  hero?: string;
}

const ink = (night?: boolean) => (night ? C.dust : C.text);

/** Paragraphe de texte courant. Chaque bloc suivant porte sa marge au-dessus : le dernier ne laisse pas de vide. */
export const paragraph = (html: string, night = false) =>
  `<p style="margin:0 0 0;font-family:${F.sans};font-size:17px;line-height:1.6;color:${ink(night)}">${html}</p>`;

/** Bouton pilule rouge (ou nuit, `dark`), comme ceux du site. */
export const button = (href: string, label: string, dark = false) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0"><tr><td style="background:${dark ? C.night : C.red};border-radius:999px">`
  + `<a href="${href}" style="display:inline-block;padding:16px 26px;font-family:${F.sans};font-size:17px;font-weight:700;line-height:1;color:${dark ? C.cream : '#ffffff'};text-decoration:none;border-radius:999px">${label}</a>`
  + `</td></tr></table>`;

/** Encadré blanc : un titre en gras et un texte. */
export const card = (title: string, html: string, kicker = false) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0"><tr><td style="background:${C.white};border-radius:16px;padding:18px">`
  + (kicker
    ? `<p style="margin:0;font-family:${F.mono};font-size:13px;color:${C.redText}">${title}</p>`
    : `<p style="margin:0;font-family:${F.sans};font-size:17px;font-weight:700;color:${C.night}">${title}</p>`)
  + `<p style="margin:6px 0 0;font-family:${F.sans};font-size:16px;line-height:1.55;color:${C.text}">${html}</p>`
  + `</td></tr></table>`;

/** Trois chiffres côte à côte (« AUJOURD'HUI 84 km »). */
export const stats = (items: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-collapse:separate;border-spacing:8px 0"><tr>`
  + items.map(([k, v]) =>
    `<td width="${Math.floor(100 / items.length)}%" style="background:${C.white};border-radius:14px;padding:14px;vertical-align:top">`
    + `<p style="margin:0;font-family:${F.mono};font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.muted}">${k}</p>`
    + `<p style="margin:4px 0 0;font-family:${F.mono};font-size:22px;color:${C.night}">${v}</p></td>`).join('')
  + `</tr></table>`;

/** Code à recopier, en gros chiffres mono. */
export const codeBox = (code: string) =>
  `<p style="margin:22px 0 0;padding:22px 12px;border-radius:16px;background:${C.white};text-align:center;font-family:${F.mono};font-size:34px;font-weight:500;line-height:1;letter-spacing:10px;color:${C.night}">${code}</p>`;

/** Lignes « étiquette : valeur » (e-mails admin). */
export const rows = (items: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-collapse:collapse;background:${C.white};border-radius:16px">`
  + items.map(([k, v], i) =>
    `<tr><td width="32%" style="padding:11px 14px;${i ? `border-top:1px solid ${C.line};` : ''}vertical-align:top;font-family:${F.mono};font-size:12px;line-height:1.7;color:${C.muted}">${k}</td>`
    + `<td style="padding:11px 14px 11px 0;${i ? `border-top:1px solid ${C.line};` : ''}vertical-align:top;font-family:${F.sans};font-size:15px;line-height:1.5;color:${C.night}">${v}</td></tr>`).join('')
  + `</table>`;

/** Lien rouge dans un texte. */
export const link = (href: string, label: string) => `<a href="${href}" style="color:${C.redText};text-decoration:underline">${label}</a>`;

export function emailLayout(e: EmailLayout): string {
  const night = e.tone === 'night';
  const bg = night ? C.night : C.cream;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  @media (max-width: 520px) {
    .tt-pad { padding: 26px 20px !important; }
    .tt-title { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#E9E4DB">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9E4DB">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${bg};border-radius:8px;border-collapse:separate;overflow:hidden">
    <tr><td style="background:${C.night};padding:24px 36px" class="tt-pad">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;white-space:nowrap">
          <img src="${e.siteUrl}/email-logo.png" width="34" height="34" alt="" style="vertical-align:middle;border:0;margin-right:8px"><span style="vertical-align:middle;font-family:'Big Shoulders Display',Impact,'Arial Narrow',sans-serif;font-size:24px;font-weight:900;line-height:1;text-transform:uppercase;color:${C.cream}">Trophy<span style="color:${C.red}">Tracker</span></span>
        </td>
        ${e.headerRight ? `<td align="right" style="vertical-align:middle;font-family:${F.mono};font-size:14px;color:#A9A59D">${e.headerRight}</td>` : ''}
      </tr></table>
    </td></tr>
    ${e.hero ? `<tr><td style="line-height:0"><img src="${e.hero}" width="600" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>` : ''}
    <tr><td class="tt-pad" style="padding:36px">
      ${e.kicker ? `<p style="margin:0 0 12px;font-family:${F.mono};font-size:14px;color:${night ? C.redOnNight : C.redText}">${e.kicker}</p>` : ''}
      <h1 class="tt-title" style="margin:0 0 18px;font-family:${F.display};font-size:36px;font-weight:800;line-height:1.05;letter-spacing:-1.2px;color:${night ? C.cream : C.night}">${e.title}</h1>
      ${e.body}
      ${e.note ? `<p style="margin:24px 0 0;font-family:${F.sans};font-size:15px;line-height:1.55;color:${night ? '#A9A59D' : C.muted}">${e.note}</p>` : ''}
    </td></tr>
    <tr><td style="padding:20px 36px;border-top:1px solid ${night ? '#2B2C33' : C.line};font-family:${F.sans};font-size:14px;line-height:1.5;color:${night ? '#A9A59D' : C.muted}" class="tt-pad">${e.footer ?? TAGLINE}</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;
}
