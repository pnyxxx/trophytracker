/**
 * Visuels QR code d'un road trip, au style « Balise », dessinés dans le navigateur (canvas → PNG) :
 *  - « sticker » : autocollant carré 12 × 12 cm (1440 px, 300 dpi), fond nuit, liseré crème ;
 *  - « story »   : 1080 × 1920, sur une vue satellite de la trace (imagerie Esri, qui autorise le canvas) ;
 *  - « round »   : autocollant rond 8 cm (960 px), rouge, fond transparent autour.
 * Le QR ouvre le lien du road trip ; il est en correction d'erreur maximale (H) : il reste lisible avec
 * le logo au centre, un autocollant un peu abîmé ou une photo de travers. Rien n'est envoyé au serveur.
 */
import { encode } from 'uqr';
import { logoMarkSvg } from '@/components/common/logo-svg';

export type PosterFormat = 'sticker' | 'story' | 'round';

export interface PosterCrew {
  name: string;
  /** Adresse complète de la page (ce qu'ouvre le QR). */
  url: string;
  city?: string | null;
  destination?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  /** En direct en ce moment (pastille « en direct »). */
  live?: boolean;
  /** Jour du voyage (story). */
  day?: number | null;
  distanceKm?: number | null;
  /** Trace [lat, lon, …] pour la story ; sinon la position de départ. */
  track?: readonly (readonly number[])[];
  start?: { lat: number; lon: number } | null;
}

const C = { night: '#15161A', cream: '#F5F1EA', red: '#E1262C', white: '#FFFFFF', dust: '#C9C5BD', muted: '#5C5850' };
const DISPLAY = '"Bricolage Grotesque Variable", "Bricolage Grotesque", sans-serif';
/** Nom de la marque (logo « la trace dessine la 4L »). */
const LOGO_FONT = '"Big Shoulders Display", Impact, sans-serif';
const MONO = '"DM Mono", ui-monospace, monospace';

export const POSTER_SIZE: Record<PosterFormat, [number, number]> = { sticker: [1440, 1440], story: [1080, 1920], round: [960, 960] };

async function loadImage(src: string, cors = false) {
  const img = new Image();
  if (cors) img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  return img;
}
const svgImage = (svg: string) => loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

/** Taille de police (px) pour que `text` tienne dans `maxWidth`, entre min et max. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxWidth: number, max: number, min: number) {
  let px = max;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = font(px);
  }
  return px;
}

/** Le QR code : panneau crème, modules nuit, yeux arrondis au cœur rouge, balise au centre. */
async function drawQr(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, panel = C.cream) {
  const { data } = encode(value, { ecc: 'H', border: 0 });
  const n = data.length;
  const quiet = 2.5;
  const m = size / (n + quiet * 2);
  const ox = x + quiet * m;
  const oy = y + quiet * m;

  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.08);
  ctx.fill();

  const isEye = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  ctx.fillStyle = C.night;
  data.forEach((row, r) => row.forEach((on, c) => {
    // +0.5 px : pas de liseré clair entre deux modules voisins
    if (on && !isEye(r, c)) ctx.fillRect(ox + c * m, oy + r * m, m + 0.5, m + 0.5);
  }));
  for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
    const ex = ox + c * m;
    const ey = oy + r * m;
    ctx.fillStyle = C.night;
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
  const logo = await svgImage(logoMarkSvg(panel === C.cream || panel === C.white ? 'light' : 'dark'));
  const box = Math.round((n * 0.22)) * m;
  const bx = ox + (n * m - box) / 2;
  const by = oy + (n * m - box) / 2;
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.roundRect(bx - m * 0.5, by - m * 0.5, box + m, box + m, m * 1.5);
  ctx.fill();
  ctx.drawImage(logo, bx + box * 0.06, by + box * 0.06, box * 0.88, box * 0.88);
}

/** Logo + « TROPHYTRACKER » en capitales (« TRACKER » en rouge), depuis (x, baseline). */
async function drawBrand(ctx: CanvasRenderingContext2D, x: number, baseline: number, px: number) {
  const mark = await svgImage(logoMarkSvg('dark'));
  const s = px * 1.3;
  ctx.drawImage(mark, x, baseline - s * 0.82, s, s);
  ctx.font = `900 ${px}px ${LOGO_FONT}`;
  ctx.letterSpacing = `${px * 0.01}px`;
  ctx.textAlign = 'left';
  const tx = x + s + px * 0.35;
  ctx.fillStyle = C.cream;
  ctx.fillText('TROPHY', tx, baseline);
  ctx.fillStyle = C.red;
  ctx.fillText('TRACKER', tx + ctx.measureText('TROPHY').width, baseline);
  ctx.letterSpacing = '0px';
}

