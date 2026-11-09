# Feature: carnet sheet (front + back) and camera framing guide

Branch: develop
Delivery strategy: single-pr, no commits made (user requested manual commit)
Checks: `npx tsc -b`, `npx eslint src`, `npm run build` (no test runner in repo)

## Specs

- **S1** — Pages captured in `carnet` mode can be paired: front and back are composited onto a single A4 sheet, one sheet per pair, in list order.
- **S2** — The composite uses the real ID-1 physical size (85.60 × 53.98 mm), so 100% means real size and 150% means 128.40 × 80.97 mm.
- **S3** — Scale is 100% by default and 150% only when the user selects it.
- **S4** — The composite page is inserted full bleed in the PDF (no margin, no rescale) so physical dimensions survive printing.
- **S5** — The camera framing guide is a clean outline with a dimmed exterior: no neon/green borders and no animated scan line. Its aspect matches the selected type (card 1.586, sheet 1:1.414).
- **S6** — The captured frame matches what the preview shows (object-cover crop), instead of the full sensor frame.

## Tasks

| ID | Specs | Route | Status |
| --- | --- | --- | --- |
| T1 | S1, S2, S3, S4 | inline | done |
| T2 | S5, S6 | inline | done |

## Log

**L1 (user, verbatim)** — "Si arranca con eso, y esos bordes de color verede y esa linea que sube y baja no son adecuadas, hay que mejorar esa interfaz. Además no hagas commits, al finalizar indicame los cambios y una sugerencia de commit para yo realizarlo manualmente."

**L2 (decision)** — The composite is built in the browser on a 2480 × 3508 canvas (A4 at 300 DPI) and stored as a JPEG page image. The PDF layer treats it as `fullBleed`, which keeps the 100%/150% math exact instead of being shrunk by the standard 8 mm margin.

**L3 (decision)** — `drawContained` fits each side inside its ID-1 box preserving aspect ratio. Forcing the exact card ratio would distort a slightly imprecise crop; containing keeps the image honest and the printed size is at most the target size.

**L4 (decision)** — Pairing is only offered when every page is `carnet` and the count is even, so unrelated sheets are never joined by accident.

**L5 (verification)** — `npx tsc -b` clean, `npx eslint src` clean, `npm run build` succeeds. Composite geometry verified by hand: 100% → 1011 × 638 px per card at 300 DPI; 150% → 1517 × 957 px; both pairs fit in 3508 px height. Not exercised on a physical device.

**L6 (next)** — PWA manifest + service worker, document viewer/delete, Web Share API for sending the PDF.
