// Открытие — из кэша, обновление — фоном. Раньше всё шло «сначала из сети», и медленная мобильная сеть (это не
// ошибка, в кэш при ней не уходили) держала каждое открытие: оболочка и данные ждали сервер. Теперь оболочка
// и основные данные лежат в кэше своей версии (CACHE поднимает update.sh publish — и здесь, и в app.js): новая
// версия скачивается целиком при установке и включается кнопкой «Обновить» (или при следующем запуске), так что
// файлы разных версий не смешиваются — и чистить кэш вручную по-прежнему не нужно.
const CACHE = "bookshelf-v60";
const COVERS = "covers-v1";        // обложки: свои и FantLab — по адресу не меняются, хранятся между версиями
const SCHEME = "scheme-cache-first";   // метка: этот Service Worker уже «из кэша» (см. install)
const PRECACHE = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon.svg", "icon-192.png",
  "data/library.json", "data/me.json", "data/picks.json", "data/themes.json", "data/feedback.json", "data/owner_public.json", "data/shelf_meta.json"];
// Меняется без новой версии (понедельничное обновление подборок и того, что гостям видно из отметок владельца) —
// освежается фоном; подборки страница перерисовывает тихо, отметки подхватит со следующей сверки.
const LIVE = ["data/picks.json", "data/owner_public.json"];

self.addEventListener("install", e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  // no-cache: сверка с сервером (304, если не менялся) — а не копия из кэша браузера десятиминутной давности.
  await c.addAll(PRECACHE.map(u => new Request(u, { cache: "no-cache" })));
  // Прежний Service Worker отдавал всё из сети — смешивать нечего, новый включается сразу. Дальше — по кнопке.
  if (!(await caches.has(SCHEME))) self.skipWaiting();
})()));
self.addEventListener("message", e => { if (e.data === "skip-waiting") self.skipWaiting(); });
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (![CACHE, COVERS, SCHEME].includes(k)) await caches.delete(k);
  await caches.open(SCHEME);
  await self.clients.claim();
})()));

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin !== location.origin) {
    if (req.destination === "image") e.respondWith(fromCovers(req));   // обложки FantLab
    return;   // API FantLab и Worker — всегда живые
  }
  if (url.pathname.endsWith("/sw.js")) return;
  if (url.pathname.includes("/covers/")) { e.respondWith(fromCovers(req)); return; }
  e.respondWith(fromVersion(e, req, url));
});

async function fromVersion(e, req, url) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) {
    if (LIVE.some(p => url.pathname.endsWith(p))) e.waitUntil(refresh(c, req, hit));
    return hit;
  }
  // Нет в кэше версии (премии, квизы — при первом открытии вкладки): из сети и в кэш.
  try {
    const r = await fetch(req, { cache: "no-cache" });
    if (r.ok) await c.put(req, r.clone());
    return r;
  } catch {
    return (await caches.match(req, { ignoreSearch: true })) || Response.error();
  }
}
async function refresh(c, req, old) {
  const r = await fetch(req, { cache: "no-cache" }).catch(() => null);
  if (!r || !r.ok) return;
  const changed = r.headers.get("etag") !== old.headers.get("etag") || r.headers.get("last-modified") !== old.headers.get("last-modified");
  await c.put(req, r.clone());
  if (changed) for (const client of await self.clients.matchAll()) client.postMessage({ type: "data-updated", url: req.url });
}
async function fromCovers(req) {
  const c = await caches.open(COVERS);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  // Обложки FantLab приходят без CORS, «непрозрачными», — кэшируем как есть; не влезло в квоту — не страшно.
  if (r.ok || r.type === "opaque") c.put(req, r.clone()).catch(() => {});
  return r;
}
