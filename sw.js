self.addEventListener('install', (event) => {
    console.log('Service Worker Yüklendi.');
    self.skipWaiting();
});

// Chrome'un PWA onayı vermesi için bu boş dinleyici şarttır.
self.addEventListener('fetch', (event) => {
    // Şimdilik boş bırakıyoruz, sadece PWA kurallarını geçmek için burada.
});
