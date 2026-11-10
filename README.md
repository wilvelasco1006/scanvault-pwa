# ScanVault

Offline-first document scanner for the browser. Capture sheets or ID cards with the phone camera, correct the perspective, apply scan filters, and export a PDF — all on the device, with no backend, no account, and no uploads.

## Quick path

1. `npm install`
2. `npm run dev -- --host` and open `https://localhost:5173` (the dev server uses a self-signed certificate because `getUserMedia` requires HTTPS).
3. `npm run build` to produce the static bundle in `dist/`.

To test from a phone on the same network, open the `Network` URL printed by Vite and accept the self-signed certificate once.

## Features

- **Camera capture** with a framing guide that matches the selected type: sheet (A4) or ID card (1.586). The captured frame matches the visible preview, not the full sensor.
- **Multi-page sessions**: capture several pages, reorder or remove them before exporting.
- **Editor**: 90° rotation, filters (original, grayscale, high-contrast B&W, Scanner Pro), OpenCV contour detection with draggable corners, and perspective correction.
- **ID card sheets**: compose front and back on a single A4 sheet at 100% (real ID-1 size) or 150%.
- **PDF export** with jsPDF: A4 pages, lazy-loaded, plus save to IndexedDB or direct download.
- **Local-only storage**: documents live in IndexedDB; nothing leaves the device.

## Stack

| Area | Choice |
|------|--------|
| UI | React 19 + TypeScript, Tailwind CSS v4 |
| Build | Vite 8 |
| Image processing | Canvas API + OpenCV.js (`@techstark/opencv-js`, lazy chunk) |
| PDF | jsPDF (lazy chunk) |
| Persistence | IndexedDB via `idb` |
| Icons | lucide-react |

## Project structure

```
src/
  components/          shared UI (ErrorBoundary, GlobalErrorBanner)
  features/
    dashboard/         document list and entry point
    scanner/           camera capture and framing guide
    editor/            rotation, filters, OpenCV correction
    session/           page list, ordering, export trigger
    export/            PDF generation, carnet sheet, save modal
  lib/image/           image loading and thumbnails
  services/db.ts       IndexedDB access
  types/               shared document, scan and geometry types
```

Feature code is split into `components/`, `pages/` and `lib/`; canvas and PDF processing stay out of the UI components.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server with HTTPS |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the repository |

## Deployment

Deploy the Vite app to Vercel with the default settings:

- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `develop` while the app is in active development; merge to `main` for releases.

The type-check runs as part of the build, so a type error fails the deployment.

## Status

- Not installable yet: no web manifest or service worker, so there is no offline app shell or install prompt.
- No automated tests yet; the pure helpers under `features/*/lib` are side-effect free and ready for Vitest coverage.
- Planned: per-filter intensity controls (brightness, contrast, B&W threshold, Scanner Pro saturation).

## Privacy

All capture, processing and export happen in the browser. The app has no server component and never transmits document images or metadata.
