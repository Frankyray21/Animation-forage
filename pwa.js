// Application installable et utilisable hors ligne : enregistre sw.js, affiche les boutons [data-install] et [data-offline].
// [data-offline] « Télécharger pour le hors ligne » : enregistre sur l'appareil tout ce qui manque (pages, 3D, polices, vidéos).
// Le service worker donne la liste de ce qui manque ; la page télécharge elle-même les petits fichiers (progression en octets)
// et suit les deux vidéos, téléchargées par le service worker (elles continuent quand on change de page). Un seul téléchargement à la fois (Web Locks).
// Rien dans un aperçu intégré (cadre) ni sous automatisation (capture vidéo).
(() => {
  if (window.self !== window.top || !('serviceWorker' in navigator) || !window.isSecureContext || navigator.webdriver) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // --- messages : bandeau visible + région lue par les lecteurs d'écran (créée d'avance pour être annoncée) ---
  let timer = 0, live = null;
  const host = () => document.fullscreenElement || document.body;   // en plein écran (mode Présentation), dans l'élément plein écran
  function announce(msg) {
    if (!live) {
      live = document.createElement('div'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
      live.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
    }
    if (live.parentNode !== host()) host().appendChild(live);
    live.textContent = msg;
  }
  function toast(msg) {
    let t = document.getElementById('pwaToast');
    if (!t) {
      t = document.createElement('div'); t.id = 'pwaToast'; t.setAttribute('aria-hidden', 'true');
      t.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:300;max-width:min(92vw,460px);padding:12px 16px;border-radius:10px;background:#15191c;color:#eef1f3;border:1px solid #f2c230;font:500 15px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)';
    }
    if (t.parentNode !== host()) host().appendChild(t);
    t.textContent = msg; t.hidden = false; clearTimeout(timer); timer = setTimeout(() => { t.hidden = true; }, 10000);
    announce(msg);
  }
  if (document.body) announce(''); else addEventListener('DOMContentLoaded', () => announce(''));

  // --- téléchargement pour le hors ligne ---
  const LOCK = 'clam-offline-download';
  const ICON = { idle: '⇩', busy: '⏳', ready: '✓', error: '⇩' };
  const TEXT = {
    idle: ['Télécharger pour le hors ligne', 'Enregistrer tout le site sur cet appareil (environ 17 Mo) pour l’utiliser sans réseau.'],
    ready: ['Prêt hors ligne', 'Tout le site est enregistré sur cet appareil : accueil, animation 3D et vidéos.'],
    error: ['Réessayer le téléchargement', 'Le téléchargement n’est pas complet.'],
  };
  // états : idle, busy, ready, error ; le bouton garde le focus (aria-disabled plutôt que disabled)
  const setOff = (state, text, title) => document.querySelectorAll('[data-offline]').forEach(b => {
    b.hidden = false; b.dataset.state = state;
    b.setAttribute('aria-disabled', String(state === 'busy' || state === 'ready'));
    b.setAttribute('aria-busy', String(state === 'busy'));
    const i = b.querySelector('[data-offline-icon]'), l = b.querySelector('[data-offline-label]');
    if (i) i.textContent = ICON[state]; if (l) l.textContent = text || TEXT[state][0];
    b.title = title || (TEXT[state] ? TEXT[state][1] : '');
  });
  let busy = false, phase = '';   // phase 'files' : petits fichiers téléchargés par la page ; 'video' : vidéos suivies dans le service worker
  const VID_EST = 13e6;   // taille des deux vidéos tant que le service worker ne l'a pas donnée
  // état demandé au service worker actif (par canal privé) ; réponse d'une autre version ignorée
  async function ask(type, wait = 20000) {
    const reg = await navigator.serviceWorker.ready, sw = navigator.serviceWorker.controller || reg.active;
    if (!sw) return null;
    return new Promise(res => {
      const ch = new MessageChannel(), t = setTimeout(() => res(null), wait);
      ch.port1.onmessage = e => { clearTimeout(t); res(e.data); };
      sw.postMessage({ type }, [ch.port2]);
    });
  }
  const valid = s => !!s && s.type === 'status' && typeof s.version === 'string' && s.version.startsWith('clam-') && Array.isArray(s.list) && Array.isArray(s.fonts);
  const status = () => ask('offline-status');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // suit les vidéos téléchargées par le service worker jusqu'à la fin (progression cumulée) ; un message par seconde le garde actif
  async function follow(show) {
    for (;;) {
      const s = await status().catch(() => null);
      if (!valid(s) || !s.videoPending) return s;
      const p = s.videoProg || { n: 0, len: 0 };
      show(p.n, p.len || VID_EST);
      await sleep(1000);
    }
  }
  let following = false;
  async function refresh() {
    if (busy) return;
    if (navigator.locks && navigator.locks.query) {   // téléchargement en cours dans un autre onglet
      try { const q = await navigator.locks.query(); if (q.held.some(l => l.name === LOCK)) return waitOther(); } catch (err) {}
    }
    const s = await status().catch(() => null);
    if (busy || !valid(s)) return;
    if (s.videoPending) {   // vidéos en cours dans le service worker (première visite, mise à jour, page précédente)
      if (following) return; following = true;
      const f = await follow((n, len) => { if (!busy) setOff('busy', `Téléchargement… ${Math.min(99, Math.floor(100 * n / len))} %`, 'Vidéos en cours d’enregistrement sur cet appareil.'); });
      following = false;
      if (!busy && valid(f)) setOff(f.ready ? 'ready' : 'idle');
      return;
    }
    setOff(s.ready ? 'ready' : 'idle');
  }
  let waiting = false;
  async function waitOther() {
    setOff('busy', 'Téléchargement dans un autre onglet…', 'Un autre onglet de cette application télécharge déjà le contenu.');
    if (waiting) return; waiting = true;
    try { await navigator.locks.request(LOCK, () => {}); } catch (err) {}   // attend la fin de l'autre téléchargement
    waiting = false; refresh();
  }
  navigator.serviceWorker.ready.then(refresh).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', refresh);   // nouvelle version du site : nouvel état
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });

  // petits fichiers : téléchargés par la page, en comptant les octets ; requêtes marquées pour ne pas passer par le service worker
  const sameOrigin = u => new URL(u).origin === location.origin;
  async function grab(cache, u, onBytes) {
    const r = await fetch(u, { cache: 'reload', credentials: 'omit', mode: sameOrigin(u) ? 'same-origin' : 'cors' });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
    const put = cache.put(u, r.clone());
    const len = +r.headers.get('content-length') || 0;
    if (r.body && r.body.getReader) {
      const rd = r.body.getReader(); let n = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.byteLength; onBytes(n, len); }
    } else { const b = await r.arrayBuffer(); onBytes(b.byteLength, b.byteLength); }
    await put;
  }
  async function download(s) {
    const cache = await caches.open(s.version);
    const vids = s.videos || [s.video];   // service worker d'une version précédente : une seule vidéo
    const files = s.list.filter(u => !vids.includes(u)), needVideo = vids.some(u => s.list.includes(u)) || s.videoPending;
    // progression en octets : taille estimée (autres fichiers 150 ko, vidéos 13 Mo) remplacée par la vraie dès qu'elle est connue
    const size = new Map(files.map(u => [u, 150e3])), got = new Map(files.map(u => [u, 0]));
    let vid = { n: 0, len: needVideo ? VID_EST : 0 }, shown = -1, said = 0;
    const report = () => {
      let T = vid.len, D = vid.n; size.forEach(v => { T += v; }); got.forEach(v => { D += v; });
      const pc = T ? Math.min(99, Math.floor(100 * D / T)) : 99;
      if (pc !== shown) { shown = pc; setOff('busy', `Téléchargement… ${pc} %`, 'Le téléchargement des vidéos continue si vous changez de page.'); }
      if (pc >= said + 25) { said = pc - pc % 25; announce(`Téléchargement : ${said} %`); }
    };
    report();
    // vidéos : demandées au service worker, suivies pendant les petits fichiers (les messages le gardent actif)
    let vp = null;
    if (needVideo) { await ask('offline-video'); vp = follow((n, len) => { vid = { n, len }; report(); }); }
    phase = 'files';
    for (const u of files) {
      if (!s.fonts.includes(u) && await cache.match(u)) { got.set(u, size.get(u)); report(); continue; }
      try {
        if (s.fonts.includes(u)) {   // feuille de styles des polices puis ses fichiers woff2
          const r = await fetch(u, { cache: 'reload', credentials: 'omit', mode: 'cors' });
          if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
          await cache.put(u, r.clone());
          const fonts = [...(await r.text()).matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
          for (const f of fonts) if (!(await cache.match(f))) await grab(cache, f, () => {});
        } else {
          await grab(cache, u, (n, len) => { if (len) size.set(u, len); got.set(u, Math.min(n, size.get(u))); report(); });
        }
      } catch (err) { if (err && err.name === 'QuotaExceededError') quota = true; }
      got.set(u, size.get(u)); report();
    }
    phase = 'video';
    if (vp) await vp;
  }
  let quota = false;
  async function start() {
    busy = true; quota = false;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (err) {}   // éviter que le navigateur efface la copie
    setOff('busy', 'Téléchargement… 0 %');
    try {
      const s = await status();
      if (!valid(s)) throw new Error('service worker indisponible ou d’une autre version');
      if (!s.ready) await download(s);
    } catch (err) {}
    busy = false; phase = '';
    const s = await status().catch(() => null);   // bilan établi par le service worker (copie de la version active)
    if (valid(s) && s.ready) {
      setOff('ready');
      toast('Tout est enregistré sur cet appareil. L’accueil, l’animation 3D et les vidéos fonctionnent maintenant sans réseau.' +
        (ios && !standalone ? ' Sur iPhone et iPad, l’application ajoutée à l’écran d’accueil a son propre stockage : ouvrez-la une fois en ligne et touchez aussi ce bouton.' : ''));
    } else {
      setOff('error');
      const n = valid(s) ? s.list.length : 0;
      toast(quota || (valid(s) && s.quota) ? 'Espace de stockage insuffisant sur l’appareil : libérez de l’espace, puis réessayez.'   // s.quota : vidéo refusée au service worker
        : !valid(s) ? 'Le site vient d’être mis à jour : rechargez la page, puis réessayez.'
        : `Téléchargement incomplet${n ? ` (${n} fichier${n > 1 ? 's' : ''} manquant${n > 1 ? 's' : ''})` : ''}. Vérifiez la connexion et réessayez.`);
    }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-offline]');
    if (!b || busy || b.dataset.state === 'busy' || b.dataset.state === 'ready') return;
    if (navigator.locks && navigator.locks.request) {
      navigator.locks.request(LOCK, { ifAvailable: true }, async lock => { if (!lock) return waitOther(); await start(); }).catch(() => { busy = false; refresh(); });
    } else start().catch(() => { busy = false; refresh(); });
  });
  // quitter la page pendant les petits fichiers les interrompt (les vidéos, elles, continuent dans le service worker)
  addEventListener('beforeunload', e => { if (busy && phase === 'files') { e.preventDefault(); e.returnValue = ''; } });

  // --- installation ---
  if (standalone) return;   // déjà installée
  let deferred = null;
  const showInstall = v => document.querySelectorAll('[data-install]').forEach(b => { b.hidden = !v; });
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; showInstall(true); });
  addEventListener('appinstalled', () => { deferred = null; showInstall(false); toast('Application installée. Elle fonctionne aussi hors ligne.'); });
  if (ios) showInstall(true);
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-install]')) return;
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice; deferred = null; if (r.outcome === 'accepted') showInstall(false); }
    else if (ios) toast('Sur iPhone ou iPad : touchez Partager, puis « Sur l’écran d’accueil ».');
  });
})();
