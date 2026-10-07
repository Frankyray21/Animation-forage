// Application installable et utilisable hors ligne : enregistre sw.js, affiche les boutons [data-install].
// Rien dans un aperçu intégré (cadre) ni sous automatisation (capture vidéo).
(() => {
  if (window.self !== window.top || !('serviceWorker' in navigator) || !window.isSecureContext || navigator.webdriver) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;   // déjà installée
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferred = null;
  const show = v => document.querySelectorAll('[data-install]').forEach(b => { b.hidden = !v; });
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; show(true); });
  addEventListener('appinstalled', () => { deferred = null; show(false); toast('Application installée. Elle fonctionne aussi hors ligne.'); });
  if (ios) show(true);
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-install]')) return;
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice; deferred = null; if (r.outcome === 'accepted') show(false); }
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
