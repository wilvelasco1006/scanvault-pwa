import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, RotateCcw } from 'lucide-react';

type CameraStatus = 'loading' | 'active' | 'error';

interface CameraViewProps {
  /** Receives the captured frame as a PNG data URL. */
  onCapture?: (dataUrl: string) => void;
}

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

/** Marco estilo escáner: esquinas resaltadas + línea de escaneo animada. */
function ScanFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="relative aspect-[1.586] w-[70%] max-w-[320px]">
        {/* Línea de escaneo animada */}
        <div className="scanline" aria-hidden="true" />

        {/* Esquinas delimitadoras */}
        <span
          className="absolute top-0 left-0 h-12 w-12 rounded-tl-2xl border-t-4 border-l-4 border-brand-neon shadow-[0_0_12px_rgba(16,185,129,0.6)]"
          aria-hidden="true"
        />
        <span
          className="absolute top-0 right-0 h-12 w-12 rounded-tr-2xl border-t-4 border-r-4 border-brand-neon shadow-[0_0_12px_rgba(16,185,129,0.6)]"
          aria-hidden="true"
        />
        <span
          className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-brand-neon shadow-[0_0_12px_rgba(16,185,129,0.6)]"
          aria-hidden="true"
        />
        <span
          className="absolute right-0 bottom-0 h-12 w-12 rounded-br-2xl border-r-4 border-b-4 border-brand-neon shadow-[0_0_12px_rgba(16,185,129,0.6)]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default function CameraView({ onCapture }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [flash, setFlash] = useState(false);

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

    // Pinta el frame actual en el canvas oculto y extrae la imagen PNG
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/png');

    // Feedback visual de captura (flash blanco)
    setFlash(true);
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = window.setTimeout(() => setFlash(false), 250);

    onCapture?.(dataUrl);
  }, [onCapture, status]);

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

      {/* Marco estilo escáner */}
      {status === 'active' && <ScanFrame />}

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

      {/* Controles del obturador */}
      {status === 'active' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <p className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">
            Coloca el documento dentro del marco
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