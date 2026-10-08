// Service worker : l'application fonctionne hors ligne après la première visite.
// Pages : réseau d'abord (mises à jour), copie locale si hors ligne. Images et scripts du site : copie locale, rafraîchie en arrière-plan.
// three.js (version figée sur le CDN) et polices : copie locale d'abord. Vidéo : lectures partielles (Range) servies depuis la copie locale hors ligne.
// Bouton « Télécharger pour le hors ligne » (pwa.js) : messages offline-status (ce qui manque) et offline-download (télécharge ce qui manque, avec la progression).
const VERSION = 'clam-v3';   // bouton de téléchargement hors ligne : renouvelle les copies locales
const LOCAL = [
  './', 'index.html', 'animation.html', 'manifest.webmanifest', 'pwa.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'img/accident-1.jpg', 'img/accident-2.jpg', 'img/accident-3.jpg', 'img/accident-4.jpg',
  'renders/03_coupe.jpg', 'renders/04_couvercle_retire.jpg', 'video/procedure_poster.jpg',
];
const FONTS = [
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
];
const CDN = [
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/TransformControls.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/MaskPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/OutlinePass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/OutputPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/Pass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/SMAAPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/shaders/CopyShader.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/shaders/OutputShader.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/shaders/SMAAShader.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js"
];
const VIDEO = 'video/procedure_boyles_h.mp4';
let videoJob = null;   // téléchargement de la vidéo lancé à l'installation (repris par le bouton au lieu d'un second téléchargement)

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL);
    await Promise.all(CDN.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    await Promise.all(FONTS.map(u => cacheFontCss(c, u).catch(() => {})));
    videoJob = c.add(VIDEO).catch(() => {}).finally(() => { videoJob = null; });   // vidéo (10 Mo) : en arrière-plan, sans bloquer l'installation
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
// feuille de styles des polices + fichiers woff2 qu'elle référence
async function cacheFontCss(c, url) {
  const r = await fetch(url, { mode: 'cors' }); if (!r.ok) return;
  await c.put(url, r.clone());
  await Promise.all(woffs(await r.text()).map(f => c.add(new Request(f, { mode: 'cors' })).catch(() => {})));
}
// --- téléchargement complet pour le hors ligne (bouton des pages) ---
const woffs = css => [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
// fichiers absents de la copie locale ; polices : feuille de styles et fichiers woff2 qu'elle référence
async function offlineMissing(c) {
  const miss = [];
  for (const u of [...LOCAL, ...CDN, VIDEO]) if (!(await c.match(u))) miss.push(u);
  for (const u of FONTS) {
    const r = await c.match(u);
    if (!r) { miss.push(u); continue; }
    for (const w of woffs(await r.text())) if (!(await c.match(w))) { miss.push(u); break; }
  }
  return miss;
}
async function offlineStatus() {
  const miss = await offlineMissing(await caches.open(VERSION));
  return { type: 'status', ready: miss.length === 0, missing: miss.length, list: miss.slice(0, 8) };
}
// télécharge un à un les fichiers manquants (la vidéo en dernier), en signalant la progression
async function offlineDownload(report) {
  const c = await caches.open(VERSION), miss = await offlineMissing(c);
  miss.sort((a, b) => (a === VIDEO) - (b === VIDEO));
  let done = 0;
  report({ type: 'progress', done, total: miss.length, video: false });
  for (const u of miss) {
    report({ type: 'progress', done, total: miss.length, video: u === VIDEO });
    try {
      if (FONTS.includes(u)) await cacheFontCss(c, u);
      else if (CDN.includes(u)) await c.add(new Request(u, { mode: 'cors' }));
      else if (u === VIDEO && videoJob) { await videoJob; if (!(await c.match(VIDEO))) await c.add(VIDEO); }
      else await c.add(u);
    } catch (err) { /* compté comme manquant au bilan */ }
    done++;
    report({ type: 'progress', done, total: miss.length, video: false });
  }
  return offlineStatus();
}
self.addEventListener('message', e => {
  const port = e.ports && e.ports[0], t = e.data && e.data.type;
  if (!port) return;
  if (t === 'offline-status') e.waitUntil(offlineStatus().then(s => port.postMessage(s), () => port.postMessage({ type: 'status', ready: false, missing: -1 })));
  if (t === 'offline-download') e.waitUntil(offlineDownload(p => port.postMessage(p)).then(s => port.postMessage(s), () => port.postMessage({ type: 'status', ready: false, missing: -1 })));
});

// lecture partielle de la vidéo depuis la copie locale
async function rangeFromCache(req) {
  const c = await caches.open(VERSION), full = await c.match(VIDEO);
  if (!full) return Response.error();
  const buf = await full.arrayBuffer(), n = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return new Response(buf, { status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(n), 'Accept-Ranges': 'bytes' } });
  const a = m[1] ? +m[1] : Math.max(0, n - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], n - 1) : n - 1;
  return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(b - a + 1), 'Content-Range': 'bytes ' + a + '-' + b + '/' + n, 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.endsWith('.mp4')) {
    e.respondWith(fetch(req).catch(() => rangeFromCache(req)));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try { const r = await fetch(req); const c = await caches.open(VERSION); c.put(req, r.clone()); return r; }
      catch (err) { return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('index.html')); }
    })());
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION), hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }
  if (/^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION), hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r;
    })());
  }
});
