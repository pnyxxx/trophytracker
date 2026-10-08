/**
 * Le récit de l'accueil : la montée du col du Galibier depuis Valloire (tracé routier réel, example-trip.json),
 * racontée en 5 chapitres pendant qu'on fait défiler la page. Données et calculs purs (sans carte), partagés
 * par la page (textes, HUD) et la carte 3D (StoryMap.tsx).
 *
 * L'avancement `prog` va de 0 (accueil, vue d'ensemble) à KEYFRAMES.length - 1 (fin du récit).
 */
import { headingAtDist, makeRoute, pointAtDist, type LonLat } from '@/lib/route-anim';
import TRIP from './example-trip.json';

export const ROUTE = makeRoute(TRIP as LonLat[]);

/** Centre de la vue d'ensemble (Valloire → col → Lautaret). */
const OVERVIEW: LonLat = [6.4134, 45.1003];
/** Le col du Galibier (2 642 m), à 67 % du tracé. */
export const COL_AT = 0.672;

/**
 * Images-clés de la caméra. `tp` : fraction du trajet où en est le voyageur ; `c` : centre fixe (sinon la
 * caméra suit le voyageur) ; `b` : cap en degrés, ou 'h' pour regarder la route devant.
 */
export interface Keyframe { c?: LonLat; z: number; pi: number; b: number | 'h'; tp: number }
export const KEYFRAMES: Keyframe[] = [
  { c: OVERVIEW, z: 11.3, pi: 0, b: 0, tp: 0 },
  { z: 14.1, pi: 62, b: 'h', tp: 0.02 },
  { z: 14.5, pi: 70, b: 'h', tp: 0.34 },
  { z: 14, pi: 64, b: 'h', tp: 0.55 },
  { z: 14.9, pi: 58, b: -25, tp: COL_AT },
  // Vue finale décalée : la trace reste visible à gauche de la carte du lien.
  { c: [6.465, 45.078], z: 11.7, pi: 34, b: -8, tp: 0.7 },
];
export const LAST = KEYFRAMES.length - 1;

export const CHAPTERS = [
  { tag: '01 · départ', title: 'Tu prends la route.', text: 'Crée ton trip en quelques minutes, lance le suivi, c’est parti. La trace s’écrit toute seule, kilomètre après kilomètre.' },
  { tag: '02 · en direct', title: 'Ils te suivent, en temps réel.', text: 'Position, vitesse, distance : ceux que tu as invités te voient avancer sur la carte, à quelques secondes près.' },
  { tag: '03 · hors réseau', title: 'Même sans réseau.', text: 'Plus de réseau dans la montée ? Ton téléphone garde chaque point en mémoire et complète la trace dès qu’il capte.' },
  { tag: '04 · souvenirs', title: 'Tes photos, là où tu les as prises.', text: 'Tes photos et tes 360° se rangent d’elles-mêmes sur la carte, pile à leur endroit.' },
  { tag: '05 · privé', title: 'Un lien. Rien de plus.', text: 'Ton voyage est privé par défaut. Seuls ceux à qui tu envoies le lien peuvent le suivre, sans compte et sans appli.' },
];

/** Photos du chapitre 4 : vues aériennes IGN autour du col (public/accueil/, Licence Ouverte). */
export const PHOTOS: { src: string; at: LonLat; w: number; tilt: number; alt: string }[] = [
  { src: '/accueil/col-galibier.jpg', at: [6.4058, 45.0634], w: 116, tilt: -4, alt: 'Le col du Galibier vu du ciel' },
  { src: '/accueil/lacet-galibier.jpg', at: [6.4108, 45.0646], w: 92, tilt: 5, alt: 'Un lacet de la route du Galibier' },
  { src: '/accueil/route-galibier.jpg', at: [6.4085, 45.0626], w: 88, tilt: -2, alt: 'La route du Galibier' },
];

const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Distance parcourue (m) à l'avancement `prog`. */
export function distAt(prog: number) {
  const i = Math.min(LAST - 1, Math.floor(prog));
  const t = ease(clamp01(prog - i));
  return lerp(KEYFRAMES[i]!.tp, KEYFRAMES[i + 1]!.tp, t) * ROUTE.total;
}

const kfBearing = (k: Keyframe) => (k.b === 'h' ? headingAtDist(ROUTE, k.tp * ROUTE.total, 1500) : k.b);

/** Caméra à l'avancement `prog` : centre, zoom, inclinaison, cap. */
export function cameraAt(prog: number) {
  const i = Math.min(LAST - 1, Math.floor(prog));
  const t = ease(clamp01(prog - i));
  const A = KEYFRAMES[i]!;
  const B = KEYFRAMES[i + 1]!;
  const d = distAt(prog);
  const center: LonLat = !A.c && !B.c
    ? pointAtDist(ROUTE, d)
    : (() => {
      const a = A.c ?? pointAtDist(ROUTE, A.tp * ROUTE.total);
      const b = B.c ?? pointAtDist(ROUTE, B.tp * ROUTE.total);
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
    })();
  // En s'éloignant, le zoom part vite ; en s'approchant, il arrive tard : on garde le voyageur en vue.
  const tz = B.z < A.z ? Math.sqrt(t) : t * t;
  return { center, zoom: lerp(A.z, B.z, tz), pitch: lerp(A.pi, B.pi, t), bearing: lerpAngle(kfBearing(A), kfBearing(B), t) };
}

/** Vue fixe (téléphone, animations réduites) : tout le tracé, voyageur au col. */
export const STILL_CAMERA = { center: OVERVIEW, zoom: 11.2, pitch: 30, bearing: -8 };

/** Le passage « hors réseau » du chapitre 3. */
export const offlineAt = (prog: number) => prog > 2.55 && prog < 3.45;
/** Les photos apparaissent au chapitre 4. */
export const photosAt = (prog: number) => prog > 3.55;
