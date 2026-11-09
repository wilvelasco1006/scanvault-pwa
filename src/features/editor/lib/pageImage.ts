import type { FilterId } from '../../../types/scan';

/** Calidad de compresión para páginas a color o en grises (JPEG). */
const JPEG_QUALITY = 0.92;

/**
 * Serializa el canvas procesado de una página a un data URL listo para el PDF.
 *
 * Los resultados binarios (B&N y Escáner Pro) se guardan como PNG porque
 * comprimen mucho mejor y no generan artefactos en los bordes del texto.
 * Las páginas a color usan JPEG, que pesa ~10x menos para la misma calidad
 * percibida y evita agotar la memoria con sesiones de varias páginas.
 */
export function canvasToPageImage(
  canvas: HTMLCanvasElement,
  filter: FilterId,
): string {
  const lossless = filter === 'bw' || filter === 'scannerPro';
  return lossless
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
