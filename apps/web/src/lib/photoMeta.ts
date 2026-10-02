/**
 * Ce qu'une photo sait d'elle-même (métadonnées EXIF / XMP), lu dans le navigateur
 * AVANT la compression (qui les efface du fichier envoyé, voir media.ts) :
 *  - position GPS de la prise de vue ;
 *  - date et heure de la prise de vue ;
 *  - photo 360° (marqueur « equirectangular » des appareils 360°, ou format 2:1).
 */
import exifr from 'exifr';

export interface PhotoMeta {
  lat: number | null;
  lon: number | null;
  /** Date de la prise de vue, si l'appareil l'a notée. */
  takenAt: Date | null;
  panorama: boolean;
}

/** Une image équirectangulaire fait deux fois plus large que haute. */
const looksPanoramic = (w: number, h: number) => w >= 2000 && h > 0 && Math.abs(w / h - 2) < 0.05;

async function imageSize(file: File): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  type Tags = { latitude?: number; longitude?: number; DateTimeOriginal?: Date; CreateDate?: Date; ProjectionType?: string };
  const [tags, size] = await Promise.all([
    exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: true }).catch(() => null) as Promise<Tags | null>,
    imageSize(file),
  ]);
  const lat = tags?.latitude;
  const lon = tags?.longitude;
  const hasGps = typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
  const date = tags?.DateTimeOriginal ?? tags?.CreateDate;
  return {
    lat: hasGps ? lat : null,
    lon: hasGps ? lon : null,
    takenAt: date instanceof Date && !Number.isNaN(date.getTime()) ? date : null,
    panorama: tags?.ProjectionType?.toLowerCase() === 'equirectangular' || looksPanoramic(size.width, size.height),
  };
}
