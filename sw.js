// Service worker : l'application fonctionne hors ligne après la première visite.
// Pages : réseau d'abord (mises à jour), copie locale si hors ligne. Images et scripts du site : copie locale, rafraîchie en arrière-plan.
// three.js (version figée sur le CDN) et polices : copie locale d'abord. Vidéo : lectures partielles (Range) servies depuis la copie locale hors ligne.
// Bouton « Télécharger pour le hors ligne » (pwa.js) : le message offline-status donne la liste de ce qui manque. La page télécharge
// elle-même les petits fichiers (requêtes cache: 'reload' + credentials: 'omit', laissées au réseau ici) ; la vidéo est téléchargée
// ici (message offline-video), avec la progression envoyée aux pages, et continue quand on change de page.
// Le site partage l'origine frankyray21.github.io avec d'autres applications : seules les copies « clam-… » sont gérées ici.
const VERSION = 'clam-v7';   // vidéo v3.1 (retours de gros plans sans pivot brusque) ; vidéo téléchargée par le service worker
const PREFIX = 'clam-';
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
const META = 'clam-meta/video-size';   // taille de la vidéo en ligne, relevée à l'installation (repère une copie périmée)
let videoJob = null, videoProg = null;   // vidéo téléchargée par le service worker, progression { n, len } suivie par les pages
const abs = u => new URL(u, self.location).href;

// L'installation n'attend jamais la vidéo (10 Mo) : sur une liaison lente, le navigateur arrête un événement après 5 min.
// La copie précédente est toujours reprise (une vidéo périmée vaut mieux qu'aucune) ; la nouvelle arrive ensuite en arrière-plan.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL);
    await Promise.all(CDN.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    await Promise.all(FONTS.map(u => cacheFontCss(c, u).catch(() => {})));
    try {
      const old = await previousVideo();
      if (old) await c.put(VIDEO, old);
      const h = await fetch(VIDEO, { method: 'HEAD', cache: 'no-store' });
      if (h.ok && h.headers.get('content-length')) await c.put(META, new Response(h.headers.get('content-length')));
    } catch (err) { /* hors ligne ou espace insuffisant : la vidéo sera (re)prise par le bouton */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== VERSION) await caches.delete(k);   // jamais les copies des autres applications
    await self.clients.claim();
  })());
  // vidéo absente (première visite) ou périmée (mise à jour) : en arrière-plan, sans bloquer
  e.waitUntil(caches.open(VERSION).then(async c => { if (await videoMissing(c)) startVideo(c); }).catch(() => {}));
});
async function previousVideo() {
  for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== VERSION) { const r = await (await caches.open(k)).match(VIDEO); if (r) return r; }
  return null;
}
// vidéo absente, ou de taille différente de celle en ligne (relevée à l'installation)
async function videoMissing(c) {
  const v = await c.match(VIDEO); if (!v) return true;
  const m = await c.match(META); if (!m) return false;
  const want = (await m.text()).trim(), got = v.headers.get('content-length');
  return !!want && !!got && want !== got;
}
// téléchargement de la vidéo par le service worker : un seul à la fois ; la copie (même périmée) n'est remplacée qu'une fois la nouvelle complète.
// Les pages qui suivent la progression envoient un message par seconde, ce qui garde le service worker actif (aucun événement long).
function startVideo(c) {
  if (videoJob) return videoJob;
  videoProg = { n: 0, len: 0 };
  videoJob = (async () => {
    const r = await fetch(VIDEO, { cache: 'no-store' });
    if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
    videoProg.len = +r.headers.get('content-length') || 0;
    const rd = r.body.getReader(), parts = [];
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); videoProg.n += value.byteLength; }
    const h = new Headers(r.headers); h.set('content-length', String(videoProg.n));
    await c.put(VIDEO, new Response(new Blob(parts, { type: 'video/mp4' }), { status: 200, headers: h }));
  })().catch(() => {}).finally(() => { videoJob = null; videoProg = null; });
  return videoJob;
}
// feuille de styles des polices (en mode cors, jamais opaque) + fichiers woff2 qu'elle référence
const woffs = css => [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
async function cacheFontCss(c, url) {
  const r = await fetch(url, { mode: 'cors' }); if (!r.ok) return;
  await c.put(url, r.clone());
  await Promise.all(woffs(await r.text()).map(f => c.add(new Request(f, { mode: 'cors' })).catch(() => {})));
}

// --- état de la copie hors ligne (bouton des pages) ---
// fichiers absents ; vidéo absente ou périmée ; polices : feuille de styles opaque ou absente, ou fichier woff2 manquant → la feuille est à refaire
async function offlineMissing(c) {
  const miss = [];
  for (const u of [...LOCAL, ...CDN]) if (!(await c.match(u))) miss.push(u);
  if (await videoMissing(c)) miss.push(VIDEO);
  for (const u of FONTS) {
    const r = await c.match(u);
    if (!r || r.type === 'opaque') { miss.push(u); continue; }
    for (const w of woffs(await r.text())) if (!(await c.match(w))) { miss.push(u); break; }
  }
  return miss;
}
async function statusMsg() {
  const miss = await offlineMissing(await caches.open(VERSION));
  return { type: 'status', version: VERSION, ready: miss.length === 0 && !videoJob, list: miss.map(abs), fonts: FONTS.map(abs), video: abs(VIDEO),
    videoPending: !!videoJob, videoProg: videoProg && { n: videoProg.n, len: videoProg.len } };
}
self.addEventListener('message', e => {
  const port = e.ports && e.ports[0], t = e.data && e.data.type;
  if (!port) return;
  const reply = p => e.waitUntil(p.then(m => port.postMessage(m), () => port.postMessage({ type: 'status', version: VERSION, ready: false, missing: -1, list: null })));
  if (t === 'offline-status') reply(statusMsg());
  else if (t === 'offline-video') reply(caches.open(VERSION).then(async c => { if (await videoMissing(c)) startVideo(c); return statusMsg(); }));   // la page demande la vidéo
  else reply(Promise.resolve({ type: 'status', version: VERSION, ready: false, missing: -1, list: null }));   // message d'une ancienne version de pwa.js : réponse immédiate (« Réessayer »)
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
  if (req.cache === 'reload' && req.credentials === 'omit') return;   // téléchargement hors ligne fait par la page : directement au réseau
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.endsWith('.mp4')) {
    e.respondWith(fetch(req).catch(() => rangeFromCache(req)));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try { const r = await fetch(req); c.put(req, r.clone()); return r; }
      catch (err) { return (await c.match(req, { ignoreSearch: true })) || (await c.match('index.html')) || Response.error(); }
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
      if (hit && hit.type !== 'opaque') return hit;
      // polices et modules : toujours en mode cors (une copie opaque ne peut pas être vérifiée)
      const r = await fetch(new Request(req.url, { mode: 'cors', credentials: 'omit' })).catch(() => null);
      if (r && r.ok) { c.put(req.url, r.clone()); return r; }
      return hit || r || fetch(req);
    })());
  }
});
