import type { DocumentType, ScanPage } from '../../../types/scan';

/** Página nueva sin editar: el original es también su primer render. */
export function createPage(
  sourceDataUrl: string,
  kind: DocumentType,
): ScanPage {
  return {
    id: crypto.randomUUID(),
    kind,
    sourceDataUrl,
    renderedDataUrl: sourceDataUrl,
    rotation: 0,
    filter: 'original',
    corners: null,
    perspectiveApplied: false,
  };
}

/** Reemplaza una página por su versión editada, conservando el orden. */
export function replacePage(pages: ScanPage[], updated: ScanPage): ScanPage[] {
  return pages.map((page) => (page.id === updated.id ? updated : page));
}

/** Elimina una página por id. */
export function removePage(pages: ScanPage[], id: string): ScanPage[] {
  return pages.filter((page) => page.id !== id);
}

/**
 * Mueve una página un lugar hacia arriba o hacia abajo.
 * Devuelve el mismo array cuando el movimiento no aplica (extremos).
 */
export function movePage(
  pages: ScanPage[],
  id: string,
  direction: 'up' | 'down',
): ScanPage[] {
  const index = pages.findIndex((page) => page.id === id);
  if (index === -1) return pages;

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= pages.length) return pages;

  const next = [...pages];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}