/** Pastille rouge DM Mono (« en direct »), point blanc devant ; renvoie sa largeur. */
function pill(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, px: number, align: 'left' | 'right' = 'left') {
  ctx.font = `500 ${px}px ${MONO}`;
  const dot = px * 0.5;
  const w = ctx.measureText(label).width + px * 1.1 + dot + px * 0.4;
  const h = px * 1.7;
  const left = align === 'right' ? x - w : x;
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.roundRect(left, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(left + px * 0.55 + dot / 2, y + h / 2, dot / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, left + px * 0.55 + dot + px * 0.4, y + h / 2 + px * 0.04);
  ctx.textBaseline = 'alphabetic';
  return w;
}

const shortDate = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', opts);
/** « 2–16 août », « 28 juil.–3 août », « dès le 2 août ». */
export function dateRange(start?: string | null, end?: string | null) {
  if (!start) return '';
  if (!end) return `dès le ${shortDate(start, { day: 'numeric', month: 'long' })}`;
  const [a, b] = [new Date(`${start}T12:00:00`), new Date(`${end}T12:00:00`)];
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${shortDate(end, { day: 'numeric', month: 'long' })}`;
  return `${shortDate(start, { day: 'numeric', month: 'short' })}–${shortDate(end, { day: 'numeric', month: 'short' })}`;
}

/** Titre « Départ → Destination » (ou le nom) : [début, partie en rouge]. */
function titleParts(c: PosterCrew): [string, string | null] {
  if (c.name.includes('→')) {
    const [a, b] = c.name.split('→').map((x) => x.trim());
    return [`${a} → `, b || null];
  }
  if (c.city && c.destination) return [`${c.city} → `, c.destination];
  return [c.name, null];
}


// ── Story : vue satellite de la trace ──────────────────────────────────────
const RAD = Math.PI / 180;
const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * RAD) / 2));
const invMerc = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD;

/** Cadrage de la story : la trace occupe le milieu de l'image (entre le titre en haut et le QR en bas). */
export const storyFrame = (points: { lat: number; lon: number }[], w: number, h: number) => fitFrame(points, w, h, 0.82, 0.36);

/**
 * Cadre une trace dans une image Web Mercator de w × h pixels : la trace prend au plus `fx` de la largeur
 * et `fy` de la hauteur, centrée. Renvoie l'emprise (lon/lat) à demander à l'imagerie et la conversion
 * position → pixel, pour dessiner la trace par-dessus.
 */
export function fitFrame(points: { lat: number; lon: number }[], w: number, h: number, fx: number, fy: number) {
  const xs = points.map((p) => p.lon * RAD);
  const ys = points.map((p) => merc(p.lat));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const minSpan = 0.006; // ≈ 35 km : une trace très courte reste lisible
  const spanX = Math.max(x1 - x0, minSpan);
  const spanY = Math.max(y1 - y0, minSpan);
  const s = Math.min((w * fx) / spanX, (h * fy) / spanY);
  const widthM = w / s;
  const heightM = h / s;
  const cx = (x0 + x1) / 2;
  const top = (y0 + y1) / 2 + heightM * 0.5; // centre de la trace à 50 % de la hauteur
  const left = cx - widthM / 2;
  return {
    bbox: [left / RAD, invMerc(top - heightM), (left + widthM) / RAD, invMerc(top)] as const,
    toPx: (lat: number, lon: number) => [(lon * RAD - left) * s, (top - merc(lat)) * s] as const,
  };
}

async function drawStoryBackground(ctx: CanvasRenderingContext2D, c: PosterCrew, w: number, h: number) {
  const pts = (c.track ?? []).map((p) => ({ lat: p[0]!, lon: p[1]! })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const anchor = pts.length ? pts : c.start ? [c.start] : [];
  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, w, h);
  if (!anchor.length) return;
  const step = Math.max(1, Math.floor(pts.length / 1500));
  const kept = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
  const frame = storyFrame(anchor, w, h);
  try {
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${frame.bbox.map((n) => n.toFixed(5)).join(',')}`
      + `&bboxSR=4326&imageSR=3857&size=${w},${h}&format=jpg&f=image`;
    const img = await loadImage(url, true);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(0, 0, w, h);
  } catch {
    /* imagerie indisponible : fond nuit */
  }
  if (kept.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [color, width] of [[C.night, 20], [C.red, 11]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      kept.forEach((p, i) => { const [x, y] = frame.toPx(p.lat, p.lon); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
    }
  }
  const last = kept.at(-1) ?? anchor[0]!;
  const [bx, by] = frame.toPx(last.lat, last.lon);
  ctx.fillStyle = C.red;
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(bx, by, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Dessine le visuel et renvoie le canvas. */
export async function drawPoster(format: PosterFormat, crew: PosterCrew): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(`800 100px ${DISPLAY}`), document.fonts.load(`900 100px ${LOGO_FONT}`), document.fonts.load(`500 40px ${MONO}`), document.fonts.load(`400 40px ${MONO}`)]);
  const [w, h] = POSTER_SIZE[format];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const [titleA, titleB] = titleParts(crew);

  if (format === 'sticker') {
    // Fond nuit, liseré crème, coins arrondis (le reste transparent).
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 144);
    ctx.fill();
    ctx.fillStyle = C.night;
    ctx.beginPath();
    ctx.roundRect(30, 30, w - 60, h - 60, 118);
    ctx.fill();
    await drawBrand(ctx, 120, 220, 66);
    pill(ctx, 'en direct', w - 120, 168, 38, 'right');
    const qr = 600;
    const qy = (h - qr) / 2 + 10;
    await drawQr(ctx, crew.url, 120, qy, qr);
    ctx.textAlign = 'left';
    ctx.font = `800 132px ${DISPLAY}`;
    ctx.letterSpacing = '-5px';
    ctx.fillStyle = C.cream;
    const tx = 120 + qr + 70;
    ctx.fillText('Suivez-', tx, qy + 210);
    ctx.fillText('nous en', tx, qy + 340);
    ctx.fillStyle = C.red;
    ctx.fillText('direct.', tx, qy + 470);
    ctx.letterSpacing = '0px';
    ctx.font = `400 42px ${MONO}`;
    ctx.fillStyle = C.dust;
    const range = dateRange(crew.starts_on, crew.ends_on);
    const rw = range ? ctx.measureText(range).width : 0;
    const name = `${titleA}${titleB ?? ''}`;
    fitFont(ctx, name, (px) => `400 ${px}px ${MONO}`, w - 240 - rw - 60, 42, 26);
    ctx.fillText(name, 120, h - 130);
    if (range) {
      ctx.font = `400 42px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText(range, w - 120, h - 130);
    }
  } else if (format === 'round') {
    const r = w / 2;
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.arc(r, r, r - 26, 0, Math.PI * 2);
    ctx.fill();
    const qr = 420;
    await drawQr(ctx, crew.url, r - qr / 2, 175, qr);
    ctx.textAlign = 'center';
    ctx.font = `800 84px ${DISPLAY}`;
    ctx.letterSpacing = '-3px';
    ctx.fillStyle = C.white;
    ctx.fillText('Suivez-nous !', r, 720);
    ctx.letterSpacing = '0px';
  } else {
    await drawStoryBackground(ctx, crew, w, h);
    const top = ctx.createLinearGradient(0, 0, 0, h);
    top.addColorStop(0, 'rgba(21,22,26,.88)');
    top.addColorStop(0.3, 'rgba(21,22,26,0)');
    top.addColorStop(0.55, 'rgba(21,22,26,0)');
    top.addColorStop(1, 'rgba(21,22,26,.94)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h);

    const label = crew.live ? (crew.day ? `jour ${crew.day} · en direct` : 'en direct') : crew.starts_on ? `départ le ${shortDate(crew.starts_on, { day: 'numeric', month: 'long' })}` : 'carnet de route';
    pill(ctx, label, 70, 84, 36);
    ctx.textAlign = 'left';
    const full = `${titleA}${titleB ?? ''}`;
    const px = fitFont(ctx, full, (p) => `800 ${p}px ${DISPLAY}`, w - 140, 124, 64);
    ctx.font = `800 ${px}px ${DISPLAY}`;
    ctx.letterSpacing = `${-px * 0.045}px`;
    ctx.fillStyle = C.cream;
    ctx.fillText(titleA, 70, 270);
    if (titleB) {
      ctx.fillStyle = C.red;
      ctx.fillText(titleB, 70 + ctx.measureText(titleA).width, 270);
    }
    ctx.letterSpacing = '0px';
    const facts = [crew.distanceKm ? `${Math.round(crew.distanceKm).toLocaleString('fr-FR')} km` : null, dateRange(crew.starts_on, crew.ends_on) || null].filter(Boolean).join(' · ');
    if (facts) {
      ctx.font = `400 38px ${MONO}`;
      ctx.fillStyle = '#E4DFD6';
      ctx.fillText(facts, 70, 340);
    }
    // Carte crème en bas : QR + « Suivez-nous en direct ».
    const cy = h - 70 - 300;
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.roundRect(70, cy, w - 140, 300, 52);
    ctx.fill();
    await drawQr(ctx, crew.url, 100, cy + 30, 240);
    ctx.textAlign = 'left';
    ctx.font = `800 54px ${DISPLAY}`;
    ctx.letterSpacing = '-1.6px';
    ctx.fillStyle = C.night;
    ctx.fillText('Suivez-nous', 380, cy + 130);
    ctx.fillText('en direct', 380, cy + 190);
    ctx.letterSpacing = '0px';
    ctx.font = `400 28px ${MONO}`;
    ctx.fillStyle = C.muted;
    ctx.fillText(new URL(crew.url).host, 380, cy + 244);
  }
  return canvas;
}

export const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible à créer'))), 'image/png'));
