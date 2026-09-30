self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

// EKSİK OLAN VE İNDİRMEYİ ENGELLEYEN HAYATİ KOD BURASI:
// Tarayıcı bu fetch kodunu görmeden uygulamanın inmesine asla izin vermez!
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return new Response('İnternet bağlantınız koptu, ancak Bekmez GO çalışmaya devam ediyor.');
        })
    );
});

// Bildirime tıklanınca uygulamayı bulup açan kod
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // Sizin GitHub projenizdeki tam yolunuz
    const targetUrl = '/bekmez-pisirim/paket.html';

    event.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // Uygulama açık ama arka plandaysa öne getir (focus)
                if (client.url.includes('paket.html') && 'focus' in client) { 
                    return client.focus(); 
                }
            }
            // Uygulama tamamen kapalıysa sıfırdan aç
            if (clients.openWindow) { 
                return clients.openWindow(targetUrl); 
            }
        })
    );
});
