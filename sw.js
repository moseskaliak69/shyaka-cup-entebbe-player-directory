// Only public app-shell assets and bounded public gallery images are cached.
const CACHE = 'shyaka-cup-stadium-v10';
const PUBLIC_MEDIA_CACHE = 'shyaka-cup-public-media-v2';
const OFFLINE_URL = '/index.html';
const MEDIA_ORIGIN = 'https://tjabrrvfxlyqkhzhtnyb.supabase.co';
const MEDIA_MAX_AGE = 24 * 60 * 60 * 1000;
const MEDIA_MAX_ENTRIES = 40;
const MEDIA_MAX_BYTES = 2 * 1024 * 1024;
const ASSETS = [
    OFFLINE_URL,
    '/public-design.css',
    '/public-design.js',
    '/offline-cache.js',
    '/vendor/supabase-2.116.0.min.js',
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
  ];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('shyaka-cup-')&&![CACHE,PUBLIC_MEDIA_CACHE].includes(key)).map(key=>caches.delete(key)));
    await pruneMedia(await caches.open(PUBLIC_MEDIA_CACHE));
    await self.clients.claim();
  })());
});
async function timedFetch(request){
  const controller=new AbortController();let timer;
  try{return await Promise.race([
    fetch(request,{signal:controller.signal}),
    new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Network timeout'))},4000)})
  ])}finally{clearTimeout(timer)}
}
async function pruneMedia(cache){
  const keys=await cache.keys();
  for(const key of keys){
    const response=await cache.match(key),stamp=Number(response?.headers.get('x-shyaka-cached-at'));
    if(!stamp||Date.now()-stamp>=MEDIA_MAX_AGE||stamp>Date.now())await cache.delete(key);
  }
  const remaining=await cache.keys();
  await Promise.all(remaining.slice(0,Math.max(0,remaining.length-MEDIA_MAX_ENTRIES)).map(key=>cache.delete(key)));
}
// Serialize media writes so simultaneous image loads cannot exceed the entry limit.
let mediaWrite=Promise.resolve();
async function galleryResponse(request){
  const cache=await caches.open(PUBLIC_MEDIA_CACHE);
  await pruneMedia(cache);
  const cached=await cache.match(request);
  let response;
  try{response=await timedFetch(new Request(request,{credentials:'omit'}));}
  catch(error){if(cached)return cached;throw error}
  if(response.status>=500){if(cached)return cached;return response}
  if(!response.ok){await cache.delete(request);return response}
  if(response.type==='opaque'||!response.headers.get('content-type')?.startsWith('image/'))return response;
  const copy=response.clone();
  mediaWrite=mediaWrite.catch(()=>{}).then(async()=>{
    const blob=await copy.blob();if(blob.size>MEDIA_MAX_BYTES){await cache.delete(request);return}
    const headers=new Headers(copy.headers);headers.set('x-shyaka-cached-at',String(Date.now()));
    // This body is decoded; do not preserve compression/transfer size headers.
    headers.delete('content-encoding');headers.delete('content-length');
    await cache.delete(request);
    await cache.put(request,new Response(blob,{status:200,headers}));
    await pruneMedia(cache);
  });
  await mediaWrite.catch(()=>{});
  return response;
}
async function shellResponse(request){
  const cache=await caches.open(CACHE);
  const navigation=request.mode==='navigate';
  // Serve one installed release immediately; update checks run separately.
  const saved=await cache.match(navigation?OFFLINE_URL:request);
  if(saved)return saved;
  let response;
  try{
    response=await timedFetch(request);
    if(response.status<500){
      if(response.ok){try{await cache.put(navigation?OFFLINE_URL:request,response.clone())}catch(error){/* Storage may be full. */}}
      return response;
    }
  }catch(error){/* An unavailable origin must not prevent opening the saved app. */}
  const cached=await cache.match(navigation?OFFLINE_URL:request);
  if(cached)return cached;
  return response||new Response('Offline copy unavailable. Connect once to prepare this device.',{status:503,headers:{'Content-Type':'text/plain'}});
}
self.addEventListener('fetch', event => {
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin===MEDIA_ORIGIN&&request.destination==='image'&&
     url.pathname.startsWith('/storage/v1/object/public/gallery/')&&!url.search&&
     !request.headers.has('authorization')){
    event.respondWith(galleryResponse(request).catch(()=>timedFetch(new Request(request,{credentials:'omit'}))));return;
  }
  if(url.origin!==self.location.origin)return;
  // No API, signed media, player media, or arbitrary same-origin responses.
  const navigation=request.mode==='navigate'&&['/','/index.html'].includes(url.pathname);
  if(!navigation&&(!ASSETS.includes(url.pathname)||url.search))return;
  event.respondWith(shellResponse(request).catch(()=>timedFetch(request).catch(()=>new Response('Offline copy unavailable. Connect once to prepare this device.',{status:503}))));
});
