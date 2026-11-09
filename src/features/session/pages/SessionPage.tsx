import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  IdCard,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import SaveDocumentModal from '../../export/components/SaveDocumentModal';
import {
  composeCarnetSheets,
  type CarnetScale,
} from '../../export/lib/carnetSheet';
import type { PdfPageImage } from '../../export/lib/pdfGenerator';
import type { ScanPage } from '../../../types/scan';

interface SessionPageProps {
  /** Páginas capturadas, en el orden en que irán al PDF. */
  pages: ScanPage[];
  /** Vuelve a la cámara para sumar otra página. */
  onAddPage?: () => void;
  /** Abre el editor de una página. */
  onEditPage?: (id: string) => void;
  /** Quita una página de la sesión. */
  onRemovePage?: (id: string) => void;
  /** Mueve una página un lugar hacia arriba o abajo. */
  onMovePage?: (id: string, direction: 'up' | 'down') => void;
  /** Vuelve al dashboard descartando la sesión. */
  onBack?: () => void;
  /** Se invoca cuando el documento se guardó en IndexedDB. */
  onSaved?: () => void;
}

const CARNET_SCALES: ReadonlyArray<{ value: CarnetScale; label: string }> = [
  { value: 1, label: '100%' },
  { value: 1.5, label: '150%' },
];

function pageCountLabel(count: number): string {
  return count === 1 ? '1 página' : `${count} páginas`;
}

export default function SessionPage({
  pages,
  onAddPage,
  onEditPage,
  onRemovePage,
  onMovePage,
  onBack,
  onSaved,
}: SessionPageProps) {
  const [joinCarnet, setJoinCarnet] = useState(true);
  const [carnetScale, setCarnetScale] = useState<CarnetScale>(1);
  const [exportImages, setExportImages] = useState<PdfPageImage[] | null>(null);
  const [preparing, setPreparing] = useState(false);

  // Juntar caras solo tiene sentido con pares completos de carnet
  const canJoinCarnet =
    pages.length >= 2 &&
    pages.length % 2 === 0 &&
    pages.every((page) => page.kind === 'carnet');

  const handleExport = useCallback(async () => {
    if (pages.length === 0 || preparing) return;
    setPreparing(true);

    try {
      const images =
        joinCarnet && canJoinCarnet
          ? await composeCarnetSheets(pages, carnetScale)
          : pages.map((page) => ({ dataUrl: page.renderedDataUrl }));
      setExportImages(images);
    } catch (error) {
      console.error('No se pudo preparar el PDF:', error);
      // Ante un fallo de composición, se exportan las páginas sueltas
      setExportImages(pages.map((page) => ({ dataUrl: page.renderedDataUrl })));
    } finally {
      setPreparing(false);
    }
  }, [canJoinCarnet, carnetScale, joinCarnet, pages, preparing]);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al panel"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </button>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-semibold text-slate-800">
              Revisar páginas
            </h1>
            <p className="text-[11px] text-slate-500">
              {pageCountLabel(pages.length)}
            </p>
          </div>

          <button
            type="button"
            onClick={onAddPage}
            aria-label="Agregar otra página"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-teal px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-teal-dark focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        {pages.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FileText className="h-8 w-8" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-slate-700">
              Todavía no hay páginas
            </h2>
            <p className="max-w-xs text-sm text-slate-500">
              Escanea la primera hoja para empezar el documento.
            </p>
            <button
              type="button"
              onClick={onAddPage}
              className="inline-flex items-center gap-2 rounded-full bg-brand-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-dark focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar página
            </button>
          </div>
        ) : (
          <ol className="space-y-3">
            {pages.map((page, index) => (
              <li
                key={page.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onEditPage?.(page.id)}
                    aria-label={`Editar página ${index + 1}`}
                    className="relative shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none"
                  >
                    <img
                      src={page.renderedDataUrl}
                      alt={`Vista previa de la página ${index + 1}`}
                      className="h-28 w-[84px] rounded-lg bg-slate-100 object-cover ring-1 ring-slate-200"
                    />
                    <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal text-[11px] font-bold text-white shadow">
                      {index + 1}
                    </span>
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-800">
                        {page.kind === 'carnet' && (
                          <IdCard
                            className="h-3.5 w-3.5 shrink-0 text-slate-400"
                            aria-hidden="true"
                          />
                        )}
                        {page.kind === 'carnet' ? 'Carnet' : 'Documento'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Página {index + 1} de {pages.length}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onMovePage?.(page.id, 'up')}
                        disabled={index === 0}
                        aria-label={`Mover página ${index + 1} hacia arriba`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none"
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMovePage?.(page.id, 'down')}
                        disabled={index === pages.length - 1}
                        aria-label={`Mover página ${index + 1} hacia abajo`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none"
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPage?.(page.id)}
                        aria-label={`Editar página ${index + 1}`}
                        className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemovePage?.(page.id)}
                        aria-label={`Eliminar página ${index + 1}`}
                        className="inline-flex h-8 items-center gap-1 rounded-full bg-red-50 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-slate-200 bg-slate-50/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          {/* Carnet: frente y dorso en la misma hoja */}
          {canJoinCarnet && (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
              <label className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={joinCarnet}
                    onChange={(event) => setJoinCarnet(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-teal"
                  />
                  Ambas caras en una hoja
                </span>
                {joinCarnet && (
                  <span className="text-[11px] font-medium text-slate-500">
                    {pages.length / 2}{' '}
                    {pages.length / 2 === 1 ? 'hoja' : 'hojas'}
                  </span>
                )}
              </label>

              {joinCarnet && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    Tamaño
                  </span>
                  {CARNET_SCALES.map((option) => {
                    const active = carnetScale === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCarnetScale(option.value)}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none ${
                          active
                            ? 'bg-brand-teal text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={pages.length === 0 || preparing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-dark disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {preparing
              ? 'Preparando…'
              : `Generar PDF · ${pageCountLabel(
                  joinCarnet && canJoinCarnet
                    ? pages.length / 2
                    : pages.length,
                )}`}
          </button>
        </div>
      </footer>

      {exportImages && (
        <SaveDocumentModal
          pages={exportImages}
          onClose={() => setExportImages(null)}
          onSaved={() => {
            setExportImages(null);
            onSaved?.();
          }}
        />
      )}
    </div>
  );
}

export type { SessionPageProps };
