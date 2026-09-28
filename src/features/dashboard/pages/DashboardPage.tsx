import { useState } from 'react';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import DocumentCard from '../components/DocumentCard';
import FAB from '../components/FAB';
import type { ScannedDocument } from '../../../types/document';
// Interface que define las propiedades que el componente DashboardPage espera recibir. Incluye dos funciones opcionales: `onNewScan`, que se invoca cuando el usuario hace clic en el botón de acción flotante (FAB) o en el CTA de estado vacío para iniciar un nuevo escaneo, y `onSettingsClick`, que se invoca cuando el usuario hace clic en el ícono de configuración en el encabezado.
interface DashboardPageProps {
  /** Invoked when the user taps the FAB / empty-state CTA to start a scan. */
  onNewScan?: () => void;
  /** Invoked when the user taps the settings icon in the header. */
  onSettingsClick?: () => void;
}

export default function DashboardPage({
  onNewScan,
  onSettingsClick,
}: DashboardPageProps) {
  // Placeholder: will be hydrated from IndexedDB once the storage layer lands.
  const [documents] = useState<ScannedDocument[]>([]);
  const hasDocuments = documents.length > 0;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      <Header onSettingsClick={onSettingsClick} />

      <main className="mx-auto w-full max-w-md px-4 pb-32">
        {hasDocuments ? (
          <section aria-label="Documentos escaneados">
            <h2 className="mt-6 mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Mis documentos
            </h2>
            <ul className="space-y-3">
              {documents.map((document) => (
                <li key={document.id}>
                  <DocumentCard document={document} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <EmptyState onNewScan={onNewScan} />
        )}
      </main>

      {/* Keep the FAB visible even when empty to always allow a scan */}
      <FAB onNewScan={onNewScan} />
    </div>
  );
}

export type { DashboardPageProps };