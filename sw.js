/* Bekmez GO — Service Worker v5: same-origin cache + FCM background push.
 * GitHub Pages'te paket.html ile aynı dizine sw.js olarak koyun.
 */
const CACHE_NAME = 'bekmez-go-v5';
const ASSETS_TO_CACHE = ['./paket.html', './manifest.json', './icon-192.png', './icon-512.png'];
const APP_PATH = new URL('./paket.html', self.registration.scope).pathname;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    Promise.allSettled(ASSETS_TO_CACHE.map(url => cache.add(url)))));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(name => name.startsWith('bekmez-go-') && name !== CACHE_NAME)
    .map(name => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Push servisleri, Firebase, Supabase ve API isteği asla bu cache'e yazılmaz.
  if (!['http:', 'https:'].includes(url.protocol)) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (req.mode === 'navigate') return (await caches.match('./paket.html')) || Response.error();
    return Response.error();
  }));
});

// FCM data-only mesajlarını servis çalışanı alır. 'notification' payload'ı
// ayrıca otomatik gösterilirse çift bildirim oluşur; backend sadece data yollar.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');
  firebase.initializeApp({
    apiKey: 'AIzaSyC8WLup5zoOmFBcFJkflo7J-XJjQEK_jr8',
    authDomain: 'bekmezpos.firebaseapp.com',
    projectId: 'bekmezpos',
    messagingSenderId: '1013709760225',
    appId: '1:1013709760225:web:ec71341cb6cdcce9fbf9a0'
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    const data = payload.data || {};
    const title = String(data.title || 'Bekmez GO').slice(0, 90);
    const body = String(data.body || '').slice(0, 320);
    const type = ['cart', 'announcement', 'order', 'account'].includes(data.type) ? data.type : 'announcement';
    const options = {
      body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: String(data.tag || `bekmez-${type}`).slice(0, 80),
      renotify: false,
      // OS kendi bildirim sesini yönetir; özel Web Audio chime yalnızca açık sayfada.
      silent: false,
      data: {type}
    };
    return self.registration.showNotification(title, options);
  });
} catch (err) {
  // Önbellek yine çalışır; FCM yüklenemediğinde push abonesi oluşturulamaz.
  console.warn('FCM background SDK kurulamadı:', err);
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const type = event.notification.data && event.notification.data.type;
  const page = type === 'cart' ? 'sepet' : type === 'order' ? 'gecmis' : type === 'announcement' ? 'firsatlar' : 'profil';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    const withinScope = list.filter(client => client.url.startsWith(self.registration.scope));
    if (withinScope.length) {
      const candidate = withinScope.find(client => client.focused) || withinScope[0];
      await candidate.focus();
      candidate.postMessage({type:'BEKMEZ_PUSH_OPEN', page});
      return;
    }
    return self.clients.openWindow(`./paket.html?bildirim=${encodeURIComponent(page)}`);
  })());
});
