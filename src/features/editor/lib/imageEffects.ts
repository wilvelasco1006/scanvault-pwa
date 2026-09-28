/**
 * Operaciones de procesamiento de imagen (Canvas) desacopladas de la UI.
 * Se aplican directamente sobre el contexto 2D del lienzo del editor.
 */

export type FilterId = 'original' | 'grayscale' | 'bw';

export const FILTER_OPTIONS: ReadonlyArray<{ id: FilterId; label: string }> = [
  { id: 'original', label: 'Original' },
  { id: 'grayscale', label: 'Escala de Grises' },
  { id: 'bw', label: 'B&N Alto Contraste' },
];

/**
 * Aplica el filtro seleccionado a todos los píxeles del canvas (in-place).
 * - 'original': no modifica nada.
 * - 'grayscale': luminancia (rec. 601) en cada canal.
 * - 'bw': umbral a 255/0 para alto contraste legible en texto.
 */
export function applyFilter(
  ctx: CanvasRenderingContext2D,
  filter: FilterId,
): void {
  if (filter === 'original') return;

  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    if (filter === 'grayscale') {
      data[i] = luma;
      data[i + 1] = luma;
      data[i + 2] = luma;
    } else {
      const value = luma > 128 ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}