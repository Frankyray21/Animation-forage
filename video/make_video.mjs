// Vidéos de formation PRO-OP-DD-005 :
//   --scen A (défaut) « Procédure respectée », étapes 1 à 9 → video/procedure_boyles_h.mp4
//   --scen D « Reconstitution de l'accident » (boulons retirés un par un)  → video/accident_boyles_h.mp4
// 1) capture (capture.mjs) : relevé des plans (--scan), images gardées en tranches parallèles (plans de transport des pièces
//    à la table coupés), ralentis (--slow), gros plans tournants des pièces retirées (--inserts), fenêtre « ressorts en coupe » (--inset) ;
// 2) bandeaux (étape + consigne de la procédure, texte exact de l'encadré de l'animation), encadrés « Pourquoi », compteur de tours,
//    repère « Ralenti » et cartons rendus en PNG par chromium ;
// 3) composition image par image (compose.py : 3D réduite + bandeau en dessous + incrustations, fondus vers et depuis les gros plans) ;
// 4) montage et encodage H.264 par ffmpeg (rendus Blender en Ken Burns, fondus enchaînés) ; voix off (narration/<scén.>/manifeste.json,
//    produite par tts.py) placée sur chaque étape, l'étape étant prolongée si la voix est plus longue que l'image.
//
// Usage : node video/make_video.mjs [--scen A|D] [--frames DIR] [--jobs 3] [--gpu] [--skip-capture] [--crf 27] [--out FICHIER] [--bands-only]
// --gpu : capture avec la carte graphique de l'ordinateur (fenêtre chromium visible) ; quelques minutes au lieu de plusieurs heures
// Variables : FFMPEG (défaut : ffmpeg), PYTHON (défaut : python3, avec Pillow), PLAYWRIGHT, CHROME, THREE_DIR, CDN_CACHE (voir capture.mjs).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const SCEN = arg('scen', 'A');
// réglages par scénario : ralentis (temps de l'animation), étapes avec la fenêtre « ressorts en coupe », parties séparées par les rendus Blender
const CONF = {
  A: { out: 'procedure_boyles_h.mp4', poster: 'procedure_poster.jpg', slow: '60.8-64.52:2', inset: ['7'], inserts: true, ref: 'Procédure', accent: '#f2c230' },
  D: { out: 'accident_boyles_h.mp4', poster: 'accident_poster.jpg', slow: '', inset: ['7', '!'], inserts: false, ref: 'Reconstitution', accent: '#e5372b' },
}[SCEN];
const FRAMES = path.resolve(arg('frames', path.join(os.tmpdir(), `clam-video-frames-${SCEN}`)));
const INSETS = path.join(FRAMES, 'inset');
const OUT = path.resolve(arg('out', path.join(ROOT, 'video', CONF.out)));
const POSTER = path.join(path.dirname(OUT), CONF.poster);
const JOBS = +arg('jobs', 3), CRF = +arg('crf', 27), FFMPEG = process.env.FFMPEG || 'ffmpeg', PYTHON = process.env.PYTHON || 'python3';
const FPS = 24, W = 1280, H = 720, BAND = 100, H3 = H - BAND, XF = 0.5;   // i/s, taille, bandeau sous la 3D, fondu entre parties (s)
const HOLD_END = Math.round(.6 * FPS), HOLD_PRE = Math.round(.4 * FPS), XFN = 8;   // fin d'étape figée, arrêt avant le gros plan, fondu (images)
const AFTER_KEEP = Math.round(.75 * FPS), AFTER_MIN = 40;   // retour du gros plan : dernières images gardées ; plan plus court : coupé
const IN_W = 400, IN_H = 250, IN_X = W - IN_W - 18, IN_Y = H3 - IN_H - 38;   // fenêtre « ressorts en coupe » (bas droite de la 3D)
const WORK = path.join(FRAMES, 'montage');
const CAP = path.join(ROOT, 'video', 'capture.mjs');
const run = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args.map(String), { stdio: 'inherit' }); p.on('exit', c => c ? rej(new Error(`${cmd} : code ${c}`)) : res()); });
const GPU = process.argv.includes('--gpu') ? ['--gpu'] : [];
const readJ = f => JSON.parse(fs.readFileSync(path.join(FRAMES, f), 'utf8'));
const COMMON = ['--fps', FPS, '--scen', SCEN, '--slow', CONF.slow];

