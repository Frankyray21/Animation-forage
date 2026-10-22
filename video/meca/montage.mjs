#!/usr/bin/env node
// Montage du film « mécanisme des mâchoires » (45 s) : textes à l'écran posés sur les images de capture.mjs --film video/meca/film.mjs.
// Un calque transparent par image (Playwright) : titre du plan, état des manettes, légende du bas, noms des pièces accrochés à leur
// position à l'écran (proj_*.json de la capture), repère « Ralenti » ; puis ffmpeg : images + calques → MP4 1920 × 1080, sans son.
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
// plans : [début, fin, surtitre, titre] ; légendes : [début, fin, texte] ; pièces : [début, fin, clé de proj, nom, côté (1 droite, −1 gauche)]
const TX = {
  fr: {
    plans: [
      [0.3, 7, 'Mandrin Boyles H', 'Comment les mâchoires serrent la tige'],
      [7, 17, '1 · Manettes ouvertes', 'L\'huile pousse le piston'],
      [17, 27, '2 · Manettes fermées', 'Les ressorts poussent le cône'],
      [27, 37, '3 · Le mécanisme seul', 'Chaque pièce, une à la fois'],
      [37, 40.2, '4 · Vue éclatée', 'Toutes les pièces du mandrin'],
      [40.2, 46, 'À retenir', 'L\'énergie qui reste : les ressorts'],
    ],
    legendes: [
      [5.3, 7, 'Vue en coupe : on ouvre le mandrin en deux pour voir dedans.'],
      [7.3, 10.2, 'L\'huile sous pression entre dans le cylindre.'],
      [10.2, 13.6, 'Le piston recule le cône : les ressorts sont écrasés au maximum.'],
      [13.6, 17, 'Le cône recule : les mâchoires s\'ouvrent.'],
      [17.3, 20.2, 'La pression tombe : l\'huile ne retient plus les ressorts.'],
      [20.2, 23.8, 'Les ressorts poussent le cône vers l\'avant.'],
      [23.8, 27, 'Le cône fait coin : il serre les mâchoires sur la tige.'],
      [27.3, 29.5, 'Le boîtier est rendu transparent : il reste le mécanisme.'],
      [29.5, 33, 'Manettes ouvertes : les ressorts se compriment.'],
      [33, 37, 'Manettes fermées : les ressorts repoussent le cône.'],
      [37.3, 40.2, 'Ce sont les boulons du cône qui retiennent la force des ressorts.'],
      [40.6, 43.2, 'Manettes fermées, il reste le moins d\'énergie possible. Mais les ressorts restent comprimés, retenus par les boulons du cône.'],
    ],
    pieces: [
      [1.2, 4.8, '3506870', 'Boîtier du mandrin', -1],
      [1.2, 4.8, 'UM-021-01-01', 'Mâchoires', 1],
      [7.3, 11, '3506909@bord', 'Cylindre hydraulique', -1],
      [7.3, 11, '3506908@bord', 'Piston', 1],
      [10.4, 14, '5200517@top', '18 ressorts', 1],
      [10.4, 14, '2920390@bord', 'Cône (bol)', 1],
      [13.8, 17, 'UM-021-01-01@top', 'Mâchoires', 1],
      [17.3, 27, '5200517@top', '18 ressorts', -1],
      [20.4, 27, '2920390@bord', 'Cône (bol)', 1],
      [23.8, 27, 'UM-021-01-01@top', 'Mâchoires', 1],
      [27.3, 29.5, '3506908@bord', 'Piston : reçoit la pression d\'huile', 1],
      [29.5, 32, '5200517@top', '18 ressorts : poussent le cône', 1],
      [32, 34.5, '2920390@bord', 'Cône (bol) : fait coin sur les mâchoires', 1],
      [34.5, 37, 'UM-021-01-01@top', 'Mâchoires : serrent la tige', 1],
      [41.8, 46, '5200517@top', '18 ressorts comprimés', -1],
    ],
    manettes: ['Manettes', 'ouvertes', 'fermées'],
    ralenti: 'Ralenti',
    cadenas: 'Le cadenas coupe l\'hydraulique, pas l\'énergie des ressorts.',
  },
  en: {
    plans: [
      [0.3, 7, 'Boyles H chuck', 'How the jaws grip the rod'],
      [7, 17, '1 · Levers open', 'Oil pushes the piston'],
      [17, 27, '2 · Levers closed', 'The springs push the cone'],
      [27, 37, '3 · The mechanism alone', 'One part at a time'],
      [37, 40.2, '4 · Exploded view', 'Every part of the chuck'],
      [40.2, 46, 'Remember', 'The energy that stays: the springs'],
    ],
    legendes: [
      [5.3, 7, 'Cutaway view: the chuck is opened in half to see inside.'],
      [7.3, 10.2, 'Pressurized oil flows into the cylinder.'],
      [10.2, 13.6, 'The piston pulls the cone back: the springs are fully compressed.'],
      [13.6, 17, 'The cone moves back: the jaws open.'],
      [17.3, 20.2, 'Pressure drops: the oil no longer holds the springs back.'],
      [20.2, 23.8, 'The springs push the cone forward.'],
      [23.8, 27, 'The cone acts as a wedge: it clamps the jaws onto the rod.'],
      [27.3, 29.5, 'The housing is made see-through: only the mechanism remains.'],
      [29.5, 33, 'Levers open: the springs compress.'],
      [33, 37, 'Levers closed: the springs push the cone back out.'],
      [37.3, 40.2, 'The cone bolts are what hold back the force of the springs.'],
      [40.6, 43.2, 'Levers closed leaves the least energy possible. But the springs stay compressed, held by the cone bolts.'],
    ],
    pieces: [
      [1.2, 4.8, '3506870', 'Chuck housing', -1],
      [1.2, 4.8, 'UM-021-01-01', 'Jaws', 1],
      [7.3, 11, '3506909@bord', 'Hydraulic cylinder', -1],
      [7.3, 11, '3506908@bord', 'Piston', 1],
      [10.4, 14, '5200517@top', '18 springs', 1],
      [10.4, 14, '2920390@bord', 'Cone (bowl)', 1],
      [13.8, 17, 'UM-021-01-01@top', 'Jaws', 1],
      [17.3, 27, '5200517@top', '18 springs', -1],
      [20.4, 27, '2920390@bord', 'Cone (bowl)', 1],
      [23.8, 27, 'UM-021-01-01@top', 'Jaws', 1],
      [27.3, 29.5, '3506908@bord', 'Piston: takes the oil pressure', 1],
      [29.5, 32, '5200517@top', '18 springs: push the cone', 1],
      [32, 34.5, '2920390@bord', 'Cone (bowl): wedges the jaws', 1],
      [34.5, 37, 'UM-021-01-01@top', 'Jaws: grip the rod', 1],
      [41.8, 46, '5200517@top', '18 springs, compressed', -1],
    ],
    manettes: ['Levers', 'open', 'closed'],
    ralenti: 'Slow motion',
    cadenas: 'The lock cuts off the hydraulics, not the energy in the springs.',
  },
}[LANG];

