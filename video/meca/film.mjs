// Film « mécanisme des mâchoires » (45 s) : découpage plan par plan pour capture.mjs --film.
// Chaque image k donne la caméra, la pièce soulignée et le pas de temps (dt < 1/24 : ralenti). Les événements (coupe,
// manettes, isolement) partent à l'image indiquée ; la capture rejoue toujours depuis l'image 0, donc l'état est le même
// quelle que soit la tranche capturée.
// Caméra fixe pendant les mouvements du mécanisme (même cadrage pour l'ouverture et la fermeture) : on compare d'un coup
// d'œil, et pas de scintillement des arêtes fines, qui vient surtout des déplacements de caméra.
// Les textes et les flèches de mouvement sont ajoutés au montage (video/meca/montage.mjs) ; proj : pièces dont la position
// à l'écran est relevée pour y accrocher leur nom ou leur flèche, plus l'avancement des manettes (lm : [q, sens]).
export const FPS = 24, N = 45 * FPS;
const C = [-1.9, 4.6, 0];   // centre du mandrin (axe horizontal selon x, face avant vers +x, à droite à l'écran en vue coupée)
const s = t => Math.round(t * FPS);
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, q) => a + (b - a) * q;
const lerp3 = (a, b, q) => a.map((v, i) => lerp(v, b[i], q));
// caméra sur un cercle autour de l'axe vertical passant par C : angle en degrés (0 = face +z, côté coupé), rayon, hauteur
const orb = (deg, r, h, t = C) => { const a = deg * Math.PI / 180; return { p: [t[0] + r * Math.sin(a), t[1] + h, t[2] + r * Math.cos(a)], t }; };
const seg = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
const camLerp = (A, B, q) => ({ p: lerp3(A.p, B.p, q), t: lerp3(A.t, B.t, q) });

export const SLOW = 2;                                              // manettes au ralenti ×2 : course de 3,6 s
const SIDE = { p: [-2.55, 5.75, 6.7], t: [-2.55, 4.95, 0] };          // coupe de côté : vérin, piston, ressorts, cône, mâchoires
const PARTS_MECA = ['3506909', '3506908', '5000199', '3506928', '5200517', '2920390', 'UM-021-01-01'];
// moments clés (s) : manettes ouvertes, manettes fermées
export const T_OUV = 4.5, T_FER = 14;
// plans : [début s, fin s, nom]
export const PLANS = [
  [0, 3.6, 'tour'],          // vue extérieure, puis passage franc à la coupe
  [3.6, 13.5, 'ouvrir'],     // manettes ouvertes : huile, piston et cône reculent, ressorts écrasés, mâchoires ouvertes
  [13.5, 23, 'fermer'],      // manettes fermées : pression tombe, ressorts poussent le cône, mâchoires serrées
  [23, 39, 'tour360'],       // vue 360° de l'intérieur, mécanisme seul, manettes actionnées plusieurs fois
  [39, 45, 'retenir'],       // le mécanisme seul, ressorts soulignés : l'énergie qui reste
];
// avant l'image 0 (images rejouées sans rendu) : manettes fermées, mâchoires fermées
export const PRE = [['lever', 1]];
export const plan = k => PLANS.find(([a, b]) => k >= s(a) && k < s(b)) || PLANS[PLANS.length - 1];

// événements à l'image k (avant le calcul de l'image)
export function events(k) {
  const e = [];
  if (k === s(2.3)) e.push(['cut', true]);
  if (k === s(T_OUV)) e.push(['lever', 0]);
  if (k === s(T_FER)) e.push(['lever', 1]);
  if (k === s(23)) e.push(['iso', PARTS_MECA]);
  for (const [t, d] of CYCLES) if (k === s(t)) e.push(['lever', d]);
  return e;
}
const ARROWS = ['3506909@bord', '3506908@bord', '5200517@top', '2920390@bord', 'UM-021-01-01@top', 'UM-021-01-01@bas'];
// vue 360° : tour complet autour du mandrin, coupe tournée avec la caméra (le plan de coupe contient l'axe et s'ouvre du côté de la
// caméra : on voit toujours l'intérieur ; les ressorts du côté retiré s'effacent en fondu) ; manettes ouvertes et fermées deux fois pendant le tour, ralenti ×1,5 (course 2,7 s)
export const T360 = [23, 39], SLOW360 = 1.5;
export const CYCLES = [[24.6, 0], [28.4, 1], [32.2, 0], [36, 1]];
const AXE = [-1.85, 4.76, 0], R360 = 5.0, H360 = 1.6;
const RET = { p: [-2.4, 5.6, 6.0], t: [-2.4, 4.95, 0] };   // mécanisme seul, de côté (fin)
// image k : caméra, pas de temps, pièce soulignée, pièces dont on relève la position, coupe orientée (cutN, axe)
export function at(k) {
  const t = k / FPS;
  let cam = SIDE, dt = 1 / FPS, hi = null, proj = ARROWS, cutN = null;
  if (t < 2.3) {                                 // extérieur, caméra presque immobile (un déplacement rapide fait papilloter les détails fins)
    cam = orb(lerp(42, 36, t / 2.3), 8, 1.8);
    proj = ['3506870', 'UM-021-01-01'];
  } else if (t < 3.6) {                          // passage franc à la coupe, même cadrage que la suite
    proj = ARROWS;
  } else if (t < 23) {
    dt = 1 / FPS / SLOW;
  } else if (t < 39) {                           // tour complet à vitesse constante, raccordé en douceur au cadrage de côté
    // vitesse constante, départ et arrivée adoucis sur 1,5 s : la caméra ne va jamais plus vite qu'il ne faut (moins de papillotement)
    const r = 1.5, T = 16, u = t - 23, v = 1 / (T - r), x = u < r ? u * u / (2 * r) : u > T - r ? (T - r) - (T - u) * (T - u) / (2 * r) : u - r / 2, ang = 360 * x * v;
    cam = orb(ang, R360, H360, AXE);
    if (t < 24.5) cam = camLerp(SIDE, cam, ease(seg(t, 23, 24.5)));
    if (t > 37.5) cam = camLerp(cam, RET, ease(seg(t, 37.5, 39)));
    // plan de coupe : tourne autour de l'axe à la même vitesse que la caméra (0° de côté, 90° vers le haut quand la caméra
    // est devant, retour par le haut quand elle est derrière) : jamais de bascule brusque, toujours ouvert du côté de la caméra
    const b = (ang <= 180 ? ang : 360 - ang) * Math.PI / 180;
    cutN = [0, Math.sin(b), Math.cos(b)];
    dt = 1 / FPS / SLOW360; proj = [];
  } else {                                       // mécanisme seul, de côté : ressorts soulignés
    cam = RET; hi = t >= 39.5 ? '5200517' : null; proj = ['5200517@top'];
  }
  return { cam, dt, hi, proj, cutN, axe: AXE };
}
