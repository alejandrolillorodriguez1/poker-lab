const CACHE='poker-lab-mobile-v5';
const ASSETS=['./','./index.html','./style.css','./engine.js','./strategy.js','./app.js','./extras.js','./strategy-ui.js','./ai-worker.js','./mobile.js','./lounge.js','./lounge.css','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('poker-lab-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok&&response.type==='basic')caches.open(CACHE).then(cache=>cache.put('./index.html',response.clone()));return response}).catch(()=>caches.match('./index.html')));return}
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)))
});




