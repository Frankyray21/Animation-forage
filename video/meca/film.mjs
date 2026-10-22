// Film « mécanisme des mâchoires » (45 s) : découpage plan par plan pour capture.mjs --film.
// Chaque image k donne la caméra, la coupe, la vue éclatée, les pièces isolées, la pièce soulignée et le pas de temps
// (dt < 1/24 : ralenti). Les événements (manettes, vue éclatée) partent à l'image indiquée ; la capture rejoue toujours
// depuis l'image 0, donc l'état est le même quelle que soit la tranche capturée.
// Les textes (titres, noms des pièces) sont ajoutés au montage (video/meca/montage.mjs) ; proj : pièces dont la position
// à l'écran est relevée pour y accrocher leur nom.
export const FPS = 24, N = 45 * FPS;
const C = [-1.9, 4.6, 0];   // centre du mandrin (axe horizontal selon x, face avant vers +x)
const s = t => Math.round(t * FPS);
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const lerp = (a, b, q) => a + (b - a) * q;
const lerp3 = (a, b, q) => a.map((v, i) => lerp(v, b[i], q));
// caméra sur un cercle autour de l'axe vertical passant par C : angle en degrés (0 = face +z, côté coupé), rayon, hauteur
const orb = (deg, r, h, t = C) => { const a = deg * Math.PI / 180; return { p: [t[0] + r * Math.sin(a), t[1] + h, t[2] + r * Math.cos(a)], t }; };
const camLerp = (A, B, q) => ({ p: lerp3(A.p, B.p, q), t: lerp3(A.t, B.t, q) });

const SIDE = { p: [-1.9, 6.0, 7.2], t: [-1.9, 4.6, 0] };          // coupe de côté : vérin, ressorts, cône, mâchoires
const WEDGE = { p: [-0.5, 5.7, 2.7], t: [-0.95, 5.15, 0] };         // gros plan du coin cône / mâchoires
const EXP = q => orb(lerp(20, 40, q), lerp(15, 16.5, q), lerp(3, 4.2, q), [1.0, 5.0, 0]);   // vue éclatée
const PARTS_MECA = ['3506908', '5000199', '3506928', '5200517', '2920390', 'UM-021-01-01'];
// plans : [début s, fin s, nom]
export const PLANS = [
  [0, 7, 'tour'],          // tour de l'extérieur par l'avant (la tête est derrière), finit côté coupe
  [7, 17, 'ouvrir'],       // manettes ouvertes : huile, piston, ressorts comprimés au maximum, mâchoires ouvertes
  [17, 27, 'fermer'],      // manettes fermées, au ralenti : les ressorts poussent le cône, le coin serre les mâchoires
  [27, 37, 'isoler'],      // le mécanisme seul, pièce par pièce, un cycle ouvrir / fermer
  [37, 40.2, 'eclate'],      // vue éclatée
  [40.2, 45, 'retenir'],     // retour en coupe, ressorts soulignés : l'énergie qui reste
];
// avant l'image 0 (images rejouées sans rendu) : manettes fermées, mâchoires fermées
export const PRE = [['lever', 1]];
export const plan = k => PLANS.find(([a, b]) => k >= s(a) && k < s(b)) || PLANS[PLANS.length - 1];

// événements à l'image k (avant le calcul de l'image)
export function events(k) {
  const e = [];
  if (k === s(5.2)) e.push(['cut', true]);
  if (k === s(8.5)) e.push(['lever', 0]);
  if (k === s(18)) e.push(['lever', 1]);
  if (k === s(27)) e.push(['iso', PARTS_MECA]);
  if (k === s(29.5)) e.push(['lever', 0]);
  if (k === s(33)) e.push(['lever', 1]);
  if (k === s(37)) e.push(['iso', null], ['explode', true]);
  if (k === s(40.2)) e.push(['explode', false], ['cut', false]);   // coupe rétablie une fois remonté
  if (k === s(41.6)) e.push(['cut', true]);
  return e;
}
// image k : caméra, pas de temps, pièce soulignée, pièces dont on relève la position
export function at(k) {
  const t = k / FPS;
  let cam, dt = 1 / FPS, hi = null, proj = [];
  if (t < 7) {                                   // tour : 125° par l'avant, de l'arrière-gauche jusqu'en face de la coupe
    const q = ease(t / 7);
    cam = orb(lerp(125, 0, q), lerp(8.5, 7.4, q), lerp(2.4, 1.5, q));
    if (t >= 5.2) cam = camLerp(cam, SIDE, ease((t - 5.2) / 1.8));
    proj = t > 1 && t < 5 ? ['3506870', 'UM-021-01-01'] : [];
  } else if (t < 17) {                           // ouverture, vitesse normale ralentie ×2 (course 3,6 s)
    cam = camLerp(SIDE, { p: [-1.6, 5.8, 6.4], t: [-1.7, 4.6, 0] }, ease((t - 7) / 10));
    dt = 1 / FPS / 2;
    proj = ['3506909@bord', '3506908@bord', '5200517@top', '2920390@bord', 'UM-021-01-01@top'];
  } else if (t < 27) {                           // fermeture au ralenti ×3 (course 5,4 s), la caméra s'approche du coin
    cam = camLerp(SIDE, WEDGE, ease((t - 19) / 6));
    dt = 1 / FPS / 3;
    proj = ['5200517@top', '2920390@bord', 'UM-021-01-01@top'];
  } else if (t < 37) {                           // mécanisme isolé, en rotation lente ; une pièce soulignée à la fois
    const q = (t - 27) / 10;
    cam = orb(lerp(-30, 35, q), lerp(5.2, 4.6, q), lerp(1.8, 1.0, q), [-1.85, 4.76, 0]);
    dt = 1 / FPS / 2;
    hi = t < 29.5 ? '3506908' : t < 32 ? '5200517' : t < 34.5 ? '2920390' : 'UM-021-01-01';
    proj = [hi === '5200517' || hi === 'UM-021-01-01' ? hi + '@top' : hi + '@bord'];
  } else if (t < 40.2) {                           // vue éclatée : recul et léger tour
    const q = ease((t - 37) / 3.2);
    cam = EXP(q);
  } else {                                       // retour : coupe de côté, ressorts soulignés
    cam = camLerp(EXP(1), SIDE, ease((t - 40.2) / 2.2));
    hi = t > 42 ? '5200517' : null;
    proj = ['5200517@top', '2920390@bord'];
  }
  return { cam, dt, hi, proj };
}
