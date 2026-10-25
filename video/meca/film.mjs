// Film « mécanisme des mâchoires » (51 s), pour capture.mjs --film : vue 360° du mandrin seul, chaque système montré en couleur
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
export const T_SYS = 6, T360 = 6 * T_SYS;        // un système toutes les 6 s (le boîtier en dernier) ; tour complet en 36 s
export const T_FIN = 15;                          // scène « ouvertes ou fermées ? »
const TF = 1.0, TG = 1.5;                         // fondu enchaîné entre deux systèmes ; glissé de la caméra et fondu vers la scène finale
// plans : [début s, fin s, nom]
export const PLANS = [
  [0, T360, 'systemes'],      // vue 360° : chaque système en couleur, le boîtier en fantôme, le reste caché ; manettes ouvertes / fermées pendant le tour
  [T360, T360 + T_FIN, 'ouvfer'],   // ouvertes ou fermées ? manettes ouvertes : ressorts écrasés, le cadenas n'y change rien ; fermées : le moins d'énergie
];
export const N = (T360 + T_FIN) * FPS;
// manettes : [instant s, sens (0 ouvrir, 1 fermer)] ; une course par système (ouvertes pendant un système, fermées pendant le suivant)
export const CYCLES = [...Array(6).keys()].map(i => [i * T_SYS + 1.0, i % 2]).concat([[T360 + TG + 0.1, 0], [T360 + 7.0, 1]]);
// avant l'image 0 (images rejouées sans rendu) : manettes fermées, mâchoires fermées
export const PRE = [['lever', 1]];
export const plan = k => PLANS.find(([a, b]) => k >= s(a) && k < s(b)) || PLANS[PLANS.length - 1];

// système i : [pièces en couleur, options d'isolement]
const sys = i => i < SYSTEMES.length ? [SYSTEMES[i][1], { cacher: true, fantome: ['3506870'] }] : [TOUT, { cacher: true }];
// événements à l'image k (avant le calcul de l'image) ; iso : [pièces pleines, { verre, cacher, fantome, fondu }]
export function events(k) {
  const e = [], t = k / FPS;
  if (k === 0) e.push(['iso', ...sys(0)]);
  for (let j = 1; j <= SYSTEMES.length; j++) {   // fondu enchaîné du système j−1 au système j, centré sur le changement
    const a = s(j * T_SYS - TF / 2), b = s(j * T_SYS + TF / 2);
    if (k < a || k > b) continue;
    if (k === b) { e.push(['iso', ...sys(j)]); continue; }
    const q = ease((k - a) / (b - a)), [A] = sys(j - 1), [B, o] = sys(j), inB = new Set(B), inA = new Set(A);
    e.push(['iso', A.filter(x => inB.has(x)), { ...o, fantome: ['3506870'], fondu: [[A.filter(x => !inB.has(x)), 1 - q], [B.filter(x => !inA.has(x)), q]] }]);
  }
  // vers la scène finale : coupe, le mécanisme reste, le reste du mandrin s'efface (puis fantôme gris)
  const a = s(T360), b = s(T360 + TG);
  if (k === a) e.push(['cut', true]);
  if (k >= a && k < b) { const q = ease((k - a) / (b - a)), inM = new Set(MECA); e.push(['iso', MECA, { fondu: [[TOUT.filter(x => !inM.has(x)), Math.max(0.12, 1 - q)]] }]); }
  if (k === b) e.push(['iso', MECA]);
  for (const [tc, d] of CYCLES) if (k === s(tc)) e.push(['lever', d]);
  return e;
}
// image k : caméra, pas de temps, pièce soulignée, pièces dont on relève la position
const CAM_FIN = { p: [-2.4, 5.6, 6.0], t: [-2.4, 4.95, 0] };
export function at(k) {
  const t = k / FPS;
  let cam, dt = 1 / FPS / SLOW, hi = null, proj = [];
  if (t < T360) {                                // tour complet à vitesse constante (départ et arrivée adoucis), de côté, un peu au-dessus
    const r = 2.0, T = T360, v = 1 / (T - r), x = t < r ? t * t / (2 * r) : t > T - r ? (T - r) - (T - t) * (T - t) / (2 * r) : t - r / 2;
    const c = 3 * T_SYS, zoom = ease(seg(t, c - 0.5, c + 0.7)) * (1 - ease(seg(t, c + T_SYS - 0.7, c + T_SYS + 0.5)));   // plus près pendant le cône et les mâchoires (petites pièces)
    cam = orb(360 * x * v, lerp(5.6, 3.4, zoom), lerp(1.7, 1.0, zoom), AXE);
    proj = ['3506909', '5000199', '5200517@top', '2920390', 'B500-8000', '3506870'];
  } else {                                       // glissé vers le mécanisme seul en coupe, ressorts soulignés ; manettes ouvertes puis fermées
    const o = orb(360, 5.6, 1.7, AXE), q = ease(seg(t, T360, T360 + TG));
    cam = { p: lerp3(o.p, CAM_FIN.p, q), t: lerp3(o.t, CAM_FIN.t, q) };
    hi = t >= T360 + TG ? '5200517' : null; proj = ['5200517@top'];
  }
  return { cam, dt, hi, proj };
}
