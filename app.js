/* FILE: app.js */
/* Single combined app file:
   - YouTube search (replace API_KEY)
   - YouTube iframe player
   - Queue + play next
   - Mini player controls
   - IndexedDB offline library
   - Firebase auth + Firestore sync (requires firebase.js)
   - PWA install prompt + service worker registration
*/

const API_KEY = "AIzaSyAwTpM9FTycoVv37gxaqbANgUY7MsTt7AY"; // <-- REPLACE

/* -------------------------------
   Utility & DOM references
--------------------------------*/
const qInput = document.getElementById("q");
const searchBtn = document.getElementById("searchBtn");
const resultsEl = document.getElementById("results");
const libraryEl = document.getElementById("library");
const librarySection = document.getElementById("librarySection");
const openLibraryBtn = document.getElementById("openLibraryBtn");
const clearLibraryBtn = document.getElementById("clearLibrary");
const themeToggle = document.getElementById("themeToggle");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const miniPlayer = document.getElementById("miniPlayer");
const miniThumb = document.getElementById("miniThumb");
const miniTitle = document.getElementById("miniTitle");
const miniPlay = document.getElementById("miniPlay");
const miniPrev = document.getElementById("miniPrev");
const miniNext = document.getElementById("miniNext");
const miniQueueBtn = document.getElementById("miniQueue");
const miniClose = document.getElementById("miniClose");

const prevBtn = document.getElementById("prevBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const queueBtn = document.getElementById("queueBtn");

const playerInfo = document.getElementById("playerInfo");

let player; // YT player
let playQueue = []; // {videoId, title, thumb}
let queueIndex = -1;
let isPlaying = false;

/* -------------------------------
   IndexedDB helper (embedded)
--------------------------------*/
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
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_SONGS, "readwrite");
    tx.objectStore(STORE_SONGS).put(song);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function removeSong(videoId) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_SONGS, "readwrite");
    tx.objectStore(STORE_SONGS).delete(videoId);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function getAllSongs() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SONGS, "readonly");
    const req = tx.objectStore(STORE_SONGS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

async function isSaved(videoId) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SONGS, "readonly");
    const req = tx.objectStore(STORE_SONGS).get(videoId);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });
}

/* -------------------------------
   YouTube player callbacks
--------------------------------*/
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "200",
    width: "320",
    videoId: "",
    playerVars: { playsinline: 1, rel: 0 },
    events: {
      onReady: () => {},
      onStateChange: onPlayerStateChange,
    },
  });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function onPlayerStateChange(event) {
  // 0 = ended
  if (event.data === 0) {
    playNextInQueue();
  }
  // 1 playing
  if (event.data === 1) {
    isPlaying = true;
    playPauseBtn.textContent = "⏯";
    miniPlay.textContent = "⏯";
  } else {
    isPlaying = false;
    playPauseBtn.textContent = "⏯";
    miniPlay.textContent = "⏯";
  }
}

