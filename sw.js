const CACHE_NAME = "bekmez-go-v1";
const ASSETS_TO_CACHE = [
    "/bekmez-pisirim/paket.html",
    "/bekmez-pisirim/manifest.json",
    "/bekmez-pisirim/icon-192.png",
    "/bekmez-pisirim/icon-512.png"
];

self.addEventListener("install", function(event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            // Statik dosyaları (HTML, ikon) telefona kurar
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cache) {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // Eski versiyonları temizle
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener("fetch", function(event) {
    // API (Firebase) isteklerini KESİNLİKLE cache'leme (Canlı veri çekimi için)
    if (event.request.url.includes("firebaseio.com")) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request).catch(function() {
                // İnternet koparsa cihazda kayıtlı olan PWA HTML arayüzünü göster
                if (event.request.headers.get("accept").includes("text/html")) {
                    return caches.match("/bekmez-pisirim/paket.html");
                }
            });
        })
    );
});

self.addEventListener("notificationclick", function(event) {
    event.notification.close();
    var targetUrl = "/bekmez-pisirim/paket.html";
    
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.indexOf("paket.html") !== -1 && "focus" in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
