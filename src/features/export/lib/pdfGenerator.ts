import { loadImage } from '../../../lib/image/loadImage';

export type PdfPageSize = 'a4' | 'fit';

export interface GeneratedPdf {
  blob: Blob;
  /** Tamaño del PDF en bytes. */
  size: number;
}

const PAGE_ORIENTATION = 'portrait' as const;
const PAGE_UNIT = 'mm';
const MARGIN_MM = 8;
/** Densidad asumida para el modo 'fit' (calidad de escaneo). */
const SCAN_DPI = 300;
const MM_PER_INCH = 25.4;

/**
 * Convierte la imagen procesada (data URL) en un PDF de una sola página
 * usando jsPDF. Generación 100% local, sin subir nada a la red.
 *
 * - `pageSize: 'a4'`  → página A4, imagen escalada y centrada con margen.
 * - `pageSize: 'fit'` → página con el tamaño físico de la imagen (300 DPI).
 *
 * jsPDF se importa dinámicamente para que no pese en el bundle inicial.
 */
export async function generatePdf(
  imageDataUrl: string,
  pageSize: PdfPageSize = 'a4',
): Promise<GeneratedPdf> {
  const [{ jsPDF }, image] = await Promise.all([
    import('jspdf'),
    loadImage(imageDataUrl),
  ]);

  const format: string | number[] =
    pageSize === 'fit'
      ? [
          image.naturalWidth * (MM_PER_INCH / SCAN_DPI),
          image.naturalHeight * (MM_PER_INCH / SCAN_DPI),
        ]
      : 'a4';

  const doc = new jsPDF({
    orientation: PAGE_ORIENTATION,
    unit: PAGE_UNIT,
    format,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - MARGIN_MM * 2;
  const usableHeight = pageHeight - MARGIN_MM * 2;

  // Encajar dentro de la página sin distorsionar la proporción
  const ratio = Math.min(
    usableWidth / image.naturalWidth,
    usableHeight / image.naturalHeight,
  );
  const imageWidthMm = image.naturalWidth * ratio;
  const imageHeightMm = image.naturalHeight * ratio;

  const x = (pageWidth - imageWidthMm) / 2;
  const y = (pageHeight - imageHeightMm) / 2;

  doc.addImage(imageDataUrl, 'PNG', x, y, imageWidthMm, imageHeightMm);

  const blob = doc.output('blob') as Blob;
  return { blob, size: blob.size };
}