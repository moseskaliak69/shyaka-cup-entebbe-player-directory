// private-player-media-fix-v99
const CACHE = 'shyaka-cup-stadium-v3';
const PUBLIC_MEDIA_CACHE = 'shyaka-cup-public-media-v1';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    OFFLINE_URL,
    '/public-design.css',
    '/public-design.js',
    '/offline-cache.js',
    '/supabase-config.js',
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
      Promise.all(keys.filter(key => ![CACHE,PUBLIC_MEDIA_CACHE].includes(key)).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Cache only public gallery images that have already been viewed. Never cache
  // player-files, signed URLs, API responses, licences or authenticated media.
  if (url.origin !== self.location.origin) {
    const isPublicGalleryImage=request.destination==='image'&&
      url.pathname.includes('/storage/v1/object/public/gallery/');
    if(!isPublicGalleryImage)return;
    event.respondWith(caches.open(PUBLIC_MEDIA_CACHE).then(async cache=>{
      const cached=await cache.match(request);
      if(cached)return cached;
      const response=await fetch(request);
      if(response&&(response.ok||response.type==='opaque'))cache.put(request,response.clone());
      return response;
    }));
    return;
  }
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
