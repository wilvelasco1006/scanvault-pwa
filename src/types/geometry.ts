/**
 * Tipos de geometría compartidos por el editor (marcos de recorte).
 * Las coordenadas están en píxeles del espacio de la imagen base
 * (la captura original sin rotar).
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Las 4 esquinas del documento, en el orden:
 * [superior izquierda, superior derecha, inferior derecha, inferior izquierda].
 */
export type Corners = [Point, Point, Point, Point];