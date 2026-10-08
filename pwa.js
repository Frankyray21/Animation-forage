// Application installable et utilisable hors ligne : enregistre sw.js, affiche les boutons [data-install] et [data-offline].
// [data-offline] « Télécharger pour le hors ligne » : enregistre sur l'appareil tout ce qui manque (pages, 3D, polices, vidéo).
// Le service worker donne la liste de ce qui manque ; la page télécharge elle-même (pas de limite de durée, progression en octets)
// et écrit dans la copie du service worker. Un seul téléchargement à la fois pour tous les onglets (Web Locks).
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
    idle: ['Télécharger pour le hors ligne', 'Enregistrer tout le site sur cet appareil (environ 13 Mo) pour l’utiliser sans réseau.'],
    ready: ['Prêt hors ligne', 'Tout le site est enregistré sur cet appareil : accueil, animation 3D et vidéo.'],
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
  let busy = false, lastStatus = null;
  // état demandé au service worker actif (par canal privé)
  async function ask(type, wait = 20000) {
    const reg = await navigator.serviceWorker.ready, sw = navigator.serviceWorker.controller || reg.active;
    if (!sw) return null;
    return new Promise(res => {
      const ch = new MessageChannel(), t = setTimeout(() => res(null), wait);
      ch.port1.onmessage = e => { clearTimeout(t); res(e.data); };
      sw.postMessage({ type }, [ch.port2]);
    });
  }
  const status = () => ask('offline-status');
  async function refresh() {
    if (busy) return;
    if (navigator.locks && navigator.locks.query) {   // téléchargement en cours dans un autre onglet
      try { const q = await navigator.locks.query(); if (q.held.some(l => l.name === LOCK)) return waitOther(); } catch (err) {}
    }
    const s = await status().catch(() => null);
    if (busy || !s || !s.list) return;
    lastStatus = s;
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

  // téléchargement d'un fichier dans la copie, en comptant les octets ; requêtes marquées pour ne pas passer par le service worker
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
    const items = s.list.slice().sort((a, b) => (a === s.video) - (b === s.video));   // la vidéo en dernier
    // progression en octets : taille estimée (vidéo 10 Mo, autres 150 ko) remplacée par la vraie dès qu'elle est connue
    const size = new Map(items.map(u => [u, u === s.video ? 10e6 : 150e3])), got = new Map(items.map(u => [u, 0]));
    let shown = -1, said = 0;
    const report = () => {
      let T = 0, D = 0; size.forEach(v => { T += v; }); got.forEach(v => { D += v; });
      const pc = Math.min(99, Math.floor(100 * D / T));
      if (pc !== shown) { shown = pc; setOff('busy', `Téléchargement… ${pc} %`, 'Restez sur cette page jusqu’à « Prêt hors ligne ».'); }
      if (pc >= said + 25) { said = pc - pc % 25; announce(`Téléchargement : ${said} %`); }
    };
    report();
    let failed = 0, quota = false;
    for (const u of items) {
      if (u === s.video && s.videoPending) await ask('offline-take-video', 30000);   // vidéo d'arrière-plan arrêtée : la page la reprend avec la progression
      if (!s.fonts.includes(u) && await cache.match(u)) { got.set(u, size.get(u)); report(); continue; }
      try {
        if (s.fonts.includes(u)) {   // feuille de styles des polices puis ses fichiers woff2
          const r = await fetch(u, { cache: 'reload', credentials: 'omit', mode: 'cors' });
          if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
          await cache.put(u, r.clone());
          const files = [...(await r.text()).matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
          for (const f of files) if (!(await cache.match(f))) await grab(cache, f, () => {});
        } else {
          await grab(cache, u, (n, len) => { if (len) size.set(u, len); got.set(u, Math.min(n, size.get(u))); report(); });
        }
      } catch (err) { failed++; if (err && err.name === 'QuotaExceededError') quota = true; }
      got.set(u, size.get(u)); report();
    }
    return { failed, quota };
  }
  async function start() {
    busy = true;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (err) {}   // éviter que le navigateur efface la copie
    setOff('busy', 'Téléchargement… 0 %');
    toast('Téléchargement pour le hors ligne : restez sur cette page jusqu’à « Prêt hors ligne ».');
    let r = { failed: 1, quota: false };
    try {
      const s = await status();
      if (!s || !s.list) throw new Error('service worker indisponible');
      r = s.ready ? { failed: 0 } : await download(s);
    } catch (err) {}
    busy = false;
    const s = await status().catch(() => null);   // bilan établi par le service worker (copie de la version active)
    if (s && s.ready) {
      setOff('ready');
      toast('Tout est enregistré sur cet appareil. L’accueil, l’animation 3D et la vidéo fonctionnent maintenant sans réseau.' +
        (ios && !standalone ? ' Sur iPhone et iPad, l’application ajoutée à l’écran d’accueil a son propre stockage : ouvrez-la une fois en ligne et touchez aussi ce bouton.' : ''));
    } else {
      setOff('error');
      const n = s && s.list ? s.list.length : 0;
      toast(r.quota ? 'Espace de stockage insuffisant sur l’appareil : libérez de l’espace, puis réessayez.'
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
  addEventListener('beforeunload', e => { if (busy) { e.preventDefault(); e.returnValue = ''; } });   // quitter la page interrompt le téléchargement

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
