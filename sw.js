const CACHE_NAME = "bekmez-go-v2";
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
                    return caches.match("/bekmez-pisirim/paket.html");
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
            return self.clients.openWindow("/bekmez-pisirim/paket.html");
        })
    );
});
