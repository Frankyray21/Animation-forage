// Service worker : l'application fonctionne hors ligne après la première visite.
// Pages : réseau d'abord (mises à jour), copie locale si hors ligne. Images et scripts du site : copie locale, rafraîchie en arrière-plan.
// three.js (version figée sur le CDN) et polices : copie locale d'abord. Vidéos : lectures partielles (Range) servies depuis la copie locale hors ligne.
// Bouton « Télécharger pour le hors ligne » (pwa.js) : le message offline-status donne la liste de ce qui manque. La page télécharge
// elle-même les petits fichiers (requêtes cache: 'reload' + credentials: 'omit', laissées au réseau ici) ; les deux vidéos sont téléchargées
// ici, l'une après l'autre (message offline-video), avec la progression cumulée envoyée aux pages, et continuent quand on change de page.
// Le site partage l'origine frankyray21.github.io avec d'autres applications : seules les copies « clam-… » sont gérées ici.
const VERSION = 'clam-v8';   // vidéos montées avec HyperFrames : procédure refaite, accident ajouté (deux vidéos)
const PREFIX = 'clam-';
const LOCAL = [
  './', 'index.html', 'animation.html', 'manifest.webmanifest', 'pwa.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'img/accident-1.jpg', 'img/accident-2.jpg', 'img/accident-3.jpg', 'img/accident-4.jpg',
  'renders/03_coupe.jpg', 'renders/04_couvercle_retire.jpg', 'video/procedure_poster.jpg', 'video/accident_poster.jpg',
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
const VIDEOS = ['video/procedure_boyles_h.mp4', 'video/accident_boyles_h.mp4'];   // procédure (scénario A), accident (reconstitution)
const META = u => 'clam-meta/size/' + u;   // taille de chaque vidéo en ligne (repère une copie périmée) : relevée à l'installation, puis à chaque démarrage
let videoJob = null, videoProg = null;   // vidéos téléchargées par le service worker, progression cumulée { n, len } suivie par les pages
let videoQuota = false;   // stockage plein pendant l'enregistrement d'une vidéo (message « espace insuffisant » de la page)
const abs = u => new URL(u, self.location).href;

// L'installation n'attend jamais les vidéos (13 Mo) : sur une liaison lente, le navigateur arrête un événement après 5 min.
// La copie précédente de chaque vidéo est toujours reprise (une vidéo périmée vaut mieux qu'aucune) ; la nouvelle arrive ensuite en arrière-plan.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL);
    await Promise.all(CDN.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    await Promise.all(FONTS.map(u => cacheFontCss(c, u).catch(() => {})));
    let sized = 0;
    for (const u of VIDEOS) {
      try {
        const old = await previousVideo(u);
        if (old) await c.put(u, old);
        await saveSize(c, u); sized++;
      } catch (err) { /* hors ligne ou espace insuffisant : la vidéo sera (re)prise par le bouton */ }
    }
    if (sized === VIDEOS.length) sizesFresh = Promise.resolve();   // tailles relevées : pas de nouveau relevé pendant ce démarrage
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== VERSION) await caches.delete(k);   // jamais les copies des autres applications
    await self.clients.claim();
  })());
  // vidéos absentes (première visite) ou périmées (mise à jour) : en arrière-plan, sans bloquer ; tailles relevées de nouveau si l'installation n'a pas pu
  e.waitUntil(caches.open(VERSION).then(async c => { await refreshSizes(c); sizesChanged = false; if ((await videosMissing(c)).length) startVideo(c); })
    .catch(() => {}).finally(videosChecked));
});
// Les pages déjà contrôlées passent à la nouvelle version dès le début de l'activation (skipWaiting), parfois avant l'événement activate :
// pendant l'activation, leurs demandes d'état attendent que les vidéos soient vérifiées (au plus 10 s), pour voir le téléchargement lancé.
let videosChecked; const checked = new Promise(r => { videosChecked = r; });
function activated() {
  const w = self.registration.active;
  return w && w.state === 'activating' ? Promise.race([checked, new Promise(r => setTimeout(r, 10000))]) : Promise.resolve();
}
async function previousVideo(u) {
  for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== VERSION) { const r = await (await caches.open(k)).match(u); if (r) return r; }
  return null;
}
// taille en ligne d'une vidéo (HEAD), gardée dans META ; vrai si elle a changé (rejet si hors ligne ou taille inconnue)
async function saveSize(c, u) {
  const h = await fetch(u, { method: 'HEAD', cache: 'no-store' }), len = h.ok && h.headers.get('content-length');
  if (!len) throw new Error('taille inconnue : HTTP ' + h.status);
  const m = await c.match(META(u)), before = m ? (await m.text()).trim() : '';
  if (before !== len) await c.put(META(u), new Response(len));
  return before !== len;
}
// Taille relevée de nouveau une fois par démarrage du service worker (sauf juste après l'installation) : une vidéo republiée sans
// changer VERSION, ou dont la taille n'a pas pu être relevée à l'installation, est alors repérée comme périmée. Hors ligne, la taille
// gardée reste et un nouvel essai est fait à la demande suivante ; au plus 5 s d'attente. sizesChanged : une taille a changé.
let sizesFresh = null, sizesChanged = false;
function refreshSizes(c) {
  sizesFresh = sizesFresh || Promise.all(VIDEOS.map(u => saveSize(c, u))).then(ch => { if (ch.some(Boolean)) sizesChanged = true; }, () => { sizesFresh = null; });
  return Promise.race([sizesFresh, new Promise(r => setTimeout(r, 5000))]);
}
// vidéo absente, ou de taille différente de celle en ligne (META)
async function videoMissing(c, u) {
  const v = await c.match(u); if (!v) return true;
  const m = await c.match(META(u)); if (!m) return false;
  const want = (await m.text()).trim(), got = v.headers.get('content-length');
  return !!want && !!got && want !== got;
}
async function videosMissing(c) {
  const miss = [];
  for (const u of VIDEOS) if (await videoMissing(c, u)) miss.push(u);
  return miss;
}
// taille en ligne d'une vidéo : relevée à l'installation, sinon demandée maintenant (0 si inconnue)
async function onlineSize(c, u) {
  const m = await c.match(META(u)), s = m ? +(await m.text()).trim() : 0;
  if (s) return s;
  const h = await fetch(u, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
  return (h && h.ok && +h.headers.get('content-length')) || 0;
}
// téléchargement des vidéos par le service worker, l'une après l'autre : un seul à la fois ; chaque copie (même périmée) n'est remplacée
// qu'une fois la nouvelle complète. Progression cumulée : octets reçus sur la somme des tailles, qui ne recule jamais.
// Les pages qui suivent la progression envoient un message par seconde, ce qui garde le service worker actif (aucun événement long).
function startVideo(c) {
  if (videoJob) return videoJob;
  const prog = videoProg = { n: 0, len: 0 }; videoQuota = false;
  videoJob = (async () => {
    const todo = await videosMissing(c), size = await Promise.all(todo.map(u => onlineSize(c, u)));
    const total = () => size.reduce((a, b) => a + b, 0);
    prog.len = total();
    let done = 0;
    for (const [i, u] of todo.entries()) {
      let n = 0;
      try {
        const r = await fetch(u, { cache: 'no-store' });
        if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
        size[i] = +r.headers.get('content-length') || size[i]; prog.len = total();
        const rd = r.body.getReader(), parts = [];
        for (;;) {
          const { done: end, value } = await rd.read(); if (end) break;
          parts.push(value); n += value.byteLength;
          if (n > size[i]) { size[i] = n; prog.len = total(); }
          prog.n = done + n;
        }
        const h = new Headers(r.headers); h.set('content-length', String(n));
        await c.put(u, new Response(new Blob(parts, { type: 'video/mp4' }), { status: 200, headers: h }));
      } catch (err) { if (err && err.name === 'QuotaExceededError') videoQuota = true; }   // vidéo suivante quand même ; celle-ci reste dans la liste de ce qui manque
      done += size[i]; prog.n = done;
    }
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
// fichiers absents ; vidéos absentes ou périmées ; polices : feuille de styles opaque ou absente, ou fichier woff2 manquant → la feuille est à refaire
async function offlineMissing(c) {
  const miss = [];
  for (const u of [...LOCAL, ...CDN]) if (!(await c.match(u))) miss.push(u);
  miss.push(...await videosMissing(c));
  for (const u of FONTS) {
    const r = await c.match(u);
    if (!r || r.type === 'opaque') { miss.push(u); continue; }
    for (const w of woffs(await r.text())) if (!(await c.match(w))) { miss.push(u); break; }
  }
  return miss;
}
async function statusMsg() {
  const c = await caches.open(VERSION);
  await refreshSizes(c);
  if (sizesChanged) { sizesChanged = false; if ((await videosMissing(c)).length) startVideo(c); }   // vidéo republiée : nouvelle copie en arrière-plan
  const miss = await offlineMissing(c);
  // video : première vidéo, pour une ancienne version de pwa.js (une seule vidéo) ; quota : une vidéo manque faute d'espace
  return { type: 'status', version: VERSION, ready: miss.length === 0 && !videoJob, list: miss.map(abs), fonts: FONTS.map(abs), videos: VIDEOS.map(abs),
    video: abs(VIDEOS[0]), videoPending: !!videoJob, videoProg: videoProg && { n: videoProg.n, len: videoProg.len },
    quota: videoQuota && !videoJob && miss.some(u => VIDEOS.includes(u)) };
}
self.addEventListener('message', e => {
  const port = e.ports && e.ports[0], t = e.data && e.data.type;
  if (!port) return;
  const reply = p => e.waitUntil(p.then(m => port.postMessage(m), () => port.postMessage({ type: 'status', version: VERSION, ready: false, missing: -1, list: null })));
  if (t === 'offline-status') reply(activated().then(statusMsg));
  else if (t === 'offline-video') reply(activated().then(() => caches.open(VERSION)).then(async c => { if ((await videosMissing(c)).length) startVideo(c); return statusMsg(); }));   // la page demande les vidéos
  else reply(Promise.resolve({ type: 'status', version: VERSION, ready: false, missing: -1, list: null }));   // message d'une ancienne version de pwa.js : réponse immédiate (« Réessayer »)
});

// lecture partielle d'une des vidéos depuis la copie locale
async function rangeFromCache(req) {
  const p = new URL(req.url).pathname, u = VIDEOS.find(v => new URL(v, self.location).pathname === p);
  const full = u && await (await caches.open(VERSION)).match(u);
  if (!full) return Response.error();
  const buf = await full.arrayBuffer(), n = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
  if (!m) return new Response(buf, { status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(n), 'Accept-Ranges': 'bytes' } });
  const a = m[1] ? +m[1] : Math.max(0, n - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], n - 1) : n - 1;
  if ((!m[1] && !+m[2]) || a > b) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + n } });   // plage hors du fichier
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