// --- 1) capture ---
if (!process.argv.includes('--skip-capture')) {
  if (!fs.existsSync(path.join(FRAMES, 'scan.json'))) await run('node', [CAP, '--out', FRAMES, ...COMMON, '--scan', ...GPU]);
  // tranches équilibrées sur le nombre d'images gardées
  const keep = readJ('scan.json').map(r => r.keep), tot = keep.filter(Boolean).length, cuts = [0];
  let acc = 0; keep.forEach((v, k) => { acc += v; if (cuts.length < JOBS && acc >= tot * cuts.length / JOBS) cuts.push(k + 1); }); cuts.push(keep.length);
  const t0 = Date.now();
  await Promise.all(cuts.slice(0, -1).map((a, j) => run('node', [CAP, '--out', FRAMES, ...COMMON, '--from', a, '--to', cuts[j + 1], '--skip-existing', ...GPU])));
  if (CONF.inserts) await run('node', [CAP, '--out', FRAMES, ...COMMON, '--inserts', '--skip-existing', ...GPU]);
  if (CONF.inset.length) await run('node', [CAP, '--out', INSETS, ...COMMON, '--w', 640, '--h', 400, '--band', 0, '--ss', 1, '--inset', CONF.inset.join(','), '--keepfrom', path.join(FRAMES, 'scan.json'), '--skip-existing', ...GPU]);
  console.log(`capture : ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
const plan = readJ('plan.json'), scan = readJ('scan.json'), ins = CONF.inserts && fs.existsSync(path.join(FRAMES, 'inserts.json')) ? readJ('inserts.json') : [];
const steps = plan.steps;
const img = k => path.join(FRAMES, `f_${String(k).padStart(5, '0')}.jpg`);
const inImg = k => path.join(INSETS, `in_${String(k).padStart(5, '0')}.jpg`);

// --- narration (texte validé) et voix (si produite par tts.py) ---
const NARR = fs.existsSync(path.join(ROOT, 'video', 'narration.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'video', 'narration.json'), 'utf8')) : {};
const MANF = path.join(ROOT, 'video', 'narration', SCEN, 'manifeste.json');
const VOICE = fs.existsSync(MANF) && !process.argv.includes('--muet') ? JSON.parse(fs.readFileSync(MANF, 'utf8')).items : [];
// passages de la narration attribués aux étapes, dans l'ordre (un même numéro d'étape peut revenir, par exemple « 7 » dans D)
const narrOf = (() => {
  const list = NARR[SCEN] || [], used = new Set(), m = new Map();
  steps.forEach((s, i) => { const j = list.findIndex((x, k) => !used.has(k) && x.n === s.n); if (j >= 0) { used.add(j); m.set(i, { ...list[j], idx: j }); } });
  return i => m.get(i) || null;
})();
const voiceOf = (i, kind) => { const n = narrOf(i); if (!n) return null; return VOICE.find(v => v.id === `${String(n.idx).padStart(2, '0')}_${kind}`) || null; };
const estDur = txt => txt ? Math.max(1.5, txt.split(/\s+/).length / 2.6) : 0;

// --- 2) bandeaux, encadrés et cartons ---
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(WORK, { recursive: true });
const nb = s => s.replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// consigne de chaque étape : texte exact de l'encadré « procédure » de l'animation (le premier qui nomme l'étape), sans reformulation
const consOf = i => { const rows = scan.filter(r => r.step === i && r.cons); return (rows.find(r => new RegExp(`étape ${steps[i].n}(?!\\d)`).test(r.cons)) || { cons: '' }).cons; };
const split = c => { const [m, s = ''] = c.split('<small>'); return { main: m.trim(), small: s.replace('</small>', '').trim() }; };
// gros plans : étiquette de la table de l'animation pour le groupe de pièces retiré
const INS_TXT = { '4': 'Couvert des mâchoires + 3 boulons ¾', '5': 'Couvercle + 9 boulons ½', '6': '3 bushings', '7': '6 boulons ½ × 6 ½', '8': '3 boulons longs ½ × 8', '9': 'Cône et mâchoires' };
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`;
const BASE = `${FONT} *{box-sizing:border-box} html,body{margin:0;background:transparent;overflow:hidden}
body{font-family:"IBM Plex Sans",sans-serif;color:#fff}
.band{position:absolute;inset:0;background:#13181b;display:flex;align-items:center;gap:20px;padding:9px 26px 4px 22px}
.prog{position:absolute;left:0;right:0;top:0;height:5px;display:flex;gap:3px}
.prog i{flex:1;background:#2b343a} .prog i.done{background:#3f9a62} .prog i.cur{background:${CONF.accent}}
.badge{flex:none;min-width:68px;height:68px;padding:0 6px;border-radius:6px;background:${CONF.accent};color:${SCEN === 'D' ? '#fff' : '#111518'};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.badge span{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.badge b{font-family:"Barlow Condensed",sans-serif;font-size:46px;font-weight:700}
.txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.t{font-family:"Barlow Condensed",sans-serif;font-size:31px;font-weight:600;line-height:1.05;white-space:nowrap}
.c{display:flex;align-items:baseline;gap:14px;white-space:nowrap}
.c .m{font-size:19px;font-weight:600;color:${SCEN === 'D' ? '#ff8a80' : '#f2c230'}}
.c .s{font-size:15px;color:#a3afb6}
.chip{align-self:center;font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;background:#2c7a4c;color:#fff;padding:3px 8px;border-radius:3px}
.ref{flex:none;text-align:right;font-size:15px;font-weight:600;letter-spacing:.06em;color:#c9d1d6}
.ref span{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7d8a92;margin-bottom:3px}
.why{position:absolute;left:0;top:0;max-width:560px;padding:12px 16px 13px;border-radius:8px;background:rgba(17,21,24,.9);border-left:5px solid #57c486;box-shadow:0 6px 20px rgba(0,0,0,.3)}
.why b{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#57c486;margin-bottom:5px}
.why p{margin:0;font-size:20px;line-height:1.3;font-weight:500}
.hud{position:absolute;left:0;top:0;padding:10px 14px 12px;border-radius:8px;background:rgba(17,21,24,.9);display:grid;gap:8px}
.hud .h{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#f2c230}
.hud .row{display:flex;gap:7px}
.hud .row i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:700 20px/1 "Barlow Condensed",sans-serif;font-style:normal;background:#2b343a;color:#a3afb6}
.hud .row i.done{background:#2c7a4c;color:#fff} .hud .row i.cur{background:#f2c230;color:#111518;box-shadow:0 0 0 3px rgba(242,194,48,.35)}
.hud .p{font-size:17px;font-weight:600}
.tag{position:absolute;left:0;top:0;padding:6px 12px;border-radius:5px;font-size:15px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.inset{position:absolute;left:0;top:0;width:${IN_W + 8}px;height:${IN_H + 34}px;border-radius:8px;background:rgba(17,21,24,.92);box-shadow:0 8px 24px rgba(0,0,0,.35)}
.inset span{position:absolute;left:10px;bottom:7px;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#57c486}`;
// texte trop long pour sa ligne : réduit (jamais coupé ni abrégé), renvoyé à la ligne en dernier recours
const FIT = `for (const el of document.querySelectorAll('.t,.c')) { const all = [el, ...el.querySelectorAll('*')], f0 = all.map(e => parseFloat(getComputedStyle(e).fontSize)); let k = 1;
  while (el.scrollWidth > el.clientWidth + 1 && k > .62) { k -= .02; all.forEach((e, j) => { e.style.fontSize = f0[j] * k + 'px'; }); }
  if (el.scrollWidth > el.clientWidth + 1) el.style.whiteSpace = 'normal'; }`;
const prog = i => `<div class="prog">${steps.map((s, j) => `<i class="${j < i ? 'done' : j === i ? 'cur' : ''}"></i>`).join('')}</div>`;
function bandHTML({ i, title, main = '', small = '', chip = '', still = false }) {
  const badge = still ? '' : `<div class="badge"><span>${SCEN === 'D' && !/^\d/.test(steps[i].n) ? '' : 'Étape'}</span><b>${esc(steps[i].n)}</b></div>`;
  return `<div class="band">${prog(i)}${badge}<div class="txt"><div class="t">${nb(esc(title))}</div>
    <div class="c">${chip ? `<span class="chip">${chip}</span>` : ''}${main ? `<span class="m">${nb(main)}</span>` : ''}${small ? `<span class="s">${nb(small)}</span>` : ''}</div></div>
    <div class="ref"><span>${still ? 'Rendu Blender' : CONF.ref}</span>PRO-OP-DD-005</div></div>`;
}
// calques : { html, w, h } rendus sur fond transparent, à la taille de leur contenu
const bands = {}, layers = {};
steps.forEach((s, i) => {
  if (SCEN === 'D') {   // reconstitution : ce que fait le travailleur (texte de l'animation), pas une consigne de la procédure
    bands[`s${i}`] = { h: BAND, html: bandHTML({ i, title: s.title, main: s.act && s.act !== s.title ? s.act : '' }) };
  } else {
    const { main, small } = split(consOf(i));
    const same = main.replace(/<[^>]+>/g, '') === s.title;   // consigne identique au titre : seul le détail est ajouté
    bands[`s${i}`] = { h: BAND, html: bandHTML({ i, title: s.title, main: same ? small : main, small: same ? '' : small }) };
  }
  const gp = ins.find(x => x.step === i);
  if (gp) bands[`i${i}`] = { h: BAND, html: bandHTML({ i, title: s.title, chip: 'Pièces retirées', main: INS_TXT[s.n] || '', small: (gp.ids || []).join(' · ') }) };
  const nr = narrOf(i);
  if (nr && nr.pourquoi_ecran) layers[`why${i}`] = `<div class="why"><b>Pourquoi</b><p>${nb(esc(nr.pourquoi_ecran))}</p></div>`;
});
// compteur du desserrage en étoile : boulons 1 à 6 (fait, en cours, à venir) et tour en cours
const counts = new Map();
scan.forEach(r => { if (r.count && CONF.inset.includes(r.n) && SCEN === 'A') counts.set(`${r.count.pass}_${r.count.num}`, r.count); });
counts.forEach((c, key) => {
  layers[`cnt${key}`] = `<div class="hud"><div class="h">Desserrage en étoile · 1 tour à la fois</div>
    <div class="row">${[1, 2, 3, 4, 5, 6].map(j => `<i class="${j < c.num ? 'done' : j === c.num ? 'cur' : ''}">${j}</i>`).join('')}</div>
    <div class="p">Tour ${c.pass} sur ${c.R} · boulon ${c.num}</div></div>`;
});
layers.slow = `<div class="tag" style="background:rgba(17,21,24,.88);color:#f2c230;border:1px solid #f2c230">Ralenti × ½</div>`;
layers.insetFrame = `<div class="inset"><span>Ressorts · vue en coupe</span></div>`;
const stepIdx = n => steps.findIndex(s => s.n === n);
if (SCEN === 'A') {
  bands.r02 = { h: BAND, html: bandHTML({ i: stepIdx('4'), still: true, title: 'Face avant : couvert des mâchoires (jaw cover) et porte-capuchon (cap holder)' }) };
  bands.r03 = { h: BAND, html: bandHTML({ i: stepIdx('6'), still: true, title: 'Coupe : 18 ressorts comprimés derrière le cône (bowl)' }) };
  bands.r04 = { h: BAND, html: bandHTML({ i: stepIdx('6'), still: true, title: 'Couvercle retiré : 9 boulons du cône, dont 3 longs de retenue' }) };
}
const CARD = (kicker, title, sub, color = '#f2c230') => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,13,.45),rgba(8,11,13,.72) 55%,rgba(8,11,13,.86))"></div>
    <div style="position:absolute;left:72px;right:72px;bottom:96px">
      <div style="font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:${color};font-weight:600;margin-bottom:14px">${kicker}</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:72px;font-weight:700;line-height:1.02;text-wrap:balance">${nb(title)}</div>
      <div style="margin-top:22px;font-size:28px;font-weight:500;color:#e3e8eb;border-left:5px solid ${color};padding-left:16px">${nb(sub)}</div>
    </div>`;
const LINE = (txt, color) => `<div style="font-family:'Barlow Condensed',sans-serif;font-size:46px;font-weight:600;line-height:1.12;text-wrap:balance;border-left:6px solid ${color};padding-left:22px;margin-bottom:24px">${nb(txt)}</div>`;
const FIN = (kicker, lines) => `<div style="position:absolute;inset:0;background:#111518"></div>
    <div style="position:absolute;left:96px;right:96px;top:50%;transform:translateY(-50%)">
      <div style="font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#f2c230;font-weight:600;margin-bottom:26px">${kicker}</div>${lines.join('')}</div>`;
if (SCEN === 'A') {
  bands.titre = { h: H, html: CARD('Vidéo de formation · Tête UM-012-100UG', "Démonter le cône d'un mandrin — PRO-OP-DD-005", 'Les ressorts (springs) restent comprimés : suivre chaque étape') };
  bands.fin = { h: H, html: FIN('À retenir · PRO-OP-DD-005', [LINE('Ne jamais retirer les boulons du cône au complet sous charge', '#ff5d52'), LINE("Remettre les 3 boulons longs sans bushing (étape 6) avant l'étape 7", '#57c486')]) };
} else {
  bands.titre = { h: H, html: CARD('Rencontre sécurité · Reconstitution', "Accident au démontage du cône d'un mandrin", 'Boulons du cône retirés un par un, dernier boulon desserré à l’impact drill', '#ff5d52') };
  bands.fin = { h: H, html: FIN('Ce qu’il fallait faire · PRO-OP-DD-005', [LINE('Étape 6 : remettre les 3 boulons longs sans bushing', '#57c486'), LINE('Étape 7 : dévisser les boulons du cône 1 tour à la fois, ordre 1 à 6', '#57c486'), LINE('Jamais un boulon retiré au complet sous charge', '#ff5d52')]) };
}
const png = name => path.join(WORK, name + '.png');
const layerSize = {};
{
  const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
  const CACHE = process.env.CDN_CACHE || path.join(os.tmpdir(), 'clam-cdn-cache');
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, r => {   // polices : curl (mandataire) avec cache
    const url = r.request().url(), f = path.join(CACHE, url.replace(/[^a-z0-9.]+/gi, '_').slice(-180));
    try { if (!fs.existsSync(f)) { fs.mkdirSync(CACHE, { recursive: true }); execFileSync('curl', ['-sSfL', '-m', '60', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', '-o', f, url]); }
      return r.fulfill({ path: f, contentType: url.includes('googleapis') ? 'text/css' : 'font/woff2', headers: { 'access-control-allow-origin': '*' } }); }
    catch (e) { return r.fulfill({ body: '', contentType: 'text/css' }); }
  });
  const load = html => page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${BASE}</style></head><body>${html}</body></html>`, { waitUntil: 'networkidle' });
  for (const [name, b] of Object.entries(bands)) {
    await page.setViewportSize({ width: W, height: b.h });
    await load(b.html);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(FIT);
    await page.screenshot({ path: png(name), omitBackground: b.h === H });
  }
  await page.setViewportSize({ width: W, height: H });
  for (const [name, html] of Object.entries(layers)) {   // calques : rognés à leur contenu, fond transparent
    await load(html);
    await page.evaluate(() => document.fonts.ready);
    const box = await page.evaluate(() => { const r = document.body.firstElementChild.getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) }; });
    await page.screenshot({ path: png(name), omitBackground: true, clip: box });
    layerSize[name] = [box.width, box.height];
  }
  await browser.close();
}
if (process.argv.includes('--bands-only')) process.exit(0);
const missing = scan.filter(r => r.keep && !fs.existsSync(img(r.k))).concat(ins.filter(x => !fs.existsSync(path.join(FRAMES, x.file))));
if (missing.length) throw new Error(`${missing.length} images manquantes (première : ${missing[0].k ?? missing[0].file})`);

