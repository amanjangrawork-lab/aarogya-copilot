/* Aarogya Copilot service worker: cache app shell for offline use (demos + paste-text work fully offline; CDN OCR needs internet once). */
const CACHE = "aarogya-v1";
const SHELL = ["./", "./index.html", "./css/styles.css", "./js/reference.js", "./js/extractor.js", "./js/summarizer.js", "./js/fhir.js", "./js/i18n.js", "./js/ocr.js", "./js/samples.js", "./js/selftest.js", "./js/app.js", "./manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    if (new URL(e.request.url).origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match("./index.html"))));
});
