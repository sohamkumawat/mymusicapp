const DB_NAME = "musicLibraryDB";
const DB_VERSION = 1;
const STORE_SONGS = "songs";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: "videoId" });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveSong(song) {
  const db = await openDB();
  const tx = db.transaction(STORE_SONGS, "readwrite");
  tx.objectStore(STORE_SONGS).put(song);
  return tx.complete;
}

async function removeSong(videoId) {
  const db = await openDB();
  const tx = db.transaction(STORE_SONGS, "readwrite");
  tx.objectStore(STORE_SONGS).delete(videoId);
  return tx.complete;
}

async function getAllSongs() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SONGS, "readonly");
    const req = tx.objectStore(STORE_SONGS).getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

async function isSaved(videoId) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SONGS, "readonly");
    const req = tx.objectStore(STORE_SONGS).get(videoId);
    req.onsuccess = () => resolve(!!req.result);
  });
}
