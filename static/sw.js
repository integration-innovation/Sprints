/**
 * Service worker for Structured Sprints.
 *
 * The app shell is small and versioned, so it is precached and served
 * cache-first — the app opens instantly and works with no connection. Requests
 * to the Google Apps Script backend are never cached: a sprint board that
 * silently showed stale rows would be worse than one that says it's offline.
 */
const VERSION = "__BUILD_ID__";
const SHELL = `sprints-shell-${VERSION}`;

// Resolved against the worker's own location, so the app works at any base path.
const SHELL_FILES = [
  "./",
  "./index.html",
  "./assets/app.js",
  "./assets/app.css",
  "./manifest.webmanifest",
  "./pwa/icon-192.png",
  "./pwa/icon-512.png",
  "./pwa/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== SHELL).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // /BAS/ is a different app with its own worker and its own cache. Stay out of
  // it entirely, including navigations — otherwise the first visit there, from
  // a browser that already has this worker, is answered with the Sprints shell.
  if (url.origin === self.location.origin && url.pathname.startsWith(new URL("./BAS/", self.location.href).pathname)) {
    return;
  }

  // Never serve the sheet from cache — stale rows would masquerade as current.
  if (url.hostname.endsWith("google.com") || url.hostname.endsWith("googleusercontent.com")) {
    return;
  }

  // A navigation always resolves to the app shell, so deep links survive offline.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});
