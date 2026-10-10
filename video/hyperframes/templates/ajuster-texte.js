// Texte trop long pour sa ligne : réduit (jamais coupé ni abrégé), renvoyé à la ligne en dernier recours.
// Boucle FIT de video/make_video.mjs:114-116, à l'identique, appliquée à chaque bandeau (.band .t et .band .c).
// Exécutée une fois les polices chargées ; la promesse est déclarée dans window.__hf.buildReady pour que
// HyperFrames attende la fin de l'ajustement avant la première capture (packages/core/src/runtime/init.ts, « buildReady »).
// Au rendu, les sous-compositions sont incorporées à index.html avant le chargement de la page : tous les bandeaux sont là.
// En prévisualisation (Studio), ils arrivent ensuite : un MutationObserver ajuste ceux qui apparaissent plus tard.
(function () {
  var ATTENDUS = {{NB_BANDEAUX}};
  function ajuster(racine) {
    for (const el of racine.querySelectorAll('.band .t, .band .c')) {
      if (el.dataset.ajuste) continue;
      el.dataset.ajuste = '1';
      const all = [el, ...el.querySelectorAll('*')], f0 = all.map(e => parseFloat(getComputedStyle(e).fontSize)); let k = 1;
      while (el.scrollWidth > el.clientWidth + 1 && k > .62) { k -= .02; all.forEach((e, j) => { e.style.fontSize = f0[j] * k + 'px'; }); }
      if (el.scrollWidth > el.clientWidth + 1) el.style.whiteSpace = 'normal';
    }
  }
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['ajuster-bandeaux'] = (async function () {
    await document.fonts.ready;
    ajuster(document);
    if (document.querySelectorAll('.band').length < ATTENDUS && typeof MutationObserver === 'function') {
      new MutationObserver(function () { document.fonts.ready.then(function () { ajuster(document); }); })
        .observe(document.body, { childList: true, subtree: true });
    }
  })();
})();
