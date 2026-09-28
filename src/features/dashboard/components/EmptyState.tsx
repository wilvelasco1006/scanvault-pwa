import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  /** Invoked when the user taps "Escanear" in the empty state. */
  onNewScan?: () => void;
}

export default function EmptyState({ onNewScan }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Folder illustration */}
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-brand-teal/10 text-brand-teal">
        <FolderOpen className="h-14 w-14" strokeWidth={1.25} aria-hidden="true" />
      </div>

      <h2 className="text-xl font-semibold text-slate-800">
        Bienvenido a ScanVault
      </h2>

      <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
        No hay documentos escaneados aún
      </p>

      <button
        type="button"
        onClick={onNewScan}
        className="mt-6 rounded-full border border-brand-teal/30 bg-white px-5 py-2.5 text-sm font-semibold text-brand-teal shadow-sm transition-colors hover:bg-brand-teal/5 focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none"
      >
        Escanear primer documento
      </button>
    </div>
  );
}

export type { EmptyStateProps };