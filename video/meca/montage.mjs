#!/usr/bin/env node
// Montage du film « mécanisme des mâchoires » (45 s) : textes à l'écran posés sur les images de capture.mjs --film video/meca/film.mjs.
// Un calque transparent par image (Playwright) : titre du plan, état des manettes, légende du bas, noms des pièces accrochés à leur
// position à l'écran (proj_*.json de la capture), repère « Ralenti », flèches dans le sens réel du mouvement des pièces
// (mâchoires, cône, ressorts, piston, huile) pendant leur course, phrase selon l'état des manettes ; puis ffmpeg : images + calques → MP4 1920 × 1080, sans son.
// Usage : node video/meca/montage.mjs --img DOSSIER_CAPTURE [--proj DOSSIER] --polices COMPOSITION.html --sortie FICHIER.mp4 [--lang fr|en] [--at k1,k2]
//   COMPOSITION.html : une composition d'un projet HyperFrames (ses @font-face et ../assets/fonts) ; PLAYWRIGHT, CHROME, FFMPEG.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARGV = process.argv.slice(2), arg = (k, d) => { const i = ARGV.indexOf('--' + k); return i < 0 ? d : ARGV[i + 1]; };
const IMG = path.resolve(arg('img', '')), OUT = path.resolve(arg('sortie', '')), LANG = arg('lang', 'fr');
const F = await import(pathToFileURL(path.join(HERE, 'film.mjs')).href);
const W = 1280, H = 720, DSF = 1.5;   // calques dessinés en 1280 × 720, rendus en 1920 × 1080

// --- textes ---
// plans : [début, fin, surtitre, titre] ; etat : [début, fin, phrase manettes ouvertes, phrase manettes fermées] (selon l'état
// des manettes) ; legendes : [début, fin, texte] ; etiquettes : [début, fin, clé de proj, nom, dx, dy]
const TX = {
  fr: {
    plans: [
      [0.3, 3.5, 'Mandrin Boyles H', 'Le mécanisme, pièce par pièce'],
      [3.5, 11, '1 · Les mâchoires', 'Elles serrent la tige'],
      [11, 18, '2 · + le cône', 'Son coin pousse les mâchoires'],
      [18, 26, '3 · + les 18 ressorts', 'Ils poussent le cône'],
      [26, 33, '4 · + le piston et l\'huile', 'L\'huile tire le cône'],
      [33, 39, '5 · + le boîtier', 'Tout est caché à l\'intérieur'],
      [39, 46, 'À retenir', 'L\'énergie qui reste : les ressorts'],
    ],
    etat: [
      [4.6, 11, 'Manettes ouvertes : les mâchoires s\'écartent.', 'Manettes fermées : les mâchoires se referment sur la tige.'],
      [12.0, 18, 'Manettes ouvertes : le cône recule, les mâchoires s\'écartent.', 'Manettes fermées : le cône avance, son coin referme les mâchoires.'],
      [19.2, 26, 'Manettes ouvertes : le cône recule et écrase les ressorts.', 'Manettes fermées : les ressorts repoussent le cône vers l\'avant.'],
      [27.0, 33, 'Manettes ouvertes : l\'huile pousse le piston, qui tire le cône vers l\'arrière.', 'Manettes fermées : la pression tombe, les ressorts reprennent le dessus.'],
    ],
    legendes: [
      [33.6, 39, 'De l\'extérieur, presque rien ne bouge : les ressorts travaillent cachés dans le boîtier.'],
      [39.4, 42.2, 'Manettes fermées : il reste le moins d\'énergie possible. Mais les ressorts restent comprimés, retenus par les boulons du cône.'],
    ],
    etiquettes: [
      [0.6, 3.2, '3506870', 'Boîtier du mandrin', -80, -60],
      [3.8, 11, 'UM-021-01-01@top', '8 mâchoires', 90, -50],
      [11.3, 18, '2920390', 'Cône (bol)', -110, -70],
      [18.3, 26, '5200517@top', '18 ressorts', -90, -50],
      [26.3, 33, '3506909@bord', 'Cylindre hydraulique', -90, -50],
      [26.3, 33, '3506908@bord', 'Piston', 70, -60],
      [33.3, 39, '3506870', 'Boîtier du mandrin', -80, -60],
      [39.8, 46, '5200517@top', '18 ressorts comprimés', -80, -50],
    ],
    huile: 'Huile',
    manettes: ['Manettes', 'ouvertes', 'fermées'],
    ralenti: 'Ralenti',
    cadenas: 'Le cadenas coupe l\'hydraulique, pas l\'énergie des ressorts.',
  },
  en: {
    plans: [
      [0.3, 3.5, 'Boyles H chuck', 'The mechanism, part by part'],
      [3.5, 11, '1 · The jaws', 'They grip the rod'],
      [11, 18, '2 · + the cone', 'Its wedge pushes the jaws'],
      [18, 26, '3 · + the 18 springs', 'They push the cone'],
      [26, 33, '4 · + the piston and the oil', 'The oil pulls the cone'],
      [33, 39, '5 · + the housing', 'Everything is hidden inside'],
      [39, 46, 'Remember', 'The energy that stays: the springs'],
    ],
    etat: [
      [4.6, 11, 'Levers open: the jaws spread apart.', 'Levers closed: the jaws close on the rod.'],
      [12.0, 18, 'Levers open: the cone moves back, the jaws spread apart.', 'Levers closed: the cone moves forward, its wedge closes the jaws.'],
      [19.2, 26, 'Levers open: the cone moves back and compresses the springs.', 'Levers closed: the springs push the cone forward again.'],
      [27.0, 33, 'Levers open: the oil pushes the piston, which pulls the cone back.', 'Levers closed: pressure drops, the springs take over.'],
    ],
    legendes: [
      [33.6, 39, 'From the outside, almost nothing moves: the springs work hidden inside the housing.'],
      [39.4, 42.2, 'Levers closed leaves the least energy possible. But the springs stay compressed, held by the cone bolts.'],
    ],
    etiquettes: [
      [0.6, 3.2, '3506870', 'Chuck housing', -80, -60],
      [3.8, 11, 'UM-021-01-01@top', '8 jaws', 90, -50],
      [11.3, 18, '2920390', 'Cone (bowl)', -110, -70],
      [18.3, 26, '5200517@top', '18 springs', -90, -50],
      [26.3, 33, '3506909@bord', 'Hydraulic cylinder', -90, -50],
      [26.3, 33, '3506908@bord', 'Piston', 70, -60],
      [33.3, 39, '3506870', 'Chuck housing', -80, -60],
      [39.8, 46, '5200517@top', '18 springs, compressed', -80, -50],
    ],
    huile: 'Oil',
    manettes: ['Levers', 'open', 'closed'],
    ralenti: 'Slow motion',
    cadenas: 'The lock cuts off the hydraulics, not the energy in the springs.',
  },
}[LANG];

