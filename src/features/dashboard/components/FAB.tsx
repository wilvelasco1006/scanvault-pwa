import { Camera } from 'lucide-react';

interface FABProps {
  /** Invoked when the user taps the FAB to start a new scan. */
  onNewScan?: () => void;
}
// Esta es una función de componente de React que representa un botón flotante de acción (FAB) para iniciar un nuevo escaneo. El componente recibe una propiedad opcional `onNewScan`, que es una función que se ejecuta cuando el usuario hace clic en el botón. El FAB está estilizado con Tailwind CSS y utiliza un ícono de cámara de la biblioteca `lucide-react`.
export default function FAB({ onNewScan }: FABProps) {
  return (
    <div className="fixed right-5 bottom-6 z-30 flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-bold tracking-[0.2em] text-brand-teal uppercase">
        New Scan
      </span>
      <button
        type="button"
        onClick={onNewScan}
        aria-label="Nuevo escaneo"
        title="Nuevo escaneo"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal text-white shadow-lg shadow-brand-teal/40 ring-4 ring-white/60 transition-transform hover:scale-105 active:scale-95 focus-visible:ring-brand-teal focus-visible:outline-none"
      >
        <Camera className="h-7 w-7" aria-hidden="true" />
      </button>
    </div>
  );
}

export type { FABProps };