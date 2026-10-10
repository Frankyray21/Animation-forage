#!/usr/bin/env node
// Chronologie calculée par make_video.mjs lui-même, pour comparer-chronologie.py. Prépare dans --travail :
//   - racine/video/make_video.mjs : copie de video/make_video.mjs du dépôt, modifiée en 4 points (garde-fou : --frames doit être
//     le frames/ de la copie, car make_video vide FRAMES/montage sans condition ; images manquantes signalées au lieu d'arrêter ;
//     composition compose.py sautée ; chronologie.json écrit puis arrêt avant ffmpeg) ; narration.json et, avec --narration, le
//     manifeste des voix (seules leurs durées comptent) ;
//   - frames/ : copie des métadonnées de capture (plan.json, scan.json, inserts.json) et inset/ en fichiers vides aux mêmes noms ;
// puis lance la copie : bandeaux et calques rendus par le headless shell (CHROME), environnement vide, hors ligne si possible
// (unshare -n, ou -rn sans droits), nice -n 19. Résultat : frames/montage/compose.json et chronologie.json.
// N'écrit que dans --travail (sous HF_TRAVAIL, hors du dépôt et du dossier des images) ; lit le dépôt et --frames sans les modifier.
// Usage : node video/hyperframes/outils/chronologie-make-video.mjs --scen A|D --frames DIR [--narration MANIFESTE]
//                                                                 [--travail DIR] [--preparer-seulement]
// Variables : HF_TRAVAIL, PLAYWRIGHT (module playwright/index.mjs ; défaut : node_modules du dépôt), HF_NAVIGATEUR (headless
// shell, défaut comme hf.sh), CDN_CACHE (polices déjà en cache : la copie tourne hors ligne).
// Puis : python3 -B video/hyperframes/outils/comparer-chronologie.py $HF_TRAVAIL/A/rapport.json <travail>/frames/montage DIR/scan.json
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const REPO = fs.realpathSync(path.resolve(ICI, '..', '..', '..'));
const ARGV = process.argv.slice(2);
const has = k => ARGV.includes('--' + k);
const arg = (k, d) => { const i = ARGV.indexOf('--' + k); return i < 0 ? d : ARGV[i + 1]; };
const SCEN = arg('scen', null);
if (!['A', 'D'].includes(SCEN) || !arg('frames', null)) throw new Error('usage : chronologie-make-video.mjs --scen A|D --frames DIR [--narration MANIFESTE] [--travail DIR] [--preparer-seulement]');
const FRAMES = fs.realpathSync(path.resolve(arg('frames')));
const MANF = arg('narration', null) ? path.resolve(arg('narration')) : null;
const TRAVAIL = path.resolve(process.env.HF_TRAVAIL || path.join(os.tmpdir(), 'clam-hf'));
const DIR = path.resolve(arg('travail', path.join(TRAVAIL, `mv-chronologie-${SCEN}`)));

// --- garde-fous (chemins réels) : --travail sous HF_TRAVAIL, hors du dépôt, sans lien avec le dossier des images ---
const inside = (p, dir) => p === dir || p.startsWith(dir + path.sep);
const reel = p => { let q = path.resolve(p); const r = []; while (!fs.existsSync(q)) { r.unshift(path.basename(q)); q = path.dirname(q); } return path.join(fs.realpathSync(q), ...r); };
{
  const T = reel(TRAVAIL), D = reel(DIR);
  if (inside(T, REPO) || inside(REPO, T)) throw new Error(`HF_TRAVAIL ${TRAVAIL} (${T}) : doit être hors du dépôt ${REPO}`);
  if (!inside(D, T) || D === T) throw new Error(`--travail ${DIR} (${D}) : doit être un sous-dossier de ${T} (HF_TRAVAIL)`);
  if (inside(D, FRAMES) || inside(FRAMES, D)) throw new Error(`--travail ${DIR} (${D}) : interdit (${FRAMES})`);
}

// --- copie modifiée de make_video.mjs : chaque point d'ancrage doit exister une fois, sinon arrêt (make_video a changé) ---
let mv = fs.readFileSync(path.join(REPO, 'video', 'make_video.mjs'), 'utf8');
const remplacer = (avant, apres) => {
  const n = mv.split(avant).length - 1;
  if (n !== 1) throw new Error(`make_video.mjs : point d'ancrage trouvé ${n} fois (attendu 1) : ${avant.slice(0, 80)}…`);
  mv = mv.replace(avant, () => apres);
};
remplacer("const WORK = path.join(FRAMES, 'montage');\n", "const WORK = path.join(FRAMES, 'montage');\n"
  + "if (!fs.existsSync(FRAMES) || fs.realpathSync(FRAMES) !== fs.realpathSync(path.join(ROOT, '..', 'frames'))) throw new Error(`(copie d'essai) --frames doit être ${path.join(ROOT, '..', 'frames')} (elle vide FRAMES/montage sans condition)`);\n");
remplacer("if (missing.length) throw new Error(`${missing.length} images manquantes (première : ${missing[0].k ?? missing[0].file})`);",
  "if (missing.length) console.log(`(copie d'essai) ${missing.length} images manquantes ignorées`);");
