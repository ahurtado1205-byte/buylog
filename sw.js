const CACHE_NAME = 'buylog-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap',
    'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Solo interceptar peticiones locales o de assets conocidos
    if (!event.request.url.startsWith(self.location.origin) && !ASSETS.some(a => event.request.url.includes(a))) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
