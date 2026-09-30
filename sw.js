const CACHE_NAME = "bekmez-go-v3";
// Dosya yolları GitHub Pages için bağımsız hale getirildi (Başına nokta eklendi)
const ASSETS_TO_CACHE = [
    "./paket.html",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

self.addEventListener("install", function(event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            // HATA YOKSAYICI: Dosyalardan biri sunucuda yoksa bile çökmeyi engeller!
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log("Eksik dosya atlandı:", url)))
            );
        })
    );
});

self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cache) {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener("fetch", function(event) {
    if (event.request.url.includes("firebaseio.com")) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request).catch(function() {
                if (event.request.headers.get("accept") && event.request.headers.get("accept").includes("text/html")) {
                    return caches.match("./paket.html");
                }
            });
        })
    );
});

self.addEventListener("notificationclick", function(event) {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) { client = clientList[i]; }
                }
                return client.focus();
            }
            return self.clients.openWindow("./paket.html");
        })
    );
});
