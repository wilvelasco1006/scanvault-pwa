import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Crop,
  Loader2,
  RotateCcw,
  RotateCw,
  Save,
  ScanLine,
  Undo2,
} from 'lucide-react';
import { applyFilter, FILTER_OPTIONS, type FilterId } from '../lib/imageEffects';
import {
  applyAdaptiveThreshold,
  detectDocumentContour,
  inverseRotatePoint,
  rotatePoint,
  transformPerspective,
} from '../lib/documentProcessing';
import { initOpenCV } from '../../scanner/lib/opencv';
import type { Corners, Point } from '../../../types/geometry';
import SaveDocumentModal from '../../export/components/SaveDocumentModal';

interface EditorPageProps {
  /** Imagen capturada por la cámara (data URL PNG). */
  capturedImage: string;
  /** Vuelve a la pantalla de cámara. */
  onBack?: () => void;
  /** Se invoca al guardar con éxito el documento (después del modal). */
  onSaved?: () => void;
}

/** Radio (px, en el espacio del lienzo) para detectar el "agarre" de una esquina. */
const DRAG_HIT_RADIUS = 24;

function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(image, 0, 0);
  return canvas;
}

interface CornerOverlayParams {
  canvas: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
  corners: Corners | null;
  rotation: number;
  perspectiveApplied: boolean;
  image: HTMLImageElement;
}

/**
 * Pinta las 4 esquinas del documento sobre el lienzo de overlay.
 * Es una función pura (sin estado): la ejecutan tanto el efecto de overlay
 * (arrastre en vivo) como la cola del pipeline de render (sincroniza tamaño).
 */
function paintCornerOverlay({
  canvas,
  overlay,
  corners,
  rotation,
  perspectiveApplied,
  image,
}: CornerOverlayParams): void {
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  const ctx = overlay.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (perspectiveApplied || !corners) return;

  const pts = corners.map((c) =>
    rotatePoint(c, rotation, image.naturalWidth, image.naturalHeight),
  );

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
  ctx.fill();
  ctx.setLineDash([8, 5]);
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#34d399';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.fill();
  });
}

