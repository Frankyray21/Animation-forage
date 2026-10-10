#!/usr/bin/env node
// Usage : node video/hyperframes/outils/tester-hors-ligne.mjs [PROJET…]
// Contrôle hors ligne de commun.mjs : cas d'URL externes (doivent être refusés) et projets existants (aucun faux positif).
// Projets par défaut : sous-dossiers de HF_TRAVAIL (défaut : $TMPDIR/clam-hf) qui ont index.html et compositions/.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { controleHorsLigne } from '../commun.mjs';
const TRAVAIL = path.resolve(process.env.HF_TRAVAIL || path.join(os.tmpdir(), 'clam-hf'));
const T = path.join(TRAVAIL, '.hf', 'tmp', 'cas-hors-ligne');
const REPO = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..'));   // chemin décodé (accents)
if ((path.resolve(T) + path.sep).startsWith(REPO + path.sep)) throw new Error(`HF_TRAVAIL ${TRAVAIL} : doit être hors du dépôt ${REPO}`);
const cas = ['<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>',
  '<script src="https://cdn.jsdelivr.net:443/npm/gsap@3.12.5/dist/gsap.min.js"></script>', '<a href="https://example.com">x</a>',
  '<style>@font-face{src:url(//fonts.gstatic.com:443/s/x.woff2)}</style>', '<img src="http://93.184.216.34/x.png">',
  '<style>@import url("https://fonts.googleapis.com?family=Roboto");</style>', '<link href=//fonts.googleapis.com/css>',
  '<style>@import "//fonts.googleapis.com/css";</style>', '<video poster="//x.example/p.jpg"></video>', '<img srcset="//x.example/a.png 2x">'];
let refus = 0;
for (const c of cas) {
  fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(path.join(T, 'compositions'), { recursive: true });
  fs.writeFileSync(path.join(T, 'index.html'), `<!doctype html><html><body>${c}</body></html>`);
  try { controleHorsLigne(T, ''); console.log(`ACCEPTÉ (défaut) : ${c}`); } catch (e) { refus++; }
}
console.log(`${refus}/${cas.length} cas externes refusés`);
fs.rmSync(T, { recursive: true, force: true });
const projets = process.argv.slice(2).length ? process.argv.slice(2).map(p => path.resolve(p))
  : fs.existsSync(TRAVAIL) ? fs.readdirSync(TRAVAIL).map(d => path.join(TRAVAIL, d)) : [];
for (const d of projets) {
  if (!fs.existsSync(path.join(d, 'index.html')) || !fs.existsSync(path.join(d, 'compositions'))) continue;
  const css = fs.readFileSync(path.join(d, 'index.html'), 'utf8');   // règles @font-face du projet (familles déclarées)
  try { controleHorsLigne(d, css); console.log(`${d} : accepté`); } catch (e) { console.log(`${d} : REFUSÉ ${e.message}`); }
}
if (refus !== cas.length) process.exit(1);
