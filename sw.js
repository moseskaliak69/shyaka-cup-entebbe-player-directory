// private-player-media-fix-v99
const CACHE = 'shyaka-cup-stadium-v2';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    OFFLINE_URL,
    '/public-design.css',
    '/public-design.js',
    '/public-teams.js',
    '/public-fonts.css',
    '/public-assets/stadium.webp',
    '/public-assets/crest.webp',
    '/public-assets/display-0.woff',
    '/public-assets/display-1.woff',
    '/public-assets/display-2.woff',
    '/public-assets/font-3.woff',
    '/public-assets/font-4.woff',
    '/public-assets/font-5.woff',
    '/public-assets/font-6.woff',

    '/shyaka-cup-logo.jpg',
    '/public-icons/shield-fill.svg',
    '/public-icons/ball-football.svg',
    '/public-icons/broadcast.svg',
    '/public-icons/people.svg',
    '/public-icons/people-fill.svg',
    '/public-icons/geo-alt.svg',
    '/public-icons/list.svg',
    '/public-icons/arrow-right.svg',
    '/public-icons/person.svg',
    '/public-icons/house.svg',
    '/public-icons/house-fill.svg',
    '/public-icons/calendar4.svg',
    '/public-icons/geo-alt-fill.svg',
    '/public-icons/calendar3.svg',
    '/public-icons/play-circle.svg',
    '/public-icons/newspaper.svg',
    '/manifest.webmanifest',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon.png',
    '/official-sponsor-shyaka.jpg'
  ])));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Development review pages must never replace the app's offline document.
  if (['/review','/design-preview.html','/design-demo.js'].includes(url.pathname)) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
      throw new Error('Offline and not cached');
    })
  );
});
