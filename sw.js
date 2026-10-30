/* Marino Family Recipes — offline-friendly PWA service worker */
const CACHE = "marino-recipes-v10";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./media/cover.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App shell: network-first for HTML so updates land quickly
  if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // IMAGE CACHE BUST: network-first for media so photo updates show up
  if (url.pathname.includes("/media/") || url.searchParams.has("v")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!res.ok) return res;
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Images & static: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res.ok) return res;
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
