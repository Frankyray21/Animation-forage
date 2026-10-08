// Vidéo de formation : scénario A « Procédure respectée » (étapes 1 à 9) de PRO-OP-DD-005.
// 1) capture (capture.mjs) : relevé des plans (--scan), images gardées en tranches parallèles (plans de transport des pièces
//    à la table coupés), gros plans tournants des pièces retirées (--inserts) ;
// 2) bandeaux (étape + consigne de la procédure, texte exact de l'encadré de l'animation) et cartons rendus en PNG par chromium ;
// 3) composition image par image (compose.py : 3D réduite + bandeau en dessous, fondus vers et depuis les gros plans) ;
// 4) montage et encodage H.264 par ffmpeg (rendus Blender en Ken Burns, fondus enchaînés).
//
// Usage : node video/make_video.mjs [--frames DIR] [--jobs 3] [--gpu] [--skip-capture] [--crf 27] [--out FICHIER]
// --gpu : capture avec la carte graphique de l'ordinateur (fenêtre chromium visible) ; quelques minutes au lieu de plusieurs heures
// Variables : FFMPEG (défaut : ffmpeg), PYTHON (défaut : python3, avec Pillow), PLAYWRIGHT, CHROME, THREE_DIR, CDN_CACHE (voir capture.mjs).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const FRAMES = path.resolve(arg('frames', path.join(os.tmpdir(), 'clam-video-frames')));
const OUT = path.resolve(arg('out', path.join(ROOT, 'video', 'procedure_boyles_h.mp4')));
const POSTER = path.join(path.dirname(OUT), 'procedure_poster.jpg');
const JOBS = +arg('jobs', 3), CRF = +arg('crf', 27), FFMPEG = process.env.FFMPEG || 'ffmpeg', PYTHON = process.env.PYTHON || 'python3';
const FPS = 24, W = 1280, H = 720, BAND = 100, H3 = H - BAND, XF = 0.5;   // i/s, taille, bandeau sous la 3D, fondu entre parties (s)
const HOLD_END = Math.round(.6 * FPS), HOLD_PRE = Math.round(.4 * FPS), XFN = 8;   // fin d'étape figée, arrêt avant le gros plan, fondu (images)
const WORK = path.join(FRAMES, 'montage');
const CAP = path.join(ROOT, 'video', 'capture.mjs');
const run = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args.map(String), { stdio: 'inherit' }); p.on('exit', c => c ? rej(new Error(`${cmd} : code ${c}`)) : res()); });
const GPU = process.argv.includes('--gpu') ? ['--gpu'] : [];
const readJ = f => JSON.parse(fs.readFileSync(path.join(FRAMES, f), 'utf8'));

