/* sw.js - 写真でカロリー・栄養バランス（オフライン対応／単一HTML） */
const CACHE = "diet-v12";
const ASSETS = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});
self.addEventListener("activate", e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
    self.clients.claim();
});
self.addEventListener("fetch", e => {
    const req = e.request;
    if (req.method !== "GET") return;
    if (new URL(req.url).origin !== self.location.origin) return;   // 外部API（Gemini等）は素通し
    const isNav = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
    if (isNav) {
        // HTMLはネットワーク優先（常に最新）。失敗時のみキャッシュ→index.htmlへ
        e.respondWith(
            fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); return res; })
                .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
        );
    } else {
        // アイコン等の静的アセットはキャッシュ優先（無ければ取得してキャッシュ）。HTMLは返さない
        e.respondWith(
            caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); return res; }))
        );
    }
});