remplacer("await run(PYTHON, [path.join(ROOT, 'video', 'compose.py'), path.join(WORK, 'compose.json')]);", "// (copie d'essai) composition sautée");
remplacer("fs.mkdirSync(path.dirname(OUT), { recursive: true });\n", "fs.writeFileSync(path.join(WORK, 'chronologie.json'), JSON.stringify({ segs, t, audio: audio.map(([v, at]) => ({ id: v.id, at })), stepMarks, nframes: seqs.map(s => s.frames.length) }, null, 1)); console.log('(copie d\\'essai) chronologie écrite'); process.exit(0);\n"
  + "fs.mkdirSync(path.dirname(OUT), { recursive: true });\n");

// --- écriture : racine/ et frames/ seulement, recréés à chaque appel ---
const RACINE = path.join(DIR, 'racine'), CAPT = path.join(DIR, 'frames');
for (const d of [RACINE, CAPT]) fs.rmSync(d, { recursive: true, force: true });
fs.mkdirSync(path.join(RACINE, 'video'), { recursive: true });
fs.writeFileSync(path.join(RACINE, 'video', 'make_video.mjs'), mv);
fs.copyFileSync(path.join(REPO, 'video', 'narration.json'), path.join(RACINE, 'video', 'narration.json'));
if (MANF) {
  fs.mkdirSync(path.join(RACINE, 'video', 'narration', SCEN), { recursive: true });
  fs.copyFileSync(MANF, path.join(RACINE, 'video', 'narration', SCEN, 'manifeste.json'));
}
fs.mkdirSync(path.join(CAPT, 'inset'), { recursive: true });
for (const f of ['plan.json', 'scan.json', 'inserts.json']) if (fs.existsSync(path.join(FRAMES, f))) fs.copyFileSync(path.join(FRAMES, f), path.join(CAPT, f));
const insets = fs.existsSync(path.join(FRAMES, 'inset')) ? fs.readdirSync(path.join(FRAMES, 'inset')).filter(f => /^in_\d+\.jpg$/.test(f)) : [];
for (const f of insets) fs.writeFileSync(path.join(CAPT, 'inset', f), '');   // make_video ne teste que leur existence
for (const d of ['home', 'tmp']) fs.mkdirSync(path.join(DIR, d), { recursive: true });

// --- lancement : env -i, headless shell imposé, hors ligne si possible, nice -n 19 (CAP_SYS_NICE retirée en root) ---
const PLAYWRIGHT = path.resolve(process.env.PLAYWRIGHT || path.join(REPO, 'node_modules', 'playwright', 'index.mjs'));
const NAV = process.env.HF_NAVIGATEUR || path.join(process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright'),
  'chromium_headless_shell-1194', 'chrome-linux', 'headless_shell');
const CDN = path.resolve(process.env.CDN_CACHE || path.join(os.tmpdir(), 'clam-cdn-cache'));
const args = ['node', path.join(RACINE, 'video', 'make_video.mjs'), '--scen', SCEN, '--frames', CAPT, '--skip-capture', ...(MANF ? [] : ['--muet'])];
// espace réseau vide : unshare -n en root ; sans droits, unshare -rn (espace de noms utilisateur) ; sinon aucun (avertissement)
const unshare = ['-n', '-rn'].find(o => spawnSync('unshare', [o, 'true']).status === 0);
const isoler = unshare ? ['unshare', unshare, 'python3', '-I', path.join(ICI, 'netns-lo.py')] : [];
const priorite = process.getuid && process.getuid() === 0 ? ['setpriv', '--bounding-set', '-sys_nice'] : [];
const env = { PATH: `${path.dirname(process.execPath)}:/usr/local/bin:/usr/bin:/bin`, HOME: path.join(DIR, 'home'), TMPDIR: path.join(DIR, 'tmp'),
  LANG: 'C.UTF-8', PLAYWRIGHT, CDN_CACHE: CDN, CHROME: NAV };
const cmd = ['nice', '-n', '19', ...priorite, ...isoler, ...args];
console.log(`copie préparée : ${RACINE} (${insets.length} images de fenêtre fictives, ${MANF ? 'voix ' + MANF : 'muet'})`);
console.log(`commande : (cd ${env.TMPDIR} && env -i ${Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ')} ${cmd.join(' ')})`);
if (has('preparer-seulement')) process.exit(0);
for (const [nom, f] of [['PLAYWRIGHT', PLAYWRIGHT], ['HF_NAVIGATEUR', NAV]]) if (!fs.existsSync(f)) throw new Error(`${nom} : ${f} introuvable`);
if (!isoler.length) console.log('AVERTISSEMENT : ni « unshare -n » ni « unshare -rn » permis : la copie tourne SANS isolation réseau (polices : CDN_CACHE seulement si elles y sont)');
const r = spawnSync(cmd[0], cmd.slice(1), { cwd: env.TMPDIR, env, stdio: 'inherit' });
if (r.status !== 0) throw new Error(`copie de make_video : code ${r.status}`);
console.log(`chronologie : ${path.join(CAPT, 'montage', 'chronologie.json')}`);