// position des pièces : proj de la capture, toutes tranches confondues
const PROJ = {}, PDIR = path.resolve(arg('proj', IMG));   // --proj : dossier d'un relevé --proj-only, si le découpage a changé après la capture
for (const f of fs.readdirSync(PDIR).filter(f => /^proj_\d+\.json$/.test(f))) Object.assign(PROJ, JSON.parse(fs.readFileSync(path.join(PDIR, f), 'utf8')));
// état des manettes (événements du film) et ralenti
const LEV = []; for (let k = 0; k < F.N; k++) for (const e of F.events(k)) if (e[0] === 'lever') LEV.push([k / F.FPS, e[1]]);
const leverAt = t => { let d = 1; for (const [a, v] of LEV) if (t >= a) d = v; return d; };

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
function calque(k) {
  const t = k / F.FPS, out = [], fr = F.at(k);
  for (const [a, b, kk, ti] of TX.plans) { const o = fade(t, a, b); if (o > 0) out.push(`<div class="titre" style="opacity:${o}"><div class="k">${esc(nb(kk))}</div><div class="t"><span>${esc(nb(ti))}</span></div></div>`); }
  if (t >= 7 && t < 37) {
    const d = leverAt(t), o = fade(t, 7, 37);
    out.push(`<div class="etat" style="opacity:${o}">${TX.manettes[0]} <b class="${d ? 'fer' : 'ouv'}">${TX.manettes[d ? 2 : 1]}</b></div>`);
    if (fr.dt < 1 / F.FPS - 1e-9) out.push(`<div class="lent" style="opacity:${o}">${TX.ralenti} ×${Math.round(1 / (fr.dt * F.FPS))}</div>`);
  }
  for (const [a, b, s] of TX.legendes) { const o = fade(t, a, b); if (o > 0) out.push(`<div class="leg" style="opacity:${o}">${esc(nb(s))}</div>`); }
  const P = PROJ[k] || {};
  for (const [a, b, key, nom, cote] of TX.pieces) {
    const o = fade(t, a, b), v = P[key]; if (!(o > 0) || !v || v[2] > 1) continue;
    const x = v[0] * W, y = v[1] * H, dx = 70 * cote, dy = -58, lx = x + dx, ly = y + dy;
    out.push(`<div class="p" style="opacity:${o}"><svg width="1" height="1"><line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" stroke="#f2c230" stroke-width="2.5"/></svg>` +
      `<div class="dot" style="left:${x}px;top:${y}px"></div><div class="nom" data-c="${cote}" style="left:${lx}px;top:${ly}px">${esc(nb(nom))}</div></div>`);
  }
  { const o = fade(t, 43.2, 46); if (o > 0) out.push(`<div class="cad" style="opacity:${o}">${CADENAS}<div>${esc(nb(TX.cadenas))}</div></div>`); }
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
