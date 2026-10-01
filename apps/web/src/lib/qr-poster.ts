/**
 * Visuels QR code d'un équipage, aux couleurs de TrophyTracker, dessinés dans le navigateur
 * (canvas → PNG) : rien n'est envoyé au serveur.
 *  - « sticker » : carré 1600 px aux coins arrondis (fond transparent autour), pour la 4L ;
 *  - « story » : 1080 × 1920, pour les stories Instagram / Facebook / WhatsApp.
 * Le QR est en correction d'erreur maximale (H) : il reste lisible avec le logo au centre,
 * un autocollant un peu abîmé ou une photo de travers.
 */
import { encode } from 'uqr';
import { logoMarkSvg } from '@/components/common/logo-svg';

export type PosterFormat = 'sticker' | 'story';

export interface PosterCrew {
  name: string;
  carNumber: string | null;
  /** Adresse complète de la page publique. */
  url: string;
  /** « 4L Trophy 2027 » */
  eventLabel: string;
  /** Logo de l'équipage (même origine), facultatif. */
  avatarUrl?: string | null;
}

const C = { ink: '#120F0C', cream: '#F4ECDF', red: '#DB4740', gold: '#F2B45A', ochre: '#D98A3D', dust: '#9E9282' };
const DISPLAY = '"Big Shoulders Display", Impact, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

export const POSTER_SIZE: Record<PosterFormat, [number, number]> = { sticker: [1600, 1600], story: [1080, 1920] };

async function loadImage(src: string) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  return img;
}

/** Image d'une adresse de même origine, ou null (sans « salir » le canvas). */
async function loadSameOrigin(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

const svgImage = (svg: string) => loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

/** Texte espacé (letter-spacing en px), aligné au centre sur x. */
function spacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const chars = [...text];
  const width = chars.reduce((w, ch) => w + ctx.measureText(ch).width, 0) + spacing * (chars.length - 1);
  let cx = x - width / 2;
  ctx.textAlign = 'left';
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = 'center';
}

/** Taille de police (px) pour que `text` tienne dans `maxWidth`, entre min et max. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxWidth: number, max: number, min: number) {
  let px = max;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    ctx.font = font(px);
  }
  return px;
}

/** Coupe un nom trop long en deux lignes équilibrées (au mot le plus proche du milieu). */
function splitName(name: string): string[] {
  const words = name.split(' ');
  if (words.length < 2) return [name];
  let best = 1;
  words.forEach((_, i) => {
    if (i && Math.abs(words.slice(0, i).join(' ').length - name.length / 2) < Math.abs(words.slice(0, best).join(' ').length - name.length / 2)) best = i;
  });
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/** Le QR code : panneau crème, modules encre, yeux arrondis au cœur rouge, logo au centre. */
async function drawQr(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number) {
  const { data } = encode(value, { ecc: 'H', border: 0 });
  const n = data.length;
  const quiet = 3; // marge claire (le panneau crème autour fait le reste)
  const m = size / (n + quiet * 2);
  const ox = x + quiet * m;
  const oy = y + quiet * m;

  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.06);
  ctx.fill();

  const isEye = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  ctx.fillStyle = C.ink;
  data.forEach((row, r) =>
    row.forEach((on, c) => {
      // +0.5 px : pas de liseré clair entre deux modules voisins
      if (on && !isEye(r, c)) ctx.fillRect(ox + c * m, oy + r * m, m + 0.5, m + 0.5);
    }),
  );

  for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
    const ex = ox + c * m;
    const ey = oy + r * m;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.roundRect(ex, ey, 7 * m, 7 * m, 2 * m);
    ctx.roundRect(ex + m, ey + m, 5 * m, 5 * m, 1.3 * m);
    ctx.fill('evenodd');
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.roundRect(ex + 2 * m, ey + 2 * m, 3 * m, 3 * m, m);
    ctx.fill();
  }

  // Logo au centre (≈ 22 % de la largeur : bien en dessous des 30 % que la correction H rattrape).
  const logo = await svgImage(logoMarkSvg('light'));
  const box = Math.round((n * m * 0.22) / m) * m;
  const bx = ox + (n * m - box) / 2;
  const by = oy + (n * m - box) / 2;
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.roundRect(bx - m * 0.5, by - m * 0.5, box + m, box + m, m * 1.5);
  ctx.fill();
  ctx.drawImage(logo, bx + box * 0.06, by + box * 0.06, box * 0.88, box * 0.88);
}

/** Symbole + « TROPHYTRACKER » (Tracker en rouge), centré sur x. */
async function drawBrand(ctx: CanvasRenderingContext2D, cx: number, baseline: number, px: number) {
  const mark = await svgImage(logoMarkSvg('dark'));
  ctx.font = `900 ${px}px ${DISPLAY}`;
  const wTrophy = ctx.measureText('TROPHY').width;
  const wTracker = ctx.measureText('TRACKER').width;
  const markSize = px * 1.25;
  const gap = px * 0.25;
  const total = markSize + gap + wTrophy + wTracker;
  let x = cx - total / 2;
  ctx.drawImage(mark, x, baseline - markSize * 0.86, markSize, markSize);
  x += markSize + gap;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.cream;
  ctx.fillText('TROPHY', x, baseline);
  ctx.fillStyle = C.red;
  ctx.fillText('TRACKER', x + wTrophy, baseline);
  ctx.textAlign = 'center';
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number) {
  const g = ctx.createRadialGradient(w * 0.8, 0, 0, w * 0.8, 0, Math.max(w, h) * 1.1);
  g.addColorStop(0, '#3A2215');
  g.addColorStop(0.45, '#1B1310');
  g.addColorStop(0.75, C.ink);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, radius);
  ctx.fill();
}

