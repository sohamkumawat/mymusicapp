/* FILE: service-worker.js */
/* Minimal service worker: caches shell, serves from cache */

const CACHE_NAME = "mymusic-shell-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/app.css",
  "/app.js",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Online-first for API requests, cache-first for shell
  const url = new URL(event.request.url);
  if (url.origin === location.origin && FILES_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((resp) => resp || fetch(event.request))
    );
    return;
  }

  // For everything else (including Google APIs), fallback to network
  event.respondWith(fetch(event.request).catch(() => caches.match("/")));
});
