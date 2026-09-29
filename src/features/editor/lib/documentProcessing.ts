/**
 * Procesamiento de imagen con OpenCV.js (@techstark/opencv-js).
 *
 * Todas las funciones liberan la memoria de WebAssembly llamando `.delete()`
 * sobre cada cv.Mat dentro de bloques `try ... finally` para evitar fugas
 * (memory leaks). Nunca se borran los Mats devueltos por `MatVector.get(i)`
 * (comparten datos): solo se elimina el MatVector contenedor.
 */
import type { Mat } from '@techstark/opencv-js';
import { initOpenCV, type OpenCVModule } from '../../scanner/lib/opencv';
import type { Corners, Point } from '../../../types/geometry';

/** Copia el contenido de un cv.Mat a un canvas nuevo (suelta el Mat aparte). */
function matToCanvas(cv: OpenCVModule, mat: Mat): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  cv.imshow(canvas, mat);
  return canvas;
}

/** Distancia euclidiana entre dos puntos (píxeles). */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Ordena 4 puntos en el orden [tl, tr, br, bl] usando la suma/diferencia
 * de coordenadas (esquinas de una hoja aproximadamente ortagonal).
 */
export function orderCorners(points: Point[]): Corners {
  const sorted = [...points].sort((a, b) => a.y - b.y);
  const [topA, topB, bottomA, bottomB] = sorted;
  const [tl, tr] = topA.x <= topB.x ? [topA, topB] : [topB, topA];
  const [bl, br] = bottomA.x <= bottomB.x ? [bottomA, bottomB] : [bottomB, bottomA];
  return [tl, tr, br, bl];
}

/**
 * Mapea un punto del espacio de la imagen base (ancho `srcW`, alto `srcH`)
 * al espacio de la vista ya rotada (canvas con `ctx.rotate(rotation)`).
 * Solo se usa con rotaciones múltiplos de 90°.
 */
export function rotatePoint(
  p: Point,
  rotation: number,
  srcW: number,
  srcH: number,
): Point {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const vw = rotation % 180 === 0 ? srcW : srcH;
  const vh = rotation % 180 === 0 ? srcH : srcW;
  const tx = p.x - srcW / 2;
  const ty = p.y - srcH / 2;
  return {
    x: tx * cos - ty * sin + vw / 2,
    y: tx * sin + ty * cos + vh / 2,
  };
}

/** Inversa de `rotatePoint`: de la vista rotada de vuelta al espacio base. */
export function inverseRotatePoint(
  p: Point,
  rotation: number,
  srcW: number,
  srcH: number,
): Point {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const vw = rotation % 180 === 0 ? srcW : srcH;
  const vh = rotation % 180 === 0 ? srcH : srcW;
  const tx = p.x - vw / 2;
  const ty = p.y - vh / 2;
  return {
    x: tx * cos + ty * sin + srcW / 2,
    y: -tx * sin + ty * cos + srcH / 2,
  };
}

/**
 * Detecta el contorno principal del documento (la hoja) en la imagen del
 * canvas y devuelve sus 4 esquinas ordenadas [tl, tr, br, bl].
 *
 * Pipeline: escala de grises → desenfoque gaussiano → Canny → contornos
 * (RETR_LIST) → se busca el polígono convexo de mayor área con 4 vértices.
 *
 * Devuelve `null` si no se encuentra un contorno cuadrilátero válido.
 */
export async function detectDocumentContour(
  srcCanvas: HTMLCanvasElement,
): Promise<Corners | null> {
  const cv = await initOpenCV();
  const src = cv.imread(srcCanvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const hierarchy = new cv.Mat();
  const contours = new cv.MatVector();
  const approx = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 75, 200);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // El cuadrilátero debe ocupar al menos el 5% de la imagen para filtrar ruido.
    const minArea = srcCanvas.width * srcCanvas.height * 0.05;
    let bestPoints: Point[] | null = null;
    let bestArea = minArea;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = Math.abs(cv.contourArea(contour, false));
      if (area < bestArea) continue;

      const perimeter = cv.arcLength(contour, true);
      cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

      if (approx.rows === 4) {
        const pts: Point[] = [];
        for (let r = 0; r < approx.rows; r++) {
          pts.push({ x: approx.data32S[r * 2], y: approx.data32S[r * 2 + 1] });
        }
        bestPoints = pts;
        bestArea = area;
      }
    }

    return bestPoints ? orderCorners(bestPoints) : null;
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    hierarchy.delete();
    contours.delete(); // libera también los Mats internos obt-enerados con get(i)
    approx.delete();
  }
}

/**
 * Aplica una transformación de perspectiva (de-skew) sobre la imagen del
 * canvas: recorta el documento según sus 4 esquinas y lo aplana.
 *
 * `corners` deben estar en el orden [tl, tr, br, bl] y en el mismo sistema
 * de coordenadas que `srcCanvas`.
 */
export async function transformPerspective(
  srcCanvas: HTMLCanvasElement,
  corners: Corners,
): Promise<HTMLCanvasElement> {
  const cv = await initOpenCV();
  const src = cv.imread(srcCanvas);
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners[0].x, corners[0].y,
    corners[1].x, corners[1].y,
    corners[2].x, corners[2].y,
    corners[3].x, corners[3].y,
  ]);

  const width = Math.max(2, Math.round(Math.max(distance(corners[0], corners[1]), distance(corners[3], corners[2]))));
  const height = Math.max(2, Math.round(Math.max(distance(corners[0], corners[3]), distance(corners[1], corners[2]))));

  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    width - 1, 0,
    width - 1, height - 1,
    0, height - 1,
  ]);

  const transform = cv.getPerspectiveTransform(srcTri, dstTri);
  const warped = new cv.Mat();

  try {
    cv.warpPerspective(src, warped, transform, new cv.Size(width, height), cv.INTER_LINEAR);
    return matToCanvas(cv, warped);
  } finally {
    src.delete();
    srcTri.delete();
    dstTri.delete();
    transform.delete();
    warped.delete();
  }
}

/**
 * Binarización adaptativa (cv.adaptiveThreshold) para generar el filtro
 * "Escáner Pro": fondo blanco nítido con texto negro, eliminando sombras
 * y variaciones de iluminación locales.
 */
export async function applyAdaptiveThreshold(
  srcCanvas: HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
  const cv = await initOpenCV();
  const src = cv.imread(srcCanvas);
  const gray = new cv.Mat();
  const binary = new cv.Mat();
  const rgba = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(
      gray,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      11,
      2,
    );
    cv.cvtColor(binary, rgba, cv.COLOR_GRAY2RGBA);
    return matToCanvas(cv, rgba);
  } finally {
    src.delete();
    gray.delete();
    binary.delete();
    rgba.delete();
  }
}