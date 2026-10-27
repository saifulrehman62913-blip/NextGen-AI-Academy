const CACHE='ilmigo-v5.1';
const ASSETS=['/','/index.html','/style.css','/app.js','/icon.svg','/shared/catalog.json','/shared/learning.mjs','/shared/accounts.mjs','/shared/schema.mjs','/shared/parent.mjs','/shared/session.mjs','/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(async path=>{const r=await fetch(path);if(!r.ok)throw Error('Offline asset unavailable');if(!/\bno-store\b/i.test(r.headers.get('Cache-Control')||''))await c.put(path,r);})))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  e.respondWith(fetch(e.request).then(async r=>{if(r.ok&&!/\bno-store\b/i.test(r.headers.get('Cache-Control')||'')){const copy=r.clone();await caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}return r;}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('/index.html'):Response.error()))));
});
