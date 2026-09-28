import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ScannedDocument } from '../types/document';

const DB_NAME = 'scanvault_db';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';

/**
 * Esquema de la base local. Todos los datos (metadata, miniatura y PDF)
 * viven en el dispositivo: PWA 100% offline, sin servidor ni cuentas.
 */
interface ScanvaultDB extends DBSchema {
  documents: {
    key: string;
    value: ScannedDocument;
    indexes: { 'by-createdAt': string };
  };
}

let dbPromise: Promise<IDBPDatabase<ScanvaultDB>> | undefined;

function getDB(): Promise<IDBPDatabase<ScanvaultDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ScanvaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const store = db.createObjectStore(DOCUMENTS_STORE, {
            keyPath: 'id',
          });
          store.createIndex('by-createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveDocument(document: ScannedDocument): Promise<void> {
  const db = await getDB();
  await db.put(DOCUMENTS_STORE, document);
}

/** Devuelve todos los documentos, más recientes primero. */
export async function getAllDocuments(): Promise<ScannedDocument[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(DOCUMENTS_STORE, 'by-createdAt');
  return all.reverse();
}

export async function getDocument(
  id: string,
): Promise<ScannedDocument | undefined> {
  const db = await getDB();
  return db.get(DOCUMENTS_STORE, id);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(DOCUMENTS_STORE, id);
}