/** Badge rouge « #123 ». */
function drawCarNumber(ctx: CanvasRenderingContext2D, num: string, cx: number, cy: number, px: number) {
  ctx.font = `700 ${px}px ${MONO}`;
  const label = `#${num}`;
  const w = ctx.measureText(label).width + px * 0.9;
  const h = px * 1.45;
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, px * 0.2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + px * 0.05);
  ctx.textBaseline = 'alphabetic';
}

/** Nom de l'équipage, sur une ou deux lignes ; renvoie la position y sous le texte. */
function drawName(ctx: CanvasRenderingContext2D, name: string, cx: number, top: number, maxWidth: number, max: number) {
  const upper = name.toUpperCase();
  const font = (px: number) => `900 ${px}px ${DISPLAY}`;
  let lines = [upper];
  let px = fitFont(ctx, upper, font, maxWidth, max, max * 0.55);
  if (ctx.measureText(upper).width > maxWidth) {
    lines = splitName(upper);
    px = Math.min(...lines.map((l) => fitFont(ctx, l, font, maxWidth, max, 40)));
  }
  ctx.font = font(px);
  ctx.fillStyle = C.cream;
  lines.forEach((l, i) => ctx.fillText(l, cx, top + px * 0.86 + i * px * 0.92));
  return top + px * 0.86 + (lines.length - 1) * px * 0.92 + px * 0.14;
}

const displayUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Dessine le visuel et renvoie le canvas. */
export async function drawPoster(format: PosterFormat, crew: PosterCrew): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load(`900 100px ${DISPLAY}`),
    document.fonts.load(`700 40px ${MONO}`),
    document.fonts.load(`600 40px ${MONO}`),
  ]);
  const [w, h] = POSTER_SIZE[format];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  const cx = w / 2;

  if (format === 'sticker') {
    drawBackground(ctx, w, h, 120);
    // Liseré crème intérieur, façon plaque de rallye.
    ctx.strokeStyle = 'rgba(244,236,223,.22)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(36, 36, w - 72, h - 72, 92);
    ctx.stroke();

    ctx.font = `600 40px ${MONO}`;
    ctx.fillStyle = C.gold;
    spacedText(ctx, '◆ SUIVEZ-NOUS EN DIRECT ◆', cx, 150, 8);
    let y = drawName(ctx, crew.name, cx, 180, w - 260, 170);
    if (crew.carNumber) {
      drawCarNumber(ctx, crew.carNumber, cx, y + 60, 44);
      y += 100;
    }
    // De bas en haut : la marque, l'adresse, puis le plus grand QR possible.
    const qrBottom = h - 270;
    const qr = Math.min(860, qrBottom - y - 40);
    await drawQr(ctx, crew.url, cx - qr / 2, qrBottom - qr, qr);
    ctx.font = `600 38px ${MONO}`;
    ctx.fillStyle = C.cream;
    ctx.fillText(displayUrl(crew.url), cx, h - 196);
    await drawBrand(ctx, cx, h - 92, 76);
  } else {
    drawBackground(ctx, w, h, 0);
    await drawBrand(ctx, cx, 170, 70);
    ctx.font = `600 32px ${MONO}`;
    ctx.fillStyle = C.dust;
    spacedText(ctx, crew.eventLabel.toUpperCase(), cx, 240, 6);

    let y = 330;
    const avatar = crew.avatarUrl ? await loadSameOrigin(crew.avatarUrl) : null;
    if (avatar) {
      const s = 220;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx - s / 2, y, s, s, 40);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.clip();
      const k = Math.max(s / avatar.width, s / avatar.height);
      ctx.drawImage(avatar, cx - (avatar.width * k) / 2, y + s / 2 - (avatar.height * k) / 2, avatar.width * k, avatar.height * k);
      ctx.restore();
      y += s + 50;
    }
    ctx.font = `600 36px ${MONO}`;
    ctx.fillStyle = C.gold;
    spacedText(ctx, '◆ SUIVEZ-NOUS EN DIRECT ◆', cx, y + 30, 7);
    y = drawName(ctx, crew.name, cx, y + 60, w - 140, 190);
    if (crew.carNumber) {
      drawCarNumber(ctx, crew.carNumber, cx, y + 58, 42);
      y += 96;
    }
    // QR centré dans la place restante au-dessus de l'adresse.
    const qr = 780;
    const qy = Math.round(y + Math.max(50, (h - 300 - y - qr) / 2));
    await drawQr(ctx, crew.url, cx - qr / 2, qy, qr);
    ctx.font = `600 34px ${MONO}`;
    ctx.fillStyle = C.cream;
    ctx.fillText(displayUrl(crew.url), cx, qy + qr + 80);
    ctx.font = `400 30px ${MONO}`;
    ctx.fillStyle = C.dust;
    ctx.fillText('Scannez pour voir la 4L sur la carte, en direct', cx, qy + qr + 140);
    ctx.fillStyle = C.red;
    ctx.fillRect(cx - 60, h - 90, 120, 6);
  }
  return canvas;
}

export const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible à créer'))), 'image/png'));
