import type { CV } from '@techstark/opencv-js';

/**
 * Instancia de OpenCV.js lista para usarse (métodos Mat, cvtColor, etc.).
 * También puede exponer `onRuntimeInitialized` mientras la runtime WASM
 * termina de compilarse.
 */
export type OpenCVModule = CV & { onRuntimeInitialized?: () => void };

let openCVPromise: Promise<OpenCVModule> | undefined;

function isPromiseLike(value: unknown): value is PromiseLike<OpenCVModule> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as PromiseLike<OpenCVModule>).then === 'function'
  );
}

/**
 * Carga el módulo OpenCV.js de forma diferida (lazy) usando un import
 * dinámico: el WASM (~13 MB) queda en un chunk aparte y solo se descarga/
 * compila la primera vez que se necesita OpenCV.
 *
 * El export del paquete puede ser:
 *   1. una Promise (runtime aún inicializándose)  → se awaits,
 *   2. un objeto con `Mat` listo                  → se usa directo,
 *   3. un objeto con `onRuntimeInitialized`       → se espera el callback.
 */
async function loadOpenCVModule(): Promise<OpenCVModule> {
  const namespace = (await import('@techstark/opencv-js')) as {
    default?: unknown;
  };
  const mod = (namespace.default ?? namespace) as OpenCVModule;

  if (mod.Mat) return mod;
  if (isPromiseLike(mod)) return await mod;

  await new Promise<void>((resolve, reject) => {
    try {
      mod.onRuntimeInitialized = () => resolve();
    } catch (error) {
      reject(error);
    }
  });
  return mod;
}

/**
 * Devuelve una promesa que resuelve con OpenCV listo.
 * Memoiza la carga: se invoca una sola vez y cualquier error resetea
 * el estado para permitir reintentar.
 */
export function initOpenCV(): Promise<OpenCVModule> {
  if (!openCVPromise) {
    openCVPromise = loadOpenCVModule().catch((error) => {
      openCVPromise = undefined;
      throw error;
    });
  }
  return openCVPromise;
}