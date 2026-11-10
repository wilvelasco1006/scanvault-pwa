import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface CapturedError {
  message: string;
  source: 'error' | 'rejection';
}

function describeError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string' && reason.trim() !== '') return reason;
  return 'Error desconocido';
}

/**
 * Muestra en pantalla los errores no controlados (síncronos y promesas
 * rechazadas). En un teléfono no hay devtools, así que este banner es la
 * evidencia visible para diagnosticar fallos de cámara, canvas u OpenCV.
 */
export default function GlobalErrorBanner() {
  const [captured, setCaptured] = useState<CapturedError | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setCaptured({
        message: event.message || describeError(event.error),
        source: 'error',
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      setCaptured({
        message: describeError(event.reason),
        source: 'rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!captured) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 flex items-start gap-3 bg-red-600 px-4 py-2 text-left text-xs text-white shadow-lg"
    >
      <p className="min-w-0 flex-1 break-words">
        <span className="font-semibold">
          {captured.source === 'rejection' ? 'Promesa rechazada' : 'Error'}:{' '}
        </span>
        {captured.message}
      </p>
      <button
        type="button"
        onClick={() => setCaptured(null)}
        aria-label="Cerrar aviso de error"
        className="shrink-0 rounded p-1 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export type { CapturedError };
