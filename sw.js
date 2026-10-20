/* Bekmez GO — Service Worker v17 — bekmezgo.com kök adresi.
 * paket.html ile aynı klasörde sw.js olarak yayımlayın.
 * Statik dosya önbelleği ve yerel bildirim tıklamaları.
 * FCM/kapalı uygulamaya otomatik push/çevrimdışı sipariş içermez.
 */
'use strict';
const CACHE_NAME = 'bekmez-go-wp5-v17-20261020';
const APP_URL = new URL('./', self.registration.scope);
const ASSETS = ['./', './manifest.json', './icon-192.png']
  .map(path => new URL(path, self.registration.scope).href);
const ASSET_PATHS = new Set(ASSETS.map(url => new URL(url).pathname));
const PAGES = new Set(['urunler', 'sepet', 'gecmis', 'profil', 'firsatlar']);

async function network(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try { return await fetch(request, {cache: 'no-cache', signal: controller.signal}); }
  finally { clearTimeout(timer); }
}
function cacheable(response, key) {
  if (!response.ok || response.type !== 'basic' || response.redirected) return false;
  if (/\bno-store\b/i.test(response.headers.get('Cache-Control') || '')) return false;
  if ((response.headers.get('Vary') || '').trim() === '*') return false;
  const actual = new URL(response.url || key);
  return actual.origin === APP_URL.origin && actual.pathname === new URL(key).pathname;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Ana sayfa alınmadan yeni sürüm etkinleşmez; çalışan eski SW korunur.
    const shell = await network(APP_URL.href);
    if (!cacheable(shell, APP_URL.href)) throw new Error('APP_SHELL_UNAVAILABLE');
    await cache.put(APP_URL.href, shell);
    await Promise.allSettled(ASSETS.slice(1).map(async key => {
      const response = await network(key);
      if (cacheable(response, key)) await cache.put(key, response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('bekmez-go-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
function assetKey(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== APP_URL.origin || !ASSET_PATHS.has(url.pathname)) return null;
  if (request.headers.has('Authorization') || request.headers.has('Range')) return null;
  // Token/API sorguları yazılmaz. Bildirim bağlantısı tek sayfa kaydını kullanır.
  if (url.search) {
    if (url.pathname !== APP_URL.pathname) return null;
    for (const [key, value] of url.searchParams) {
      if (key !== 'bildirim' || !PAGES.has(value)) return null;
    }
  }
  return new URL(url.pathname, APP_URL.origin).href;
}
async function serve(request, key) {
  try {
    const response = await network(request);
    const copy = cacheable(response, key) ? response.clone() : null;
    const write = copy
      ? caches.open(CACHE_NAME).then(cache => cache.put(key, copy)).catch(() => {})
      : Promise.resolve();
    // HTTP hatası gizlenmez; önbellek/kota hatası başarılı ağ yanıtını bozmaz.
    return {response, write};
  } catch (_) {
    let cached;
    try { cached = await (await caches.open(CACHE_NAME)).match(key); } catch (_) {}
    return {response: cached || Response.error(), write: Promise.resolve()};
  }
}
self.addEventListener('fetch', event => {
  const key = assetKey(event.request);
  if (!key) return; // Firebase, Supabase, API, POST ve diğer dosyalar doğrudan ağa gider.
  const operation = serve(event.request, key);
  event.respondWith(operation.then(result => result.response));
  // waitUntil, sonradan then içinde değil event işlenirken kaydedilir.
  event.waitUntil(operation.then(result => result.write).catch(() => {}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const fallback = data.type === 'cart' ? 'sepet' : data.type === 'order' ? 'gecmis'
    : data.type === 'announcement' ? 'firsatlar' : 'profil';
  const page = PAGES.has(data.page) ? data.page : fallback;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const matching = windows.filter(client => {
      try { const url = new URL(client.url); return url.origin === APP_URL.origin && url.pathname === APP_URL.pathname; }
      catch (_) { return false; }
    });
    const candidate = matching.find(client => client.focused) || matching[0];
    if (candidate) {
      try { await candidate.focus(); candidate.postMessage({type: 'BEKMEZ_PUSH_OPEN', page}); return; }
      catch (_) {}
    }
    const target = new URL(APP_URL.href);target.searchParams.set('bildirim', page);
    return self.clients.openWindow(target.href);
  })());
});
