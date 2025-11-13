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
