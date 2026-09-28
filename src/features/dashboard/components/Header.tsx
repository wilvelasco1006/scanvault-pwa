import { Settings } from 'lucide-react';

interface HeaderProps {
  // Invoca cuando el usuario hace clic en el botón de configuración. Esta función es opcional y se puede proporcionar para manejar la acción de configuración en la aplicación.
  onSettingsClick?: () => void;
}
//Esta es una función de componente de React que representa el encabezado de la aplicación ScanVault. El componente recibe una propiedad opcional `onSettingsClick`, que es una función que se ejecuta cuando el usuario hace clic en el botón de configuración. El encabezado está estilizado con Tailwind CSS y contiene el logotipo de la aplicación, un título y un botón de configuración.
function ShieldIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2 4.5 5v6.2c0 4.5 3.1 8.6 7.5 9.8 4.4-1.2 7.5-5.3 7.5-9.8V5L12 2Zm0 4.3a2.9 2.9 0 0 1 2.9 2.9v.5h.6a.9.9 0 0 1 .9.9v3.6a.9.9 0 0 1-.9.9h-5a.9.9 0 0 1-.9-.9V9.6a.9.9 0 0 1 .9-.9h.6v-.5A2.9 2.9 0 0 1 12 6.3Zm0 1.6a1.3 1.3 0 0 0-1.3 1.3v.5h2.6v-.5A1.3 1.3 0 0 0 12 7.9Z" />
    </svg>
  );
}
// Esta es una función de componente de React que representa el logotipo de la aplicación ScanVault. El componente recibe una propiedad opcional `className`, que permite personalizar las clases CSS aplicadas al elemento SVG. El logotipo está compuesto por un rectángulo de color verde y un ícono de documento con líneas de escaneo, estilizado con Tailwind CSS.
function ScanVaultLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" className="fill-brand-teal" />
      {/* Document */}
      <path
        d="M16 13h11l5 5v17a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2Z"
        className="fill-white"
      />
      <path d="M27 13v5h5" className="stroke-brand-teal" strokeWidth={1.6} />
      {/* Scan lines */}
      <path
        d="M18.5 22h11M18.5 26h11M18.5 30h7"
        className="stroke-brand-teal"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}
// Esta es una función de componente de React que representa el encabezado de la aplicación ScanVault. El componente recibe una propiedad opcional `onSettingsClick`, que es una función que se ejecuta cuando el usuario hace clic en el botón de configuración. El encabezado está estilizado con Tailwind CSS y contiene el logotipo de la aplicación, un título y un botón de configuración.
export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <ScanVaultLogo />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-brand-teal">
              ScanVault
            </h1>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-neon/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand-neon uppercase">
              <ShieldIcon />
              100% Offline &amp; Private
            </span>
          </div>
        </div>

        {/* Settings (no user accounts in this app) */}
        <button
          type="button"
          onClick={onSettingsClick}
          aria-label="Configuración"
          className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-brand-teal focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:outline-none"
        >
          <Settings className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export type { HeaderProps };
