import type { Corners } from './geometry';

/**
 * Tipo de documento a escanear: determina la guía de encuadre en la cámara
 * y, más adelante, la composición del PDF (hoja completa o carnet).
 */
export type DocumentType = 'document' | 'carnet';

/** Filtros de imagen disponibles en el editor. */
export type FilterId = 'original' | 'grayscale' | 'bw' | 'scannerPro';

/**
 * Estado de edición de una página. Es todo lo que hace falta para volver a
 * renderizar la imagen desde el original: rotación (múltiplos de 90°),
 * filtro, esquinas detectadas (en el espacio de la imagen base) y si el
 * recorte por perspectiva ya se aplicó.
 */
export interface PageEditState {
  rotation: number;
  filter: FilterId;
  corners: Corners | null;
  perspectiveApplied: boolean;
}

/**
 * Una página escaneada dentro de una sesión.
 *
 * `sourceDataUrl` es la captura normalizada y nunca se modifica: permite
 * reabrir el editor y reproducir el resultado exacto. `renderedDataUrl` es
 * el resultado ya aplanado (rotación + recorte + filtro) que va al PDF.
 */
export interface ScanPage extends PageEditState {
  id: string;
  kind: DocumentType;
  sourceDataUrl: string;
  renderedDataUrl: string;
}
