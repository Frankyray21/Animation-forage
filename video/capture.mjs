// Capture image par image (déterministe) du scénario A d'animation.html, pour la vidéo de formation.
// La 3D seule est capturée (W × (H − bande)) ; le bandeau (étape + consigne de la procédure) est ajouté au montage.
// --scan : passe rapide sans rendu → scan.json (plan, étape, consigne, image gardée ou non : plans de table et de marche coupés)
// (sans option) : rendu des seules images gardées ; --inserts : gros plans tournants sur chaque pièce retirée → inserts.json
// La page est servie depuis le dépôt par un petit serveur local ; les crochets de capture sont
// injectés dans la copie servie (animation.html n'est jamais modifié).
//
// Usage : node video/capture.mjs [--out DIR] [--fps 24] [--ss 2] [--band 100] [--from K] [--to K] [--skip-existing] [--gpu] [--scan | --inserts | --info]
// --ss : suréchantillonnage (rendu à ss × la taille, réduit au montage) contre le crénelage et le scintillement des arêtes
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
const FPS = +arg('fps', 24), W = +arg('w', 1280), H = +arg('h', 720), SS = +arg('ss', 2), BAND = +arg('band', 100), H3 = H - BAND;
const OUT = path.resolve(arg('out', path.join(ROOT, 'video', 'frames')));
const INFO = process.argv.includes('--info');
const THREE_DIR = process.env.THREE_DIR || '';
const CACHE = process.env.CDN_CACHE || path.join(os.tmpdir(), 'clam-cdn-cache');
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');

// --- copie servie d'animation.html, avec les crochets de capture ---
const sub = (s, a, b) => { if (!s.includes(a)) throw new Error('motif absent : ' + a); return s.replace(a, b); };
let html = fs.readFileSync(path.join(ROOT, 'animation.html'), 'utf8');
// boucle d'images pilotée : une image calculée par « __go », dt fixe, rendu sautable (préchauffage)
html = sub(html, 'function frame(now) {\n  const dt = Math.min(0.1, (now - last) / 1000);',
  'function frame(now) {\n  if (window.__cap && !(window.__go > 0)) { last = now; requestAnimationFrame(frame); return; }\n  if (window.__cap) window.__go--;\n' +
  '  const dt = window.__cap ? window.__fixedDt : Math.min(0.1, (now - last) / 1000);');
html = sub(html, "if (quality === 'high' && composer) composer.render(); else renderer.render(scene, camera);",
  "if (!window.__noRender) { if (quality === 'high' && composer) composer.render(); else renderer.render(scene, camera); }\n  window.__frames = (window.__frames || 0) + 1;");
// horloge virtuelle (respiration du travailleur, tremblement de la clé) : même résultat à chaque capture
html = sub(html, '<script type="importmap">', '<script>{ const r = performance.now.bind(performance); performance.now = () => window.__vt != null ? window.__vt : r(); }</script>\n<script type="importmap">');
// repères 3D sans le × de fermeture (inutile dans la vidéo)
html = sub(html, "closable = true } = {}) {", "closable = true } = {}) {\n  closable = false;");
// gros plans des pièces : étiquettes 3D masquées
html = sub(html, 'const labelOpacity = (s, a) => { if (!s) return;', 'const labelOpacity = (s, a) => { if (!s) return; if (window.__noLabels) a = 0;');
// mise en page de capture : la 3D seule (le bandeau et la consigne sont ajoutés au montage), sans encadré ni puces
html = sub(html, '</head>', `<style>
.rail, .dock, .vbar, #camChip, .chip-row, #procCard, #procLine, .bilan, .actcard, .actdot, .fs-steps, .pres-bar { display: none !important; }
.app { display: block !important; padding: 0 !important; }
.stage { display: block !important; border: 0 !important; border-radius: 0 !important; }
.view { width: ${W}px !important; height: ${H3}px !important; min-height: 0 !important; }
.note { bottom: 10px !important; font-size: 13px !important; }
</style>
</head>`);

