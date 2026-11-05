// Makes the app installable and opens the last schedule when offline. Never caches auth or API writes.
// Its registration scope is the site's basePath (empty when the app is mounted at the root).
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const CACHE = `${BASE.slice(1)}-v5`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  const p = url.pathname.slice(BASE.length);
  if (p.startsWith("/api/") || p.startsWith("/invite") || p.startsWith("/account") || p.startsWith("/admin") || p === "/login") return;
  if (p.includes("apple-touch-icon") || p.includes("apple-icon")) return;
  if (p.startsWith("/_next/static/") || /\.(png|svg|webmanifest|woff2)$/.test(p)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || Response.error())));
  }
});
