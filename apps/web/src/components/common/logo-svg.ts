/** Couleurs du symbole selon le fond (voir Logo.tsx), et le symbole en SVG autonome. */
export const LOGO_TONES = {
  dark: { trace: '#F2B45A', wheelFill: '#120F0C', ink: '#F4ECDF', dotStroke: '#F4ECDF' },
  light: { trace: '#D98A3D', wheelFill: '#F4ECDF', ink: '#1A1612', dotStroke: '#FFF8EC' },
};

/** Le même symbole en SVG autonome (pour le dessiner sur un canvas : QR codes, visuels à télécharger). */
export function logoMarkSvg(tone: keyof typeof LOGO_TONES = 'dark') {
  const c = LOGO_TONES[tone];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256"><g transform="translate(1 2.5) scale(0.93)">`
    + `<path d="M5 51 H12 V24 Q12 21 15 21 H38 L46 29 H54 Q58 29 58 33" fill="none" stroke="${c.trace}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<circle cx="20" cy="46" r="5.5" fill="${c.wheelFill}" stroke="${c.ink}" stroke-width="3"/>`
    + `<circle cx="47" cy="46" r="5.5" fill="${c.wheelFill}" stroke="${c.ink}" stroke-width="3"/>`
    + `<circle cx="5" cy="51" r="3" fill="${c.wheelFill}" stroke="${c.ink}" stroke-width="2.5"/>`
    + `<circle cx="58" cy="33" r="10" fill="none" stroke="#DB4740" stroke-width="2" opacity="0.45"/>`
    + `<circle cx="58" cy="33" r="6" fill="#DB4740" stroke="${c.dotStroke}" stroke-width="2.8"/></g></svg>`;
}