export default function EditorPage({
  capturedImage,
  onBack,
  onSaved,
}: EditorPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const cornersRef = useRef<Corners | null>(null);
  const renderTokenRef = useRef(0);

  // Contador que incrementa cuando se carga la imagen → dispara el redibujado
  const [loaded, setLoaded] = useState(0);
  const [rotation, setRotation] = useState(0); // grados: 0 | 90 | 180 | 270
  const [filter, setFilter] = useState<FilterId>('original');

  // Encuadre: esquinas (en el espacio de la imagen base) + si el recorte ya se aplicó
  const [corners, setCorners] = useState<Corners | null>(null);
  const [perspectiveApplied, setPerspectiveApplied] = useState(false);

  // Flags de UI (proceso OpenCV en curso / errores)
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [opencvError, setOpencvError] = useState<string | null>(null);

  // Modal de guardado/exportación
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageDataUrl, setModalImageDataUrl] = useState<string | null>(null);

  // Espejo de `corners` accesible desde el pipeline de render (evita re-render por arrastre)
  useEffect(() => {
    cornersRef.current = corners;
  }, [corners]);

  // Auto-detección del contorno (se dispara al cargar la imagen y desde el botón)
  const runDetection = useCallback(async (interactive: boolean) => {
    const image = imageRef.current;
    if (!image) return;
    if (interactive) setDetecting(true);
    try {
      const detected = await detectDocumentContour(imageToCanvas(image));
      if (detected) {
        setCorners(detected);
        setPerspectiveApplied(false);
      } else {
        setCorners(null);
      }
    } catch (error) {
      console.error('Detección de contorno fallida', error);
      setOpencvError('El auto-encuadre no está disponible: no se pudo cargar OpenCV.');
    } finally {
      if (interactive) setDetecting(false);
    }
  }, []);

  // Carga la imagen capturada (data URL) en un HTMLImageElement
  useEffect(() => {
    imageRef.current = null;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setLoaded((n) => n + 1);
      void runDetection(false); // auto-encuadre en cuanto entra la imagen base
    };
    image.src = capturedImage;
    return () => {
      if (imageRef.current === image) imageRef.current = null;
    };
  }, [capturedImage, runDetection]);

  // Pipeline de render: rotación → (recorte por perspectiva) → (filtro)
  // El contenido vive en canvasRef; las esquinas se dibujan en overlayRef.
  const render = useCallback(async () => {
    const token = ++renderTokenRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || loaded === 0) return;

    const baseW = image.naturalWidth;
    const baseH = image.naturalHeight;
    const vw = rotation % 180 === 0 ? baseW : baseH;
    const vh = rotation % 180 === 0 ? baseH : baseW;

    // 1) Imagen base rotada sobre fondo oscuro
    let content = document.createElement('canvas');
    content.width = vw;
    content.height = vh;
    const baseCtx = content.getContext('2d');
    if (!baseCtx) return;
    baseCtx.fillStyle = '#0f172a';
    baseCtx.fillRect(0, 0, vw, vh);
    baseCtx.imageSmoothingEnabled = true;
    baseCtx.imageSmoothingQuality = 'high';
    baseCtx.translate(vw / 2, vh / 2);
    baseCtx.rotate((rotation * Math.PI) / 180);
    baseCtx.drawImage(image, -baseW / 2, -baseH / 2);

    // 2) Recorte por perspectiva + filtro 'Escáner Pro' (OpenCV)
    const { current: currentCorners } = cornersRef;
    const doWarp = perspectiveApplied && currentCorners !== null;
    const doScan = filter === 'scannerPro';

    if (doWarp || doScan) {
      await initOpenCV(); // límite asíncrono: garantiza el WASM listo antes del spinner
      setBusy(true);
      setOpencvError(null);
    }

    try {
      if (doWarp && currentCorners) {
        const viewCorners = currentCorners.map((c) =>
          rotatePoint(c, rotation, baseW, baseH),
        ) as Corners;
        content = await transformPerspective(content, viewCorners);
      }

      if (doScan) {
        content = await applyAdaptiveThreshold(content);
      } else {
        applyFilter(content.getContext('2d')!, filter);
      }

      if (token !== renderTokenRef.current) return;

      canvas.width = content.width;
      canvas.height = content.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(content, 0, 0);

      // Sincroniza y repinta el overlay con el tamaño final del contenido
      const overlay = overlayRef.current;
      if (overlay) {
        paintCornerOverlay({
          canvas,
          overlay,
          corners: cornersRef.current,
          rotation,
          perspectiveApplied,
          image,
        });
      }
    } catch (error) {
      console.error('Error en el pipeline de procesamiento', error);
      if (token === renderTokenRef.current) {
        setOpencvError('No se pudo procesar la imagen con OpenCV en este dispositivo.');
      }
    } finally {
      if (token === renderTokenRef.current) setBusy(false);
    }
  }, [loaded, rotation, filter, perspectiveApplied]);

  useEffect(() => {
    if (loaded === 0) return;
    void render();
  }, [render, loaded]);

  // Dibuja las 4 esquinas sobre el overlay (arrastre en vivo)
  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!overlay || !canvas || !image) return;
    paintCornerOverlay({ canvas, overlay, corners, rotation, perspectiveApplied, image });
  }, [corners, perspectiveApplied, rotation]);

  useEffect(() => {
    if (loaded === 0) return;
    drawOverlay();
  }, [drawOverlay, loaded]);

  const rotateLeft = useCallback(() => {
    setRotation((current) => (current - 90 + 360) % 360);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((current) => (current + 90) % 360);
  }, []);

  const handleApplyCrop = useCallback(() => {
    if (!cornersRef.current) return;
    setPerspectiveApplied(true);
  }, []);

  const handleResetCrop = useCallback(() => {
    setPerspectiveApplied(false);
  }, []);

  // --- Interacción con el overlay (arrastre de esquinas) ---
  const clientToCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const overlay = overlayRef.current;
      if (!overlay) return { x: 0, y: 0 };
      const rect = overlay.getBoundingClientRect();
      const scale = Math.min(
        rect.width / overlay.width,
        rect.height / overlay.height,
      );
      const offsetX = (rect.width - overlay.width * scale) / 2;
      const offsetY = (rect.height - overlay.height * scale) / 2;
      return {
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (perspectiveApplied || !corners) return;
      const image = imageRef.current;
      if (!image) return;
      const p = clientToCanvasPoint(event.clientX, event.clientY);
      const viewCorners = corners.map((c) =>
        rotatePoint(c, rotation, image.naturalWidth, image.naturalHeight),
      );
      const hit = viewCorners.findIndex(
        (c) => Math.hypot(c.x - p.x, c.y - p.y) <= DRAG_HIT_RADIUS,
      );
      if (hit === -1) return;
      dragIndexRef.current = hit;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [clientToCanvasPoint, corners, perspectiveApplied, rotation],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const index = dragIndexRef.current;
      if (index === null || !corners || perspectiveApplied) return;
      const image = imageRef.current;
      if (!image) return;
      const p = clientToCanvasPoint(event.clientX, event.clientY);
      const base = inverseRotatePoint(
        p,
        rotation,
        image.naturalWidth,
        image.naturalHeight,
      );
      const clamped: Point = {
        x: Math.min(Math.max(base.x, 2), image.naturalWidth - 2),
        y: Math.min(Math.max(base.y, 2), image.naturalHeight - 2),
      };
      setCorners((prev) =>
        prev ? (prev.map((c, i) => (i === index ? clamped : c)) as Corners) : prev,
      );
    },
    [clientToCanvasPoint, corners, perspectiveApplied, rotation],
  );

  const releasePointer = useCallback(() => {
    dragIndexRef.current = null;
  }, []);

  const handleOpenSaveModal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Consolida rotación + recorte + filtro en una imagen PNG para exportar
    setModalImageDataUrl(canvas.toDataURL('image/png'));
    setModalOpen(true);
  }, []);

  const handleCloseSaveModal = useCallback(() => {
    setModalOpen(false);
    setModalImageDataUrl(null);
  }, []);

  const handleFilterChange = useCallback((nextFilter: FilterId) => {
    setFilter(nextFilter);
    setOpencvError(null);
  }, []);

  const draggable = corners !== null && !perspectiveApplied;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-900 text-white">
      {/* Barra superior: navegación + guardar */}
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a la cámara"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver
        </button>

        <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-wide text-white">
          Editar escaneo
        </h1>

        <button
          type="button"
          onClick={handleOpenSaveModal}
          aria-label="Guardar documento"
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-teal-dark focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Guardar
        </button>
      </header>

      {/* Lienzo interactivo: contenido + overlay de esquinas */}
      <main className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
        {loaded === 0 ? (
          <Loader2
            className="h-8 w-8 animate-spin text-brand-neon"
            aria-hidden="true"
          />
        ) : (
          <div className="relative h-full w-full overflow-hidden rounded-lg">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-contain shadow-2xl"
            />
            <canvas
              ref={overlayRef}
              aria-label="Esquinas del documento: arrastra para ajustar el marco"
              className={`absolute inset-0 h-full w-full rounded-lg ${
                draggable
                  ? 'cursor-grab touch-none active:cursor-grabbing'
                  : 'pointer-events-none'
              }`}
              style={{ touchAction: draggable ? 'none' : 'auto' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={releasePointer}
              onPointerCancel={releasePointer}
            />
            {busy && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/40">
                <Loader2
                  className="h-8 w-8 animate-spin text-brand-neon"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Barra inferior: rotación + encuadre + filtros */}
      <footer className="border-t border-white/10 bg-slate-900 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={rotateLeft}
            aria-label="Girar 90° a la izquierda"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Girar 90°
          </button>
          <button
            type="button"
            onClick={rotateRight}
            aria-label="Girar 90° a la derecha"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Girar 90°
          </button>
        </div>

        {/* Encuadre / recorte por perspectiva */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {!perspectiveApplied ? (
            <>
              <button
                type="button"
                onClick={() => void runDetection(true)}
                disabled={detecting || busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {detecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ScanLine className="h-4 w-4" aria-hidden="true" />
                )}
                Auto encuadre
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                disabled={!corners || busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-teal-dark focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Crop className="h-4 w-4" aria-hidden="true" />
                Aplicar recorte
              </button>
              {corners && (
                <p className="w-full text-center text-[11px] text-white/50">
                  Arrastra las esquinas para ajustar el marco del documento
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleResetCrop}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              Restablecer recorte
            </button>
          )}
        </div>

        {opencvError && (
          <p className="mt-2 text-center text-xs text-red-400">{opencvError}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {FILTER_OPTIONS.map((option) => {
            const active = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleFilterChange(option.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none ${
                  active
                    ? 'bg-brand-teal text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </footer>

      {/* Modal Guardar/Exportar */}
      {modalOpen && modalImageDataUrl && (
        <SaveDocumentModal
          imageDataUrl={modalImageDataUrl}
          onClose={handleCloseSaveModal}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

export type { EditorPageProps };