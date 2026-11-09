import { loadImage } from '../../../lib/image/loadImage';
import type { ScanPage } from '../../../types/scan';
import type { PdfPageImage } from './pdfGenerator';

/**
 * Escala de impresión de la cédula respecto de su tamaño real.
 * 1 = tamaño normal, 1.5 = ampliada al 150%.
 */
export type CarnetScale = 1 | 1.5;

/** Resolución de la hoja compuesta. 300 DPI es la densidad de impresión estándar. */
const SHEET_DPI = 300;
const MM_PER_INCH = 25.4;

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/** Medidas de una tarjeta ID-1 (DNI, cédula, carnet): 85,60 × 53,98 mm. */
const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 53.98;

/** Separación vertical entre frente y dorso. */
const GAP_MM = 12;

/**
 * Dibuja la imagen dentro de la caja indicada sin deformarla
 * (equivalente a `object-fit: contain`), centrada.
 */
function drawContained(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
): void {
  const ratio = Math.min(
    boxWidth / image.naturalWidth,
    boxHeight / image.naturalHeight,
  );
  const width = image.naturalWidth * ratio;
  const height = image.naturalHeight * ratio;
  ctx.drawImage(
    image,
    x + (boxWidth - width) / 2,
    y + (boxHeight - height) / 2,
    width,
    height,
  );
}

/**
 * Compone frente y dorso de una tarjeta en una única hoja A4.
 *
 * Cada cara se dibuja al tamaño físico real de una tarjeta ID-1 multiplicado
 * por `scale`. Como la hoja resultante ya es A4 exacta, el PDF la inserta a
 * página completa (full bleed): así el 100% y el 150% significan lo mismo en
 * pantalla que impresos.
 */
export async function composeCarnetSheet(
  frontDataUrl: string,
  backDataUrl: string,
  scale: CarnetScale,
): Promise<string> {
  const [front, back] = await Promise.all([
    loadImage(frontDataUrl),
    loadImage(backDataUrl),
  ]);

  const pxPerMm = SHEET_DPI / MM_PER_INCH;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(A4_WIDTH_MM * pxPerMm);
  canvas.height = Math.round(A4_HEIGHT_MM * pxPerMm);

  const ctx = canvas.getContext('2d');
  if (!ctx) return frontDataUrl;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const cardWidth = CARD_WIDTH_MM * scale * pxPerMm;
  const cardHeight = CARD_HEIGHT_MM * scale * pxPerMm;
  const gap = GAP_MM * pxPerMm;

  const totalHeight = cardHeight * 2 + gap;
  const startY = (canvas.height - totalHeight) / 2;
  const x = (canvas.width - cardWidth) / 2;

  drawContained(ctx, front, x, startY, cardWidth, cardHeight);
  drawContained(ctx, back, x, startY + cardHeight + gap, cardWidth, cardHeight);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Empareja las páginas de la sesión de a dos (frente, dorso) y compone una
 * hoja A4 por par. El orden de la lista es el orden de las hojas.
 */
export async function composeCarnetSheets(
  pages: ScanPage[],
  scale: CarnetScale,
): Promise<PdfPageImage[]> {
  const sheets: PdfPageImage[] = [];

  for (let index = 0; index + 1 < pages.length; index += 2) {
    const dataUrl = await composeCarnetSheet(
      pages[index].renderedDataUrl,
      pages[index + 1].renderedDataUrl,
      scale,
    );
    sheets.push({ dataUrl, fullBleed: true });
  }

  return sheets;
}
