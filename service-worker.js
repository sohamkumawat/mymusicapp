self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open("mymusic-shell")
      .then((cache) =>
        cache.addAll(["/", "/index.html", "/app.css", "/app.js"])
      )
  );
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
