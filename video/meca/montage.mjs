#!/usr/bin/env node
// Montage du film « mécanisme des mâchoires » (30 s) : textes à l'écran posés sur les images de capture.mjs --film video/meca/film.mjs.
// Un calque transparent par image (Playwright) : titre du plan, état des manettes, légende du bas, noms des pièces accrochés à leur
// position à l'écran (proj_*.json de la capture), repère « Ralenti », flèches de mouvement des pièces et chaîne des étapes
// (huile, piston, cône, ressorts, mâchoires) réglées sur l'avancement réel des manettes ; puis ffmpeg : images + calques → MP4 1920 × 1080, sans son.
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
// plans : [début, fin, surtitre, titre] ; legendes : [début, fin, texte] ; etiquettes : [début, fin, clé de proj, nom, dx, dy]
// chaine : étapes du mouvement, allumées une à une selon l'avancement des manettes (q : 0 → 1) ; fleches : noms des flèches
const TX = {
  fr: {
    plans: [
      [0.3, 3.6, 'Mandrin Boyles H', 'Comment les mâchoires serrent la tige'],
      [3.6, 13.5, '1 · Manettes ouvertes', 'Les mâchoires s\'ouvrent'],
      [13.5, 23, '2 · Manettes fermées', 'Les mâchoires serrent'],
      [23, 31, 'À retenir', 'L\'énergie qui reste : les ressorts'],
    ],
    legendes: [
      [2.4, 3.6, 'Vue en coupe : le mandrin ouvert en deux.'],
      [23.4, 26.6, 'Manettes fermées : il reste le moins d\'énergie possible. Mais les ressorts restent comprimés, retenus par les boulons du cône.'],
    ],
    etiquettes: [
      [0.6, 2.2, '3506870', 'Boîtier du mandrin', -80, -60],
      [0.6, 2.2, 'UM-021-01-01', 'Mâchoires', 80, -60],
      [23.8, 31, '5200517@top', '18 ressorts comprimés', -80, -50],
    ],
    ouvrir: ['Manette ouverte', 'L\'huile entre', 'Piston et cône reculent', 'Ressorts écrasés · mâchoires ouvertes'],
    fermer: ['Manette fermée', 'La pression tombe', 'Les ressorts poussent le cône', 'Mâchoires serrées sur la tige'],
    noms: { huile: 'Huile', piston: 'Piston', ressorts: 'Ressorts', cone: 'Cône', machoires: 'Mâchoires' },
    manettes: ['Manettes', 'ouvertes', 'fermées'],
    ralenti: 'Ralenti',
    cadenas: 'Le cadenas coupe l\'hydraulique, pas l\'énergie des ressorts.',
  },
  en: {
    plans: [
      [0.3, 3.6, 'Boyles H chuck', 'How the jaws grip the rod'],
      [3.6, 13.5, '1 · Levers open', 'The jaws open'],
      [13.5, 23, '2 · Levers closed', 'The jaws clamp'],
      [23, 31, 'Remember', 'The energy that stays: the springs'],
    ],
    legendes: [
      [2.4, 3.6, 'Cutaway view: the chuck opened in half.'],
      [23.4, 26.6, 'Levers closed leaves the least energy possible. But the springs stay compressed, held by the cone bolts.'],
    ],
    etiquettes: [
      [0.6, 2.2, '3506870', 'Chuck housing', -80, -60],
      [0.6, 2.2, 'UM-021-01-01', 'Jaws', 80, -60],
      [23.8, 31, '5200517@top', '18 springs, compressed', -80, -50],
    ],
    ouvrir: ['Lever open', 'Oil flows in', 'Piston and cone move back', 'Springs compressed · jaws open'],
    fermer: ['Lever closed', 'Pressure drops', 'The springs push the cone', 'Jaws clamped on the rod'],
    noms: { huile: 'Oil', piston: 'Piston', ressorts: 'Springs', cone: 'Cone', machoires: 'Jaws' },
    manettes: ['Levers', 'open', 'closed'],
    ralenti: 'Slow motion',
    cadenas: 'The lock cuts off the hydraulics, not the energy in the springs.',
  },
}[LANG];
const SEUILS = [0, .25, .42, .9];   // avancement des manettes où chaque étape de la chaîne s'allume (voir leverBlend d'animation.html)

