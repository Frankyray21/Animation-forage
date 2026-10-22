// Film « mécanisme des mâchoires » (30 s) : découpage plan par plan pour capture.mjs --film.
// Chaque image k donne la caméra, la pièce soulignée et le pas de temps (dt < 1/24 : ralenti). Les événements (coupe,
// manettes, isolement) partent à l'image indiquée ; la capture rejoue toujours depuis l'image 0, donc l'état est le même
// quelle que soit la tranche capturée.
// Caméra fixe pendant les mouvements du mécanisme (même cadrage pour l'ouverture et la fermeture) : on compare d'un coup
// d'œil, et pas de scintillement des arêtes fines, qui vient surtout des déplacements de caméra.
// Les textes et les flèches de mouvement sont ajoutés au montage (video/meca/montage.mjs) ; proj : pièces dont la position
// à l'écran est relevée pour y accrocher leur nom ou leur flèche, plus l'avancement des manettes (lm : [q, sens]).
export const FPS = 24, N = 30 * FPS;
const C = [-1.9, 4.6, 0];   // centre du mandrin (axe horizontal selon x, face avant vers +x, à droite à l'écran en vue coupée)
const s = t => Math.round(t * FPS);
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, q) => a + (b - a) * q;
const lerp3 = (a, b, q) => a.map((v, i) => lerp(v, b[i], q));
// caméra sur un cercle autour de l'axe vertical passant par C : angle en degrés (0 = face +z, côté coupé), rayon, hauteur
const orb = (deg, r, h, t = C) => { const a = deg * Math.PI / 180; return { p: [t[0] + r * Math.sin(a), t[1] + h, t[2] + r * Math.cos(a)], t }; };
const camLerp = (A, B, q) => ({ p: lerp3(A.p, B.p, q), t: lerp3(A.t, B.t, q) });

export const SLOW = 2;                                              // manettes au ralenti ×2 : course de 3,6 s
const SIDE = { p: [-2.55, 5.75, 6.7], t: [-2.55, 4.95, 0] };          // coupe de côté : vérin, piston, ressorts, cône, mâchoires
const PARTS_MECA = ['3506909', '3506908', '5000199', '3506928', '5200517', '2920390', 'UM-021-01-01'];
// moments clés (s) : manettes ouvertes, manettes fermées
export const T_OUV = 4.5, T_FER = 14;
// plans : [début s, fin s, nom]
export const PLANS = [
  [0, 3.6, 'tour'],          // court travelling extérieur, finit en coupe
  [3.6, 13.5, 'ouvrir'],     // manettes ouvertes : huile, piston et cône reculent, ressorts écrasés, mâchoires ouvertes
  [13.5, 23, 'fermer'],      // manettes fermées : pression tombe, ressorts poussent le cône, mâchoires serrées
  [23, 30, 'retenir'],       // le mécanisme seul, ressorts soulignés : l'énergie qui reste
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
  return e;
}
const ARROWS = ['3506909@bord', '3506908@bord', '5200517@top', '2920390@bord', 'UM-021-01-01@top', 'UM-021-01-01@bas'];
// image k : caméra, pas de temps, pièce soulignée, pièces dont on relève la position
export function at(k) {
  const t = k / FPS;
  let cam = SIDE, dt = 1 / FPS, hi = null, proj = ARROWS;
  if (t < 3.6) {                                 // extérieur, lent (un quart de tour) puis coupe
    cam = orb(lerp(60, 8, ease(t / 3.6)), lerp(8, 7, ease(t / 3.6)), lerp(2.0, 1.2, ease(t / 3.6)));
    if (t >= 2.3) cam = camLerp(cam, SIDE, ease((t - 2.3) / 1.3));
    proj = t < 2.3 ? ['3506870', 'UM-021-01-01'] : ARROWS;
  } else if (t < 23) {
    dt = 1 / FPS / SLOW;
  } else {                                       // mécanisme seul : léger travelling avant, ressorts soulignés
    cam = camLerp(SIDE, { p: [-2.4, 5.6, 6.0], t: [-2.4, 4.95, 0] }, ease((t - 23) / 7));
    hi = t >= 23.8 ? '5200517' : null;
  }
  return { cam, dt, hi, proj };
}
