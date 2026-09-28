import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, RotateCcw, RotateCw, Save } from 'lucide-react';
import { applyFilter, FILTER_OPTIONS, type FilterId } from '../lib/imageEffects';
import SaveDocumentModal from '../../export/components/SaveDocumentModal';

interface EditorPageProps {
  /** Imagen capturada por la cámara (data URL PNG). */
  capturedImage: string;
  /** Vuelve a la pantalla de cámara. */
  onBack?: () => void;
  /** Se invoca al guardar con éxito el documento (después del modal). */
  onSaved?: () => void;
}

export default function EditorPage({
  capturedImage,
  onBack,
  onSaved,
}: EditorPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Contador que incrementa cuando se carga la imagen → dispara el redibujado
  const [loaded, setLoaded] = useState(0);
  const [rotation, setRotation] = useState(0); // grados: 0 | 90 | 180 | 270
  const [filter, setFilter] = useState<FilterId>('original');

  // Modal de guardado/exportación
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageDataUrl, setModalImageDataUrl] = useState<string | null>(null);

  // Carga la imagen capturada (data URL) en un HTMLImageElement
  useEffect(() => {
    imageRef.current = null;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setLoaded((n) => n + 1);
    };
    image.src = capturedImage;
    return () => {
      if (imageRef.current === image) imageRef.current = null;
    };
  }, [capturedImage]);

  // Redibuja el lienzo al cargar la imagen o cambiar rotación/filtro
  useEffect(() => {
    if (loaded === 0) return;

    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const sideways = rotation % 180 !== 0;
    const viewWidth = sideways ? image.naturalHeight : image.naturalWidth;
    const viewHeight = sideways ? image.naturalWidth : image.naturalHeight;

    // Render en resolución del dispositivo para máxima nitidez
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(viewWidth * dpr);
    canvas.height = Math.round(viewHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fondo oscuro (cubre desalineaciones durante la rotación)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Dibuja la imagen rotada sobre su centro
    ctx.translate(viewWidth / 2, viewHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

    applyFilter(ctx, filter);
  }, [loaded, rotation, filter]);

  const rotateLeft = useCallback(() => {
    setRotation((current) => (current - 90 + 360) % 360);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((current) => (current + 90) % 360);
  }, []);

  const handleOpenSaveModal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Consolida rotación + filtro en una imagen PNG para exportar
    setModalImageDataUrl(canvas.toDataURL('image/png'));
    setModalOpen(true);
  }, []);

  const handleCloseSaveModal = useCallback(() => {
    setModalOpen(false);
    setModalImageDataUrl(null);
  }, []);

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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-teal-dark focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Guardar
        </button>
      </header>

      {/* Lienzo interactivo */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-4">
        {loaded === 0 ? (
          <Loader2
            className="h-8 w-8 animate-spin text-brand-neon"
            aria-hidden="true"
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        )}
      </main>

      {/* Barra inferior: rotación + filtros */}
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

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {FILTER_OPTIONS.map((option) => {
            const active = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.id)}
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