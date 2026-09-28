import { loadImage } from './loadImage';

const THUMBNAIL_MAX_WIDTH = 480;
const THUMBNAIL_FORMAT = 'image/jpeg';
const THUMBNAIL_QUALITY = 0.8;

/**
 * Genera una miniatura ligera (JPEG) desde una imagen completa.
 * Las miniaturas son las que se muestran en la lista del Dashboard;
 * el original/PDF vive en IndexedDB.
 */
export async function createThumbnail(
  dataUrl: string,
  maxWidth = THUMBNAIL_MAX_WIDTH,
): Promise<string> {
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL(THUMBNAIL_FORMAT, THUMBNAIL_QUALITY);
}