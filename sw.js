// Offline: salva tutti i file al primo avvio e li serve dalla cache. VERSIONE cambia a ogni build.py.
const VERSIONE = 'dp8bit-b523211941';
const FILE = ['./', 'index.html', 'app.js', 'mondo.js', 'storia.js', 'three.module.min.js', 'domande.js', 'argomenti.js', 'manifest.json', 'icon-180.png', 'icon-512.png'];
// cache: 'reload' = scarica sempre dalla rete, mai dalla memoria del browser (GitHub la tiene 10 minuti: si salverebbero i file vecchi)
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE.map(f => new Request(f, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  // cancella solo le vecchie versioni di QUESTA app: altre app sullo stesso dominio (es. github.io) hanno il loro prefisso
  const prefisso = VERSIONE.replace(/[^-]*$/, '');
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(prefisso) && k !== VERSIONE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))); });