// --- 3) composition : une séquence par partie (A : étapes 1–3 | 4–5 | 6–9, rendus Blender intercalés ; D : une seule partie) ---
// chaque étape : ses images gardées ; à la place du transport à la table, fondu vers le gros plan tournant de la pièce retirée, puis retour.
// Incrustations par image : fenêtre « ressorts en coupe », compteur de tours, repère « Ralenti », encadré « Pourquoi » (pendant sa voix).
const parts = SCEN === 'A' ? [[0, 2], [3, 4], [5, 8]] : [[0, steps.length - 1]];
const rowByK = new Map(scan.map(r => [r.k, r]));
const PAD = 0.35;   // silence avant chaque voix (s)
const stepMarks = [];   // { part, i, f0, f1 } : premières et dernières images de chaque étape dans sa partie (pour la voix)
const seqs = parts.map(([a, b], p) => {
  const clips = [];
  for (let i = a; i <= b; i++) {
    const sb = png(`s${i}`), ib = png(`i${i}`), rows = scan.filter(r => r.step === i && r.keep);
    const gp = ins.filter(x => x.step === i), at = gp.length ? gp[0].at : Infinity;
    const F = r => ({ f: [img(r.k), sb], k: r.k, i });
    const before = rows.filter(r => r.k < at).map(F);
    let after = rows.filter(r => r.k >= at).map(F);
    // retour du gros plan : le travailleur revient de la table et pivote en arrivant ; seule la fin du plan (travailleur immobile) est gardée,
    // ou rien si le plan est trop court (sauf la dernière étape, dont le plan large final reste entier)
    if (gp.length && i < steps.length - 1) after = after.length < AFTER_MIN ? [] : after.slice(-AFTER_KEEP);
    const fade = clips.length > 0 && !!clips[clips.length - 1].ins;   // l'étape précédente finit sur un gros plan
    if (before.length) clips.push({ frames: before, hold: gp.length ? HOLD_PRE : HOLD_END, fade, i });
    if (gp.length) clips.push({ frames: gp.map(x => ({ f: [path.join(FRAMES, x.file), ib], i })), hold: 0, fade: true, ins: true, i });
    if (after.length) clips.push({ frames: after, hold: HOLD_END, fade: gp.length > 0, i });
  }
  // voix plus longue que l'image : la fin de l'étape est prolongée (dernière image figée)
  for (let i = a; i <= b; i++) {
    const cl = clips.filter(c => c.i === i); if (!cl.length) continue;
    const have = cl.reduce((s, c) => s + c.frames.length + c.hold, 0) / FPS;
    const vc = voiceOf(i, 'c'), vp = voiceOf(i, 'p');
    const need = (vc ? PAD + vc.dur : 0) + (vp ? PAD + vp.dur : 0) + (vc || vp ? .5 : 0);
    if (need > have) cl[cl.length - 1].hold += Math.ceil((need - have) * FPS);
  }
  const frames = [];
  for (const c of clips) {
    let f = c.frames;
    if (c.fade && frames.length) {   // fondu : dernière image du plan précédent (figée) → premières images du nouveau plan
      const L = frames[frames.length - 1];
      f.slice(0, XFN).forEach((x, j) => frames.push({ a: L, b: x, t: (j + 1) / (XFN + 1), i: x.i, k: x.k }));
      f = f.slice(XFN);
    }
    frames.push(...f);
    for (let r = 0; r < c.hold; r++) frames.push({ ...frames[frames.length - 1], hold: true });
  }
  for (let i = a; i <= b; i++) { const f0 = frames.findIndex(x => x.i === i), f1 = frames.length - 1 - [...frames].reverse().findIndex(x => x.i === i); if (f0 >= 0) stepMarks.push({ part: p, i, f0, f1 }); }
  // incrustations : fenêtre ressorts, compteur, ralenti ; encadré « Pourquoi » pendant sa voix (ou, sans voix, après la consigne estimée)
  const decorate = (x, n) => {
    if (x.a) return { a: decorate(x.a, n), b: decorate(x.b, n), t: x.t };
    const d = { f: x.f, ov: [] }, r = x.k != null ? rowByK.get(x.k) : null, pk = x.k != null ? plan.frames[x.k] : null;
    if (r && CONF.inset.includes(r.n) && r.cam !== 'hyd' && !r.cut && fs.existsSync(inImg(x.k))) {
      d.ovu = [[png('insetFrame'), IN_X - 4, IN_Y - 4]]; d.in = [inImg(x.k), IN_X, IN_Y, IN_W, IN_H];
    }
    if (r && r.count && layers[`cnt${r.count.pass}_${r.count.num}`]) d.ov.push([png(`cnt${r.count.pass}_${r.count.num}`), W - layerSize[`cnt${r.count.pass}_${r.count.num}`][0] - 18, 18]);
    if (pk && pk.slow && !x.hold) d.ov.push([png('slow'), Math.round(W / 2 - layerSize.slow[0] / 2), 18]);
    const m = stepMarks.find(s => s.part === p && s.i === x.i);
    if (m && layers[`why${x.i}`]) {
      const vc = voiceOf(x.i, 'c'), vp = voiceOf(x.i, 'p'), nr = narrOf(x.i), t = (n - m.f0) / FPS;
      const s0 = vp ? PAD + (vc ? vc.dur + PAD : 0) : PAD + estDur(nr && nr.voix), s1 = s0 + (vp ? vp.dur + .8 : Math.max(4, nr.pourquoi_ecran.length / 14));
      if (t >= s0 && t <= s1) d.ov.push([png(`why${x.i}`), 18, 18]);
    }
    return d.ov.length || d.in ? d : d.f;
  };
  return { dir: path.join(WORK, `p${p}`), frames: frames.map((x, n) => decorate(x, n)) };
});
fs.writeFileSync(path.join(WORK, 'compose.json'), JSON.stringify({ w: W, h3: H3, band: BAND, jobs: os.cpus().length, seqs }));
await run(PYTHON, [path.join(ROOT, 'video', 'compose.py'), path.join(WORK, 'compose.json')]);

