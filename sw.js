/* Bekmez GO — Service Worker v17.
 * paket.html ile aynı klasörde sw.js olarak yayımlayın.
 * Statik dosya önbelleği ve yerel bildirim tıklamaları.
 * FCM/kapalı uygulamaya otomatik push/çevrimdışı sipariş içermez.
 */
'use strict';
const CACHE_NAME = 'bekmez-go-v6-reconcile';
const IMAGE_CACHE='bekmez-go-public-images-v1',MAX_IMAGES=80;
const APP_URL = new URL('./paket.html', self.registration.scope);
const ASSETS = ['./paket.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-app.svg']
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
    await Promise.all(names.filter(name => name.startsWith('bekmez-go-') && name !== CACHE_NAME && name !== IMAGE_CACHE)
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
function publicImageKey(request){
  const url=new URL(request.url);
  if(request.method!=='GET'||request.headers.has('Authorization')||request.headers.has('Range')||url.search||url.origin!=='https://nwzxvksywfzpvxwvtypf.supabase.co')return null;
  // Only immutable public product UUID WebPs. No API, signed URL or account data.
  return /^\/storage\/v1\/object\/public\/Bekmez-GO%20Photos\/products\/[a-f0-9-]{36}\.webp$/i.test(url.pathname)?url.href:null;
}
async function serveImage(key){
  let cache;try{cache=await caches.open(IMAGE_CACHE);const hit=await cache.match(key);if(hit)return {response:hit,write:Promise.resolve()};}catch(_){}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let response;
  try{response=await fetch(key,{mode:'cors',credentials:'omit',cache:'force-cache',signal:controller.signal});}finally{clearTimeout(timer);}
  const copy=response.ok&&response.type==='cors'&&!response.redirected&&!/no-store/i.test(response.headers.get('Cache-Control')||'')&&/image\/webp/i.test(response.headers.get('Content-Type')||'')?response.clone():null;
  const write=copy&&cache?(async()=>{const blob=await copy.blob();if(blob.size>524288)return;await cache.put(key,new Response(blob,{status:200,headers:copy.headers}));const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-MAX_IMAGES)).map(k=>cache.delete(k)));})().catch(()=>{}):Promise.resolve();
  return {response,write};
}
self.addEventListener('fetch', event => {
  const image=publicImageKey(event.request),key=assetKey(event.request);if(!image&&!key)return;
  const operation=image?serveImage(image):serve(event.request,key);
  event.respondWith(operation.then(result=>result.response));
  event.waitUntil(operation.then(result=>result.write).catch(()=>{}));
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
