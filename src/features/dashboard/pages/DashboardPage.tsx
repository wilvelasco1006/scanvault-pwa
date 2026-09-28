import { useEffect, useState } from 'react';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import DocumentCard from '../components/DocumentCard';
import FAB from '../components/FAB';
import { getAllDocuments } from '../../../services/db';
import type { ScannedDocument } from '../../../types/document';

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
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga los documentos guardados en IndexedDB al iniciar el componente
  useEffect(() => {
    let disposed = false;
    void getAllDocuments()
      .then((stored) => {
        if (!disposed) setDocuments(stored);
      })
      .catch(() => {
        if (!disposed) setDocuments([]);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, []);

  const hasDocuments = documents.length > 0;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      <Header onSettingsClick={onSettingsClick} />

      <main className="mx-auto w-full max-w-md px-4 pb-32">
        {loading ? (
          <p className="mt-16 text-center text-sm text-slate-400">
            Cargando documentos…
          </p>
        ) : hasDocuments ? (
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