// position des pièces et avancement des manettes : proj de la capture, toutes tranches confondues
const PROJ = {}, PDIR = path.resolve(arg('proj', IMG));   // --proj : dossier d'un relevé --proj-only, si le découpage a changé après la capture
for (const f of fs.readdirSync(PDIR).filter(f => /^proj_\d+\.json$/.test(f))) Object.assign(PROJ, JSON.parse(fs.readFileSync(path.join(PDIR, f), 'utf8')));
const LEV = []; for (let k = 0; k < F.N; k++) for (const e of F.events(k)) if (e[0] === 'lever') LEV.push([k / F.FPS, e[1]]);
const leverAt = t => { let d = 1; for (const [a, v] of LEV) if (t >= a) d = v; return d; };
const leverT = t => { let a0 = -1; for (const [a] of LEV) if (t >= a) a0 = a; return a0; };   // instant du dernier basculement

// --- page des calques ---
const polices = path.resolve(arg('polices', ''));
const FONTS = (fs.readFileSync(polices, 'utf8').match(/@font-face\s*{[^}]*}/g) || []).join('\n')
  .replace(/url\(\.\.\/assets\/fonts\//g, `url(${pathToFileURL(path.join(path.dirname(polices), '..', 'assets', 'fonts')).href}/`);
if (!FONTS) throw new Error(`${polices} : aucune @font-face`);
const html = `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><style>
${FONTS}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:transparent;font-family:"IBM Plex Sans",sans-serif;color:#fff}
.titre{position:absolute;left:40px;top:34px;transition:none}
.titre .k{display:inline-block;font-size:14px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#111518;background:#f2c230;padding:5px 10px 4px;border-radius:4px}
.titre .t{margin-top:8px;font-family:"Barlow Condensed",sans-serif;font-size:42px;font-weight:600;line-height:1.02;color:#fff;
  text-shadow:0 2px 0 rgba(0,0,0,.25),0 0 18px rgba(17,21,24,.55);max-width:620px}
.titre .t span{background:rgba(17,21,24,.78);box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 12px;border-radius:4px}
.etat{position:absolute;right:40px;top:34px;display:flex;align-items:center;gap:10px;background:rgba(17,21,24,.82);border-radius:6px;padding:8px 14px;
  font-size:15px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.etat b{display:inline-block;padding:3px 9px;border-radius:4px;font-weight:700}
.etat b.ouv{background:#e5372b;color:#fff} .etat b.fer{background:#2e8a44;color:#fff}
.lent{position:absolute;right:40px;top:84px;font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;background:#fff;color:#111518;padding:5px 10px;border-radius:4px}
.leg{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);max-width:1000px;text-align:center;text-wrap:balance;
  background:rgba(17,21,24,.86);border-left:5px solid #f2c230;padding:12px 22px;border-radius:4px;font-size:24px;font-weight:500;line-height:1.3}
.p{position:absolute;left:0;top:0}
.p .dot{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#f2c230;box-shadow:0 0 0 3px rgba(17,21,24,.75)}
.p svg{position:absolute;left:0;top:0;overflow:visible}
.p .nom{position:absolute;white-space:nowrap;background:#111518;color:#fff;border:2px solid #f2c230;border-radius:4px;padding:5px 11px;
  font-family:"Barlow Condensed",sans-serif;font-size:25px;font-weight:600;letter-spacing:.02em}
.etat{font-size:19px;padding:10px 16px} .etat b{font-size:19px}
.etat.flash{box-shadow:0 0 0 4px #f2c230}
.fl{position:absolute;left:0;top:0;overflow:visible}
.fn{position:absolute;white-space:nowrap;transform:translate(-50%,-50%);background:#111518;color:#fff;border:2px solid #f2c230;border-radius:4px;
  padding:3px 9px;font-family:"Barlow Condensed",sans-serif;font-size:22px;font-weight:600}
.fn.huile{border-color:#ff9d2e}
.cad{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);display:flex;align-items:center;gap:20px;background:rgba(17,21,24,.9);
  border:3px solid #f2c230;border-radius:8px;padding:18px 28px;max-width:860px}
.cad svg{flex:none}
.cad div{font-family:"Barlow Condensed",sans-serif;font-size:38px;font-weight:600;line-height:1.08;text-wrap:balance}
</style></head><body><div id="r"></div></body></html>`;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const nb = s => LANG === 'fr' ? s.replace(/ ([?!;:])/g, ' $1') : s;
const fade = (t, a, b, d = .35) => Math.max(0, Math.min(1, (t - a) / d, (b - t) / d));
const CADENAS = `<svg width="54" height="64" viewBox="0 0 54 64"><path d="M14 28V18a13 13 0 0 1 26 0v10" fill="none" stroke="#f2c230" stroke-width="6"/>
<rect x="5" y="27" width="44" height="34" rx="5" fill="#f2c230"/><circle cx="27" cy="41" r="5" fill="#111518"/><rect x="24.5" y="42" width="5" height="11" rx="2" fill="#111518"/></svg>`;
// flèche épaisse (SVG) de (x, y) dans la direction (ux, uy), longueur L ; couleur c
const fleche = (x, y, ux, uy, L, c, o) => {
  const ex = x + ux * L, ey = y + uy * L, px = -uy, py = ux, hw = 15, hl = 22, sw = 9;
  const bx = ex - ux * hl, by = ey - uy * hl;
  const pts = [[x + px * sw / 2, y + py * sw / 2], [bx + px * sw / 2, by + py * sw / 2], [bx + px * hw, by + py * hw], [ex, ey], [bx - px * hw, by - py * hw], [bx - px * sw / 2, by - py * sw / 2], [x - px * sw / 2, y - py * sw / 2]];
  return `<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${c}" stroke="#111518" stroke-width="3" stroke-linejoin="round" opacity="${o}"/>`;
};
const seg = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
function calque(k) {
  const t = k / F.FPS, out = [], fr = F.at(k), P = PROJ[k] || {};
  for (const [a, b, kk, ti] of TX.plans) { const o = fade(t, a, b); if (o > 0) out.push(`<div class="titre" style="opacity:${o}"><div class="k">${esc(nb(kk))}</div><div class="t"><span>${esc(nb(ti))}</span></div></div>`); }
  const nom = F.plan(k)[2];
  // état des manettes (éclair au basculement) et ralenti
  if (t >= 3.5 && t < 39) {
    const d = leverAt(t), o = fade(t, 3.5, 39), te = leverT(t), fl = te >= 0 && t < te + 1.2 && Math.floor((t - te) * 4) % 2 === 0;
    out.push(`<div class="etat${fl ? ' flash' : ''}" style="opacity:${o}">${TX.manettes[0]} <b class="${d ? 'fer' : 'ouv'}">${TX.manettes[d ? 2 : 1]}</b></div>`);
    if (fr.dt < 1 / F.FPS - 1e-9) { const f = +(1 / (fr.dt * F.FPS)).toFixed(1); out.push(`<div class="lent" style="top:94px;opacity:${o}">${TX.ralenti} ×${LANG === 'fr' ? String(f).replace('.', ',') : f}</div>`); }
  }
  // ce qui bouge, selon l'état des manettes
  for (const [a, b, ouv, fer] of TX.etat) { const o = fade(t, a, b); if (o > 0) out.push(`<div class="leg" style="opacity:${o}">${esc(nb(leverAt(t) ? fer : ouv))}</div>`); }
  // flèches pendant la course des pièces (puis 1 s encore), dans le sens réel du mouvement à l'écran
  const te = leverT(t), course = 1.8 * F.SLOW, u = t - te;
  const w = te < 0 ? 0 : Math.min(seg(u, .38 * course - .2, .38 * course), 1 - seg(u, course + 1, course + 1.4));
  const ouv = leverAt(t) === 0, pulse = (t * 2.2) % 1, svg = [], noms = [];
  const pt = key => { const v = P[key]; return v && v[2] <= 1 ? [v[0] * W, v[1] * H] : null; };
  // flèche le long de l'axe, posée en key ; sens à l'écran donné par deux points d'une même pièce (centre → centre décalé vers l'avant) :
  // vers l'arrière à l'ouverture, vers l'avant à la fermeture
  const axial = (key, dA, dB, col, L, off = 0) => {
    const p = pt(key), a = pt(dA), b = pt(dB); if (!p || !a || !b || w <= 0) return;
    let [ux, uy] = unit(a, b); if (ouv) { ux = -ux; uy = -uy; }
    const x0 = p[0] - ux * L / 2 + ux * 12 * pulse + -uy * off, y0 = p[1] - uy * L / 2 + uy * 12 * pulse + ux * off;
    svg.push(fleche(x0, y0, ux, uy, L, col, w)); };
  const radial = (cKey, key) => {   // mâchoire : s'écarte de l'axe à l'ouverture, s'en rapproche à la fermeture
    const c = pt(cKey), p = pt(key); if (!c || !p || w <= 0) return;
    let [ux, uy] = unit(c, p); const d = ouv ? 1 : -1, x = p[0] + ux * 30, y = p[1] + uy * 30;
    svg.push(fleche(x - d * ux * 26 + d * ux * 8 * pulse, y - d * uy * 26 + d * uy * 8 * pulse, d * ux, d * uy, 52, '#ffffff', w)); };
  if (nom === 'machoires') { radial('UM-021-01-01', 'UM-021-01-01@top'); radial('UM-021-01-01', 'UM-021-01-01@bas'); }
  if (nom === 'cone') { axial('2920390', '2920390', '2920390@ax', '#f2c230', 90, 0); radial('UM-021-01-01', 'UM-021-01-01@top'); }
  if (nom === 'ressorts') { axial('2920390', '2920390', '2920390@ax', '#f2c230', 90, 0); axial('5200517@top', '2920390', '2920390@ax', '#4fd06a', 80, -40); }
  if (nom === 'piston') {
    axial('3506908@bord', '3506908', '3506908@ax', '#f2c230', 80, 0); axial('2920390@bord', '3506908', '3506908@ax', '#f2c230', 80, 0);
    const c = pt('3506909@bord'), wo = te < 0 ? 0 : Math.min(seg(u, .1 * course, .2 * course), 1 - seg(u, .5 * course + .6, .5 * course + 1));
    if (c && wo > 0) { svg.push(fleche(c[0], ouv ? c[1] - 96 + 10 * pulse : c[1] - 22 - 10 * pulse, 0, ouv ? 1 : -1, 64, '#ff9d2e', wo)); noms.push([c[0], c[1] - 118, TX.huile, 'huile', wo]); }
  }
  if (svg.length) out.push(`<svg class="fl" width="${W}" height="${H}">${svg.join('')}</svg>`);
  for (const [x, y, n, c, o] of noms) out.push(`<div class="fn ${c}" style="left:${x}px;top:${y}px;opacity:${o}">${esc(nb(n))}</div>`);
  for (const [a, b, s] of TX.legendes) { const o = fade(t, a, b); if (o > 0) out.push(`<div class="leg" style="opacity:${o}">${esc(nb(s))}</div>`); }
  for (const [a, b, key, nm, dx, dy] of TX.etiquettes) {
    const o = fade(t, a, b), v = P[key]; if (!(o > 0) || !v || v[2] > 1) continue;
    const x = v[0] * W, y = v[1] * H, lx = x + dx, ly = y + dy, cote = dx < 0 ? -1 : 1;
    out.push(`<div class="p" style="opacity:${o}"><svg width="1" height="1"><line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" stroke="#f2c230" stroke-width="2.5"/></svg>` +
      `<div class="dot" style="left:${x}px;top:${y}px"></div><div class="nom" data-c="${cote}" style="left:${lx}px;top:${ly}px">${esc(nb(nm))}</div></div>`);
  }
  { const o = fade(t, 42.2, 46); if (o > 0) out.push(`<div class="cad" style="opacity:${o}">${CADENAS}<div>${esc(nb(TX.cadenas))}</div></div>`); }
  return out.join('');
}

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
const OV = path.join(path.dirname(OUT), `calques_${LANG}`); fs.mkdirSync(OV, { recursive: true });
fs.writeFileSync(path.join(OV, 'calque.html'), html);   // page en file:// : les polices locales se chargent
await page.goto(pathToFileURL(path.join(OV, 'calque.html')).href, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
const ATK = arg('at', '') ? arg('at', '').split(',').map(Number) : null;
for (const k of ATK || [...Array(F.N).keys()]) {
  await page.evaluate(h => {
    const r = document.getElementById('r'); r.innerHTML = h;
    // nom de pièce : à gauche du trait vers la gauche, centré verticalement sur le bout du trait, gardé dans l'image
    for (const n of r.querySelectorAll('.nom')) { const w = n.offsetWidth, hh = n.offsetHeight, c = +n.dataset.c;
      let l = parseFloat(n.style.left) - (c < 0 ? w : 0), tp = parseFloat(n.style.top) - hh / 2;
      n.style.left = Math.max(12, Math.min(innerWidth - w - 12, l)) + 'px'; n.style.top = Math.max(150, Math.min(innerHeight - hh - 110, tp)) + 'px'; }
  }, calque(k));
  await page.screenshot({ path: path.join(OV, `o_${String(k).padStart(5, '0')}.png`), omitBackground: true });
  if (k % 120 === 0) console.log(`calque ${k}/${F.N}`);
}
await browser.close();
const FF = process.env.FFMPEG || 'ffmpeg';
if (ATK) {   // aperçus : image + calque → apercu_<k>.jpg
  for (const k of ATK) { const n = String(k).padStart(5, '0');
    execFileSync(FF, ['-loglevel', 'error', '-y', '-i', path.join(IMG, `f_${n}.jpg`), '-i', path.join(OV, `o_${n}.png`), '-filter_complex', '[0]scale=1920:1080[a];[a][1]overlay', '-q:v', '3', path.join(path.dirname(OUT), `apercu_${LANG}_${n}.jpg`)]); }
} else {
  execFileSync(FF, ['-loglevel', 'error', '-y', '-framerate', String(F.FPS), '-i', path.join(IMG, 'f_%05d.jpg'), '-framerate', String(F.FPS), '-i', path.join(OV, 'o_%05d.png'),
    '-filter_complex', '[0]scale=1920:1080:flags=lanczos[a];[a][1]overlay,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  console.log(`${OUT} : ${(fs.statSync(OUT).size / 1e6).toFixed(1)} Mo`);
}
