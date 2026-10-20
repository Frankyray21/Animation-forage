#!/usr/bin/env node
// Images fixes des ajouts de la vidéo 1 (script-v2), montées par inserer.py autour du rendu HyperFrames de la voix principale :
//   - cartes d'arrêt (A/arrets.json) : « ⏸ Arrêt — On en discute » après l'étape 1, « ⏸ À vous la parole » à la fin ;
//   - contre-exemple de l'étape 7 (A/contre-exemple.json) : calques transparents posés sur les images du scénario B (bandeau rouge
//     « ✗ Si on ne respecte pas la séquence » en haut à gauche, bandeau du bas avec le geste montré), puis carte « ✓ La bonne méthode » ;
//   - repères « Vidéo accélérée × N » (même style que dans le rendu) pour les images du contre-exemple sautées.
// Même allure que les cartes du rendu (templates/questions.html, base.css) : polices locales du projet HyperFrames (--build), aucune
// ressource externe ; fonds : rendus Blender du dépôt (renders/), assombris.
// Usage : node video/hyperframes/cartes.mjs --build BUILD --plan-b DOSSIER_CAPTURE_B --sortie DOSSIER
//   BUILD : projet de gen-a.mjs (compositions/questions.html pour les @font-face, assets/fonts) ; PLAYWRIGHT, HF_NAVIGATEUR comme ailleurs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..');
const ARGV = process.argv.slice(2), arg = (k, d) => { const i = ARGV.indexOf('--' + k); return i < 0 ? d : ARGV[i + 1]; };
const BUILD = path.resolve(arg('build', '')), PLANB = path.resolve(arg('plan-b', '')), OUT = path.resolve(arg('sortie', ''));
if (!arg('build') || !arg('plan-b') || !arg('sortie')) throw new Error('usage : node cartes.mjs --build BUILD --plan-b DOSSIER --sortie DOSSIER');
const W = 1280, H = 720, BAND = 100;
const A = p => JSON.parse(fs.readFileSync(path.join(HERE, 'synchro', 'A', p), 'utf8'));
const ARRETS = A('arrets.json').arrets, CONTRE = A('contre-exemple.json');
const scanB = JSON.parse(fs.readFileSync(path.join(PLANB, 'scan.json'), 'utf8'));
const planB = JSON.parse(fs.readFileSync(path.join(PLANB, 'plan.json'), 'utf8'));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nbx = t => t.replace(/ ([?!;:»])/g, ' $1').replace(/« /g, '« ').replace(/(\d) ([½¼¾⅛])/g, '$1 $2');

