import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Check, Loader2, RotateCcw } from 'lucide-react';
import type { DocumentType } from '../../../types/scan';

type CameraStatus = 'loading' | 'active' | 'error';

interface CameraViewProps {
  /** Receives the captured frame as a JPEG data URL + the selected document type. */
  onCapture?: (dataUrl: string, documentType: DocumentType) => void;
  /** Páginas ya capturadas en la sesión actual. */
  pageCount?: number;
  /** Cierra la cámara y pasa a revisar las páginas escaneadas. */
  onDone?: () => void;
}

/**
 * Lado máximo (px) de la captura. Una hoja A4 a 2600 px son ~314 DPI, más que
 * suficiente para el PDF; capturar el frame completo del sensor multiplicaría
 * el peso en memoria de cada página sin ganar calidad útil.
 */
const MAX_CAPTURE_SIDE = 2600;
const CAPTURE_QUALITY = 0.92;

function describeCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'El permiso de la cámara fue denegado. Autorízalo en la configuración del navegador y vuelve a intentarlo.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No se encontró ninguna cámara en este dispositivo.';
      case 'NotReadableError':
        return 'La cámara está en uso por otra aplicación. Ciérrala y reintenta.';
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return 'No hay una cámara trasera disponible en este dispositivo.';
      default:
        return 'Ocurrió un error desconocido al iniciar la cámara.';
    }
  }
  return 'No se pudo iniciar la cámara.';
}

/** Adquiere el arranque de la cámara trasera (facingMode: 'environment'). */
async function getCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException(
      'Este navegador no soporta el acceso a la cámara.',
      'NotSupportedError',
    );
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
}

/**
 * Guía de encuadre sobria: un recorte limpio del visor que oscurece todo lo
 * que queda fuera del área útil. El aspecto cambia según el tipo de documento
 * para que el marco coincida con lo que se va a escanear.
 */
function ScanFrame({ variant }: { variant: 'card' | 'sheet' }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
      <div
        aria-hidden="true"
        className={`rounded-3xl border border-white/40 shadow-[0_0_0_100vmax_rgba(15,23,42,0.45)] ${
          variant === 'card'
            ? 'aspect-[1.586] w-full max-w-[340px]'
            : 'aspect-[1/1.414] w-[min(100%,42vh)] max-w-[300px]'
        }`}
      />
    </div>
  );
}

export default function CameraView({
  onCapture,
  pageCount = 0,
  onDone,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [flash, setFlash] = useState(false);
  // El tipo de documento define el aspecto del marco de encuadre
  const [documentType, setDocumentType] = useState<DocumentType>('document');

  /** Detiene todos los tracks para apagar el indicador de cámara del sistema. */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /** Asigna el stream al <video> y lo reproduce. */
  const applyStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    video.srcObject = stream;
    await video.play();
    setStatus('active');
  }, []);

  const handleError = useCallback((error: unknown) => {
    setErrorMessage(describeCameraError(error));
    setStatus('error');
  }, []);

  /** Arranca la cámara. Usado por el botón "Reintentar". */
  const startCamera = useCallback(() => {
    setStatus('loading');
    setErrorMessage('');
    stopStream();

    getCameraStream()
      .then((stream) => applyStream(stream))
      .catch((error: unknown) => handleError(error));
  }, [applyStream, handleError, stopStream]);

  useEffect(() => {
    let disposed = false;

    // Estado inicial 'loading'; las actualizaciones ocurren tras los await/promesas
    getCameraStream()
      .then(async (stream) => {
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        await applyStream(stream);
      })
      .catch((error: unknown) => {
        if (!disposed) handleError(error);
      });

    return () => {
      disposed = true;
      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
      }
      // Apagar el indicador de cámara del sistema al desmontar
      stopStream();
    };
  }, [applyStream, handleError, stopStream]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || status !== 'active') return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return;

    // El <video> usa object-cover: se captura exactamente el recorte visible,
    // no el frame completo, para que la guía de encuadre no mienta.
    const boxWidth = video.clientWidth;
    const boxHeight = video.clientHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = width;
    let sourceHeight = height;

    if (boxWidth > 0 && boxHeight > 0) {
      const coverScale = Math.max(boxWidth / width, boxHeight / height);
      sourceWidth = Math.min(width, boxWidth / coverScale);
      sourceHeight = Math.min(height, boxHeight / coverScale);
      sourceX = (width - sourceWidth) / 2;
      sourceY = (height - sourceHeight) / 2;
    }

    // Pinta el recorte visible en el canvas oculto, acotado a MAX_CAPTURE_SIDE
    const scale = Math.min(
      1,
      MAX_CAPTURE_SIDE / Math.max(sourceWidth, sourceHeight),
    );
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const dataUrl = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);

    // Feedback visual de captura (flash blanco)
    setFlash(true);
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = window.setTimeout(() => setFlash(false), 250);

    onCapture?.(dataUrl, documentType);
  }, [documentType, onCapture, status]);

  return (
    <div className="relative min-h-dvh bg-slate-900 text-white">
      {/* Stream de video en pantalla completa */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Canvas oculto: se usa para extraer el frame capturado */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Guía de encuadre: tarjeta o hoja completa */}
      {status === 'active' && (
        <ScanFrame variant={documentType === 'carnet' ? 'card' : 'sheet'} />
      )}

      {/* Flash de captura */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 bg-white transition-opacity duration-200 ${
          flash ? 'opacity-70' : 'opacity-0'
        }`}
      />

      {/* Estado: iniciando cámara */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900">
          <Loader2
            className="h-10 w-10 animate-spin text-brand-neon"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-300">Iniciando cámara…</p>
        </div>
      )}

      {/* Estado: error de permisos o sin dispositivo */}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-900 px-8 text-center">
          <CameraOff className="h-14 w-14 text-slate-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">
            No se pudo acceder a la cámara
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-slate-400">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 rounded-full bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-dark focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      {/* Sesión en curso: páginas capturadas + pasar a revisión */}
      {status === 'active' && pageCount > 0 && (
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-30">
          <button
            type="button"
            onClick={onDone}
            aria-label={`Terminar captura y revisar ${pageCount} páginas`}
            className="inline-flex items-center gap-2 rounded-full bg-brand-teal px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-teal-dark focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Listo ({pageCount})
          </button>
        </div>
      )}

      {/* Controles del obturador */}
      {status === 'active' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* Tipo de documento: el marco solo se usa para carnet */}
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-slate-900/60 p-1 backdrop-blur">
            <button
              type="button"
              aria-pressed={documentType === 'document'}
              onClick={() => setDocumentType('document')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none ${
                documentType === 'document'
                  ? 'bg-white text-slate-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Documento
            </button>
            <button
              type="button"
              aria-pressed={documentType === 'carnet'}
              onClick={() => setDocumentType('carnet')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none ${
                documentType === 'carnet'
                  ? 'bg-white text-slate-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Carnet
            </button>
          </div>

          <p className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">
            {documentType === 'carnet'
              ? 'Ubica el carnet dentro del marco'
              : 'Ubica la hoja dentro del marco'}
          </p>
          <button
            type="button"
            onClick={handleCapture}
            aria-label="Capturar documento"
            className="pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/15 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-900 shadow-inner">
              <Camera className="h-8 w-8" aria-hidden="true" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export type { CameraViewProps };