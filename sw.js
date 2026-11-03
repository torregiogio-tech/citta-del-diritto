// Offline: salva tutti i file al primo avvio e li serve dalla cache. VERSIONE cambia a ogni build.py.
const VERSIONE = 'dp8bit-a3d69a8007';
const FILE = ['./', 'index.html', 'app.js', 'mondo.js', 'three.module.min.js', 'domande.js', 'argomenti.js', 'manifest.json', 'icon-180.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIONE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))); });