// @font-face du projet (chemins rendus absolus) et règles communes de base.css
const q = fs.readFileSync(path.join(BUILD, 'compositions', 'questions.html'), 'utf8');
const FONTS = (q.match(/@font-face\s*{[^}]*}/g) || []).join('\n').replace(/url\(\.\.\/assets\/fonts\//g, `url(${pathToFileURL(path.join(BUILD, 'assets', 'fonts')).href}/`);
if (!FONTS) throw new Error(`${BUILD}/compositions/questions.html : aucune @font-face`);
const BASE = fs.readFileSync(path.join(HERE, 'templates', 'base.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//, '')
  .replace(/{{ACCENT}}/g, '#e5372b').replace(/{{BADGE_FG}}/g, '#fff').replace(/{{MAIN_FG}}/g, '#ff8a80').replace(/{{INSET_BOX_W}}/g, '408').replace(/{{INSET_BOX_H}}/g, '284');
const img = f => pathToFileURL(path.join(REPO, 'renders', f)).href;
const page = (corps, css = '', fond = '#111518') => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
${FONTS}
${BASE}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${fond};font-family:"IBM Plex Sans",sans-serif;color:#fff}
.fond{position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover}
.voile{position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,21,24,.96) 0%,rgba(17,21,24,.9) 50%,rgba(17,21,24,.6) 100%)}
.carte{position:absolute;left:96px;right:120px;top:0;height:${H}px;display:flex;flex-direction:column;justify-content:center}
.kicker{font-size:18px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:30px}
.arret{display:inline-flex;align-items:center;gap:14px;align-self:flex-start;padding:8px 18px 8px 14px;border-radius:6px;background:#f2c230;color:#111518;
  font-family:"Barlow Condensed",sans-serif;font-size:34px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:34px}
.arret i{font-style:normal;display:inline-grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#111518;color:#f2c230;font-size:20px;letter-spacing:0}
.qui{font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px;color:#f2c230}
.question{font-family:"Barlow Condensed",sans-serif;font-size:58px;font-weight:600;line-height:1.06;text-wrap:balance;max-width:1000px}
.consigne{text-wrap:balance;margin-top:44px;border-left:6px solid #f2c230;padding-left:22px;font-size:27px;font-weight:500;color:#eef2f4;max-width:960px}
ol.qs{margin:0;padding:0;list-style:none;display:grid;gap:22px;max-width:1040px;counter-reset:q}
ol.qs li{counter-increment:q;display:grid;grid-template-columns:52px 1fr;gap:16px;align-items:start;font-family:"Barlow Condensed",sans-serif;font-size:38px;font-weight:600;line-height:1.08;text-wrap:balance}
ol.qs li::before{content:counter(q);display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#2b343a;color:#f2c230;font-size:28px;font-weight:700;margin-top:-2px}
.pied{position:absolute;left:96px;bottom:44px;font-size:14px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#7d8a92}
${css}
</style></head><body>${corps}</body></html>`;

const pages = [];
// cartes d'arrêt
for (const [j, x] of ARRETS.entries()) {
  const fin = x.apres === 'fin';
  const corps = `<img class="fond" src="${img(fin ? '01_ensemble.jpg' : '03_coupe.jpg')}"><div class="voile"></div>
<div class="carte"><div class="arret"><i>❚❚</i>${esc(x.titre.replace(/^⏸\s*/, ''))}</div>
${fin ? `<div class="qui">Questions pour l'équipe</div><ol class="qs">${x.questions.map(t => `<li>${esc(nbx(t))}</li>`).join('')}</ol>`
      : `<div class="qui">Question pour l'équipe</div><div class="question">${esc(nbx(`« ${x.question} »`))}</div>`}
<div class="consigne"${fin ? ' style="margin-top:36px;font-size:24px"' : ''}>${esc(nbx(x.consigne))}</div></div>
<div class="pied">PRO-OP-DD-005 · Rencontre sécurité</div>`;
  pages.push({ nom: `arret-${fin ? 'fin' : x.apres}`, html: page(corps) });
}
// « ✓ La bonne méthode » (retour à la procédure)
pages.push({ nom: 'bonne-methode', html: page(`<img class="fond" src="${img('04_couvercle_retire.jpg')}"><div class="voile"></div>
<div class="carte"><div class="kicker" style="color:#57c486">Retour à la procédure</div>
<div class="question" style="display:flex;align-items:center;gap:22px"><span style="display:inline-grid;place-items:center;width:74px;height:74px;border-radius:50%;background:#2c7a4c;font-size:48px">✓</span>${esc(CONTRE.bandeau_retour.replace(/^✓\s*/, ''))}</div>
<div class="consigne" style="border-color:#57c486">${esc(nbx('Étape 8 : les ressorts sont détendus, les 3 boulons longs ne portent plus rien.'))}</div></div>
<div class="pied">PRO-OP-DD-005 · Rencontre sécurité</div>`) });
// calques du contre-exemple : un par étape du scénario B montrée (titre de l'étape au bandeau), fond transparent
const etapesB = [...new Set(scanB.filter(r => r.n === '7' || r.n === '!').map(r => r.step))];
for (const i of etapesB) {
  const s = planB.steps[i];
  const corps = `<div style="position:absolute;left:0;top:0;width:${W}px;height:${H - BAND}px;box-shadow:inset 0 0 0 6px #e5372b"></div>
<div style="position:absolute;left:18px;top:18px;display:flex;align-items:center;gap:12px;padding:9px 16px 9px 12px;border-radius:6px;background:#c62828;box-shadow:0 6px 20px rgba(0,0,0,.35);font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">
<span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#fff;color:#c62828;font-size:24px">✗</span>${esc(CONTRE.bandeau_entree.replace(/^✗\s*/, ''))}</div>
<div style="position:absolute;left:0;top:${H - BAND}px;width:${W}px;height:${BAND}px"><div class="band"><div class="badge"><b>✗</b></div>
<div class="txt"><div class="t">${esc(nbx(s.title))}</div><div class="c"><span class="chip" style="background:#c62828">Contre-exemple</span><span class="m">Ce qu'il ne faut pas faire</span></div></div>
<div class="ref"><span>Ne pas faire</span>PRO-OP-DD-005</div></div></div>`;
  pages.push({ nom: `contre-${i}`, html: page(corps, '', 'transparent'), transparent: true });
}
// cadre de la fenêtre « ressorts en coupe » (gen.mjs : IN_W 400, IN_H 250, en bas à droite de la 3D), pour les images B qui en ont une
pages.push({ nom: 'fenetre-cadre', transparent: true, html: page(`<div class="inset" style="left:${W - 400 - 18 - 4}px;top:${H - BAND - 250 - 38 - 4}px"><span>Ressorts · vue en coupe</span></div>`, '', 'transparent') });
for (const f of [1.5, 2, 2.5, 3, 3.5, 4, 5, 6])
  pages.push({ nom: `accelere-${String(f).replace('.', '_')}`, transparent: true, html: page(`<div class="tag" style="left:50%;top:18px;transform:translateX(-50%);white-space:nowrap;background:rgba(17,21,24,.88);color:#cfd8dc;border:1px solid #cfd8dc">Vidéo accélérée × ${String(f).replace('.', ',')}</div>`, '', 'transparent') });

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const exe = process.env.HF_NAVIGATEUR || ['/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'].find(f => fs.existsSync(f));
const nav = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await ctx.route(/^(?!file:|data:|about:)/, r => r.abort());   // hors ligne : seules les ressources locales
fs.mkdirSync(OUT, { recursive: true });
for (const p of pages) {
  const f = path.join(OUT, `${p.nom}.html`); fs.writeFileSync(f, p.html);
  const pg = await ctx.newPage(); await pg.goto(pathToFileURL(f).href); await pg.evaluate(() => document.fonts.ready);
  await pg.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
  await pg.screenshot({ path: path.join(OUT, `${p.nom}.png`), omitBackground: !!p.transparent }); await pg.close();
}
await nav.close();
fs.writeFileSync(path.join(OUT, 'cartes.json'), JSON.stringify({ pages: pages.map(p => p.nom), etapes_b: etapesB }, null, 1));
console.log(`${OUT} : ${pages.length} images (${pages.map(p => p.nom).join(', ')})`);