/* -------------------------------
   Search + Results
--------------------------------*/
async function searchYouTube(query) {
  resultsEl.innerHTML = `<li class="video-item">Searching…</li>`;
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(
      query
    )}&key=${API_KEY}`;
    const res = await fetch(searchUrl, { method: "GET", mode: "cors" });
    const json = await res.json();
    if (!json.items) {
      resultsEl.innerHTML = "<li>No results</li>";
      return;
    }
    renderResults(json.items);
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = "<li>Error fetching results</li>";
  }
}

function renderResults(items) {
  resultsEl.innerHTML = "";
  items.forEach((item) => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumb = item.snippet.thumbnails.medium.url;

    const tmpl = document.getElementById("videoItemTemplate");
    const clone = tmpl.content.cloneNode(true);
    const li = clone.querySelector("li");
    const img = clone.querySelector(".thumb");
    const titleEl = clone.querySelector(".title");
    const subEl = clone.querySelector(".sub");
    const playBtn = clone.querySelector(".play");
    const nextBtn = clone.querySelector(".next");
    const saveBtn = clone.querySelector(".save");

    img.src = thumb;
    titleEl.textContent = title;
    subEl.textContent = item.snippet.channelTitle;

    playBtn.onclick = () => {
      enqueueAndPlayImmediate({ videoId, title, thumb });
    };
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      addToPlayNext({ videoId, title, thumb });
      alert("Added to play next");
    };

    saveBtn.textContent = "Save";
    isSaved(videoId).then((saved) => {
      if (saved) saveBtn.textContent = "Saved";
    });

    saveBtn.onclick = async (e) => {
      e.stopPropagation();
      const exists = await isSaved(videoId);
      if (exists) {
        await removeSong(videoId);
        saveBtn.textContent = "Save";
      } else {
        await saveSong({ videoId, title, thumb });
        saveBtn.textContent = "Saved";
      }

      // If logged in, sync to cloud (will be handled in onAuthStateChanged)
      if (window._firebaseAuth && window._firebaseAuth.currentUser) {
        syncLocalToCloud().catch(console.error);
      }
    };

    resultsEl.appendChild(clone);
  });
}

/* -------------------------------
   Queue & Playback helpers
--------------------------------*/
function enqueueAndPlayImmediate(track) {
  // Remove any later duplicates
  playQueue = playQueue.filter((t) => t.videoId !== track.videoId);
  // place immediately next and start playing it
  playQueue.splice(queueIndex + 1, 0, track);
  queueIndex = queueIndex + 1;
  playVideo(track.videoId, track.title, track.thumb, false);
}

function addToPlayNext(track) {
  playQueue.splice(queueIndex + 1, 0, track);
}

function playVideo(videoId, title, thumb, addToQueue = true) {
  // If addToQueue is true, append to queue after current
  if (addToQueue) {
    // avoid duplicate
    if (!playQueue.some((t) => t.videoId === videoId)) {
      playQueue.push({ videoId, title, thumb });
      if (queueIndex === -1) queueIndex = 0;
    }
    queueIndex = playQueue.findIndex((t) => t.videoId === videoId);
  }

  if (!player) {
    alert("Player not ready yet");
    return;
  }
  player.loadVideoById(videoId);

  miniThumb.src = thumb;
  miniTitle.textContent = title;
  playerInfo.textContent = `${title}`;
  showMiniPlayer();
  isPlaying = true;
}

function playNextInQueue() {
  if (queueIndex + 1 >= playQueue.length) {
    // nothing next
    isPlaying = false;
    return;
  }
  queueIndex++;
  const next = playQueue[queueIndex];
  playVideo(next.videoId, next.title, next.thumb, false);
}

function playPreviousInQueue() {
  if (queueIndex <= 0) return;
  queueIndex--;
  const prev = playQueue[queueIndex];
  playVideo(prev.videoId, prev.title, prev.thumb, false);
}

/* -------------------------------
   UI: mini player & queue panel
--------------------------------*/
function showMiniPlayer() {
  miniPlayer.classList.remove("hidden");
  miniPlayer.classList.add("show");
}

function hideMiniPlayer() {
  miniPlayer.classList.add("hidden");
}

document.getElementById("miniClose").addEventListener("click", () => {
  hideMiniPlayer();
  if (player) player.stopVideo();
});

document.getElementById("miniPlay").addEventListener("click", () => {
  if (!player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
});

document.getElementById("miniNext").addEventListener("click", playNextInQueue);
document
  .getElementById("miniPrev")
  .addEventListener("click", playPreviousInQueue);
document.getElementById("miniQueue").addEventListener("click", renderQueue);

queueBtn.addEventListener("click", renderQueue);

function renderQueue() {
  const panel = document.getElementById("queuePanel");
  const list = document.getElementById("queueList");
  list.innerHTML = "";
  playQueue.forEach((song, index) => {
    const item = document.createElement("div");
    item.className = "queue-item";
    item.innerHTML = `<img src="${song.thumb}" class="queue-thumb" />
      <div style="flex:1"><div style="font-weight:600">${song.title}</div>
      <div style="font-size:12px;color:var(--muted)">${
        index === queueIndex ? "Now Playing" : ""
      }</div></div>
      <div><button class="q-play">Play</button> <button class="q-remove">Remove</button></div>`;
    item.querySelector(".q-play").addEventListener("click", () => {
      queueIndex = index;
      playVideo(song.videoId, song.title, song.thumb, false);
      panel.classList.add("hidden");
    });
    item.querySelector(".q-remove").addEventListener("click", () => {
      playQueue.splice(index, 1);
      if (index < queueIndex) queueIndex--;
      if (index === queueIndex) {
        // play next
        playNextInQueue();
      }
      renderQueue();
    });
    list.appendChild(item);
  });
  panel.classList.remove("hidden");
}

/* -------------------------------
   Library UI + sync with IndexedDB
--------------------------------*/
openLibraryBtn.addEventListener("click", () => {
  if (
    librarySection.style.display === "none" ||
    librarySection.style.display === ""
  ) {
    librarySection.style.display = "block";
    renderLibraryView();
  } else {
    librarySection.style.display = "none";
  }
});

clearLibraryBtn.addEventListener("click", async () => {
  if (!confirm("Clear library?")) return;
  const songs = await getAllSongs();
  for (const s of songs) await removeSong(s.videoId);
  renderLibraryView();
});

async function renderLibraryView() {
  const songs = await getAllSongs();
  libraryEl.innerHTML = "";
  if (!songs.length) {
    libraryEl.innerHTML = "<li>No items in library</li>";
    return;
  }
  songs.forEach((song) => {
    const li = document.createElement("li");
    li.className = "video-item";
    li.innerHTML = `<img src="${song.thumb}" class="thumb" />
      <div class="meta"><div class="title">${song.title}</div>
      <div class="actions">
        <button class="play">Play</button>
        <button class="remove">Remove</button>
      </div></div>`;
    li.querySelector(".play").addEventListener("click", () => {
      enqueueAndPlayImmediate(song);
    });
    li.querySelector(".remove").addEventListener("click", async () => {
      await removeSong(song.videoId);
      renderLibraryView();
      if (window._firebaseAuth && window._firebaseAuth.currentUser) {
        syncLocalToCloud().catch(console.error);
      }
    });
    libraryEl.appendChild(li);
  });
}

/* -------------------------------
   Firebase Auth + Firestore sync
   (requires firebase.js to be present and initialized)
--------------------------------*/
async function syncLocalToCloud() {
  try {
    const auth = window._firebaseAuth;
    const db = window._firestore;
    const user = auth.currentUser;
    if (!user) return;
    const songs = await getAllSongs();
    const batch = db.batch();
    const userRef = db.collection("users").doc(user.uid).collection("library");
    songs.forEach((s) => {
      const docRef = userRef.doc(s.videoId);
      batch.set(docRef, s);
    });
    await batch.commit();
    console.log("Local->Cloud sync done");
  } catch (e) {
    console.error(e);
  }
}

async function syncCloudToLocal() {
  try {
    const auth = window._firebaseAuth;
    const db = window._firestore;
    const user = auth.currentUser;
    if (!user) return;
    const snapshot = await db
      .collection("users")
      .doc(user.uid)
      .collection("library")
      .get();
    for (const doc of snapshot.docs) {
      await saveSong(doc.data());
    }
    console.log("Cloud->Local sync done");
    renderLibraryView();
  } catch (e) {
    console.error(e);
  }
}

// Auth handlers
if (window._firebaseAuth) {
  const auth = window._firebaseAuth;
  loginBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(console.error);
  });
  logoutBtn.addEventListener("click", () => {
    auth.signOut().catch(console.error);
  });

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      // sync local to cloud then cloud to local (merge)
      await syncLocalToCloud();
      await syncCloudToLocal();
    } else {
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
    }
  });
} else {
  console.warn(
    "Firebase auth not available. Install firebase.js with your config to enable login/sync."
  );
}

/* -------------------------------
   Search button + input bindings
--------------------------------*/
searchBtn.onclick = () => {
  const q = qInput.value.trim();
  if (!q) return alert("Enter search terms");
  searchYouTube(q);
};
qInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

/* -------------------------------
   Player controls: prev/next/pause
--------------------------------*/
prevBtn.addEventListener("click", playPreviousInQueue);
nextBtn.addEventListener("click", playNextInQueue);
playPauseBtn.addEventListener("click", () => {
  if (!player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
});

/* mini controls mirror */
document.getElementById("miniPlay").addEventListener("click", (e) => {
  playPauseBtn.click();
});
miniPrev.addEventListener("click", playPreviousInQueue);
miniNext.addEventListener("click", playNextInQueue);

/* -------------------------------
   Theme toggle + PWA install prompt
--------------------------------*/
if (localStorage.getItem("theme") === "light")
  document.body.classList.add("light-mode");

themeToggle.addEventListener("click", () => {
  if (document.body.classList.contains("light-mode")) {
    document.body.classList.remove("light-mode");
    localStorage.setItem("theme", "dark");
    themeToggle.textContent = "🌙";
  } else {
    document.body.classList.add("light-mode");
    localStorage.setItem("theme", "light");
    themeToggle.textContent = "☀️";
  }
});

// Install prompt
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").style.display = "inline-block";
});
document.getElementById("installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById("installBtn").style.display = "none";
});

/* -------------------------------
   Service worker registration
--------------------------------*/
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then(() => {
      console.log("SW registered");
    })
    .catch(console.error);
}

/* -------------------------------
   On load: render library from IDB
--------------------------------*/
getAllSongs()
  .then(() => {
    renderLibraryView();
  })
  .catch(console.error);

/* -------------------------------
   Small helper: add song to library and optionally sync
--------------------------------*/
async function addToLibrary(item) {
  const exists = await isSaved(item.videoId);
  if (exists) return;
  await saveSong(item);
  renderLibraryView();
  if (window._firebaseAuth && window._firebaseAuth.currentUser) {
    syncLocalToCloud().catch(console.error);
  }
}

/* Expose addToLibrary for earlier UI if needed */
window.addToLibrary = addToLibrary;