// position des pièces et avancement des manettes : proj de la capture, toutes tranches confondues
const PROJ = {}, PDIR = path.resolve(arg('proj', IMG));   // --proj : dossier d'un relevé --proj-only, si le découpage a changé après la capture
for (const f of fs.readdirSync(PDIR).filter(f => /^proj_\d+\.json$/.test(f))) Object.assign(PROJ, JSON.parse(fs.readFileSync(path.join(PDIR, f), 'utf8')));
const leverAt = t => t >= F.T_FER ? 1 : t >= F.T_OUV ? 0 : 1;

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
.chaine{position:absolute;left:40px;right:40px;bottom:30px;display:flex;align-items:stretch;justify-content:center;gap:0}
.chaine .e{flex:0 1 auto;display:flex;align-items:center;background:rgba(17,21,24,.82);color:#9aa5ab;padding:10px 16px;border-radius:5px;
  font-family:"Barlow Condensed",sans-serif;font-size:25px;font-weight:600;line-height:1.05;text-align:center;max-width:270px;border:2px solid transparent}
.chaine .e.on{background:#f2c230;color:#111518}
.chaine .e.now{border-color:#fff;box-shadow:0 0 18px rgba(242,194,48,.8)}
.chaine .s{display:flex;align-items:center;padding:0 7px;color:#f2c230;font-size:26px;font-weight:700;text-shadow:0 0 6px rgba(17,21,24,.9)}
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
function calque(k) {
  const t = k / F.FPS, out = [], fr = F.at(k), P = PROJ[k] || {};
  for (const [a, b, kk, ti] of TX.plans) { const o = fade(t, a, b); if (o > 0) out.push(`<div class="titre" style="opacity:${o}"><div class="k">${esc(nb(kk))}</div><div class="t"><span>${esc(nb(ti))}</span></div></div>`); }
  // état des manettes, éclair au basculement ; ralenti
  if (t >= 3.6 && t < 23) {
    const d = leverAt(t), o = fade(t, 3.6, 23), te = d ? F.T_FER : F.T_OUV, fl = t >= te && t < te + 1.2 && Math.floor((t - te) * 4) % 2 === 0;
    out.push(`<div class="etat${fl ? ' flash' : ''}" style="opacity:${o}">${TX.manettes[0]} <b class="${d ? 'fer' : 'ouv'}">${TX.manettes[d ? 2 : 1]}</b></div>`);
    if (fr.dt < 1 / F.FPS - 1e-9) out.push(`<div class="lent" style="top:94px;opacity:${o}">${TX.ralenti} ×${Math.round(1 / (fr.dt * F.FPS))}</div>`);
  }
  // mouvement : chaîne des étapes et flèches sur les pièces, d'après l'avancement réel des manettes
  if (t >= 3.6 && t < 23) {
    const ouv = t < F.T_FER, avant = t < (ouv ? F.T_OUV : F.T_FER), q = avant ? -1 : (P.lm ? P.lm[0] : 1), o = fade(t, 3.6, 23);
    const E = ouv ? TX.ouvrir : TX.fermer, cur = SEUILS.reduce((n, s, i) => q >= s ? i : n, -1);
    out.push(`<div class="chaine" style="opacity:${o}">` + E.map((e, i) => `${i ? '<div class="s">▶</div>' : ''}<div class="e${i <= cur ? ' on' : ''}${i === cur && q < 1 ? ' now' : ''}">${esc(nb(e))}</div>`).join('') + '</div>');
    const pt = key => { const v = P[key]; return v && v[2] <= 1 ? [v[0] * W, v[1] * H] : null; };
        const pulse = (t * 2.2) % 1, svg = [], noms = [];
    // flèche pendant son mouvement (fraction a..b de la course des manettes), puis 1 s encore, puis s'efface
    const te = ouv ? F.T_OUV : F.T_FER, course = 1.8 * F.SLOW;   // LEVER_T d'animation.html × ralenti
    const showAr = (a, b) => { const u = t - te; return avant ? 0 : Math.min(seg(u, a * course - .2, a * course), 1 - seg(u, b * course + 1, b * course + 1.4)); };
    // huile : entre dans la chambre (ouverture) ou en sort (fermeture), au bord du cylindre
    { const p = pt('3506909@bord'), w = showAr(.15, .45); if (p && w > 0) { const y0 = p[1] - 92, dir = ouv ? 1 : -1;
      svg.push(fleche(p[0], ouv ? y0 + 10 * pulse : p[1] - 18 - 10 * pulse, 0, dir, 64, '#ff9d2e', w)); noms.push([p[0], y0 - 22, TX.noms.huile, 'huile', w]); } }
    // piston et cône : vers la tête (gauche) à l'ouverture, vers l'avant (droite) à la fermeture
    const hx = ouv ? -1 : 1, wh = showAr(.38, 1), wn = 1;   // noms des pièces : toute la durée du plan
    for (const [key, nom, dy] of [['3506908@bord', TX.noms.piston, 0], ['2920390@bord', TX.noms.cone, 0]]) {
      const p = pt(key); if (!p) continue;
      const x0 = p[0] - hx * 40 + hx * 14 * pulse; if (wh > 0) svg.push(fleche(x0, p[1] + dy, hx, 0, 80, '#f2c230', wh)); noms.push([p[0], p[1] + 34, nom, '', wn]); }
    // ressorts : écrasés (deux flèches qui se rejoignent) ou qui poussent (flèche vers l'avant)
    { const p = pt('5200517@top'); if (p) {
      if (wh <= 0) {} else if (ouv) { svg.push(fleche(p[0] + 95 - 10 * pulse, p[1] - 34, -1, 0, 60, '#4fd06a', wh), fleche(p[0] - 95 + 10 * pulse, p[1] - 34, 1, 0, 60, '#4fd06a', wh)); }
      else svg.push(fleche(p[0] - 50 + 14 * pulse, p[1] - 34, 1, 0, 90, '#4fd06a', wh));
      noms.push([p[0], p[1] - 70, TX.noms.ressorts, '', wn]); } }
    // mâchoires : s'écartent de l'axe (ouverture) ou s'en rapprochent (fermeture), en haut et en bas
    for (const [key, sg] of [['UM-021-01-01@top', -1], ['UM-021-01-01@bas', 1]]) {
      const p = pt(key); if (!p) continue;
      const d = ouv ? sg : -sg, x = p[0] + 58;
      if (wh > 0) svg.push(fleche(x, p[1] - d * 26 + d * 8 * pulse, 0, d, 52, '#ffffff', wh));
      if (sg < 0) noms.push([x + 70, p[1], TX.noms.machoires, '', wn]); }
    if (svg.length) out.push(`<svg class="fl" width="${W}" height="${H}">${svg.join('')}</svg>`);
    for (const [x, y, n, c, w] of noms) out.push(`<div class="fn ${c}" style="left:${x}px;top:${y}px;opacity:${w}">${esc(nb(n))}</div>`);
  }
  for (const [a, b, s] of TX.legendes) { const o = fade(t, a, b); if (o > 0) out.push(`<div class="leg" style="opacity:${o}">${esc(nb(s))}</div>`); }
  for (const [a, b, key, nom, dx, dy] of TX.etiquettes) {
    const o = fade(t, a, b), v = P[key]; if (!(o > 0) || !v || v[2] > 1) continue;
    const x = v[0] * W, y = v[1] * H, lx = x + dx, ly = y + dy, cote = dx < 0 ? -1 : 1;
    out.push(`<div class="p" style="opacity:${o}"><svg width="1" height="1"><line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" stroke="#f2c230" stroke-width="2.5"/></svg>` +
      `<div class="dot" style="left:${x}px;top:${y}px"></div><div class="nom" data-c="${cote}" style="left:${lx}px;top:${ly}px">${esc(nb(nom))}</div></div>`);
  }
  { const o = fade(t, 26.6, 31); if (o > 0) out.push(`<div class="cad" style="opacity:${o}">${CADENAS}<div>${esc(nb(TX.cadenas))}</div></div>`); }
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
