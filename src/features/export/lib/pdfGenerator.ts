import { loadImage } from '../../../lib/image/loadImage';

export type PdfPageSize = 'a4' | 'fit';

export interface GeneratedPdf {
  blob: Blob;
  /** Tamaño del PDF en bytes. */
  size: number;
  /** Cantidad de páginas incluidas. */
  pageCount: number;
}

const PAGE_ORIENTATION = 'portrait' as const;
const PAGE_UNIT = 'mm';
const MARGIN_MM = 8;
/** Densidad asumida para el modo 'fit' (calidad de escaneo). */
const SCAN_DPI = 300;
const MM_PER_INCH = 25.4;

/** jsPDF necesita saber el formato real del data URL que recibe. */
function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

/** Tamaño físico de página: A4 fijo o el tamaño de la imagen a 300 DPI. */
function pageFormatFor(
  image: HTMLImageElement,
  pageSize: PdfPageSize,
): string | number[] {
  if (pageSize === 'a4') return 'a4';
  return [
    image.naturalWidth * (MM_PER_INCH / SCAN_DPI),
    image.naturalHeight * (MM_PER_INCH / SCAN_DPI),
  ];
}

/**
 * Convierte una o más imágenes procesadas (data URLs) en un PDF de varias
 * páginas usando jsPDF. Generación 100% local, sin subir nada a la red.
 *
 * - `pageSize: 'a4'`  → cada página A4, imagen escalada y centrada con margen.
 * - `pageSize: 'fit'` → cada página con el tamaño físico de su imagen (300 DPI).
 *
 * jsPDF se importa dinámicamente para que no pese en el bundle inicial.
 */
export async function generatePdf(
  imageDataUrls: string[],
  pageSize: PdfPageSize = 'a4',
): Promise<GeneratedPdf> {
  if (imageDataUrls.length === 0) {
    throw new Error('Se necesita al menos una página para generar el PDF.');
  }

  const [{ jsPDF }, images] = await Promise.all([
    import('jspdf'),
    Promise.all(imageDataUrls.map((dataUrl) => loadImage(dataUrl))),
  ]);

  const doc = new jsPDF({
    orientation: PAGE_ORIENTATION,
    unit: PAGE_UNIT,
    format: pageFormatFor(images[0], pageSize),
  });

  images.forEach((image, index) => {
    if (index > 0) doc.addPage(pageFormatFor(image, pageSize));

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

    doc.addImage(
      imageDataUrls[index],
      detectImageFormat(imageDataUrls[index]),
      x,
      y,
      imageWidthMm,
      imageHeightMm,
    );
  });

  const blob = doc.output('blob') as Blob;
  return { blob, size: blob.size, pageCount: images.length };
}
