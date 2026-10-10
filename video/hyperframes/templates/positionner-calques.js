// Compteur de tours et repère « Ralenti » (scénario A) : make_video.mjs les capture rognés à leur boîte arrondie à l'entier
// supérieur (lignes 197-199 : Math.ceil de la largeur) puis les colle à un x entier (lignes 257-258) :
//   compteur : x = W − ceil(largeur) − 18, y = 18 ;  « Ralenti » : x = round(W / 2 − ceil(largeur) / 2), y = 18.
// Le CSS seul (right: 18px, translateX(−50%)) donnerait un x fractionnaire : la position exacte est posée ici, une fois les polices
// chargées, avant la première capture (window.__hf.buildReady). Les éléments minutés inactifs sont en visibility: hidden (mise
// en page conservée) : leur largeur se mesure.
(function () {
  var W = {{W}};
  function positionner(racine) {
    for (const el of racine.querySelectorAll('.hud.pos, .tag.pos')) {
      if (el.dataset.place) continue;
      const w = Math.ceil(el.getBoundingClientRect().width);
      if (!w) continue;
      el.dataset.place = '1';
      el.style.right = 'auto';
      el.style.transform = 'none';
      el.style.left = (el.classList.contains('hud') ? W - w - 18 : Math.round(W / 2 - w / 2)) + 'px';
    }
  }
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['positionner-calques'] = (async function () {
    await document.fonts.ready;
    if (window.__hf.buildReady['ajuster-bandeaux']) await window.__hf.buildReady['ajuster-bandeaux'];
    positionner(document);
    // pas de MutationObserver : au rendu, toutes les sous-compositions sont incorporées avant le chargement (voir ajuster-texte.js) ;
    // un placement asynchrone après coup rendrait la capture non déterministe
  })();
})();
