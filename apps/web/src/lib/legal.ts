/**
 * Informations légales partagées par les pages Mentions légales, CGU et Confidentialité,
 * le pied de page et les formulaires. Analyse complète : docs/JURIDIQUE.md.
 */

/** Éditeur du site et responsable du traitement des données. */
export const EDITOR = {
  name: 'Julien Plomion',
  email: 'julien.plomion2006@gmail.com',
};

/**
 * Informations d'entreprise, exigées dès que le site vend (mentions légales, CGV).
 * À compléter à l'immatriculation (SIRET) et à l'adhésion au médiateur : docs/PAIEMENT.md.
 */
export const BUSINESS: {
  status: string;
  siret: string | null;
  address: string | null;
  mediator: { name: string; url: string; address?: string } | null;
} = {
  status: 'Entrepreneur individuel (micro-entreprise)',
  siret: null,
  address: null,
  mediator: null,
};
export const VAT_MENTION = 'TVA non applicable, art. 293 B du CGI';

/** Date de dernière mise à jour des pages légales (à changer à chaque modification de leur contenu). */
export const LEGAL_UPDATED_AT = '2 octobre 2026';

/**
 * Tarif de l'accès équipage, pour l'affichage. Le montant réellement payé est
 * calculé par la base (private.crew_price_at) : garder les deux identiques.
 */
export const PRICING = {
  launchCents: 1500,
  regularCents: 1900,
  /** Fin du tarif de lancement : 1er décembre 2026 à 0 h, heure de Paris. */
  launchEndsAt: Date.parse('2026-12-01T00:00:00+01:00'),
  launchLastDay: '30 novembre 2026',
};

/** Le tarif de lancement est-il encore en cours ? */
export const isLaunchPrice = (now = Date.now()) => now < PRICING.launchEndsAt;

/** Prix de l'accès équipage aujourd'hui, en centimes. */
export const currentPriceCents = (now = Date.now()) => (isLaunchPrice(now) ? PRICING.launchCents : PRICING.regularCents);

/** « 15 € », « 19,50 € ». */
export const euros = (cents: number) =>
  `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`;

/** Phrase de tarif réutilisée sur le site. */
export function priceSentence(now = Date.now()) {
  return isLaunchPrice(now)
    ? `${euros(PRICING.launchCents)} par équipage jusqu’au ${PRICING.launchLastDay} (tarif de lancement), puis ${euros(PRICING.regularCents)}`
    : `${euros(PRICING.regularCents)} par équipage`;
}

/** Lien « Signaler un contenu » : un email pré-rempli à l'éditeur. */
export const REPORT_HREF = `mailto:${EDITOR.email}?subject=${encodeURIComponent('TrophyTracker — Signalement de contenu')}&body=${encodeURIComponent(
  'Adresse de la page ou de la photo concernée :\n\nPourquoi ce contenu pose problème :\n',
)}`;

/** Lien de contact général. */
export const CONTACT_HREF = `mailto:${EDITOR.email}?subject=${encodeURIComponent('TrophyTracker')}`;

/**
 * Charte fair-play : acceptée par l'équipage avant de générer sa clé GPS (preuve gardée en base),
 * reprise dans les conditions d'utilisation et sur la page d'accueil.
 */
export const FAIR_PLAY = {
  spirit:
    'Le 4L Trophy, c’est l’aventure à la boussole et au roadbook, l’entraide et la solidarité. TrophyTracker est là pour que vos proches vivent l’aventure avec vous, pas pour vous la faciliter.',
  rules: [
    { title: 'Jamais pour s’orienter', text: 'Pendant la course, on n’utilise pas TrophyTracker pour trouver son chemin : ni sa propre position, ni la trace ou la position des autres équipages.' },
    { title: 'Le règlement d’abord', text: 'On respecte le règlement du 4L Trophy et les consignes de l’organisation. En cas de doute, on leur demande.' },
    { title: 'Tout l’équipage est d’accord', text: 'Le téléphone localise la 4L et donc tous ses occupants : chaque membre accepte de partager la position.' },
    { title: 'Pas un outil de sécurité', text: 'Les positions peuvent arriver en retard ou pas du tout. En cas d’urgence : la balise et le bouton d’alerte de l’organisation, et les secours (112 en Europe).' },
  ],
};
