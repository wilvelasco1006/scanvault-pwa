import { ArrowLeft } from 'lucide-react';
import CameraView from '../components/CameraView';
import type { DocumentType } from '../../../types/scan';

interface ScannerPageProps {
  /** Páginas ya capturadas en la sesión actual. */
  pageCount?: number;
  /** Returns to the dashboard (discards the session). */
  onBack?: () => void;
  /** Receives the captured data URL + selected document type from CameraView. */
  onCapture?: (dataUrl: string, documentType: DocumentType) => void;
  /** Cierra la cámara y pasa a revisar las páginas. */
  onDone?: () => void;
}

export default function ScannerPage({
  pageCount = 0,
  onBack,
  onCapture,
  onDone,
}: ScannerPageProps) {
  return (
    <div className="relative min-h-dvh bg-slate-900">
      <CameraView
        onCapture={onCapture}
        pageCount={pageCount}
        onDone={onDone}
      />

      {/* Volver al Dashboard (siempre accesible, incluso en error) */}
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver al panel"
        className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-3.5 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-slate-900/80 focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver
      </button>
    </div>
  );
}

export type { ScannerPageProps };
