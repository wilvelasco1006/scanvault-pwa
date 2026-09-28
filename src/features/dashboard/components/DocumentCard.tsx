import { FileText } from 'lucide-react';
import type { ScannedDocument } from '../../../types/document';
// esta es una función de utilidad que formatea el tamaño del archivo en bytes a una cadena legible por humanos, utilizando unidades como B, KB, MB y GB. También formatea la fecha de creación del documento en un formato legible para el usuario.
const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};
function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
// Esta funcion de utilidad formatea una fecha en formato ISO a una cadena legible por humanos, utilizando el idioma español y un formato de fecha específico (día, mes abreviado y año).
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', DATE_OPTIONS);
}
// Esta interfaz define las propiedades que el componente DocumentCard espera recibir. Incluye un objeto `document` de tipo `ScannedDocument`, que contiene información sobre el documento escaneado, y una función opcional `onClick`, que se invoca cuando el usuario hace clic en la tarjeta del documento.
interface DocumentCardProps {
  document: ScannedDocument;
  onClick?: () => void;
}
// Se exporta la función de componente DocumentCard, que representa una tarjeta de documento escaneado en la interfaz de usuario. El componente recibe un objeto `document` y una función opcional `onClick`. La tarjeta muestra una miniatura del documento (si está disponible), el título del documento, la fecha de creación y el tamaño del archivo, todo estilizado con Tailwind CSS. Cuando el usuario hace clic en la tarjeta, se invoca la función `onClick` si se proporciona.
export default function DocumentCard({ document, onClick }: DocumentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-brand-teal/40 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none"
    >
      {document.thumbnailUrl ? (
        <img
          src={document.thumbnailUrl}
          alt={`Vista previa de ${document.title}`}
          className="h-20 w-16 shrink-0 rounded-lg bg-slate-100 object-cover"
        />
      ) : (
        <span className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <FileText className="h-7 w-7" aria-hidden="true" />
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-slate-800">
          {document.title}
        </span>
        <span className="text-xs text-slate-500">
          {formatDate(document.createdAt)}
        </span>
        <span className="text-xs text-slate-400">
          {formatFileSize(document.fileSize)}
        </span>
      </span>
    </button>
  );
}

export type { DocumentCardProps };