// --- serveur local du dépôt ---
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/animation.html') { res.writeHead(200, { 'content-type': MIME['.html'] }); return res.end(html); }
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/animation.html`;

// --- fichiers CDN : copie locale de three si fournie, sinon curl (respecte le mandataire HTTPS) avec cache ---
function cdn(url) {
  const f = path.join(CACHE, url.replace(/[^a-z0-9.]+/gi, '_').slice(-180));
  if (!fs.existsSync(f)) { fs.mkdirSync(CACHE, { recursive: true }); execFileSync('curl', ['-sSfL', '-m', '60', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', '-o', f, url]); }
  return f;
}
// --gpu : carte graphique de l'ordinateur (fenêtre chromium visible, beaucoup plus rapide) au lieu du WebGL logiciel (swiftshader)
const GPU = process.argv.includes('--gpu');
const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), headless: !GPU,
  args: GPU ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SS, colorScheme: 'light' });
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
console.log('WebGL : ' + await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'), e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; }));
await page.evaluate(async () => {
  await document.fonts.ready;
  const c = window.__clam; c.setQuality('high');
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
fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify({ fps: FPS, w: W, h: H, band: BAND, ss: SS, ...info, frames: plan }, null, 1));
console.log(`scénario ${info.scen} : ${info.steps.length} étapes, ${info.total.toFixed(2)} s, ${plan.length} images`);
if (INFO) { console.log(info.steps.map((s, i) => `${s.n} ${s.title} (${info.starts[i].toFixed(2)} s, ${s.dur.toFixed(2)} s)`).join('\n')); await browser.close(); server.close(); process.exit(0); }

const FROM = +arg('from', 0), TO = Math.min(+arg('to', plan.length), plan.length), SKIP0 = process.argv.includes('--skip-existing');
const view = await page.evaluate(() => { const b = document.getElementById('view').getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; });
await page.evaluate(fps => { window.__cap = true; window.__fixedDt = 1 / fps; window.__go = 0; window.__cutFar = true; }, FPS);
// une image calculée (rendu facultatif) à l'instant t ; l'horloge virtuelle avance avec l'indice k
async function step(fr, render) {
  const n = await page.evaluate(([fr, render, fps]) => {
    const c = window.__clam;
    c.setT(fr.t); window.__vt = 1000 * (fr.k + 24) / fps; window.__noRender = !render;
    window.__go = 1; return window.__frames || 0;
  }, [fr, render, FPS]);
  await page.waitForFunction(n => (window.__frames || 0) > n, n, { polling: 'raf' });
}
// préchauffage : 24 images à T = 0 (la caméra quitte la vue d'accueil), puis les images avant FROM, sans rendu
for (let i = 0; i < 24; i++) await step({ k: i - 24, t: 0, step: 0 }, false);
for (let k = 0; k < FROM; k++) await step(plan[k], false);
// plans coupés au montage : transport des pièces à la table et marches (sauf l'aller au poste de commande, étape 1)
const DROP = new Set(['tableJC', 'tableCV', 'tablePB', 'tableL', 'tablePlate']);
const keepOf = (cam, n) => !(DROP.has(cam) || (cam === 'walk' && n !== '1'));
if (process.argv.includes('--scan')) {   // relevé sans rendu : plan, consigne de l'encadré procédure (texte exact), image gardée
  const rows = [];
  for (let k = 0; k < plan.length; k++) {
    await step(plan[k], false);
    const m = await page.evaluate(() => { const c = document.getElementById('procCard'), st = window.__clam.cutState(); return { cam: st.cam, cut: st.cutOn, cons: c.hidden ? '' : (c.dataset.html || '') }; });
    const s = info.steps[plan[k].step];
    rows.push({ k, step: plan[k].step, n: s.n, title: s.title, end: !!plan[k].end, ...m, keep: keepOf(m.cam, s.n) });
    if (k % 240 === 0) console.log(`relevé ${k}/${plan.length}`);
  }
  fs.writeFileSync(path.join(OUT, 'scan.json'), JSON.stringify(rows));
  console.log(`relevé : ${rows.filter(r => r.keep).length} images gardées sur ${rows.length}`);
  await browser.close(); server.close(); process.exit(0);
}
if (process.argv.includes('--inserts')) {   // pièce retirée : gros plan tournant, à la place des plans de table coupés
  // la pièce est montrée une fois posée sur la table, en surbrillance (--insat table, défaut) ou au moment où elle vient d'être retirée (--insat pull) ;
  // travailleur et étiquettes masqués, vue entière (sans coupe)
  const SPEC = { '4': ['3506907', 'B750-1500'], '5': ['3506906', 'B500-2250'], '6': ['3506878'], '7': ['B500-6500'], '8': ['B500-8000'], '9': ['2920390', 'UM-021-01-01'] };
  const AT = arg('insat', 'table'), ONLY = arg('insonly', '');
  const scan = JSON.parse(fs.readFileSync(path.join(OUT, 'scan.json'), 'utf8'));
  const N = Math.round(+arg('inslen', 2.5) * FPS), out = [];
  for (let i = 0; i < info.steps.length; i++) {
    const n = info.steps[i].n, ids = SPEC[n]; if (!ids || (ONLY && !ONLY.split(',').includes(n))) continue;
    // premier plan coupé de l'étape précédé d'un plan gardé : c'est là que le gros plan est inséré
    const rows = scan.filter(r => r.step === i);
    const d0 = rows.findIndex((r, j) => !r.keep && j > 0 && rows[j - 1].keep); if (d0 < 0) continue;
    let tb = d0; while (tb < rows.length && !rows[tb].keep && !DROP.has(rows[tb].cam)) tb++;   // marche jusqu'à la table
    let te = tb; while (te + 1 < rows.length && rows[te + 1].cam === rows[tb].cam && !rows[te + 1].keep) te++;
    const kAt = AT === 'table' ? rows[te].k : rows[d0 - 1].k, cam = AT === 'table' ? rows[tb].cam : rows[d0 - 1].cam;
    await page.evaluate(() => { const w = document.getElementById('optWorker'); w.checked = false; w.dispatchEvent(new Event('change')); window.__clam.setCutAuto(false); window.__clam.setCutUI(false); window.__noLabels = true; document.querySelectorAll('.note').forEach(n => { n.style.visibility = 'hidden'; }); });
    for (let j = 0; j < 6; j++) await step({ k: 100000 + j, t: plan[kAt].t, step: i }, false);
    const geo = await page.evaluate(([ids, cam]) => {
      const c = window.__clam, T = c.THREE, box = new T.Box3();
      for (const id of ids) { const p = c.PARTS.find(p => p.id === id); if (p) p.objs.filter(Boolean).forEach(o => { let v = o.visible; o.traverseAncestors(a => { v = v && a.visible; }); if (v) box.expandByObject(o); }); }
      const ctr = box.getCenter(new T.Vector3()), r = Math.max(.6, box.getSize(new T.Vector3()).length() / 2), C = c.CAMS[cam].fn ? c.CAMS[cam].fn() : c.CAMS[cam];
      const d = new T.Vector3(C.p[0] - C.t[0], C.p[1] - C.t[1], C.p[2] - C.t[2]).normalize();
      return { ctr: ctr.toArray(), r, d: d.toArray() };
    }, [ids, cam]);
    const dist = Math.min(9, Math.max(+arg('insmin', 2.2), geo.r * +arg('insk', 3.0)));
    for (let f = 0; f < N; f++) {
      const name = `ins_${n}_${String(f).padStart(3, '0')}.jpg`, file = path.join(OUT, name);
      const a = (-20 + 40 * f / Math.max(1, N - 1)) * Math.PI / 180, [dx, dy, dz] = geo.d;
      const rx = dx * Math.cos(a) + dz * Math.sin(a), rz = -dx * Math.sin(a) + dz * Math.cos(a);
      const z = dist * (1.08 - .14 * f / Math.max(1, N - 1));   // léger travelling avant
      const p = [geo.ctr[0] + rx * z, geo.ctr[1] + Math.max(dy, .35) * z, geo.ctr[2] + rz * z];
      await page.evaluate(([p, t]) => { window.__camOverride = { p, t }; }, [p, geo.ctr]);
      if (!(SKIP0 && fs.existsSync(file) && fs.statSync(file).size > 10000)) { await step({ k: 100010 + f, t: plan[kAt].t, step: i }, true); await page.screenshot({ path: file, type: 'jpeg', quality: 93, clip: view }); }
      out.push({ file: name, n, step: i, at: rows[d0].k, ids });
    }
    console.log(`pièce retirée, étape ${n} (${AT}, t = ${plan[kAt].t.toFixed(2)} s, plan ${cam}) : ${N} images`);
  }
  await page.evaluate(() => { window.__camOverride = null; window.__noLabels = false; });
  fs.writeFileSync(path.join(OUT, 'inserts.json'), JSON.stringify(out));
  await browser.close(); server.close(); process.exit(0);
}
const t0 = Date.now();
const SKIP = SKIP0;
const scanF = path.join(OUT, 'scan.json'), KEEP = fs.existsSync(scanF) ? JSON.parse(fs.readFileSync(scanF, 'utf8')).map(r => r.keep) : null;   // sans relevé : toutes les images
for (let k = FROM; k < TO; k++) {
  const f = path.join(OUT, `f_${String(k).padStart(5, '0')}.jpg`);
  if ((KEEP && !KEEP[k]) || (SKIP && fs.existsSync(f) && fs.statSync(f).size > 10000)) { await step(plan[k], false); continue; }   // plan coupé ou image déjà faite : rejouée sans rendu (continuité de la caméra)
  await step(plan[k], true);
  await page.screenshot({ path: f, type: 'jpeg', quality: 93, clip: view });
  if (k % 24 === 0 || k === TO - 1) console.log(`image ${k + 1}/${plan.length} (étape ${info.steps[plan[k].step].n}, t = ${plan[k].t.toFixed(2)} s) · ${((Date.now() - t0) / 1000 / (k - FROM + 1)).toFixed(2)} s/image`);
}
console.log(`capture ${FROM}–${TO - 1} terminée en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close(); server.close();
