# Feature: multi-page scan session

Branch: develop
Delivery strategy: single-pr (local commits on develop)
Checks: `npx tsc -b` + `npm run build` (no test runner exists yet — see Log L3)

## Specs

- **S1** — A scan session collects one or more pages. Capturing stays on the camera screen and appends a page; the camera shows the current page count and a "Listo" action.
- **S2** — Pages can be reordered (move up / move down) and removed before export. The list order is the PDF page order.
- **S3** — Tapping a page opens the editor pre-loaded with that page's stored edit state (rotation, filter, corners, perspective applied). Applying the edit returns to the page list and replaces that page's rendered image.
- **S4** — Edge detection and perspective correction are available for every page (sheet and carnet), not only for carnet pages.
- **S5** — Export produces a single PDF with one page per scanned page, preserving aspect ratio, A4 format with 8 mm margin.
- **S6** — The persisted document records its page count and the dashboard shows it.
- **S7 (out of scope for this slice)** — Carnet front + back composite on a single sheet, 100% by default with an optional 150% scale (user decision, see Log L2).

## Tasks

| ID | Specs | Route | Status |
| --- | --- | --- | --- |
| T1 | S1, S2 | inline | done |
| T2 | S3, S4 | inline | done |
| T3 | S5, S6 | inline | done |

## Log

**L1 (user, verbatim)** — "El objetivo es crear una pwa de Scanner de documentos, algo muy similar a CamScanner(app movil) con la opcion de Scanear documento de identidad por ambos lados y opcion de ampliarlo al 150%.EJemplos de caso de uso, tengo una tarea de resolver 4 ejercicios de algebra, los resuelvo en mi cuaderno. Abro mi pwa, scanneo los ejercicios, acomodo las imagenes scaneadas en orden, genero el pdf y lo entrego. Ejemplo de caso de uso #2: Me incribo a un curso, me piden mandar al correo mi cedula ampliada al 150% abro mi pwa, opcion dni o cedula, tomo la foto, queda con filtros inteligentes de scaneo o escojo filtros manuales, tomo la foto por el lado contrario de la cedula, acomodo las imagenes en el pdf.Guardo el pdf y lo envio. Todo en diseño Mobile First. Ese es el objetivo y debo llevar esta prueba inicial a la idea mejor ejecutada."

**L2 (user, verbatim)** — "Ambas caras en una misma pagina, y quiero que tenga la opción de colocarlo al 150% como opcional es decir, tamaño normal por defecto y si el usuario lo pide ahi si se coloca al 150 %"

**L3 (decision)** — No test runner in the repo, so the test-first RED/GREEN cycle is not runnable yet. Proportionate checks for this slice: `tsc -b` (type safety) and `vite build` (bundle + import graph). Adding vitest is deferred to the PWA + tests slice; the new pure helpers (`session/lib/pageOps.ts`) are written side-effect free so they can be covered directly.

**L4 (decision)** — Capture is capped at 2600 px on the long side and encoded as JPEG 0.92 in `CameraView`, instead of a full-resolution PNG data URL. 2600 px covers A4 at ~314 DPI and keeps a realistic 10-page session under a few MB of memory.

**L5 (verification)** — `npx tsc -b` clean (no errors). `npm run build` succeeds: 2107 modules, main bundle 275 kB, opencv chunk 15.5 MB lazy, jspdf chunk 400 kB lazy. Camera and multi-page flow not exercised in a browser in this session.

**L6 (next)** — Slice 2: carnet front + back composited on a single A4 sheet, 100% by default with an optional 150% scale (S7); then document viewer/delete/share (Web Share API) and PWA manifest + service worker.
