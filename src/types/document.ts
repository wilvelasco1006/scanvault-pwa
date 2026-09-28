/**
 * Core domain model for a document stored in the local vault.
 * ScanVault is 100% offline: every document lives only in the device's
 * IndexedDB storage and never leaves the browser.
 */
export interface ScannedDocument {
  /** Unique identifier (UUID generated on the device). */
  id: string;
  /** User-facing name, e.g. "Carnet de conducir". */
  title: string;
  /** ISO 8601 timestamp of when the document was created. */
  createdAt: string;
  /** Size of the stored file in bytes. */
  fileSize: number;
  /** Local object/blob URL of the document preview image. */
  thumbnailUrl: string;
}
