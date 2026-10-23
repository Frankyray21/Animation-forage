// Film « mécanisme des mâchoires » (48 s) : le mécanisme construit pièce par pièce, pour capture.mjs --film.
// Chaque plan ajoute une pièce (les autres sont cachées) et actionne les manettes : on voit ce que la nouvelle pièce fait.
// Pièces entières (pas de coupe) sauf pour le piston, dont l'huile ne se voit qu'à l'intérieur du cylindre.
// Chaque image k donne la caméra, la pièce soulignée et le pas de temps (dt < 1/24 : ralenti). Les événements (coupe,
// manettes, isolement) partent à l'image indiquée ; la capture rejoue toujours depuis l'image 0, donc l'état est le même
// quelle que soit la tranche capturée. Caméra lente (petits arcs) : les déplacements rapides font papilloter les détails fins.
// Les textes et les flèches de mouvement sont ajoutés au montage (video/meca/montage.mjs) ; proj : pièces dont la position
// à l'écran est relevée (« id@ax » : un point décalé vers l'avant, pour le sens du mouvement), plus l'avancement des manettes.
export const FPS = 24, N = 48 * FPS;
const s = t => Math.round(t * FPS);
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, q) => a + (b - a) * q;
const lerp3 = (a, b, q) => a.map((v, i) => lerp(v, b[i], q));
const seg = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
// caméra sur un cercle autour de l'axe vertical passant par t : angle en degrés (0 = côté +z, 90 = devant, côté mâchoires), rayon, hauteur
const orb = (deg, r, h, t) => { const a = deg * Math.PI / 180; return { p: [t[0] + r * Math.sin(a), t[1] + h, t[2] + r * Math.cos(a)], t }; };
const camLerp = (A, B, q) => ({ p: lerp3(A.p, B.p, q), t: lerp3(A.t, B.t, q) });

export const SLOW = 1.5;                         // manettes au ralenti ×1,5 : course de 2,7 s
const AXE = [-1.85, 4.76, 0];                    // axe du mandrin (selon x, avant vers +x)
const MACH = ['UM-021-01-01'], CONE = ['2920390'], RESS = ['5200517'];
const PIST = ['3506908', '5000199', '3506928'], CYL = ['3506909'];
const MECA = [...MACH, ...CONE, ...RESS, ...PIST, ...CYL];
// plans : [début s, fin s, nom, pièce ajoutée (clé de proj de son nom)]
export const PLANS = [
  [0, 3.5, 'exterieur'],
  [3.5, 11, 'machoires'],    // les mâchoires seules
  [11, 18, 'cone'],          // + le cône (en transparence) : son coin referme les mâchoires
  [18, 26, 'ressorts'],      // + les 18 ressorts : ils poussent le cône
  [26, 33, 'piston'],        // + le piston et le cylindre (en coupe, avec l'huile) : l'huile tire le cône
  [33, 39, 'boitier'],       // + le boîtier : de l'extérieur, presque rien ne bouge
  [39, 48, 'ouvfer'],        // ouvertes ou fermées ? manettes ouvertes : ressorts écrasés, le cadenas n'y change rien ; fermées : le moins d'énergie
];
// manettes : [instant s, sens (0 ouvrir, 1 fermer)] — deux basculements par plan
export const CYCLES = [[4.6, 0], [7.8, 1], [12.0, 0], [15.0, 1], [19.2, 0], [22.6, 1], [27.0, 0], [30.0, 1], [34.0, 0], [36.6, 1], [39.2, 0], [43.8, 1]];
// avant l'image 0 (images rejouées sans rendu) : manettes fermées, mâchoires fermées
export const PRE = [['lever', 1]];
export const plan = k => PLANS.find(([a, b]) => k >= s(a) && k < s(b)) || PLANS[PLANS.length - 1];

// événements à l'image k (avant le calcul de l'image) ; iso : [pièces pleines, { verre : pièces en transparence, cacher : le reste caché }]
export function events(k) {
  const e = [];
  if (k === s(3.5)) e.push(['iso', MACH, { cacher: true }]);
  if (k === s(11)) e.push(['iso', MACH, { verre: CONE, cacher: true }]);
  if (k === s(18)) e.push(['iso', [...MACH, ...RESS], { verre: CONE, cacher: true }]);
  if (k === s(26)) e.push(['cut', true], ['iso', MECA, { cacher: true }]);
  if (k === s(33)) e.push(['cut', false], ['iso', null]);
  if (k === s(39)) e.push(['cut', true], ['iso', MECA]);
  for (const [t, d] of CYCLES) if (k === s(t)) e.push(['lever', d]);
  return e;
}
// image k : caméra, pas de temps, pièce soulignée, pièces dont on relève la position
export function at(k) {
  const t = k / FPS;
  let cam, dt = 1 / FPS / SLOW, hi = null, proj = [];
  if (t < 3.5) {                                 // le mandrin sur la tête, caméra presque immobile
    cam = orb(lerp(42, 34, t / 3.5), 8, 1.8, AXE); dt = 1 / FPS;
    proj = ['3506870', 'UM-021-01-01'];
  } else if (t < 11) {                           // mâchoires seules, de trois quarts avant, petit arc
    const J = [-0.92, 4.76, 0];
    cam = orb(lerp(62, 40, ease(seg(t, 3.5, 11))), 3.3, 1.0, J);
    proj = ['UM-021-01-01', 'UM-021-01-01@top', 'UM-021-01-01@bas'];
  } else if (t < 18) {                           // + cône : de côté un peu en avant, on voit le coin
    const J = [-0.95, 4.76, 0];
    cam = orb(lerp(40, 22, ease(seg(t, 11, 18))), 4.2, 1.1, J);
    proj = ['2920390', '2920390@ax', 'UM-021-01-01@top', 'UM-021-01-01'];
  } else if (t < 26) {                           // + ressorts : la couronne entière, de trois quarts
    const J = [-1.35, 4.76, 0];
    cam = orb(lerp(30, 12, ease(seg(t, 18, 26))), 5.6, 1.9, J);
    proj = ['5200517@top', '5200517', '2920390', '2920390@ax'];
  } else if (t < 33) {                           // + piston et cylindre : coupe de côté, fixe (huile visible)
    cam = { p: [-2.0, 5.45, 5.7], t: [-2.0, 4.85, 0] };
    proj = ['3506909@bord', '3506908@bord', '3506908', '3506908@ax', '2920390@bord', '5200517@top'];
  } else if (t < 39) {                           // + boîtier : le mandrin complet sur la tête, de trois quarts
    cam = orb(lerp(36, 48, ease(seg(t, 33, 39))), 7.4, 1.8, AXE);
    proj = ['3506870', 'UM-021-01-01'];
  } else {                                       // mécanisme seul en coupe, ressorts soulignés ; manettes ouvertes puis fermées (ralenti ×1,5)
    cam = { p: [-2.4, 5.6, 6.0], t: [-2.4, 4.95, 0] };
    hi = t >= 39.5 ? '5200517' : null; proj = ['5200517@top'];
  }
  return { cam, dt, hi, proj };
}
