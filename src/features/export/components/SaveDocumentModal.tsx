import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FolderPlus, Loader2, X } from 'lucide-react';
import { saveDocument } from '../../../services/db';
import { generatePdf, type GeneratedPdf } from '../lib/pdfGenerator';
import { createThumbnail } from '../../../lib/image/thumbnail';
import type { ScannedDocument } from '../../../types/document';

interface SaveDocumentModalProps {
  /** Imagen final procesada por el editor (data URL PNG). */
  imageDataUrl: string;
  onClose?: () => void;
  /** Se invoca al guardar con éxito el documento en IndexedDB. */
  onSaved?: (document: ScannedDocument) => void;
}

type BusyAction = 'save' | 'download' | null;

const TITLE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

function defaultTitle(): string {
  return `Documento ${new Date().toLocaleDateString('es-ES', TITLE_FORMAT)}`;
}

/** Normaliza el título para usarlo como nombre de archivo. */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\d]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SaveDocumentModal({
  imageDataUrl,
  onClose,
  onSaved,
}: SaveDocumentModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  // Cachea PDF + miniatura para no regenerarlos si descargas y luego guardas
  const preparedRef = useRef<{
    pdf: GeneratedPdf;
    thumbnailUrl: string;
  } | null>(null);

  const prepare = useCallback(async () => {
    if (!preparedRef.current) {
      const [pdf, thumbnailUrl] = await Promise.all([
        generatePdf(imageDataUrl, 'a4'),
        createThumbnail(imageDataUrl),
      ]);
      preparedRef.current = { pdf, thumbnailUrl };
    }
    return preparedRef.current;
  }, [imageDataUrl]);

  // Cerrar con Escape (salvo durante una operación en curso)
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && busy === null) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [busy, onClose]);

  const handleSave = useCallback(async () => {
    if (busy !== null) return;
    setBusy('save');
    setError(null);

    try {
      const { pdf, thumbnailUrl } = await prepare();

      const scannedDocument: ScannedDocument = {
        id: crypto.randomUUID(),
        title: title.trim() || defaultTitle(),
        createdAt: new Date().toISOString(),
        fileSize: pdf.size,
        thumbnailUrl,
        pdfBlob: pdf.blob,
      };

      await saveDocument(scannedDocument);
      onSaved?.(scannedDocument);
    } catch (saveError) {
      console.error('No se pudo guardar el documento:', saveError);
      setError('No se pudo guardar el documento. Inténtalo de nuevo.');
      setBusy(null);
    }
  }, [busy, onSaved, prepare, title]);

  const handleDownload = useCallback(async () => {
    if (busy !== null) return;
    setBusy('download');
    setError(null);

    try {
      const { pdf } = await prepare();
      const url = URL.createObjectURL(pdf.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slugify(title) || 'documento'}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
    } catch (downloadError) {
      console.error('No se pudo generar el PDF:', downloadError);
      setError('No se pudo generar el PDF. Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  }, [busy, prepare, title]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-document-title"
        className="w-full max-w-md rounded-t-3xl border border-white/10 bg-slate-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        {/* Encabezado */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="save-document-title"
            className="text-base font-semibold text-white"
          >
            Guardar documento
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            disabled={busy !== null}
            className="rounded-full bg-white/10 p-1.5 text-slate-300 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Título */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label
            htmlFor="document-title"
            className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-400 uppercase"
          >
            Título del documento
          </label>
          <input
            id="document-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nombre del documento"
            maxLength={80}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/40 focus:outline-none"
          />

          {error && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-dark disabled:opacity-60"
            >
              {busy === 'save' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FolderPlus className="h-4 w-4" aria-hidden="true" />
              )}
              {busy === 'save' ? 'Guardando…' : 'Guardar en ScanVault'}
            </button>

            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              {busy === 'download' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {busy === 'download' ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>
        </form>

        {/* Después de descargar: ofrecer guardar en el almacén */}
        {downloaded && (
          <div
            role="status"
            className="mt-4 flex flex-col gap-3 rounded-2xl border border-brand-neon/30 bg-brand-neon/10 p-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-brand-neon">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              PDF descargado
            </p>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-teal-dark disabled:opacity-60"
            >
              {busy === 'save' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FolderPlus className="h-4 w-4" aria-hidden="true" />
              )}
              Guardar también en ScanVault
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export type { SaveDocumentModalProps };