// --- 4) montage ffmpeg ---
const R = f => path.join(ROOT, 'renders', f);
const inputs = [], chains = [], segs = [];
const input = (...a) => { inputs.push(...a); return inputs.filter(x => x === '-i').length - 1; };
const norm = `settb=AVTB,setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1`;
// rendu Blender fixe : Ken Burns (zoom 1,00 → 1,06) ; carton titre par-dessus (plein cadre) ou bandeau en dessous
function still(jpg, name, dur, full = false) {
  const n = Math.round(dur * FPS), h = full ? H : H3, a = input('-i', jpg), b = input('-loop', '1', '-t', String(dur), '-i', png(name)), l = `s${segs.length}`;
  chains.push(`[${a}:v]scale=3200:2000,crop=3200:${Math.round(3200 * h / W)},zoompan=z='1+0.06*on/${n - 1}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${n}:s=${W}x${h}:fps=${FPS},setsar=1,pad=${W}:${H}:0:0[${l}k]`,
    `[${l}k][${b}:v]overlay=0:${full ? 0 : H3}:shortest=1,${norm}${full ? ',fade=t=in:st=0:d=0.6' : ''}[${l}]`);
  segs.push({ l, dur, name });
}
function proc(s, p) {
  const a = input('-framerate', String(FPS), '-i', path.join(s.dir, '%05d.jpg')), l = `s${segs.length}`;
  chains.push(`[${a}:v]${norm}[${l}]`); segs.push({ l, dur: s.frames.length / FPS, part: p, name: `partie ${p + 1}` });
}
const vIntro = VOICE.find(v => v.id === 'intro'), vFin = VOICE.find(v => v.id === 'fin');
const TITLE = Math.max(3.5, vIntro ? vIntro.dur + 1.2 : 0), INS = 3, END = Math.max(4, vFin ? vFin.dur + 1.4 : 0);
still(R('01_ensemble.jpg'), 'titre', TITLE, true);
if (SCEN === 'A') {
  proc(seqs[0], 0);
  still(R('02_face_mandrin.jpg'), 'r02', INS);
  proc(seqs[1], 1);
  still(R('03_coupe.jpg'), 'r03', INS);
  still(R('04_couvercle_retire.jpg'), 'r04', INS);
  proc(seqs[2], 2);
} else proc(seqs[0], 0);
{ const a = input('-loop', '1', '-t', String(END), '-i', png('fin')), l = `s${segs.length}`;
  chains.push(`[${a}:v]${norm},fade=t=out:st=${END - 0.8}:d=0.8[${l}]`); segs.push({ l, dur: END, name: 'fin' }); }
