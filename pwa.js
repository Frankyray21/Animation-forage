// Application installable et utilisable hors ligne : enregistre sw.js, affiche les boutons [data-install] et [data-offline].
// [data-offline] « Télécharger pour le hors ligne » : enregistre tout le site sur l'appareil (pages, 3D, polices, vidéo), avec la progression.
// Rien dans un aperçu intégré (cadre) ni sous automatisation (capture vidéo).
(() => {
  if (window.self !== window.top || !('serviceWorker' in navigator) || !window.isSecureContext || navigator.webdriver) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});

  // --- téléchargement pour le hors ligne ---
  const ICON = { idle: '⇩', busy: '⏳', ready: '✓', error: '⇩' };
  const setOff = (state, text, title) => document.querySelectorAll('[data-offline]').forEach(b => {
    b.hidden = false; b.dataset.state = state; b.disabled = state === 'busy' || state === 'ready';
    b.setAttribute('aria-busy', String(state === 'busy'));
    const i = b.querySelector('[data-offline-icon]'), l = b.querySelector('[data-offline-label]');
    if (i) i.textContent = ICON[state]; if (l) l.textContent = text;
    b.title = title || '';
  });
  // question au service worker par canal privé ; onMsg reçoit la progression, la promesse le bilan final
  const ask = (sw, type, onMsg) => new Promise((res, rej) => {
    const ch = new MessageChannel(), t = setTimeout(() => rej(new Error('délai')), type === 'offline-download' ? 15 * 60e3 : 20e3);
    ch.port1.onmessage = e => { const d = e.data || {}; if (d.type === 'progress') { if (onMsg) onMsg(d); return; } clearTimeout(t); res(d); };
    sw.postMessage({ type }, [ch.port2]);
  });
  const READY = ['Prêt hors ligne', 'Tout le site est enregistré sur cet appareil : accueil, animation 3D et vidéo.'];
  const IDLE = ['Télécharger pour le hors ligne', 'Enregistrer tout le site sur cet appareil (environ 15 Mo) pour l’utiliser sans réseau.'];
  const show = s => s.ready ? setOff('ready', ...READY) : setOff('idle', ...IDLE);
  let busy = false;
  navigator.serviceWorker.ready.then(reg => reg.active && ask(reg.active, 'offline-status')).then(s => { if (s && !busy) show(s); }).catch(() => {});
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-offline]');
    if (!b || busy || b.dataset.state === 'ready') return;
    busy = true;
    setOff('busy', 'Téléchargement… 0 %');
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (err) {}   // éviter que le navigateur efface la copie
    try {
      const reg = await navigator.serviceWorker.ready;
      const s = await ask(reg.active, 'offline-download', d => {
        const pc = d.total ? Math.floor(100 * d.done / d.total) : 100;
        setOff('busy', d.video ? `Téléchargement… ${pc} % (vidéo)` : `Téléchargement… ${pc} %`);
      });
      if (s.ready) { show(s); toast('Tout est enregistré sur cet appareil. L’accueil, l’animation 3D et la vidéo fonctionnent maintenant sans réseau.'); }
      else { setOff('error', 'Réessayer le téléchargement'); toast(`Téléchargement incomplet${s.missing > 0 ? ` (${s.missing} fichier${s.missing > 1 ? 's' : ''} manquant${s.missing > 1 ? 's' : ''})` : ''}. Vérifiez la connexion et réessayez.`); }
    } catch (err) {
      setOff('error', 'Réessayer le téléchargement'); toast('Téléchargement interrompu. Vérifiez la connexion et réessayez.');
    }
    busy = false;
  });

  // --- installation ---
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;   // déjà installée
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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

  let timer = 0;
  function toast(msg) {
    let t = document.getElementById('pwaToast');
    if (!t) {
      t = document.createElement('div'); t.id = 'pwaToast'; t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:300;max-width:min(92vw,460px);padding:12px 16px;border-radius:10px;background:#15191c;color:#eef1f3;border:1px solid #f2c230;font:500 15px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)';
      (document.fullscreenElement || document.body).appendChild(t);
    }
    t.textContent = msg; t.hidden = false; clearTimeout(timer); timer = setTimeout(() => { t.hidden = true; }, 9000);
  }
})();
