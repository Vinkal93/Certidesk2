const CACHE_NAME = "certidesk-pwa-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = ["/", "/offline", "/download", "/pwa-icon/192", "/pwa-icon/512"];

const PRIVATE_PREFIXES = [
  "/api/",
  "/su",
  "/institute",
  "/student",
  "/login",
  "/register",
  "/onboarding",
  "/scan-login",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated portals, APIs, or login flows
  if (PRIVATE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  // Network-first for HTML page navigations with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return (await caches.match(OFFLINE_URL)) || Response.error();
      })
    );
    return;
  }

  // Stale-while-revalidate for static public assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/pwa-icon/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