// fondus enchaînés ; début de chaque segment dans la vidéo finale
let cur = segs[0].l, t = segs[0].dur;
segs[0].from = 0;
segs.slice(1).forEach((s, i) => {
  const off = t - XF, o = i === segs.length - 2 ? 'v' : `x${i}`;
  chains.push(`[${cur}][${s.l}]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(4)}[${o}]`);
  s.from = +off.toFixed(3); cur = o; t = off + s.dur;
});
// voix : intro sur le titre, consigne puis « Pourquoi » au début de chaque étape, conclusion sur le carton de fin
const audio = [];
if (vIntro) audio.push([vIntro, .6]);
for (const m of stepMarks) {
  const seg = segs.find(s => s.part === m.part), t0 = seg.from + m.f0 / FPS, vc = voiceOf(m.i, 'c'), vp = voiceOf(m.i, 'p');
  if (vc) audio.push([vc, t0 + PAD]);
  if (vp) audio.push([vp, t0 + PAD + (vc ? vc.dur + PAD : 0)]);
}
if (vFin) audio.push([vFin, segs[segs.length - 1].from + .7]);
const amap = [];
if (audio.length) {
  const labels = audio.map(([v, at], j) => { const a = input('-i', path.join(ROOT, v.file)); chains.push(`[${a}:a]aresample=48000,adelay=${Math.round(at * 1000)}:all=1[a${j}]`); return `[a${j}]`; });
  chains.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad,atrim=0:${t.toFixed(3)}[aout]`);
  amap.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '128k');
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await run(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', chains.join(';\n'), '-map', '[v]', ...(amap.length ? amap : ['-an']),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', OUT]);
// image d'aperçu : le carton titre
await run(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '2.2', '-i', OUT, '-frames:v', '1', '-q:v', '5', POSTER]);
console.log('plan :\n' + segs.map(s => `  ${s.from.toFixed(1).padStart(5)} s  ${s.name}`).join('\n'));
console.log(`voix : ${audio.length ? `${audio.length} passages (${JSON.parse(fs.readFileSync(MANF, 'utf8')).voix})` : 'aucune'}`);
console.log(`durée ${t.toFixed(2)} s · ${OUT} ${(fs.statSync(OUT).size / 1e6).toFixed(2)} Mo · ${POSTER} ${(fs.statSync(POSTER).size / 1e3).toFixed(0)} ko`);
