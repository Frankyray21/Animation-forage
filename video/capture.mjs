// Capture image par image (déterministe) du scénario A d'index.html, pour la vidéo de formation.
// La page est servie depuis le dépôt par un petit serveur local ; les crochets de capture sont
// injectés dans la copie servie (index.html n'est jamais modifié).
//
// Usage : node video/capture.mjs [--out DIR] [--fps 24] [--from K] [--to K] [--info]
// Variables : PLAYWRIGHT (chemin du module playwright si non installé localement),
//             CHROME (exécutable chromium), THREE_DIR (copie locale du paquet three@0.160.0),
//             CDN_CACHE (cache des fichiers CDN téléchargés par curl ; défaut : dossier temporaire).
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const FPS = +arg('fps', 24), W = +arg('w', 1280), H = +arg('h', 720);
const OUT = path.resolve(arg('out', path.join(ROOT, 'video', 'frames')));
const INFO = process.argv.includes('--info');
const THREE_DIR = process.env.THREE_DIR || '';
const CACHE = process.env.CDN_CACHE || path.join(os.tmpdir(), 'clam-cdn-cache');
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');

// --- copie servie d'index.html, avec les crochets de capture ---
const sub = (s, a, b) => { if (!s.includes(a)) throw new Error('motif absent : ' + a); return s.replace(a, b); };
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// boucle d'images pilotée : une image calculée par « __go », dt fixe, rendu sautable (préchauffage)
html = sub(html, 'function frame(now) {\n  const dt = Math.min(0.1, (now - last) / 1000);',
  'function frame(now) {\n  if (window.__cap && !(window.__go > 0)) { last = now; requestAnimationFrame(frame); return; }\n  if (window.__cap) window.__go--;\n' +
  '  const dt = window.__cap ? window.__fixedDt : Math.min(0.1, (now - last) / 1000);');
html = sub(html, "if (quality === 'high' && composer) composer.render(); else renderer.render(scene, camera);",
  "if (!window.__noRender) { if (quality === 'high' && composer) composer.render(); else renderer.render(scene, camera); }\n  window.__frames = (window.__frames || 0) + 1;");
// horloge virtuelle (respiration du travailleur, tremblement de la clé) : même résultat à chaque capture
html = sub(html, '<script type="importmap">', '<script>{ const r = performance.now.bind(performance); performance.now = () => window.__vt != null ? window.__vt : r(); }</script>\n<script type="importmap">');
// mise en page de capture : la vue seule, à la taille de la vidéo, bande de sous-titre en bas
html = sub(html, '</head>', `<style>
.rail, .dock, .vbar, #camChip { display: none !important; }
.app { display: block !important; padding: 0 !important; }
.stage { display: block !important; border: 0 !important; border-radius: 0 !important; }
.view { width: ${W}px !important; height: ${H}px !important; min-height: 0 !important; }
.note { bottom: 74px !important; font-size: 13px !important; }
#capBand { position: absolute; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; align-items: center; gap: 16px; padding: 10px 28px 12px;
  background: rgba(10, 14, 17, .74); color: #fff; font-family: "Barlow Condensed", "Arial Narrow", sans-serif; font-size: 34px; font-weight: 600; line-height: 1.1; }
#capBand b { flex: none; display: grid; place-items: center; min-width: 46px; height: 46px; border-radius: 6px; background: #2c7a4c; font-size: 32px; font-weight: 700; }
#capBand small { margin-left: auto; font-family: "IBM Plex Mono", monospace; font-size: 15px; font-weight: 400; color: #c9d1d6; white-space: nowrap; }
</style>
</head>`);
html = sub(html, '<div class="flash" id="flash"></div>', '<div class="flash" id="flash"></div><div id="capBand"><b id="capBandN"></b><span id="capBandT"></span><small id="capBandS">PRO-OP-DD-005 · Procédure respectée</small></div>');

// --- serveur local du dépôt ---
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': MIME['.html'] }); return res.end(html); }
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;

