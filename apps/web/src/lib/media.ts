/**
 * Images : compression dans le navigateur avant l'envoi, et URLs publiques.
 *
 * Ré-encoder l'image en WebP via un <canvas> :
 *  - divise souvent le poids par 5 à 10 (important en 4G au milieu du désert !) ;
 *  - SUPPRIME les métadonnées EXIF, dont la position GPS exacte de la prise de vue.
 */
import { supabase } from './supabase';

export const MEDIA_BUCKET = 'crew-media';

export type ImagePreset = 'photo' | 'panorama' | 'avatar' | 'cover' | 'logo';

const PRESETS: Record<ImagePreset, { maxW: number; maxH: number; quality: number }> = {
  photo: { maxW: 2560, maxH: 2560, quality: 0.82 },
  // ≤ 16,7 Mpx : limite des canvas sur iPhone ; reste net en 360°.
  panorama: { maxW: 5760, maxH: 2880, quality: 0.85 },
  avatar: { maxW: 512, maxH: 512, quality: 0.88 },
  cover: { maxW: 2400, maxH: 1200, quality: 0.82 },
  logo: { maxW: 512, maxH: 512, quality: 0.9 },
};

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

export async function compressImage(file: File, preset: ImagePreset): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image');
  if (file.size > 60 * 1024 * 1024) throw new Error('Image trop lourde (60 Mo maximum)');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Format non lisible par votre navigateur (essayez JPG ou PNG)');
  }
  const { maxW, maxH, quality } = PRESETS[preset];
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Compression impossible sur ce navigateur');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  // Safari ancien : pas d'encodeur WebP → repli JPEG.
  const final =
    blob && blob.type === 'image/webp'
      ? blob
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!final) throw new Error('Compression impossible');
  return { blob: final, width, height };
}

/** Envoie une image compressée dans le dossier de l'équipage ; renvoie son chemin. */
export async function uploadCrewImage(crewId: string, folder: string, file: File, preset: ImagePreset) {
  const img = await compressImage(file, preset);
  const ext = img.blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${crewId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, img.blob, { contentType: img.blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return { path, width: img.width, height: img.height };
}

export async function removeCrewImages(...paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (list.length) await supabase.storage.from(MEDIA_BUCKET).remove(list);
}

/** Supprime tous les fichiers d'un équipage (avant la suppression de l'équipage). */
export async function removeCrewFolder(crewId: string) {
  for (const sub of ['avatar', 'cover', 'photos', 'sponsors']) {
    const { data } = await supabase.storage.from(MEDIA_BUCKET).list(`${crewId}/${sub}`, { limit: 1000 });
    if (data?.length) await removeCrewImages(...data.map((f) => `${crewId}/${sub}/${f.name}`));
  }
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Miniature redimensionnée à la volée par le serveur (imgproxy). */
export function thumbUrl(path: string | null | undefined, width = 640): string | null {
  if (!path) return null;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path, { transform: { width, quality: 70 } }).data.publicUrl;
}
