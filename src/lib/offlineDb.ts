import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Offline database using IndexedDB for storing rug submissions
 * and photos when the device is offline.
 */

export interface OfflineRugSubmission {
  id: string; // UUID generated client-side
  jobId: string;
  jobNumber: string;
  clientName: string;
  userId: string;
  companyId: string | null;
  formData: {
    rugNumber: string;
    length: string;
    width: string;
    rugType: string;
    notes: string;
  };
  /** Photo blob keys in the 'photos' store */
  photoKeys: string[];
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  errorMessage?: string;
  retryCount: number;
  createdAt: number; // timestamp
  lastAttemptAt?: number;
}

interface OfflinePhoto {
  key: string; // e.g. "submission-id_photo-index"
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
}

interface OfflineDB extends DBSchema {
  rugSubmissions: {
    key: string;
    value: OfflineRugSubmission;
    indexes: {
      'by-status': string;
      'by-job': string;
    };
  };
  photos: {
    key: string;
    value: OfflinePhoto;
  };
}

const DB_NAME = 'rugboost-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

export async function getOfflineDb(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Rug submissions store
      const subStore = db.createObjectStore('rugSubmissions', { keyPath: 'id' });
      subStore.createIndex('by-status', 'status');
      subStore.createIndex('by-job', 'jobId');

      // Photo blobs store
      db.createObjectStore('photos', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

// ── Submission CRUD ──────────────────────────────────────────

export async function saveOfflineSubmission(
  submission: OfflineRugSubmission,
  photos: { file: File; key: string }[]
): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction(['rugSubmissions', 'photos'], 'readwrite');

  // Store submission
  await tx.objectStore('rugSubmissions').put(submission);

  // Store photo blobs
  for (const { file, key } of photos) {
    await tx.objectStore('photos').put({
      key,
      blob: file,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
  }

  await tx.done;
}

export async function getPendingSubmissions(): Promise<OfflineRugSubmission[]> {
  const db = await getOfflineDb();
  const all = await db.getAllFromIndex('rugSubmissions', 'by-status', 'pending');
  // Also include failed ones for retry
  const failed = await db.getAllFromIndex('rugSubmissions', 'by-status', 'failed');
  return [...all, ...failed].sort((a, b) => a.createdAt - b.createdAt);
}

export async function getAllSubmissions(): Promise<OfflineRugSubmission[]> {
  const db = await getOfflineDb();
  return db.getAll('rugSubmissions');
}

export async function getSubmissionsByJob(jobId: string): Promise<OfflineRugSubmission[]> {
  const db = await getOfflineDb();
  return db.getAllFromIndex('rugSubmissions', 'by-job', jobId);
}

export async function updateSubmissionStatus(
  id: string,
  status: OfflineRugSubmission['status'],
  errorMessage?: string
): Promise<void> {
  const db = await getOfflineDb();
  const sub = await db.get('rugSubmissions', id);
  if (!sub) return;

  sub.status = status;
  sub.lastAttemptAt = Date.now();
  if (errorMessage) sub.errorMessage = errorMessage;
  if (status === 'failed') sub.retryCount += 1;

  await db.put('rugSubmissions', sub);
}

export async function deleteSubmission(id: string): Promise<void> {
  const db = await getOfflineDb();
  const sub = await db.get('rugSubmissions', id);
  if (!sub) return;

  const tx = db.transaction(['rugSubmissions', 'photos'], 'readwrite');

  // Delete associated photos
  for (const key of sub.photoKeys) {
    await tx.objectStore('photos').delete(key);
  }

  await tx.objectStore('rugSubmissions').delete(id);
  await tx.done;
}

export async function getPhotosForSubmission(photoKeys: string[]): Promise<File[]> {
  const db = await getOfflineDb();
  const files: File[] = [];

  for (const key of photoKeys) {
    const photo = await db.get('photos', key);
    if (photo) {
      files.push(new File([photo.blob], photo.fileName, { type: photo.mimeType }));
    }
  }

  return files;
}

export async function getPendingCount(): Promise<number> {
  const db = await getOfflineDb();
  const pending = await db.countFromIndex('rugSubmissions', 'by-status', 'pending');
  const failed = await db.countFromIndex('rugSubmissions', 'by-status', 'failed');
  return pending + failed;
}

export async function clearCompletedSubmissions(): Promise<void> {
  const db = await getOfflineDb();
  const uploaded = await db.getAllFromIndex('rugSubmissions', 'by-status', 'uploaded');

  const tx = db.transaction(['rugSubmissions', 'photos'], 'readwrite');
  for (const sub of uploaded) {
    for (const key of sub.photoKeys) {
      await tx.objectStore('photos').delete(key);
    }
    await tx.objectStore('rugSubmissions').delete(sub.id);
  }
  await tx.done;
}
