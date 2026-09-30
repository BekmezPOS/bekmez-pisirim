self.addEventListener("install", function(event) {
    self.skipWaiting();
});

self.addEventListener("activate", function(event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function(event) {
    event.respondWith(
        fetch(event.request).catch(function() {
            return new Response("Çevrimdışı mod, ancak uygulama çalışıyor.");
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
