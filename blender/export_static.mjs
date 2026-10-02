// Export des pièces fixes de la tête et du banc pour la cuisson de l'éclairage (bake_lightmaps.py)
// Usage : node export_static.mjs <dossier_sortie> [dossier_du_paquet_three@0.160.0]
// Variables : PLAYWRIGHT (chemin du module si non installé localement), CHROME (exécutable chromium)
// Sorties : lm_src.glb (cibles LM_<g>_<i> + occulteurs OC_*, repère du rig sous le nœud LM_root) et lm_src.json
//   g = h (tête, headG) ou c (banc, carriage) ; i = rang du maillage dans headG.traverse() / carriage.traverse()
//   au démarrage (instantané LM.snap de index.html). Pose : tête horizontale sur le banc, T = 0, pas d'éclaté.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(HERE, 'lm_work');
const PKG = process.argv[3] || null;   // paquet three local (sinon CDN)
fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
let html = src.slice(src.indexOf('<title>'), src.lastIndexOf('</body>')).replace(/^<\/head>$|^<body>$/mg, '');
html = html.replace("function frame(now) {", "function frame(now) { window.__frames = (window.__frames || 0) + 1;");
html = html.replace("PARTS, camera,", "PARTS, camera, rig, headG, carriage, clampG, tableG, consoleG, hiCache,");
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } }); page.setDefaultTimeout(1800000);
page.on('pageerror', e => console.log('[pageerror]', e.message));
if (PKG) await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ path: PKG + '/' + r.request().url().split('three@0.160.0/')[1], contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__clam, null, { timeout: 180000 });
const frames = async n => { const f0 = await page.evaluate(() => window.__frames || 0); await page.waitForFunction(([f, n]) => (window.__frames || 0) >= f + n, [f0, n], { timeout: 0 }); };
await page.evaluate(() => { const c = window.__clam; c.setQuality('low'); c.select(null); c.setCut(false); c.explodeNow(false); c.headExplodeNow(false); c.setT(0); });
await frames(4);

// 1) positions de la pose éclatée (tête), relatives au rig, pour la 2e cuisson
await page.evaluate(() => { window.__clam.headExplodeNow(true); });
await frames(4);
const expl = await page.evaluate(() => {
  const c = window.__clam, inv = c.rig.matrixWorld.clone().invert(), out = [];
  c.lm.snap.h.forEach(([o]) => out.push(inv.clone().multiply(o.matrixWorld).elements.slice()));
  return out;
});
await page.evaluate(() => { window.__clam.headExplodeNow(false); });
await frames(4);

