// Film « mécanisme des mâchoires » (32 s), pour capture.mjs --film : vue 360° du mandrin seul, chaque système montré en couleur
// (les autres pièces en transparence) pendant que les manettes s'ouvrent et se ferment, puis la scène « Manettes ouvertes ou fermées ? ».
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
// les systèmes du mandrin (pièces de la nomenclature), montrés un à un pendant le tour
export const SYSTEMES = [
  ['hydraulique', ['3506909', '3506908', '5035016', '5035018', '5035015', '5035017', '2501-8-6']],
  ['transmission', ['5000199', '3506928', '3506882', '5054078', '5222624']],
  ['ressorts', ['5200517']],
  ['coneMachoires', ['2920390', 'UM-021-01-01']],
  ['retenue', ['B500-6500', 'B500-8000', '3506878']],
];
const TOUT = ['3506881', '3506879', '3506910', 'B500-1500', 'B500-4500', 'NC500', '3506909', '5035016', '5035018', '3506908', '5035015', '5035017', '5222624',
  '5000199', '3506882', '5054078', '3506928', '2501-8-6', 'ZNPT250', '5041022', '3506870', '3506880', '5040192', '5200517', '2920390', 'UM-021-01-01',
  'B500-6500', '3506878', 'B500-8000', '3506906', 'B500-2250', '3506907', 'B750-1500', 'W500-M'];
export const T_SYS = 3.5, T360 = 21;             // un système toutes les 3,5 s, puis le boîtier ; tour complet en 21 s
// plans : [début s, fin s, nom]
export const PLANS = [
  [0, 21, 'systemes'],       // vue 360° : chaque système en couleur, les autres en transparence ; manettes ouvertes / fermées pendant le tour
  [21, 32, 'ouvfer'],        // ouvertes ou fermées ? manettes ouvertes : ressorts écrasés, le cadenas n'y change rien ; fermées : le moins d'énergie
];
export const N = 32 * FPS;
// manettes : [instant s, sens (0 ouvrir, 1 fermer)]
export const CYCLES = [[1.0, 0], [4.6, 1], [8.2, 0], [11.8, 1], [15.4, 0], [19.0, 1], [21.2, 0], [25.8, 1]];
// avant l'image 0 (images rejouées sans rendu) : manettes fermées, mâchoires fermées
export const PRE = [['lever', 1]];
export const plan = k => PLANS.find(([a, b]) => k >= s(a) && k < s(b)) || PLANS[PLANS.length - 1];

// événements à l'image k (avant le calcul de l'image) ; iso : [pièces pleines, { verre : pièces en transparence, cacher : le reste caché }]
export function events(k) {
  const e = [];
  SYSTEMES.forEach(([, ids], i) => { if (k === s(i * T_SYS)) e.push(['iso', ids, { cacher: true, fantome: ['3506870'] }]); });   // le système en couleur, le boîtier en fantôme, le reste caché
  if (k === s(SYSTEMES.length * T_SYS)) e.push(['iso', TOUT, { cacher: true }]);   // le boîtier : tout le mandrin, en plein
  if (k === s(21)) e.push(['cut', true], ['iso', MECA]);
  for (const [t, d] of CYCLES) if (k === s(t)) e.push(['lever', d]);
  return e;
}
// image k : caméra, pas de temps, pièce soulignée, pièces dont on relève la position
export function at(k) {
  const t = k / FPS;
  let cam, dt = 1 / FPS / SLOW, hi = null, proj = [];
  if (t < 21) {                                  // tour complet à vitesse constante (départ et arrivée adoucis), de côté, un peu au-dessus
    const r = 1.2, T = T360, v = 1 / (T - r), x = t < r ? t * t / (2 * r) : t > T - r ? (T - r) - (T - t) * (T - t) / (2 * r) : t - r / 2;
    const zoom = ease(seg(t, 10.0, 11.0)) * (1 - ease(seg(t, 13.6, 14.6)));   // plus près pendant le cône et les mâchoires (petites pièces)
    cam = orb(360 * x * v, lerp(5.6, 3.4, zoom), lerp(1.7, 1.0, zoom), AXE);
    proj = ['3506909', '5000199', '5200517@top', '2920390', 'B500-8000', '3506870'];
  } else {                                       // mécanisme seul en coupe, ressorts soulignés ; manettes ouvertes puis fermées
    cam = { p: [-2.4, 5.6, 6.0], t: [-2.4, 4.95, 0] };
    hi = t >= 21.5 ? '5200517' : null; proj = ['5200517@top'];
  }
  return { cam, dt, hi, proj };
}
