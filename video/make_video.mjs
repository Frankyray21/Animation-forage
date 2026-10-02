// Vidéo de formation : scénario A « Procédure respectée » (étapes 1 à 9) de PRO-OP-DD-005.
// 1) capture image par image de l'animation (capture.mjs, en parallèle par tranches),
// 2) cartons (titre, légendes des rendus Blender, fin) rendus en PNG par chromium,
// 3) montage et encodage H.264 par ffmpeg (fondus enchaînés, Ken Burns sur les rendus, fin d'étape figée).
//
// Usage : node video/make_video.mjs [--frames DIR] [--jobs 3] [--skip-capture] [--crf 23] [--out FICHIER]
// Variables : FFMPEG (défaut : ffmpeg), PLAYWRIGHT, CHROME, THREE_DIR, CDN_CACHE (voir capture.mjs).
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
const JOBS = +arg('jobs', 3), CRF = +arg('crf', 23), FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 24, W = 1280, H = 720, HOLD = 1.5, XF = 0.5;   // i/s, taille, fin d'étape figée (s), fondu enchaîné (s)
const WORK = path.join(FRAMES, 'montage');
const run = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: 'inherit' }); p.on('exit', c => c ? rej(new Error(`${cmd} : code ${c}`)) : res()); });

// --- 1) capture ---
const planF = path.join(FRAMES, 'plan.json');
if (!process.argv.includes('--skip-capture')) {
  await run('node', [path.join(ROOT, 'video', 'capture.mjs'), '--out', FRAMES, '--fps', FPS, '--info']);
  const n = JSON.parse(fs.readFileSync(planF, 'utf8')).frames.length, per = Math.ceil(n / JOBS);
  const t0 = Date.now();
  await Promise.all([...Array(JOBS)].map((_, j) => run('node', [path.join(ROOT, 'video', 'capture.mjs'), '--out', FRAMES, '--fps', FPS, '--from', j * per, '--to', Math.min(n, (j + 1) * per)])));
  console.log(`capture : ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
const plan = JSON.parse(fs.readFileSync(planF, 'utf8'));
const img = k => path.join(FRAMES, `f_${String(k).padStart(5, '0')}.jpg`);
const missing = plan.frames.filter(f => !fs.existsSync(img(f.k)));
if (missing.length) throw new Error(`${missing.length} images manquantes (première : ${missing[0].k})`);

// --- 2) cartons ---
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(WORK, { recursive: true });
const nb = s => s.replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »');
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`;
const BASE = `${FONT} *{box-sizing:border-box} html,body{margin:0;width:${W}px;height:${H}px;background:transparent;overflow:hidden}
body{font-family:"IBM Plex Sans",sans-serif;color:#fff}
.band{position:absolute;left:0;right:0;bottom:0;padding:14px 28px 16px;background:rgba(10,14,17,.74);display:flex;align-items:center;gap:16px}
.band .t{font-family:"Barlow Condensed",sans-serif;font-size:34px;font-weight:600;line-height:1.1}
.band .tag{margin-left:auto;flex:none;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:#c9d1d6;border:1px solid #6b7780;border-radius:4px;padding:3px 8px}`;
const cards = {
  titre: `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,13,.45),rgba(8,11,13,.72) 55%,rgba(8,11,13,.86))"></div>
    <div style="position:absolute;left:72px;right:72px;bottom:96px">
      <div style="font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#f2c230;font-weight:600;margin-bottom:14px">Vidéo de formation · Tête UM-012-100UG</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:72px;font-weight:700;line-height:1.02;text-wrap:balance">${nb("Démonter le cône d'un mandrin Boyles H — PRO-OP-DD-005")}</div>
      <div style="margin-top:22px;font-size:28px;font-weight:500;color:#e3e8eb;border-left:5px solid #f2c230;padding-left:16px">${nb('Les ressorts (springs) restent comprimés : suivre chaque étape')}</div>
    </div>`,
  r02: `<div class="band"><span class="t">${nb('Face avant : couvert des mâchoires (jaw cover) et porte-capuchon (cap holder)')}</span><span class="tag">Rendu Blender</span></div>`,
  r03: `<div class="band"><span class="t">${nb('Coupe : 18 ressorts comprimés derrière le cône (bowl)')}</span><span class="tag">Rendu Blender</span></div>`,
  r04: `<div class="band"><span class="t">${nb('Couvercle retiré : 9 boulons du cône, dont 3 longs de retenue')}</span><span class="tag">Rendu Blender</span></div>`,
  fin: `<div style="position:absolute;inset:0;background:#111518"></div>
    <div style="position:absolute;left:96px;right:96px;top:50%;transform:translateY(-50%)">
      <div style="font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#f2c230;font-weight:600;margin-bottom:26px">À retenir · PRO-OP-DD-005</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:50px;font-weight:600;line-height:1.12;text-wrap:balance;border-left:6px solid #ff5d52;padding-left:22px;margin-bottom:26px">${nb('Ne jamais retirer les boulons du cône au complet sous charge')}</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:50px;font-weight:600;line-height:1.12;text-wrap:balance;border-left:6px solid #57c486;padding-left:22px">${nb("Remettre les 3 boulons longs sans bushing (étape 6) avant l'étape 7")}</div>
    </div>`,
};
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
  for (const [name, body] of Object.entries(cards)) {
    await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${BASE}</style></head><body>${body}</body></html>`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(WORK, name + '.png'), omitBackground: true });
  }
  await browser.close();
}

// --- 3) séquences d'images de la procédure : une par partie, fin de chaque étape figée HOLD s ---
const parts = [[0, 2], [3, 4], [5, 8]];   // étapes 1–3 | 4–5 | 6–9 (rendus Blender intercalés)
const seq = parts.map(([a, b], p) => {
  const dir = path.join(WORK, `p${p}`); fs.mkdirSync(dir);
  let n = 0;
  for (const f of plan.frames.filter(f => f.step >= a && f.step <= b))
    for (let r = 0; r < (f.end ? Math.round(HOLD * FPS) : 1); r++) fs.symlinkSync(img(f.k), path.join(dir, `${String(n++).padStart(5, '0')}.jpg`));
  return { dir, dur: n / FPS };
});

// --- 4) montage ffmpeg ---
const R = f => path.join(ROOT, 'renders', f);
const inputs = [], chains = [], segs = [];
const input = (...a) => { inputs.push(...a); return inputs.filter(x => x === '-i').length - 1; };
const norm = `settb=AVTB,setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1`;
// rendu Blender fixe : Ken Burns (zoom 1,00 → 1,06), carton PNG par-dessus
function still(jpg, png, dur, extra = '') {
  const n = Math.round(dur * FPS), a = input('-i', jpg), b = input('-loop', '1', '-t', String(dur), '-i', png), l = `s${segs.length}`;
  chains.push(`[${a}:v]scale=3200:2000,crop=3200:1800,zoompan=z='1+0.06*on/${n - 1}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${n}:s=${W}x${H}:fps=${FPS},setsar=1[${l}k]`,
    `[${l}k][${b}:v]overlay=0:0:shortest=1,${norm}${extra}[${l}]`);
  segs.push({ l, dur });
}
function proc(s) {
  const a = input('-framerate', String(FPS), '-i', path.join(s.dir, '%05d.jpg')), l = `s${segs.length}`;
  chains.push(`[${a}:v]${norm}[${l}]`); segs.push({ l, dur: s.dur });
}
const TITLE = 3.5, INS = 3, END = 4;
still(R('01_ensemble.jpg'), path.join(WORK, 'titre.png'), TITLE, ',fade=t=in:st=0:d=0.6');
proc(seq[0]);
still(R('02_face_mandrin.jpg'), path.join(WORK, 'r02.png'), INS);
proc(seq[1]);
still(R('03_coupe.jpg'), path.join(WORK, 'r03.png'), INS);
still(R('04_couvercle_retire.jpg'), path.join(WORK, 'r04.png'), INS);
proc(seq[2]);
{ const a = input('-loop', '1', '-t', String(END), '-i', path.join(WORK, 'fin.png')), l = `s${segs.length}`;
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
