/**
 * E-mails du voyage envoyés aux proches par le service tracker (file private.trip_mails) :
 *   - « invite »    : un voyageur invite un proche à suivre le road trip (sans compte) ;
 *   - « departure » : « C'est parti ! », au premier lancement du suivi ;
 *   - « evening »   : le résumé du soir (kilomètres, altitude, photos, mot du journal).
 * Tout ce qui vient des voyageurs est échappé ; chaque e-mail a son lien de désinscription.
 */
import { button, card, emailLayout, link, paragraph, stats } from './email-layout.js';
import type { Email } from './admin-emails.js';

export interface TripPayload {
  name: string;
  slug: string;
  city: string | null;
  destination: string | null;
  starts_on: string | null;
  ends_on: string | null;
  trip_type: string | null;
  start_lat?: number | null;
  start_lon?: number | null;
  travellers: string[];
  inviter?: string | null;
  // Résumé du soir
  day?: string;
  day_number?: number | null;
  total_days?: number | null;
  distance_km?: number | null;
  max_altitude_m?: number | null;
  photos?: number;
  stages?: string[];
  journal?: { title: string; body: string } | null;
}

export interface TripMail {
  id: number;
  kind: 'invite' | 'departure' | 'evening';
  email: string;
  unsub_token: string | null;
  payload: TripPayload;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim().slice(0, 140);
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' });
const VEHICLE: Record<string, string> = { van: 'en van', voiture: 'en voiture', moto: 'à moto', raid: 'en raid', groupe: 'entre amis', monde: 'autour du monde' };

/** « Léa », « Léa et Sam », « Léa, Sam et Noé » */
export function names(list: string[]) {
  const l = list.map((n) => n.trim()).filter(Boolean);
  if (l.length <= 1) return l[0] ?? 'Les voyageurs';
  return `${l.slice(0, -1).join(', ')} et ${l.at(-1)}`;
}

const tripDays = (p: TripPayload) =>
  p.starts_on && p.ends_on ? Math.round((Date.parse(p.ends_on) - Date.parse(p.starts_on)) / 864e5) + 1 : null;

/** Vue satellite autour du départ (Esri, image statique), pour « C'est parti ». */
export function heroUrl(p: TripPayload) {
  if (p.start_lat == null || p.start_lon == null) return undefined;
  const [lat, lon] = [Number(p.start_lat), Number(p.start_lon)];
  const bbox = [lon - 0.65, lat - 0.28, lon + 0.65, lat + 0.28].map((n) => n.toFixed(3)).join(',');
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=1200,520&format=jpg&f=image`;
}

export function buildTripEmail(m: TripMail, siteUrl: string, now = new Date()): Email & { unsubscribeUrl: string | null } {
  const p = m.payload;
  const page = `${siteUrl}/t/${encodeURIComponent(p.slug)}`;
  const unsubscribeUrl = m.unsub_token ? `${siteUrl}/desabonnement?t=${encodeURIComponent(m.unsub_token)}` : null;
  const unsub = unsubscribeUrl ? link(esc(unsubscribeUrl), 'Ne plus rien recevoir') : '';
  const name = p.name.trim() || 'le road trip';
  const site = esc(siteUrl);

  if (m.kind === 'invite') {
    const who = p.inviter?.trim() || names(p.travellers);
    const route = [p.city ? `part de ${p.city}` : 'part', p.starts_on ? `le ${shortDate(p.starts_on)}` : null,
      p.destination ? `pour ${p.destination}` : null, p.trip_type ? VEHICLE[p.trip_type] : null].filter(Boolean).join(' ');
    const intro = `Bonjour, ${who} ${route}. Vous pourrez voir où en est le voyage, ses photos et son carnet de route, en direct.`;
    const calm = 'Si la carte ne bouge plus pendant quelques heures, pas d’inquiétude : sans réseau, la trace arrive plus tard.';
    return {
      subject: oneLine(`${who} vous invite à suivre son road trip`),
      text: `${intro}\n\nSuivre le voyage : ${page}\n\nRien à installer : le lien s’ouvre sur votre téléphone ou votre ordinateur, sans compte ni mot de passe.\n\n${calm}\n\nCe voyage est privé : ne transférez ce lien qu’aux personnes de confiance.${unsubscribeUrl ? `\nNe plus rien recevoir : ${unsubscribeUrl}` : ''}`,
      html: emailLayout({
        siteUrl: site,
        kicker: esc(name),
        title: `${esc(who)} vous invite à suivre son road trip.`,
        body: paragraph(esc(intro)) + button(esc(page), 'Suivre le voyage')
          + card('Rien à installer', 'Le lien s’ouvre sur votre téléphone ou votre ordinateur. Pas de compte, pas de mot de passe.'),
        note: esc(calm),
        footer: `Ce voyage est privé : ne transférez ce lien qu’aux personnes de confiance. Vous recevrez aussi un e-mail au départ et un résumé chaque soir de route. ${unsub}`,
      }),
      unsubscribeUrl,
    };
  }

  if (m.kind === 'departure') {
    const days = tripDays(p);
    const when = now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).replace(' à ', ' · ');
    const intro = `${names(p.travellers)} ${p.travellers.length > 1 ? 'viennent' : 'vient'} de partir${p.city ? ` de ${p.city}` : ''}.`
      + `${p.destination ? ` Direction ${p.destination}` : ''}${days ? `${p.destination ? ', ' : ' '}${days} jours de route` : ''}${p.destination || days ? '.' : ''}`;
    return {
      subject: oneLine(`C’est parti ! ${name} a pris la route`),
      text: `C’est parti !\n\n${intro}\n\nVoir la carte en direct : ${page}\n\nSi la carte ne bouge plus pendant quelques heures, pas d’inquiétude : sans réseau, la trace arrive plus tard.${unsubscribeUrl ? `\n\nNe plus rien recevoir : ${unsubscribeUrl}` : ''}`,
      html: emailLayout({
        siteUrl: site,
        tone: 'night',
        hero: heroUrl(p),
        kicker: esc([when, p.city].filter(Boolean).join(' · ')),
        title: 'C’est parti !',
        body: paragraph(esc(intro), true) + button(esc(page), 'Voir la carte en direct'),
        note: 'Si la carte ne bouge plus pendant quelques heures, pas d’inquiétude : sans réseau, la trace arrive plus tard.',
        footer: `Vous suivez ${esc(name)}. Un résumé arrivera chaque soir de route. ${unsub}`,
      }),
      unsubscribeUrl,
    };
  }

  // Résumé du soir
  const stages = p.stages ?? [];
  const title = stages.length >= 2 ? `${stages[0]} → ${stages.at(-1)}` : stages[0] ?? name;
  const dayLabel = p.day_number && p.day_number >= 1 ? `jour ${p.day_number}${p.total_days ? ` / ${p.total_days}` : ''}` : undefined;
  const km = `${nf.format(p.distance_km ?? 0)} km`;
  const items: [string, string][] = [['aujourd’hui', km]];
  if (p.max_altitude_m != null) items.push(['altitude max', `${nf.format(p.max_altitude_m)} m`]);
  items.push(['photos', String(p.photos ?? 0)]);
  return {
    subject: oneLine(`${name}${dayLabel ? ` · ${dayLabel}` : ''} : ${km} aujourd’hui`),
    text: `${title}\n${p.day ? longDate(p.day) : ''}${dayLabel ? ` · ${dayLabel}` : ''}\n\nAujourd’hui : ${km}${p.max_altitude_m != null ? `, jusqu’à ${nf.format(p.max_altitude_m)} m` : ''}, ${p.photos ?? 0} photo(s).`
      + `${p.journal ? `\n\n« ${p.journal.title} »\n${p.journal.body}` : ''}\n\nLire le carnet de route : ${page}#carnet${unsubscribeUrl ? `\n\nNe plus recevoir ce résumé : ${unsubscribeUrl}` : ''}`,
    html: emailLayout({
      siteUrl: site,
      headerRight: dayLabel,
      kicker: esc([p.day ? longDate(p.day) : null, name].filter(Boolean).join(' · ')),
      title: esc(title),
      body: stats(items)
        + (p.journal ? card('le mot du journal', `<strong>${esc(p.journal.title)}</strong><br>${esc(p.journal.body)}`, true) : '')
        + button(`${esc(page)}#carnet`, 'Lire le carnet de route', true),
      footer: `Vous recevez ce résumé chaque soir de route. ${unsubscribeUrl ? link(esc(unsubscribeUrl), 'Ne plus le recevoir') : ''}`,
    }),
    unsubscribeUrl,
  };
}
