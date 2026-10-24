// Film « mécanisme des mâchoires » (41,5 s), pour capture.mjs --film : d'abord tout le mécanisme en action (coupe de côté),
// puis construit pièce par pièce (les autres pièces cachées) en actionnant les manettes : on voit ce que chaque pièce fait ;
// la caméra tourne vers l'avant pour montrer les mâchoires qui s'ouvrent et se ferment.
// Pièces entières (pas de coupe) dans les plans pièce par pièce.
// Chaque image k donne la caméra, la pièce soulignée et le pas de temps (dt < 1/24 : ralenti). Les événements (coupe,
// manettes, isolement) partent à l'image indiquée ; la capture rejoue toujours depuis l'image 0, donc l'état est le même
// quelle que soit la tranche capturée. Caméra lente (petits arcs) : les déplacements rapides font papilloter les détails fins.
// Les textes et les flèches de mouvement sont ajoutés au montage (video/meca/montage.mjs) ; proj : pièces dont la position
// à l'écran est relevée (« id@ax » : un point décalé vers l'avant, pour le sens du mouvement), plus l'avancement des manettes.
export const FPS = 24;
const s = t => Math.round(t * FPS);
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, q) => a + (b - a) * q;
const lerp3 = (a, b, q) => a.map((v, i) => lerp(v, b[i], q));
const seg = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
// caméra sur un cercle autour de l'axe vertical passant par t : angle en degrés (0 = côté +z, 90 = devant, côté mâchoires), rayon, hauteur
const orb = (deg, r, h, t) => { const a = deg * Math.PI / 180; return { p: [t[0] + r * Math.sin(a), t[1] + h, t[2] + r * Math.cos(a)], t }; };

export const SLOW = 1.5;                         // manettes au ralenti ×1,5 : course de 2,7 s
const AXE = [-1.85, 4.76, 0];                    // axe du mandrin (selon x, avant vers +x)
const MACH = ['UM-021-01-01'], CONE = ['2920390'], RESS = ['5200517'];
const PIST = ['3506908', '5000199', '3506928'], CYL = ['3506909'];
const MECA = [...MACH, ...CONE, ...RESS, ...PIST, ...CYL];
// plans : [début s, fin s, nom]
export const PLANS = [
  [0, 2.5, 'exterieur'],
  [2.5, 12.5, 'action'],     // tout le mécanisme en coupe : huile, piston, cône, ressorts, mâchoires, un cycle ouvrir / fermer
  [12.5, 19.5, 'cone'],      // puis pièce par pièce : mâchoires + cône (en transparence), la caméra tourne vers l'avant (mâchoires de face)
  [19.5, 27, 'ressorts'],    // + les 18 ressorts : ils poussent le cône ; même rotation vers l'avant
  [27, 32.5, 'boitier'],     // + le boîtier : de l'extérieur, presque rien ne bouge
  [32.5, 43.5, 'ouvfer'],    // ouvertes ou fermées ? (seule scène gardée dans la vidéo, montage.mjs --debut 32.5) manettes ouvertes : ressorts écrasés, le cadenas n'y change rien ; fermées : le moins d'énergie
];
export const N = 43.5 * FPS;
// manettes : [instant s, sens (0 ouvrir, 1 fermer)] — deux basculements par plan
export const CYCLES = [[3.6, 0], [8.0, 1], [13.3, 0], [16.4, 1], [20.3, 0], [23.6, 1], [27.8, 0], [30.1, 1], [32.7, 0], [37.3, 1]];
// avant l'image 0 (images rejouées sans rendu) : manettes fermées, mâchoires fermées
export const PRE = [['lever', 1]];
export const plan = k => PLANS.find(([a, b]) => k >= s(a) && k < s(b)) || PLANS[PLANS.length - 1];

// événements à l'image k (avant le calcul de l'image) ; iso : [pièces pleines, { verre : pièces en transparence, cacher : le reste caché }]
export function events(k) {
  const e = [];
  if (k === s(2.5)) e.push(['cut', true], ['iso', MECA]);
  if (k === s(12.5)) e.push(['cut', false], ['iso', MACH, { verre: CONE, cacher: true }]);
  if (k === s(19.5)) e.push(['iso', [...MACH, ...RESS], { verre: CONE, cacher: true }]);
  if (k === s(27)) e.push(['iso', null]);
  if (k === s(32.5)) e.push(['cut', true], ['iso', MECA]);
  for (const [t, d] of CYCLES) if (k === s(t)) e.push(['lever', d]);
  return e;
}
const SIDE = { p: [-2.6, 5.5, 6.5], t: [-2.6, 4.98, 0] };   // coupe de côté, mécanisme entier
// image k : caméra, pas de temps, pièce soulignée, pièces dont on relève la position
export function at(k) {
  const t = k / FPS;
  let cam, dt = 1 / FPS / SLOW, hi = null, proj = [];
  if (t < 2.5) {                                 // le mandrin sur la tête, caméra presque immobile
    cam = orb(lerp(42, 36, t / 2.5), 8, 1.8, AXE); dt = 1 / FPS;
    proj = ['3506870', 'UM-021-01-01'];
  } else if (t < 12.5) {                         // le mécanisme en action : coupe de côté fixe
    cam = SIDE;
    proj = ['3506909@bord', '3506908@bord', '3506908', '3506908@ax', '2920390@bord', '5200517@top', 'UM-021-01-01', 'UM-021-01-01@top', 'UM-021-01-01@bas'];
  } else if (t < 19.5) {                         // mâchoires + cône : de côté (le coin) vers l'avant (mâchoires de face), lentement
    cam = orb(lerp(28, 72, ease(seg(t, 12.5, 19.5))), 4.0, 1.0, [-0.95, 4.76, 0]);
    proj = ['2920390', '2920390@ax', 'UM-021-01-01', 'UM-021-01-01@top', 'UM-021-01-01@bas'];
  } else if (t < 27) {                           // + ressorts : la couronne entière, de côté vers l'avant
    cam = orb(lerp(22, 66, ease(seg(t, 19.5, 27))), 5.6, 1.6, [-1.3, 4.76, 0]);
    proj = ['5200517@top', '5200517', '2920390', '2920390@ax', 'UM-021-01-01', 'UM-021-01-01@top', 'UM-021-01-01@bas'];
  } else if (t < 32.5) {                         // + boîtier : le mandrin complet sur la tête, de trois quarts
    cam = orb(lerp(36, 46, ease(seg(t, 27, 32.5))), 7.4, 1.8, AXE);
    proj = ['3506870', 'UM-021-01-01'];
  } else {                                       // mécanisme seul en coupe, ressorts soulignés ; manettes ouvertes puis fermées
    cam = { p: [-2.4, 5.6, 6.0], t: [-2.4, 4.95, 0] };
    hi = t >= 33 ? '5200517' : null; proj = ['5200517@top'];
  }
  return { cam, dt, hi, proj };
}
