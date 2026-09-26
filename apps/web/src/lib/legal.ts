/**
 * Informations légales partagées par les pages Mentions légales, CGU et Confidentialité,
 * le pied de page et les formulaires. Analyse complète : docs/JURIDIQUE.md.
 */

/** Éditeur du site et responsable du traitement des données. */
export const EDITOR = {
  name: 'Julien Plomion',
  email: 'julien.plomion2006@gmail.com',
};

/** Date de dernière mise à jour des pages légales (à changer à chaque modification de leur contenu). */
export const LEGAL_UPDATED_AT = '26 septembre 2026';

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
