import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const IDB_NAME = 'doreta_media_db';
const IDB_STORE = 'audio_files';
const CHUNK_SIZE = 400000; // ~400KB per chunk, well within Firestore 1MB doc limit

// In-memory cache for ultra-fast synchronous playback
const memCache = new Map<string, string>();

/**
 * Open or upgrade the IndexedDB database for large binary/audio storage
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save audio to local IndexedDB (quota is typically hundreds of MBs)
 */
export async function saveAudioToLocalIDB(id: string, dataUrl: string, name?: string): Promise<void> {
  memCache.set(id, dataUrl);
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ id, dataUrl, name, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[MediaStorage] Failed to cache audio in IndexedDB:', err);
  }
}

/**
 * Read audio from local IndexedDB
 */
export async function getAudioFromLocalIDB(id: string): Promise<string | null> {
  if (memCache.has(id)) {
    return memCache.get(id)!;
  }
  try {
    const idb = await openIDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.dataUrl) {
          memCache.set(id, req.result.dataUrl);
          resolve(req.result.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Split large audio base64 data and upload to Firestore collection 'media_storage'
 * Returns a media reference protocol string: `cloud-media://${mediaId}`
 */
export async function uploadAudioToCloudChunks(mediaId: string, dataUrl: string, fileName?: string): Promise<string> {
  // Always cache locally first so this device never has to re-download
  await saveAudioToLocalIDB(mediaId, dataUrl, fileName);

  const totalLen = dataUrl.length;
  const totalChunks = Math.ceil(totalLen / CHUNK_SIZE);

  try {
    // 1. Write metadata document
    const metaRef = doc(db, 'media_storage', `${mediaId}_meta`);
    await setDoc(metaRef, {
      mediaId,
      totalChunks,
      totalLength: totalLen,
      fileName: fileName || 'audio.mp3',
      createdAt: new Date().toISOString(),
    });

    // 2. Write each chunk document
    for (let i = 0; i < totalChunks; i++) {
      const chunkData = dataUrl.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(db, 'media_storage', `${mediaId}_c${i}`);
      await setDoc(chunkRef, {
        mediaId,
        chunkIndex: i,
        data: chunkData,
      });
    }

    return `cloud-media://${mediaId}`;
  } catch (error) {
    console.error(`[MediaStorage] Error uploading chunks for media ${mediaId}:`, error);
    // If upload to cloud failed, return local reference
    return `cloud-media://${mediaId}`;
  }
}

// In-flight download promises to avoid duplicate parallel fetches
const pendingDownloads = new Map<string, Promise<string | null>>();

/**
 * Reconstruct audio data URL from Firestore chunks (or local IDB cache)
 */
export async function resolveAudioUrl(audioRef: string): Promise<string> {
  if (!audioRef) return '';

  // Standard URL or already a base64 string
  if (!audioRef.startsWith('cloud-media://')) {
    return audioRef;
  }

  const mediaId = audioRef.replace('cloud-media://', '').trim();

  // 1. Check memory cache
  if (memCache.has(mediaId)) {
    return memCache.get(mediaId)!;
  }

  // 2. Check local IndexedDB
  const localCached = await getAudioFromLocalIDB(mediaId);
  if (localCached) {
    return localCached;
  }

  // 3. Prevent duplicate fetches if already in progress
  if (pendingDownloads.has(mediaId)) {
    const res = await pendingDownloads.get(mediaId);
    return res || audioRef;
  }

  const fetchPromise = (async (): Promise<string | null> => {
    try {
      // Fetch metadata
      const metaRef = doc(db, 'media_storage', `${mediaId}_meta`);
      const metaSnap = await getDoc(metaRef);

      if (!metaSnap.exists()) {
        console.warn(`[MediaStorage] Metadata not found for media ${mediaId}`);
        return null;
      }

      const meta = metaSnap.data() as { totalChunks: number; fileName?: string };
      const totalChunks = meta.totalChunks || 1;

      // Fetch all chunks in order
      const chunkPromises: Promise<string>[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkRef = doc(db, 'media_storage', `${mediaId}_c${i}`);
        chunkPromises.push(
          getDoc(chunkRef).then((snap) => {
            if (snap.exists()) {
              return (snap.data()?.data as string) || '';
            }
            return '';
          })
        );
      }

      const chunkResults = await Promise.all(chunkPromises);
      const fullDataUrl = chunkResults.join('');

      if (fullDataUrl) {
        // Cache locally in IndexedDB
        await saveAudioToLocalIDB(mediaId, fullDataUrl, meta.fileName);
        return fullDataUrl;
      }
      return null;
    } catch (err) {
      console.warn(`[MediaStorage] Failed to resolve media ${mediaId} from cloud:`, err);
      return null;
    } finally {
      pendingDownloads.delete(mediaId);
    }
  })();

  pendingDownloads.set(mediaId, fetchPromise);
  const resolved = await fetchPromise;
  return resolved || audioRef;
}
