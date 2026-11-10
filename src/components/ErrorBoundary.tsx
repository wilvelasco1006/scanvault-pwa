import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Red de seguridad de la interfaz: si un componente lanza durante el render,
 * en lugar de dejar la pantalla en blanco se muestra el mensaje del error.
 * En producción no hay devtools a mano (móvil), así que el texto visible es
 * la única evidencia disponible para diagnosticar.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error no controlado en la interfaz', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center text-white">
        <h1 className="text-lg font-semibold">La aplicación encontró un error</h1>
        <p className="max-w-md break-words text-sm leading-relaxed text-slate-300">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-dark focus-visible:ring-2 focus-visible:ring-brand-neon focus-visible:outline-none"
        >
          Recargar
        </button>
      </div>
    );
  }
}

export type { ErrorBoundaryProps };
