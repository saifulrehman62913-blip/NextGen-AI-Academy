const CACHE='ilmigo-v6.2';
const ASSETS=['/','/index.html','/style.css','/app.js','/icon.svg','/shared/catalog.json','/shared/learning.mjs','/shared/accounts.mjs','/shared/schema.mjs','/shared/parent.mjs','/shared/session.mjs','/manifest.webmanifest'];
// A stalled network must not hide an already cached offline app. Consume the
// static response body inside the deadline so a header-only response cannot hang.
function network(request){
  if(typeof AbortController!=='function'||typeof setTimeout!=='function')return fetch(request);
  const controller=new AbortController();let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('Offline asset network deadline exceeded'));controller.abort();},10000);});
  const transfer=(async()=>{
    const response=await fetch(request,{signal:controller.signal});
    if(!response.ok)return response;
    const body=await response.arrayBuffer();
    const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.delete('Content-Length');
    return new Response([204,205].includes(response.status)?null:body,{status:response.status,statusText:response.statusText,headers});
  })();
  return Promise.race([transfer,deadline]).finally(()=>clearTimeout(timer));
}
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(async path=>{const r=await network(path);if(!r.ok)throw Error('Offline asset unavailable');if(!/\bno-store\b/i.test(r.headers.get('Cache-Control')||''))await c.put(path,r);})))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ilmigo-v')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  e.respondWith(network(e.request).then(async r=>{if(r.ok&&!/\bno-store\b/i.test(r.headers.get('Cache-Control')||'')){const copy=r.clone();await caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}return r;}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('/index.html'):Response.error()))));
});
