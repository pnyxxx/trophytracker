/** Le symbole « Balise » en SVG autonome (pour le dessiner sur un canvas : QR codes, visuels à télécharger). */
export function logoMarkSvg(tone: 'signal' | 'cream' = 'signal') {
  const [disc, dot] = tone === 'cream' ? ['#F5F1EA', '#E1262C'] : ['#E1262C', '#F5F1EA'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256">`
    + `<circle cx="32" cy="32" r="31" fill="${disc}" opacity="0.22"/>`
    + `<circle cx="32" cy="32" r="24" fill="${disc}"/>`
    + `<circle cx="32" cy="32" r="7.5" fill="${dot}"/></svg>`;
}
