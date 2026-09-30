self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // GitHub Pages'teki tam yolunuz
    const targetUrl = '/bekmez-pisirim/paket.html';

    event.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
            // 1. ADIM: Müşterinin telefonunda veya tarayıcısında uygulama zaten arka planda açıksa
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // Açık olan sekme paket.html'yi içeriyorsa direkt onu ekrana getir (focus)
                if (client.url.includes('paket.html') && 'focus' in client) { 
                    return client.focus(); 
                }
            }
            // 2. ADIM: Uygulama tamamen kapalıysa, doğru URL ile sıfırdan aç
            if (clients.openWindow) { 
                return clients.openWindow(targetUrl); 
            }
        })
    );
});