// --- fichiers CDN : copie locale de three si fournie, sinon curl (respecte le mandataire HTTPS) avec cache ---
function cdn(url) {
  const f = path.join(CACHE, url.replace(/[^a-z0-9.]+/gi, '_').slice(-180));
  if (!fs.existsSync(f)) { fs.mkdirSync(CACHE, { recursive: true }); execFileSync('curl', ['-sSfL', '-m', '60', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', '-o', f, url]); }
  return f;
}
const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'light' });
page.setDefaultTimeout(0);
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.route(/^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//, r => {
  const url = r.request().url();
  try {
    if (THREE_DIR && url.includes('three@0.160.0/')) return r.fulfill({ path: path.join(THREE_DIR, url.split('three@0.160.0/')[1]), contentType: 'text/javascript' });
    const ct = url.includes('fonts.googleapis') ? 'text/css' : url.endsWith('.woff2') ? 'font/woff2' : 'text/javascript';
    return r.fulfill({ path: cdn(url), contentType: ct, headers: { 'access-control-allow-origin': '*' } });
  } catch (e) { console.log('[cdn] échec', url); return url.includes('fonts.') ? r.fulfill({ body: '', contentType: 'text/css' }) : r.abort(); }
});
await page.addInitScript(() => { try { localStorage.setItem('clam-scen', 'A'); } catch (e) {} });
await page.goto(URL0, { waitUntil: 'load' });
await page.waitForFunction(() => window.__clam, null, { timeout: 180000 });
await page.evaluate(async () => {
  await document.fonts.ready;
  const c = window.__clam; c.setQuality('high'); c.setCut(true);
  document.getElementById('help').hidden = true; document.getElementById('helpVeil').hidden = true;
  document.getElementById('optNums').checked = true; document.getElementById('optWorker').checked = true;
});

// --- plan : chaque étape à 1×, plus une image exacte de fin d'étape (figée ensuite au montage) ---
const info = await page.evaluate(() => { const c = window.__clam; return { steps: c.steps().map(s => ({ n: s.n, title: s.title, dur: s.dur })), starts: c.starts(), total: c.total(), scen: document.getElementById('scenChipText').textContent }; });
const plan = [];
info.steps.forEach((s, i) => {
  const t0 = info.starts[i], t1 = i + 1 < info.steps.length ? info.starts[i + 1] : info.total;
  for (let j = 0; t0 + j / FPS < t1 - 0.5 / FPS; j++) plan.push({ k: plan.length, t: t0 + j / FPS, step: i });
  plan.push({ k: plan.length, t: t1 - 1e-3, step: i, end: true });
});
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify({ fps: FPS, w: W, h: H, ...info, frames: plan }, null, 1));
console.log(`scénario ${info.scen} : ${info.steps.length} étapes, ${info.total.toFixed(2)} s, ${plan.length} images`);
if (INFO) { console.log(info.steps.map((s, i) => `${s.n} ${s.title} (${info.starts[i].toFixed(2)} s, ${s.dur.toFixed(2)} s)`).join('\n')); await browser.close(); server.close(); process.exit(0); }

const FROM = +arg('from', 0), TO = Math.min(+arg('to', plan.length), plan.length);
const view = await page.evaluate(() => { const b = document.getElementById('view').getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; });
await page.evaluate(fps => { window.__cap = true; window.__fixedDt = 1 / fps; window.__go = 0; }, FPS);
// une image calculée (rendu facultatif) à l'instant t ; l'horloge virtuelle avance avec l'indice k
async function step(fr, render) {
  const n = await page.evaluate(([fr, render, fps]) => {
    const c = window.__clam, s = c.steps()[fr.step];
    c.setT(fr.t); window.__vt = 1000 * (fr.k + 24) / fps; window.__noRender = !render;
    document.getElementById('capBandN').textContent = s.n; document.getElementById('capBandT').textContent = s.title;
    window.__go = 1; return window.__frames || 0;
  }, [fr, render, FPS]);
  await page.waitForFunction(n => (window.__frames || 0) > n, n, { polling: 'raf' });
}
// préchauffage : 24 images à T = 0 (la caméra quitte la vue d'accueil), puis les images avant FROM, sans rendu
for (let i = 0; i < 24; i++) await step({ k: i - 24, t: 0, step: 0 }, false);
for (let k = 0; k < FROM; k++) await step(plan[k], false);
const t0 = Date.now();
for (let k = FROM; k < TO; k++) {
  const f = path.join(OUT, `f_${String(k).padStart(5, '0')}.jpg`);
  await step(plan[k], true);
  await page.screenshot({ path: f, type: 'jpeg', quality: 93, clip: view });
  if (k % 24 === 0 || k === TO - 1) console.log(`image ${k + 1}/${plan.length} (étape ${info.steps[plan[k].step].n}, t = ${plan[k].t.toFixed(2)} s) · ${((Date.now() - t0) / 1000 / (k - FROM + 1)).toFixed(2)} s/image`);
}
console.log(`capture ${FROM}–${TO - 1} terminée en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close(); server.close();