// --- 1) capture ---
if (!process.argv.includes('--skip-capture')) {
  if (!fs.existsSync(path.join(FRAMES, 'scan.json'))) await run('node', [CAP, '--out', FRAMES, '--fps', FPS, '--scan', ...GPU]);
  // tranches équilibrées sur le nombre d'images gardées
  const keep = readJ('scan.json').map(r => r.keep), tot = keep.filter(Boolean).length, cuts = [0];
  let acc = 0; keep.forEach((v, k) => { acc += v; if (cuts.length < JOBS && acc >= tot * cuts.length / JOBS) cuts.push(k + 1); }); cuts.push(keep.length);
  const t0 = Date.now();
  await Promise.all(cuts.slice(0, -1).map((a, j) => run('node', [CAP, '--out', FRAMES, '--fps', FPS, '--from', a, '--to', cuts[j + 1], '--skip-existing', ...GPU])));
  await run('node', [CAP, '--out', FRAMES, '--fps', FPS, '--inserts', '--skip-existing', ...GPU]);
  console.log(`capture : ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
const plan = readJ('plan.json'), scan = readJ('scan.json'), ins = readJ('inserts.json');
const steps = plan.steps;
const img = k => path.join(FRAMES, `f_${String(k).padStart(5, '0')}.jpg`);

// --- 2) bandeaux et cartons ---
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
.prog i{flex:1;background:#2b343a} .prog i.done{background:#3f9a62} .prog i.cur{background:#f2c230}
.badge{flex:none;width:68px;height:68px;border-radius:6px;background:#f2c230;color:#111518;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.badge span{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.badge b{font-family:"Barlow Condensed",sans-serif;font-size:46px;font-weight:700}
.txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.t{font-family:"Barlow Condensed",sans-serif;font-size:31px;font-weight:600;line-height:1.05;white-space:nowrap}
.c{display:flex;align-items:baseline;gap:14px;white-space:nowrap}
.c .m{font-size:19px;font-weight:600;color:#f2c230}
.c .s{font-size:15px;color:#a3afb6}
.chip{align-self:center;font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;background:#2c7a4c;color:#fff;padding:3px 8px;border-radius:3px}
.ref{flex:none;text-align:right;font-size:15px;font-weight:600;letter-spacing:.06em;color:#c9d1d6}
.ref span{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7d8a92;margin-bottom:3px}`;
// texte trop long pour sa ligne : réduit (jamais coupé ni abrégé), renvoyé à la ligne en dernier recours
const FIT = `for (const el of document.querySelectorAll('.t,.c')) { const all = [el, ...el.querySelectorAll('*')], f0 = all.map(e => parseFloat(getComputedStyle(e).fontSize)); let k = 1;
  while (el.scrollWidth > el.clientWidth + 1 && k > .62) { k -= .02; all.forEach((e, j) => { e.style.fontSize = f0[j] * k + 'px'; }); }
  if (el.scrollWidth > el.clientWidth + 1) el.style.whiteSpace = 'normal'; }`;
const prog = i => `<div class="prog">${steps.map((s, j) => `<i class="${j < i ? 'done' : j === i ? 'cur' : ''}"></i>`).join('')}</div>`;
function bandHTML({ i, title, main = '', small = '', chip = '', still = false }) {
  const badge = still ? '' : `<div class="badge"><span>Étape</span><b>${steps[i].n}</b></div>`;
  return `<div class="band">${prog(i)}${badge}<div class="txt"><div class="t">${nb(esc(title))}</div>
    <div class="c">${chip ? `<span class="chip">${chip}</span>` : ''}${main ? `<span class="m">${nb(main)}</span>` : ''}${small ? `<span class="s">${nb(small)}</span>` : ''}</div></div>
    <div class="ref"><span>${still ? 'Rendu Blender' : 'Procédure'}</span>PRO-OP-DD-005</div></div>`;
}
const bands = {};   // nom → { html, h }
steps.forEach((s, i) => {
  const { main, small } = split(consOf(i));
  const same = main.replace(/<[^>]+>/g, '') === s.title;   // consigne identique au titre : seul le détail est ajouté
  bands[`s${i}`] = { h: BAND, html: bandHTML({ i, title: s.title, main: same ? small : main, small: same ? '' : small }) };
  const gp = ins.find(x => x.step === i);
  if (gp) bands[`i${i}`] = { h: BAND, html: bandHTML({ i, title: s.title, chip: 'Pièces retirées', main: INS_TXT[s.n] || '', small: (gp.ids || []).join(' · ') }) };
});
const stepIdx = n => steps.findIndex(s => s.n === n);
bands.r02 = { h: BAND, html: bandHTML({ i: stepIdx('4'), still: true, title: 'Face avant : couvert des mâchoires (jaw cover) et porte-capuchon (cap holder)' }) };
bands.r03 = { h: BAND, html: bandHTML({ i: stepIdx('6'), still: true, title: 'Coupe : 18 ressorts comprimés derrière le cône (bowl)' }) };
bands.r04 = { h: BAND, html: bandHTML({ i: stepIdx('6'), still: true, title: 'Couvercle retiré : 9 boulons du cône, dont 3 longs de retenue' }) };
bands.titre = { h: H, html: `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,13,.45),rgba(8,11,13,.72) 55%,rgba(8,11,13,.86))"></div>
    <div style="position:absolute;left:72px;right:72px;bottom:96px">
      <div style="font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#f2c230;font-weight:600;margin-bottom:14px">Vidéo de formation · Tête UM-012-100UG</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:72px;font-weight:700;line-height:1.02;text-wrap:balance">${nb("Démonter le cône d'un mandrin — PRO-OP-DD-005")}</div>
      <div style="margin-top:22px;font-size:28px;font-weight:500;color:#e3e8eb;border-left:5px solid #f2c230;padding-left:16px">${nb('Les ressorts (springs) restent comprimés : suivre chaque étape')}</div>
    </div>` };
bands.fin = { h: H, html: `<div style="position:absolute;inset:0;background:#111518"></div>
    <div style="position:absolute;left:96px;right:96px;top:50%;transform:translateY(-50%)">
      <div style="font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#f2c230;font-weight:600;margin-bottom:26px">À retenir · PRO-OP-DD-005</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:50px;font-weight:600;line-height:1.12;text-wrap:balance;border-left:6px solid #ff5d52;padding-left:22px;margin-bottom:26px">${nb('Ne jamais retirer les boulons du cône au complet sous charge')}</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:50px;font-weight:600;line-height:1.12;text-wrap:balance;border-left:6px solid #57c486;padding-left:22px">${nb("Remettre les 3 boulons longs sans bushing (étape 6) avant l'étape 7")}</div>
    </div>` };
const png = name => path.join(WORK, name + '.png');
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
  for (const [name, b] of Object.entries(bands)) {
    await page.setViewportSize({ width: W, height: b.h });
    await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${BASE}</style></head><body>${b.html}</body></html>`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(FIT);
    await page.screenshot({ path: png(name), omitBackground: b.h === H });
  }
  await browser.close();
}
if (process.argv.includes('--bands-only')) process.exit(0);
const missing = scan.filter(r => r.keep && !fs.existsSync(img(r.k))).concat(ins.filter(x => !fs.existsSync(path.join(FRAMES, x.file))));
if (missing.length) throw new Error(`${missing.length} images manquantes (première : ${missing[0].k ?? missing[0].file})`);

// --- 3) composition : une séquence par partie (étapes 1–3 | 4–5 | 6–9, rendus Blender intercalés) ---
// chaque étape : ses images gardées ; à la place du transport à la table, fondu vers le gros plan tournant de la pièce retirée, puis retour
const parts = [[0, 2], [3, 4], [5, 8]];
const seqs = parts.map(([a, b], p) => {
  const clips = [];
  for (let i = a; i <= b; i++) {
    const sb = png(`s${i}`), ib = png(`i${i}`), rows = scan.filter(r => r.step === i && r.keep);
    const gp = ins.filter(x => x.step === i), at = gp.length ? gp[0].at : Infinity;
    const before = rows.filter(r => r.k < at).map(r => [img(r.k), sb]), after = rows.filter(r => r.k >= at).map(r => [img(r.k), sb]);
    const fade = clips.length > 0 && !!clips[clips.length - 1].ins;   // l'étape précédente finit sur un gros plan
    if (before.length) clips.push({ frames: before, hold: gp.length ? HOLD_PRE : HOLD_END, fade });
    if (gp.length) clips.push({ frames: gp.map(x => [path.join(FRAMES, x.file), ib]), hold: 0, fade: true, ins: true });
    if (after.length) clips.push({ frames: after, hold: HOLD_END, fade: gp.length > 0 });
  }
  const frames = [];
  for (const c of clips) {
    let f = c.frames;
    if (c.fade && frames.length) {   // fondu : dernière image du plan précédent (figée) → premières images du nouveau plan
      const L = frames[frames.length - 1];
      f.slice(0, XFN).forEach((x, j) => frames.push([L[0], L[1], x[0], x[1], (j + 1) / (XFN + 1)]));
      f = f.slice(XFN);
    }
    frames.push(...f);
    for (let r = 0; r < c.hold; r++) frames.push(frames[frames.length - 1]);
  }
  return { dir: path.join(WORK, `p${p}`), frames };
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
  segs.push({ l, dur });
}
function proc(s) {
  const a = input('-framerate', String(FPS), '-i', path.join(s.dir, '%05d.jpg')), l = `s${segs.length}`;
  chains.push(`[${a}:v]${norm}[${l}]`); segs.push({ l, dur: s.frames.length / FPS });
}
const TITLE = 3.5, INS = 3, END = 4;
still(R('01_ensemble.jpg'), 'titre', TITLE, true);
proc(seqs[0]);
still(R('02_face_mandrin.jpg'), 'r02', INS);
proc(seqs[1]);
still(R('03_coupe.jpg'), 'r03', INS);
still(R('04_couvercle_retire.jpg'), 'r04', INS);
proc(seqs[2]);
{ const a = input('-loop', '1', '-t', String(END), '-i', png('fin')), l = `s${segs.length}`;
  chains.push(`[${a}:v]${norm},fade=t=out:st=${END - 0.8}:d=0.8[${l}]`); segs.push({ l, dur: END }); }
// fondus enchaînés
let cur = segs[0].l, t = segs[0].dur;
const timeline = [{ seg: 'titre', from: 0 }];
segs.slice(1).forEach((s, i) => {
  const off = t - XF, o = i === segs.length - 2 ? 'v' : `x${i}`;
  chains.push(`[${cur}][${s.l}]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(4)}[${o}]`);
  timeline.push({ seg: s.l, from: +off.toFixed(2) });
  cur = o; t = off + s.dur;
});
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await run(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', chains.join(';\n'), '-map', '[v]', '-an',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', OUT]);
// image d'aperçu : le carton titre
await run(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '2.2', '-i', OUT, '-frames:v', '1', '-q:v', '5', POSTER]);
const names = ['titre', 'étapes 1–3', 'rendu 02 face', 'étapes 4–5', 'rendu 03 coupe', 'rendu 04 couvercle', 'étapes 6–9', 'fin'];
console.log('plan :\n' + timeline.map((x, i) => `  ${x.from.toFixed(1).padStart(5)} s  ${names[i]}`).join('\n'));
console.log(`durée ${t.toFixed(2)} s · ${OUT} ${(fs.statSync(OUT).size / 1e6).toFixed(2)} Mo · ${POSTER} ${(fs.statSync(POSTER).size / 1e3).toFixed(0)} ko`);
