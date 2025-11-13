// Replace with your API key (restrict it to your domain in Google Cloud console)
const API_KEY = "AIzaSyAwTpM9FTycoVv37gxaqbANgUY7MsTt7AY";

const qInput = document.getElementById("q");
const searchBtn = document.getElementById("searchBtn");
const resultsEl = document.getElementById("results");
const libraryEl = document.getElementById("library");
const librarySection = document.getElementById("librarySection");
const openLibraryBtn = document.getElementById("openLibraryBtn");
const clearLibraryBtn = document.getElementById("clearLibrary");

let player;
let library = JSON.parse(localStorage.getItem("mymusic_library") || "[]");

function saveLibrary() {
  localStorage.setItem("mymusic_library", JSON.stringify(library));
  renderLibrary();
}

function renderLibrary() {
  libraryEl.innerHTML = "";
  if (!library.length) {
    libraryEl.innerHTML = "<li>No items in library</li>";
    return;
  }
  library.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.title;
    li.style.padding = "6px 0";
    const playBtn = document.createElement("button");
    playBtn.textContent = "Play";
    playBtn.onclick = () => playVideo(item.videoId);
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      library = library.filter((i) => i.videoId !== item.videoId);
      saveLibrary();
    };
    li.appendChild(playBtn);
    li.appendChild(removeBtn);
    libraryEl.appendChild(li);
  });
}

function addToLibrary(item) {
  if (library.find((i) => i.videoId === item.videoId)) return;
  library.push(item);
  saveLibrary();
  alert("Saved to library");
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "200",
    width: "320",
    videoId: "",
    playerVars: { playsinline: 1 },
    events: {
      onReady: () => {},
    },
  });
}

function playVideo(videoId) {
  if (!player) {
    alert("Player not ready yet");
    return;
  }
  player.loadVideoById(videoId);
}

async function searchYouTube(query) {
  resultsEl.innerHTML = "<li>Searching…</li>";
  try {
    // Use 'search.list' then 'videos.list' to get durations (optional)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(
      query
    )}&key=${API_KEY}`;
    const res = await fetch(searchUrl);
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
    const tmpl = document.getElementById("videoItemTemplate");
    const clone = tmpl.content.cloneNode(true);
    const li = clone.querySelector("li");
    const img = clone.querySelector(".thumb");
    const title = clone.querySelector(".title");
    const playBtn = clone.querySelector(".play");
    const saveBtn = clone.querySelector(".save");

    const videoId = item.id.videoId;
    img.src = item.snippet.thumbnails.medium.url;
    title.textContent = item.snippet.title;

    playBtn.onclick = () => playVideo(videoId);
    saveBtn.onclick = () =>
      addToLibrary({ videoId, title: item.snippet.title });

    resultsEl.appendChild(clone);
  });
}

searchBtn.onclick = () => {
  const q = qInput.value.trim();
  if (!q) return alert("Enter search terms");
  searchYouTube(q);
};

openLibraryBtn.onclick = () => {
  librarySection.style.display =
    librarySection.style.display === "none" ? "block" : "none";
  renderLibrary();
};

clearLibraryBtn.onclick = () => {
  if (confirm("Clear library?")) {
    library = [];
    saveLibrary();
  }
};

// Init
renderLibrary();

// Export on global for YouTube API to use
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .catch((e) => console.warn(e));
}

const toggleBtn = document.getElementById("themeToggle");

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  toggleBtn.textContent = "☀️";
}

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
    toggleBtn.textContent = "☀️";
  } else {
    localStorage.setItem("theme", "light");
    toggleBtn.textContent = "🌙";
  }
});

function playVideo(videoId, title, thumbnailUrl) {
  player.loadVideoById(videoId);

  // Update mini player
  document.getElementById("miniThumb").src = thumbnailUrl;
  document.getElementById("miniTitle").textContent = title;

  const mini = document.getElementById("miniPlayer");
  mini.classList.remove("hidden");
  mini.classList.add("show");
}

document.getElementById("miniClose").addEventListener("click", () => {
  const mini = document.getElementById("miniPlayer");
  mini.classList.remove("show");
  setTimeout(() => mini.classList.add("hidden"), 300);

  player.stopVideo(); // stops audio completely
});

document.getElementById("miniPlayer").addEventListener("click", () => {
  // Smooth scroll to player area
  window.scrollTo({ top: 0, behavior: "smooth" });
});

async function renderSearchResult(video) {
  const videoId = video.id.videoId;
  const title = video.snippet.title;
  const thumb = video.snippet.thumbnails.default.url;

  const item = document.createElement("div");
  item.classList.add("searchItem");

  let saved = await isSaved(videoId);

  item.innerHTML = `
    <img src="${thumb}" class="thumb" />
    <div class="title">${title}</div>
    <button class="saveBtn ${saved ? "saved" : ""}">♡</button>
  `;

  const saveBtn = item.querySelector(".saveBtn");

  saveBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    if (await isSaved(videoId)) {
      await removeSong(videoId);
      saveBtn.classList.remove("saved");
    } else {
      await saveSong({ videoId, title, thumb });
      saveBtn.classList.add("saved");
    }
  });

  document.getElementById("results").appendChild(item);
}

async function openLibrary() {
  const songs = await getAllSongs();
  renderLibrary(songs);
}

function renderLibrary(songs) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  songs.forEach((song) => {
    const item = document.createElement("div");
    item.classList.add("searchItem");

    item.innerHTML = `
      <img src="${song.thumb}" class="thumb" />
      <div class="title">${song.title}</div>
      <button class="saveBtn saved">♡</button>
    `;

    item.addEventListener("click", () => {
      playVideo(song.videoId, song.title, song.thumb);
    });

    item.querySelector(".saveBtn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await removeSong(song.videoId);
      openLibrary();
    });

    container.appendChild(item);
  });
}
