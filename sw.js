// Standalone app retired. Only this app's caches are cleared; account data is retained.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pyoda-walk-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(Response.redirect('https://pyoda-music.dhakstjr1.chatgpt.site/#walk',302))});
