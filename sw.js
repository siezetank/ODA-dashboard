// ODA 추진현황 PWA service worker
// 캐시 버전을 올리면(예: oda-v2) 기존 캐시를 비우고 새로 받습니다.
const CACHE = "oda-v25";
const SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./food.html",
  "./medical.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon-180.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Supabase(API/실시간)는 절대 캐시하지 않음 — 항상 네트워크로
  if (url.hostname.endsWith("supabase.co")) return;

  // 페이지(HTML)는 네트워크 우선 → 최신 버전 즉시 반영, 오프라인이면 캐시
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return r;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 그 외 정적 자원(아이콘 등)은 캐시 우선
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req)
        .then((r) => {
          if (url.origin === self.location.origin) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return r;
        })
        .catch(() => cached)
    )
  );
});