// 2) export GLB
const res = await page.evaluate(async ([expl]) => {
  const c = window.__clam, THREE = c.THREE, LM = c.lm;
  const { GLTFExporter } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/exporters/GLTFExporter.js');
  c.rig.updateWorldMatrix(true, true);
  const rigW = c.rig.matrixWorld.clone(), inv = rigW.clone().invert();
  const root = new THREE.Object3D(); root.name = 'LM_root';
  rigW.decompose(root.position, root.quaternion, root.scale);
  const mats = new Map();
  const simple = (m, name) => {
    const col = m && m.color ? m.color.getHexString() : 'ffffff';
    const n = name.replace('#', col);
    if (!mats.has(n)) { const s = new THREE.MeshStandardMaterial({ color: '#' + col, roughness: m.roughness ?? .5, metalness: m.metalness ?? 0 }); s.name = n; mats.set(n, s); }
    return mats.get(n);
  };
  const visible = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  const cleanGeo = (g, M) => {
    const out = new THREE.BufferGeometry();
    for (const a of ['position', 'normal', 'uv', 'color']) if (g.attributes[a]) out.setAttribute(a, g.attributes[a].clone());
    if (g.index) out.setIndex(g.index.clone());
    for (const gr of g.groups) out.addGroup(gr.start, gr.count, gr.materialIndex);
    out.applyMatrix4(M);
    if (M.determinant() < 0 && out.index) { const ix = out.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
    return out;
  };
  // pièces non cuites : quincaillerie, raccords, petites pièces (restent en temps réel)
  const FAST = /^(B\d|W\d|SHC|SS\d|SHCS|HP\d|\d{4})/;
  const IN = 0.254;   // 1 po en unités de scène
  const targets = [], skipped = {}, occ = [];
  const add = (name, geo, mat, extra) => { const m = new THREE.Mesh(geo, mat); m.name = name; root.add(m); return m; };
  const deltas = {};
  let nOcc = 0;
  for (const g of ['h', 'c']) LM.snap[g].forEach(([o, rel], i) => {
    if (!o.isMesh || o.isSprite || o.userData.xray || !visible(o)) return;
    const ms = [].concat(o.material);
    if (ms.some(m => !m || m.isSpriteMaterial || m.isLineBasicMaterial || m.transparent)) return;
    const relNow = inv.clone().multiply(o.matrixWorld);
    let moved = 0; for (let k = 0; k < 16; k++) moved = Math.max(moved, Math.abs(relNow.elements[k] - rel.elements[k]));
    const p = o.userData.part, id = p ? p.id : '-';
    const delta = g === 'h' ? [expl[i][12] - rel.elements[12], expl[i][13] - rel.elements[13], expl[i][14] - rel.elements[14]] : null;
    if (o.isInstancedMesh) {   // chaînes : occulteurs seulement
      const M = new THREE.Matrix4();
      for (let j = 0; j < o.count; j++) { o.getMatrixAt(j, M); const nm = `OC_${g}_${i}_${j}`; add(nm, cleanGeo(o.geometry, rel.clone().multiply(M)), simple(ms[0], 'o_#')); if (delta) deltas[nm] = delta; nOcc++; }
      return;
    }
    o.geometry.computeBoundingSphere();
    const sc = new THREE.Vector3(); rel.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
    const rIn = o.geometry.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z) / IN;
    let why = null;
    if (o.userData.cutWithChuck) why = 'coupe';
    else if (g === 'h' && FAST.test(id)) why = 'quincaillerie';
    else if (rIn < .8) why = 'petite';
    else if (rel.determinant() <= 0) why = 'miroir';
    else if (moved > 1e-4) why = 'bouge';
    else if (Array.isArray(o.material) && !o.geometry.groups.length) why = 'groupes';
    if (why) {
      skipped[why] = (skipped[why] || 0) + 1;
      const nm = `OC_${g}_${i}`; add(nm, cleanGeo(o.geometry, rel), Array.isArray(o.material) ? ms.map(m => simple(m, 'o_#')) : simple(o.material, 'o_#')); if (delta) deltas[nm] = delta; nOcc++;
      return;
    }
    const nm = `LM_${g}_${i}`;
    add(nm, cleanGeo(o.geometry, rel), Array.isArray(o.material) ? ms.map((m, k) => simple(m, `m${k}_#`)) : simple(o.material, 'm0_#'));
    if (delta) deltas[nm] = delta;
    const pos = o.geometry.attributes.position;
    targets.push({ name: nm, part: id, partName: p ? p.name : '', verts: pos.count, tris: (o.geometry.index ? o.geometry.index.count : pos.count) / 3, rIn: +rIn.toFixed(2) });
  });
  // occulteurs hors tête/banc : mandrin (pose T = 0, sans coupe), table des pièces retirées
  for (const [tag, G] of [['k', c.clampG], ['t', c.tableG]]) { let j = 0; G.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.xray || !visible(o)) return;
    const ms = [].concat(o.material); if (ms.some(m => !m || m.isSpriteMaterial || m.isLineBasicMaterial || (m.transparent && m.opacity < .5))) return;
    add(`OC_${tag}_${j++}`, cleanGeo(o.geometry, inv.clone().multiply(o.matrixWorld)), Array.isArray(o.material) ? ms.map(m => simple(m, 'o_#')) : simple(o.material, 'o_#')); nOcc++;
  }); }
  const FLOOR_Y = -7.74;   // plancher du site (repère monde)
  const buf = await new Promise((ok, ko) => new GLTFExporter().parse(root, ok, ko, { binary: true, trs: true }));
  const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return { b64: btoa(s), info: { rigWorld: rigW.elements, floorY: FLOOR_Y, targets, skipped, nOcc, deltas } };
}, [expl]);
fs.writeFileSync(path.join(OUT, 'lm_src.glb'), Buffer.from(res.b64, 'base64'));
fs.writeFileSync(path.join(OUT, 'lm_src.json'), JSON.stringify(res.info));
const t = res.info.targets;
console.log(`lm_src.glb ${fs.statSync(path.join(OUT, 'lm_src.glb')).size} o ; cibles ${t.length} (h ${t.filter(x => x.name.startsWith('LM_h')).length}, c ${t.filter(x => x.name.startsWith('LM_c')).length}), triangles ${t.reduce((a, x) => a + x.tris, 0)} ; occulteurs ${res.info.nOcc} ; écartées ${JSON.stringify(res.info.skipped)}`);
await browser.close();
