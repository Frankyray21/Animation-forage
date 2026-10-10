#!/usr/bin/env node
// Générateur de composition HyperFrames pour le montage des scénarios D (ce fichier) et A (gen-a.mjs, appelé d'ici avec --scen A).
// Reproduit les étapes 2 à 4 de video/make_video.mjs et video/compose.py pour D : carton titre (Ken Burns + fondu d'ouverture),
// partie 3D (images gardées de scan.json, réduites par moyenne de zone), bandeau de 100 px sous la 3D, calques (« Pourquoi »,
// fenêtre « ressorts en coupe », compteur et « Ralenti » si le scénario en a), fins d'étape figées 0,6 s, prolongation d'étape
// quand la voix est plus longue, fondus enchaînés de 0,5 s, carton de fin (fondu de fermeture 0,8 s) et voix placées à l'instant
// de adelay. La 3D n'est pas recalculée : elle vient de la capture de video/capture.mjs (f_*.jpg, inset/in_*.jpg).
//
// Durées et fondus mesurés, pas recalculés : le montage ffmpeg de make_video.mjs (carton titre, xfade, carton de fin, fondus
// d'ouverture et de fermeture) est rejoué à 64 × 36 pixels, et le projet reprend le nombre d'images et l'opacité de chaque image.
// Rendu : HyperFrames en séquence PNG sans perte (hf.sh render --format png-sequence), puis encoder.mjs encode exactement comme
// make_video.mjs:318-326 (x264 CRF 27 preset slow, BT.601 non balisé, voix MP3 d'origine, AAC mono 128 kbit/s).
//
// Node ≥ 22, aucune dépendance hors bibliothèque standard ; ffmpeg pour réduire et encoder les images (FFMPEG ou HYPERFRAMES_FFMPEG_PATH).
// N'écrit que dans --out, qui doit être un sous-dossier de HF_TRAVAIL (défaut : $TMPDIR/clam-hf), hors du dépôt et du dossier des
// images (chemins réels : les liens symboliques sont résolus).
//
// Usage : node video/hyperframes/gen.mjs [--scen D] [--frames DIR] [--narration MANIFESTE | --muet] [--out DIR] [--only-steps 0,2-4]
//                      [--limit-frames N] [--repo DIR] [--no-end] [--simuler-manquantes] [--simuler-fenetre] [--simuler-pourquoi ÉTAPE:PASSAGE]
//                      [--texte-hyperframes] [--fonts-cache DIR] [--threads 1] [--gop 24] [--force]
//         node video/hyperframes/gen.mjs --scen A … : voir gen-a.mjs (options --fenetre, --chronologie-seule ; pas de --only-steps /
//                      --limit-frames / --no-end)
// Défauts : --frames $TMPDIR/clam-video-frames-<scén.> (comme make_video.mjs), --out $HF_TRAVAIL/<scén.>, --fonts-cache $CDN_CACHE.
// Voir README.md (chaîne, commandes, sécurité, écarts connus avec make_video.mjs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { outilsFfmpeg, polices, dureeWav, controleHorsLigne } from './commun.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARGV = process.argv.slice(2);
const has = k => ARGV.includes('--' + k);
const arg = (k, d) => { const i = ARGV.indexOf('--' + k); return i < 0 ? d : ARGV[i + 1]; };
const REPO = path.resolve(arg('repo', path.resolve(HERE, '..', '..')));   // gen.mjs est dans video/hyperframes du dépôt
const TRAVAIL = path.resolve(process.env.HF_TRAVAIL || path.join(os.tmpdir(), 'clam-hf'));   // projets, rendus : hors dépôt
const SCEN = arg('scen', 'D');
const FRAMES = path.resolve(arg('frames', path.join(os.tmpdir(), `clam-video-frames-${SCEN}`)));   // défaut de make_video.mjs
const OUT = path.resolve(arg('out', path.join(TRAVAIL, SCEN)));
const MANF = has('muet') ? null : arg('narration', null) ? path.resolve(arg('narration')) : path.join(REPO, 'video', 'narration', SCEN, 'manifeste.json');
const FFMPEG = process.env.FFMPEG || process.env.HYPERFRAMES_FFMPEG_PATH || 'ffmpeg';
const FONTS_CACHE = path.resolve(arg('fonts-cache', process.env.CDN_CACHE || path.join(os.tmpdir(), 'clam-cdn-cache')));   // comme make_video.mjs
const THREADS = String(+arg('threads', 1) || 1), GOP = String(+arg('gop', 24) || 24), FORCE = has('force');
const LIMIT = arg('limit-frames', null) != null ? +arg('limit-frames') : null;
const NO_END = has('no-end'), SIM_MISSING = has('simuler-manquantes'), SIM_INSET = has('simuler-fenetre');
const SIM_WHY = arg('simuler-pourquoi', null);   // « 0:1 » : l'étape 0 reçoit l'encadré « Pourquoi » du passage 1 de narration.json
const TEXTE_HF = has('texte-hyperframes');   // garder text-rendering: geometricPrecision injecté par HyperFrames (voir TEXTE_RENDU)

// --- garde-fous : gen.mjs efface des fichiers dans --out (compositions/*, anciens clips, voix) ; --out doit donc être un sous-dossier
// de HF_TRAVAIL, lui-même hors du dépôt, comparé sur les chemins réels (liens symboliques résolus), et jamais le dépôt, le dossier
// des images ni un dossier de capture (plan.json ou scan.json : une capture peut être en cours) ---
const inside = (p, dir) => p === dir || p.startsWith(dir + path.sep);
const reel = p => {   // chemin réel : realpath de l'ancêtre existant le plus proche, puis le reste du chemin
  let q = path.resolve(p); const reste = [];
  while (!fs.existsSync(q)) { reste.unshift(path.basename(q)); const up = path.dirname(q); if (up === q) break; q = up; }
  return path.join(fs.realpathSync(q), ...reste);
};
{
  // dépôt lu (--repo) ET dépôt qui contient gen.mjs : un --repo vers une autre copie ne doit pas ouvrir le vrai dépôt à l'écriture
  const OUT_R = reel(OUT), TRAVAIL_R = reel(TRAVAIL), REPO_R = reel(REPO), DEPOT_R = reel(path.resolve(HERE, '..', '..'));
  for (const d of new Set([REPO_R, DEPOT_R])) if (inside(TRAVAIL_R, d) || inside(d, TRAVAIL_R)) throw new Error(`HF_TRAVAIL ${TRAVAIL} (${TRAVAIL_R}) : doit être hors du dépôt ${d}`);
  if (!inside(OUT_R, TRAVAIL_R) || OUT_R === TRAVAIL_R) throw new Error(`--out ${OUT} (${OUT_R}) : doit être un sous-dossier de ${TRAVAIL_R} (HF_TRAVAIL)`);
  for (const p of [REPO_R, DEPOT_R, reel(FRAMES), reel(HERE)]) if (inside(OUT_R, p) || inside(p, OUT_R)) throw new Error(`--out ${OUT} (${OUT_R}) : interdit (${p})`);
  for (let q = OUT_R; ; q = path.dirname(q)) {
    if (['plan.json', 'scan.json'].some(f => fs.existsSync(path.join(q, f)))) throw new Error(`--out ${OUT} (${OUT_R}) : dans un dossier de capture (${q})`);
    if (path.dirname(q) === q) break;
  }
}

// --- réglages de video/make_video.mjs (lignes 25-37, 212), à l'identique ---
const CONF = {
  A: { slow: '60.8-64.52:2', inset: ['7'], inserts: true, ref: 'Procédure', accent: '#f2c230' },
  D: { slow: '', inset: ['7', '!'], inserts: false, ref: 'Reconstitution', accent: '#e5372b' },
}[SCEN];
if (!CONF) throw new Error(`scénario ${SCEN} : A ou D seulement`);
const FPS = 24, W = 1280, H = 720, BAND = 100, H3 = H - BAND, XF = 0.5;
const HOLD_END = Math.round(.6 * FPS);
const IN_W = 400, IN_H = 250, IN_X = W - IN_W - 18, IN_Y = H3 - IN_H - 38;
const PAD = 0.35;

// --- données ---
const readJ = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const plan = readJ(path.join(FRAMES, 'plan.json')), scan = readJ(path.join(FRAMES, 'scan.json'));
if (plan.fps !== FPS || plan.w !== W || plan.h !== H || plan.band !== BAND) throw new Error(`plan.json : ${plan.fps} i/s, ${plan.w} × ${plan.h}, bandeau ${plan.band} (attendu ${FPS}, ${W} × ${H}, ${BAND})`);
if (plan.scenario !== SCEN) throw new Error(`plan.json : scénario ${plan.scenario}, attendu ${SCEN}`);
const steps = plan.steps;
const NARR = readJ(path.join(REPO, 'video', 'narration.json'));
let VOICE = [];
if (MANF) {
  if (fs.existsSync(MANF)) VOICE = readJ(MANF).items;
  else if (arg('narration', null)) throw new Error(`manifeste introuvable : ${MANF}`);
}
const notes = [];   // simulations et écarts signalés (repris dans rapport.json)

// passages de la narration attribués aux étapes, dans l'ordre (make_video.mjs:66-71)
const narrOf = (() => {
  const list = NARR[SCEN] || [], used = new Set(), m = new Map();
  steps.forEach((s, i) => { const j = list.findIndex((x, k) => !used.has(k) && x.n === s.n); if (j >= 0) { used.add(j); m.set(i, { ...list[j], idx: j }); } });
  if (SIM_WHY) {   // essai : encadré « Pourquoi » d'un autre passage sur une étape qui n'en a pas (le minutage suit la règle normale)
    const [si, pj] = SIM_WHY.split(':').map(Number), src = list[pj];
    if (!m.has(si) || !src || !src.pourquoi_ecran) throw new Error(`--simuler-pourquoi ${SIM_WHY} : étape ou passage invalide`);
    m.set(si, { ...m.get(si), pourquoi_ecran: src.pourquoi_ecran });
    notes.push(`SIMULATION : encadré « Pourquoi » du passage ${pj} (étape ${src.n}) affiché sur l'étape ${si} (${steps[si].n}), qui n'en a pas dans narration.json`);
  }
  return i => m.get(i) || null;
})();
const voiceOf = (i, kind) => { const n = narrOf(i); if (!n) return null; return VOICE.find(v => v.id === `${String(n.idx).padStart(2, '0')}_${kind}`) || null; };
const estDur = txt => txt ? Math.max(1.5, txt.split(/\s+/).length / 2.6) : 0;
const nb = s => s.replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const escAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// --- sélection des étapes (--only-steps : indices dans plan.steps, ex. « 0 » ou « 0,2-4 ») ---
const SEL = (() => {
  const o = arg('only-steps', null); if (!o) return steps.map((_, i) => i);
  const set = new Set();
  for (const p of o.split(',')) { const [a, b] = p.split('-').map(Number); for (let i = a; i <= (Number.isFinite(b) ? b : a); i++) if (i >= 0 && i < steps.length) set.add(i); }
  return [...set].sort((x, y) => x - y);
})();

// --- images de la capture : seules les images complètes comptent (la capture tourne peut-être encore) ---
const fImg = k => path.join(FRAMES, `f_${String(k).padStart(5, '0')}.jpg`);
const inImg = k => path.join(FRAMES, 'inset', `in_${String(k).padStart(5, '0')}.jpg`);
function jpegOk(f) {
  try {
    const st = fs.statSync(f); if (st.size <= 10000) return false;
    const fd = fs.openSync(f, 'r'), b = Buffer.alloc(2); fs.readSync(fd, b, 0, 2, st.size - 2); fs.closeSync(fd);
    return b[0] === 0xff && b[1] === 0xd9;   // marqueur de fin JPEG : fichier entièrement écrit
  } catch { return false; }
}
const rowByK = new Map(scan.map(r => [r.k, r]));

// --- scénario A (« Procédure respectée » : trois parties, rendus Blender, gros plans, ralenti, compteur) : gen-a.mjs ---
if (SCEN === 'A') {
  for (const k of ['only-steps', 'limit-frames', 'no-end']) if (has(k)) throw new Error(`--${k} : option du scénario D ; pour A, --fenetre DÉBUT-FIN (images)`);
  const { genererA } = await import('./gen-a.mjs');
  await genererA({ HERE, REPO, SCEN, FRAMES, OUT, MANF, FFMPEG, FONTS_CACHE, THREADS, GOP, FORCE, SIM_MISSING, SIM_INSET, TEXTE_HF, arg, has,
    CONF, FPS, W, H, BAND, H3, XF, HOLD_END, IN_W, IN_H, IN_X, IN_Y, PAD, plan, scan, steps, NARR, VOICE, notes, narrOf, voiceOf, estDur, nb, esc,
    fImg, inImg, jpegOk, rowByK });
  process.exit(0);
}
const { ffmpeg, RGB, ENC, sig, sigFile, upToDate, saveSig, encodeSeq, still } = outilsFfmpeg({ FFMPEG, THREADS, GOP, FORCE, OUT, FPS });

// --- 1) chronologie de la partie 3D (make_video.mjs:214-249, cas D : une partie, pas de gros plan) ---
const clips = [];
for (const i of SEL) {
  let rows = scan.filter(r => r.step === i && r.keep);
  if (LIMIT != null) rows = rows.slice(0, LIMIT);
  if (rows.length) clips.push({ i, rows, hold: HOLD_END, prolonge: 0 });
}
if (!clips.length) throw new Error('aucune image gardée dans les étapes choisies');
// voix plus longue que l'image : la fin de l'étape est prolongée (make_video.mjs:230-237)
for (const c of clips) {
  const have = (c.rows.length + c.hold) / FPS;
  const vc = voiceOf(c.i, 'c'), vp = voiceOf(c.i, 'p');
  const need = (vc ? PAD + vc.dur : 0) + (vp ? PAD + vp.dur : 0) + (vc || vp ? .5 : 0);
  if (need > have) { c.prolonge = Math.ceil((need - have) * FPS); c.hold += c.prolonge; }
}
// images manquantes : erreur (comme make_video.mjs:204-205), ou remplacement par l'image disponible la plus proche (--simuler-manquantes)
const avail = scan.filter(r => r.keep && jpegOk(fImg(r.k))).map(r => r.k);
const srcOf = new Map();
const missing = [];
for (const c of clips) for (const r of c.rows) {
  if (jpegOk(fImg(r.k))) { srcOf.set(r.k, fImg(r.k)); continue; }
  missing.push(r.k);
  if (!SIM_MISSING || !avail.length) continue;
  let best = avail[0]; for (const a of avail) if (Math.abs(a - r.k) < Math.abs(best - r.k) || (Math.abs(a - r.k) === Math.abs(best - r.k) && a < best)) best = a;
  srcOf.set(r.k, fImg(best));
}
if (missing.length && !SIM_MISSING) throw new Error(`${missing.length} images manquantes (première : ${missing[0]}) ; --simuler-manquantes pour les remplacer`);
if (missing.length) notes.push(`SIMULATION : ${missing.length} images 3D manquantes (capture en cours) remplacées par l'image disponible la plus proche (première : f_${String(missing[0]).padStart(5, '0')})`);

const frames = [];   // { k, i, hold } : une entrée par image de la partie
for (const c of clips) {
  c.f0 = frames.length;
  for (const r of c.rows) frames.push({ k: r.k, i: c.i });
  const last = c.rows[c.rows.length - 1].k;
  for (let j = 0; j < c.hold; j++) frames.push({ k: last, i: c.i, hold: true });
  c.f1 = frames.length - 1;
}
const N = frames.length;

// --- 2) segments (make_video.mjs:276-308) : montage ffmpeg rejoué à 64 × 36, nombre d'images et opacités mesurés ---
const vIntro = VOICE.find(v => v.id === 'intro'), vFin = VOICE.find(v => v.id === 'fin');
const TITLE = Math.max(3.5, vIntro ? vIntro.dur + 1.2 : 0), END = Math.max(4, vFin ? vFin.dur + 1.4 : 0);   // make_video.mjs:290
const TITLE_F = Math.round(TITLE * FPS), XF_F = Math.round(XF * FPS);   // TITLE_F = n de still() (zoompan d=n)
const P0 = TITLE_F - XF_F;                     // début de la partie 3D : xfade à offset TITLE − 0,5 (arrondi à l'image par xfade)
const E0 = P0 + N - XF_F;                      // début du carton de fin : xfade sur la fin de la partie
const T = f => f / FPS;                        // secondes exactes d'une image (même calcul que le moteur : image / i/s)
const S = x => String(x);                      // nombre JS complet : relu à l'identique par parseFloat
const ms = x => String(Math.round(x * 1000) / 1000);
// durée t de make_video.mjs (lignes 302-308), calculée dans le même ordre : sert à atrim (encoder.mjs) et aux instants des voix
const MV_T = (() => { let t = TITLE; const o1 = t - XF; t = o1 + N / FPS; if (NO_END) return t; const o2 = t - XF; return o2 + END; })();
// Rejeu : carton titre = chaîne still() exacte (image fixe + zoompan d=n + PNG « -loop 1 -t TITLE » + overlay shortest=1 + norm
// + fade=t=in), partie = N images à 24 i/s, carton de fin = « -loop 1 -t END » + norm + fade=t=out, xfade aux mêmes offsets.
// Carton blanc et partie noire : la luminance de chaque image donne directement l'opacité du fondu (Y = 16 + 219 × opacité).
// Ce que le rejeu révèle (et qu'un arrondi ne donne pas) : overlay=shortest coupe le segment titre une ou deux images avant la
// fin du xfade (dernières images du fondu 100 % 3D) ; « -loop 1 -t END » donne parfois une image de plus que round(END × 24)
// (dernière image noire) ; fade=t=in/out progresse par pas d'image (1/14 et 1/19 environ), pas linéairement en temps.
function rejouerMontage() {
  const dir = path.join(OUT, '.travail', 'rejeu'); fs.mkdirSync(dir, { recursive: true });
  const blanc = path.join(dir, 'blanc.png'), gris = path.join(dir, 'gris.jpg');
  ffmpeg(['-f', 'lavfi', '-i', 'color=c=white:s=64x36:d=1', '-frames:v', '1', blanc]);
  ffmpeg(['-f', 'lavfi', '-i', 'color=c=gray:s=64x40:d=1', '-frames:v', '1', gris]);
  const norm = `settb=AVTB,setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1`, n = TITLE_F;
  const inputs = ['-i', gris, '-loop', '1', '-t', String(TITLE), '-i', blanc, '-f', 'lavfi', '-i', `color=c=black:s=64x36:r=${FPS}`];
  const ch = [`[0:v]scale=320:200,crop=320:180,zoompan=z='1+0.06*on/${n - 1}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${n}:s=64x36:fps=${FPS},setsar=1,pad=64:36:0:0[s0k]`,
    `[s0k][1:v]overlay=0:0:shortest=1,${norm},fade=t=in:st=0:d=0.6[s0]`, `[2:v]trim=end_frame=${N},${norm}[s1]`];
  let t = TITLE; const o1 = t - XF; t = o1 + N / FPS;
  ch.push(`[s0][s1]xfade=transition=fade:duration=${XF}:offset=${o1.toFixed(4)}[${NO_END ? 'v' : 'x0'}]`);
  if (!NO_END) {
    inputs.push('-loop', '1', '-t', String(END), '-i', blanc);
    ch.push(`[3:v]${norm},fade=t=out:st=${END - 0.8}:d=0.8[s2]`);
    const o2 = t - XF; ch.push(`[x0][s2]xfade=transition=fade:duration=${XF}:offset=${o2.toFixed(4)}[v]`);
  }
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-threads', THREADS, '-filter_complex_threads', '1', ...inputs,
    '-filter_complex', ch.join(';'), '-map', '[v]', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`rejeu du montage : ffmpeg code ${r.status} ${r.stderr}`);
  const fs1 = 64 * 36 * 3 / 2, nb = r.stdout.length / fs1;
  if (!Number.isInteger(nb)) throw new Error('rejeu du montage : sortie tronquée');
  const op = [];   // opacité du carton (blanc) à chaque image
  for (let f = 0; f < nb; f++) { let s = 0; for (let j = 0; j < 64 * 36; j++) s += r.stdout[f * fs1 + j]; op.push(Math.min(1, Math.max(0, (s / (64 * 36) - 16) / 219))); }
  const un = x => x > 0.998, zero = x => x < 0.002;
  // fondu d'ouverture : images 0 … K (K = première image à 100 %)
  const K = op.findIndex(un); if (K < 0 || K >= P0) throw new Error('rejeu : fondu d’ouverture non terminé avant la partie');
  // xfade titre → partie : poids de la partie à l'image P0 + j (j = 0 … J, J = première image 100 % partie)
  if (!un(op[P0]) || op[P0 + 1] > 0.99) throw new Error(`rejeu : le xfade titre → partie ne commence pas à l'image ${P0}`);
  const wIn = []; for (let j = 0; j <= XF_F; j++) { wIn.push(1 - op[P0 + j]); if (un(wIn[j])) break; }
  if (!un(wIn[wIn.length - 1])) throw new Error('rejeu : xfade titre → partie non terminé');
  const res = { nb, ouverture: op.slice(0, K + 1), entree: wIn, titreImages: P0 + wIn.length - 1 };
  if (NO_END) { if (nb !== P0 + N) throw new Error(`rejeu : ${nb} images au lieu de ${P0 + N}`); return res; }
  // xfade partie → fin : poids du carton de fin à l'image E0 + j ; puis fondu de fermeture jusqu'à la dernière image
  if (!zero(op[E0]) || op[E0 + 1] < 0.01) throw new Error(`rejeu : le xfade partie → fin ne commence pas à l'image ${E0}`);
  const wOut = []; for (let j = 0; j <= XF_F; j++) { wOut.push(op[E0 + j]); if (un(wOut[j])) break; }
  if (!un(wOut[wOut.length - 1])) throw new Error('rejeu : xfade partie → fin non terminé');
  const finImages = nb - E0;
  let k0 = finImages - 1; while (k0 > wOut.length - 1 && !un(op[E0 + k0])) k0--;   // dernière image à 100 % avant la fermeture
  return { ...res, sortie: wOut, finImages, fermetureDebut: k0, fermeture: op.slice(E0 + k0, nb) };
}
const REJEU = rejouerMontage();
const TITLE_SHOWN = REJEU.titreImages;           // images du carton titre réellement montrées (make_video : overlay=shortest)
const END_F = NO_END ? 0 : REJEU.finImages;       // images du carton de fin (make_video : « -loop 1 -t END » puis fps=24)
const TOTAL_F = REJEU.nb;
// opacités mesurées → images clés CSS, une par image (interpolation linéaire entre deux images : valeur exacte à chaque image)
const cle = (nom, vals) => `@keyframes ${nom} { ${vals.map((v, j) => `${+(100 * j / (vals.length - 1)).toFixed(6)}% { opacity: ${+v.toFixed(4)}; }`).join(' ')} }`;
const dureeCle = vals => S(T(vals.length - 1));

// --- 3) calques, en intervalles d'images de la partie ---
// « Pourquoi » : pendant sa voix (ou, sans voix, après la consigne estimée) — make_video.mjs:259-264
const whys = [];
for (const c of clips) {
  const nr = narrOf(c.i); if (!nr || !nr.pourquoi_ecran) continue;
  const vc = voiceOf(c.i, 'c'), vp = voiceOf(c.i, 'p');
  const s0 = vp ? PAD + (vc ? vc.dur + PAD : 0) : PAD + estDur(nr && nr.voix), s1 = s0 + (vp ? vp.dur + .8 : Math.max(4, nr.pourquoi_ecran.length / 14));
  let a = -1, b = -1;
  for (let n = c.f0; n <= c.f1; n++) { const t = (n - c.f0) / FPS; if (t >= s0 && t <= s1) { if (a < 0) a = n; b = n; } }
  if (a >= 0) whys.push({ i: c.i, a, b, texte: nb(nr.pourquoi_ecran), s0, s1 });
}
// fenêtre « ressorts en coupe » : étapes de CONF.inset, hors caméra hyd et hors plan déjà en coupe — make_video.mjs:254-256
let simInset = null;
const insetSrc = k => {
  if (jpegOk(inImg(k))) return inImg(k);
  if (!SIM_INSET) return null;
  if (!simInset) {   // une image du plan « hyd » (la caméra de la fenêtre) recadrée 16:10 et réduite à 640 × 400 comme la capture --inset
    const hyd = scan.find(r => r.cam === 'hyd' && jpegOk(fImg(r.k)));
    if (!hyd) return null;
    simInset = path.join(OUT, '.travail', 'fenetre-simulee.png');
    fs.mkdirSync(path.dirname(simInset), { recursive: true });
    ffmpeg(['-i', fImg(hyd.k), '-vf', 'crop=ih*1.6:ih,scale=640:400:flags=lanczos', '-frames:v', '1', simInset]);
    notes.push(`SIMULATION : fenêtre « ressorts en coupe » absente (inset/ pas encore capturé) ; image fixe tirée de f_${String(hyd.k).padStart(5, '0')}.jpg (caméra hyd) recadrée à 640 × 400`);
  }
  return simInset;
};
const insetRuns = [];   // { i, a, b, ks: [k…] (images mobiles), holdFrom } par étape et par suite continue
{
  let cur = null;
  frames.forEach((x, n) => {
    const r = rowByK.get(x.k);
    const on = r && CONF.inset.includes(r.n) && r.cam !== 'hyd' && !r.cut && insetSrc(x.k);
    if (on && cur && cur.i === x.i && cur.b === n - 1) { cur.b = n; cur.list.push(x); return; }
    if (cur) insetRuns.push(cur);
    cur = on ? { i: x.i, a: n, b: n, list: [x] } : null;
  });
  if (cur) insetRuns.push(cur);
}
// compteur de tours (make_video.mjs:140-146, 257) : réservé au scénario A par la ligne 141 ; ralenti (lignes 147, 258) : CONF.slow vide en D
const countRuns = [], slowRuns = [];
{
  let cc = null, cs = null;
  frames.forEach((x, n) => {
    const r = rowByK.get(x.k), pk = plan.frames[x.k];
    const key = r && r.count && CONF.inset.includes(r.n) && SCEN === 'A' ? `${r.count.pass}_${r.count.num}` : null;
    if (key && cc && cc.key === key && cc.b === n - 1) cc.b = n; else { if (cc) countRuns.push(cc); cc = key ? { key, c: r.count, a: n, b: n } : null; }
    const sl = !!(pk && pk.slow && !x.hold);
    if (sl && cs && cs.b === n - 1) cs.b = n; else { if (cs) slowRuns.push(cs); cs = sl ? { a: n, b: n } : null; }
  });
  if (cc) countRuns.push(cc); if (cs) slowRuns.push(cs);
}

// --- 4) voix (make_video.mjs:310-317) ---
// Instants des voix : formule exacte de make_video.mjs (seg.from = début du fondu arrondi au ms, lignes 302-308), et non la grille
// des images : avec une voix d'intro de 7,37 s, la partie commence à 8,070 s pour ffmpeg et la voix y est placée par rapport à 8,070 s,
// alors que la première image de la partie tombe à 8,083 s (image 194). On garde ce décalage de 13 ms tel quel.
const PART_FROM = +(TITLE - XF).toFixed(3), END_FROM = +(TITLE - XF + N / FPS - XF).toFixed(3);
const audio = [];
if (vIntro) audio.push({ v: vIntro, at: .6 });
for (const c of clips) {
  const t0 = PART_FROM + c.f0 / FPS, vc = voiceOf(c.i, 'c'), vp = voiceOf(c.i, 'p');
  if (vc) audio.push({ v: vc, at: t0 + PAD });
  if (vp) audio.push({ v: vp, at: t0 + PAD + (vc ? vc.dur + PAD : 0) });
}
if (vFin && !NO_END) audio.push({ v: vFin, at: END_FROM + .7 });


// --- outils ffmpeg : commun.mjs (outilsFfmpeg, appelé plus haut) ; réduction 3D par moyenne de zone, fenêtre en Lanczos ---
const VF_3D = `${RGB},scale=${W}:${H3}:flags=area+accurate_rnd,format=rgb24`;
const VF_IN = `${RGB},scale=${IN_W}:${IN_H}:flags=lanczos+accurate_rnd,format=rgb24`;

// --- 5) écriture du projet ---
fs.mkdirSync(OUT, { recursive: true });
for (const d of ['assets/3d', 'assets/images', 'assets/fonts', 'compositions', ...(insetRuns.length ? ['assets/fenetre'] : []), ...(audio.length ? ['assets/voix'] : [])]) fs.mkdirSync(path.join(OUT, d), { recursive: true });
for (const f of fs.globSync ? fs.globSync('assets/**/*.sig', { cwd: OUT }) : []) fs.rmSync(path.join(OUT, f));   // anciennes signatures dans assets/
for (const f of fs.readdirSync(path.join(OUT, 'compositions'))) fs.rmSync(path.join(OUT, 'compositions', f));
const tpl = name => fs.readFileSync(path.join(HERE, 'templates', name), 'utf8');
const fill = (s, v) => s.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => { if (!(k in v)) throw new Error(`gabarit : {{${k}}} sans valeur`); return v[k]; });

// polices locales (commun.mjs : cache de make_video.mjs, licences OFL, repli DejaVu signalé)
const fontRules = polices({ OUT, FONTS_CACHE, HERE, notes });
const fontsFor = dir => fontRules.split('{{FONT_DIR}}').join(dir);
const baseCss = fill(tpl('base.css'), { ACCENT: CONF.accent, BADGE_FG: SCEN === 'D' ? '#fff' : '#111518', MAIN_FG: SCEN === 'D' ? '#ff8a80' : '#f2c230', INSET_BOX_W: String(IN_W + 8), INSET_BOX_H: String(IN_H + 34) });
const common = sub => ({ W: String(W), H: String(H), H3: String(H3), BAND: String(BAND), FONTS_CSS: fontsFor(sub ? '../assets/fonts/' : 'assets/fonts/'), BASE_CSS: baseCss });
const writeComp = (name, html) => fs.writeFileSync(path.join(OUT, 'compositions', name), html);

// bandeau de chaque étape (bandHTML de make_video.mjs:117-123, cas D lignes 127-128)
const prog = i => `<div class="prog">${steps.map((s, j) => `<i class="${j < i ? 'done' : j === i ? 'cur' : ''}"></i>`).join('')}</div>`;
const bandeauHTML = i => { const s = steps[i], main = s.act && s.act !== s.title ? s.act : '';
  return fill(tpl('bandeau.html'), { PROG: prog(i), BADGE: `<div class="badge"><span>${SCEN === 'D' && !/^\d/.test(s.n) ? '' : 'Étape'}</span><b>${esc(s.n)}</b></div>`,
    TITRE: nb(esc(s.title)), CHIP: '', MAIN: main ? `<span class="m">${nb(main)}</span>` : '', SMALL: '', REF: CONF.ref }); };
// cartons (make_video.mjs:155-171) — textes du scénario D, à l'identique
fs.copyFileSync(path.join(REPO, 'renders', '01_ensemble.jpg'), path.join(OUT, 'assets/images/01_ensemble.jpg'));
const KB_W = W, KB_H = Math.round(W * 2000 / 3200);   // scale=3200:2000 ramené à la largeur du cadre ; rognage centré de H
writeComp('carton-titre.html', fill(tpl('carton-titre.html'), { ...common(true), IMAGE: '../assets/images/01_ensemble.jpg',
  OUV_DUREE: dureeCle(REJEU.ouverture), OUV_CLES: cle('titre-ouverture', REJEU.ouverture), DUREE_TITRE: S(T(TITLE_SHOWN)),
  KB_W: String(KB_W), KB_H: String(KB_H), KB_TOP: String(-(KB_H - H) / 2), KB_OX: String(W / 2), KB_OY: String(KB_H / 2),
  KB_DUREE: S((TITLE_F - 1) / FPS), KB_ZOOM: '1.06', COULEUR: '#ff5d52', KICKER: 'Rencontre sécurité · Reconstitution',
  TITRE: nb("Accident au démontage du cône d'un mandrin"), SOUS_TITRE: nb('Boulons du cône retirés un par un, dernier boulon desserré à l’impact drill') }));
const LINE = (txt, color) => `<div style="font-family:'Barlow Condensed',sans-serif;font-size:46px;font-weight:600;line-height:1.12;text-wrap:balance;border-left:6px solid ${color};padding-left:22px;margin-bottom:24px">${nb(txt)}</div>`;
if (!NO_END) writeComp('carton-fin.html', fill(tpl('carton-fin.html'), { ...common(true),
  ENTREE_DUREE: dureeCle(REJEU.sortie), ENTREE_CLES: cle('fin-entree', REJEU.sortie),
  FERM_DEBUT: S(T(REJEU.fermetureDebut)), FERM_DUREE: dureeCle(REJEU.fermeture), FERM_CLES: cle('fin-fermeture', REJEU.fermeture),
  KICKER: 'Ce qu’il fallait faire · PRO-OP-DD-005',
  LIGNES: [LINE('Étape 6 : Remettre les 3 boulons longs (bolts) sans bushing', '#57c486'), LINE('Étape 7 : 6 boulons ½ × 6 ½ à dévisser 1 tour à la fois, ordre 1 → 6', '#57c486'), LINE('Jamais un boulon retiré au complet sous charge', '#ff5d52')].join('') }));

// médias : un clip 3D sans perte par étape + l'image figée de fin d'étape ; fenêtre : un clip par suite + image figée
const enc = { encodes: 0, cache: 0 };
const t3d = Date.now();
for (const c of clips) {
  const files = c.rows.map(r => srcOf.get(r.k));
  c.video = `assets/3d/etape-${String(c.i).padStart(2, '0')}.mp4`; c.fige = `assets/3d/etape-${String(c.i).padStart(2, '0')}-fin.png`;
  enc[encodeSeq(files, path.join(OUT, c.video), VF_3D) === 'cache' ? 'cache' : 'encodes']++;
  still(files[files.length - 1], path.join(OUT, c.fige), VF_3D);
}
insetRuns.forEach((r, j) => {
  const moving = r.list.filter(x => !x.hold), held = r.list.filter(x => x.hold);
  r.j = j; r.nMove = moving.length; r.nHold = held.length;
  const name = `assets/fenetre/fenetre-${String(j).padStart(2, '0')}`;
  if (moving.length) { r.video = name + '.mp4'; enc[encodeSeq(moving.map(x => insetSrc(x.k)), path.join(OUT, r.video), VF_IN) === 'cache' ? 'cache' : 'encodes']++; }
  if (held.length) { r.fige = name + '-fin.png'; still(insetSrc(held[0].k), path.join(OUT, r.fige), VF_IN); }
});
const tEnc = (Date.now() - t3d) / 1000;
{ // restes d'un appel précédent (autres étapes, autres suites de fenêtre) : retirés du dossier servi
  const used = new Set([...clips.flatMap(c => [c.video, c.fige]), ...insetRuns.flatMap(r => [r.video, r.fige])].filter(Boolean));
  for (const d of ['assets/3d', 'assets/fenetre']) if (fs.existsSync(path.join(OUT, d)))
    for (const f of fs.readdirSync(path.join(OUT, d))) if (!used.has(`${d}/${f}`)) { fs.rmSync(path.join(OUT, d, f)); fs.rmSync(sigFile(path.join(OUT, d, f)), { force: true }); }
}
// voix : décodées en WAV PCM dans le projet (le serveur de fichiers de HyperFrames ne sert que le dossier du projet).
// Pourquoi pas le MP3 tel quel : HyperFrames prépare chaque piste avec « ffmpeg -ss <début> -t <durée> -i fichier »
// (packages/engine/src/services/audioMixer.ts, prepareAudioTrack) ; sur nos MP3 (délai d'encodeur, start_time 0,046 s)
// cette recherche ajoute 0,134 s de silence en tête (mesuré) : la voix partirait 0,13 s trop tard. En WAV, elle part à l'instant voulu.
// Durée réelle du WAV (en-tête RIFF : taille du bloc data ÷ octets par seconde) : le MP3 décodé est 60 à 70 ms plus court que la
// durée du manifeste (délai et remplissage de l'encodeur) ; data-duration ne doit pas dépasser le média (check : clip_media_fit).
// La durée du manifeste (a.v.dur) reste celle de toute la chronologie, comme dans make_video.mjs.
for (const a of audio) {
  let f = path.resolve(REPO, a.v.file);
  if (!fs.existsSync(f) && MANF) f = path.join(path.dirname(MANF), path.basename(a.v.file));
  if (!fs.existsSync(f)) throw new Error(`voix introuvable : ${a.v.file}`);
  a.orig = f; a.src = `assets/voix/${a.v.id}.wav`;
  const out = path.join(OUT, a.src), key = sig([f], 'pcm_s16le');
  if (!upToDate(out, key)) { ffmpeg(['-i', f, '-map', '0:a:0', '-c:a', 'pcm_s16le', out]); saveSig(out, key); }
  a.durWav = dureeWav(out);
}
for (const f of fs.existsSync(path.join(OUT, 'assets/voix')) ? fs.readdirSync(path.join(OUT, 'assets/voix')) : [])
  if (!audio.some(a => a.src.endsWith('/' + f))) fs.rmSync(path.join(OUT, 'assets/voix', f));   // restes d'un appel précédent

// --- index.html ---
const L = [];   // lignes du corps
const pad = '      ';
const tm = (a, n) => `data-start="${S(T(a))}" data-duration="${S(T(n))}"`;
L.push(`${pad}<!-- carton titre : ${TITLE_SHOWN} images montrées (make_video : TITLE = ${ms(TITLE)} s = max(3,5 ; voix d'intro + 1,2), zoompan de ${TITLE_F} images,`);
L.push(`${pad}     segment coupé à ${TITLE_SHOWN} images par overlay=shortest ; nombre mesuré par le rejeu ffmpeg) -->`);
L.push(`${pad}<div id="carton-titre" class="clip hote-plein hote-carton-titre" data-composition-id="carton-titre" data-composition-src="compositions/carton-titre.html" ${tm(0, TITLE_SHOWN)} data-track-index="2" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
L.push(`${pad}<!-- partie 3D : images ${P0} à ${P0 + N - 1} ; fondu enchaîné d'entrée sur ${REJEU.entree.length - 1} images (opacités mesurées) -->`);
L.push(`${pad}<div class="partie" style="animation-delay: ${S(T(P0))}s">`);
// une sous-composition par étape (compositions/etape-sN.html) : 3D, fin figée, bandeau, fenêtre, compteur, ralenti, « Pourquoi » — temps locaux
const tl = (a, n) => `data-start="${S(T(a))}" data-duration="${S(T(n))}"`;
for (const c of clips) {
  const s = steps[c.i], nR = c.rows.length, nH = c.hold, id = `etape-s${c.i}`, E = [], p2 = '        ';
  E.push(`${p2}<!-- ${nR} images gardées (k ${c.rows[0].k} à ${c.rows[nR - 1].k}) + fin figée ${nH} images (${HOLD_END} + prolongation ${c.prolonge}) -->`);
  E.push(`${p2}<video id="vue3d-s${c.i}" class="vue3d" src="../${c.video}" ${tl(0, nR)} data-media-start="0" data-track-index="0" muted playsinline></video>`);
  E.push(`${p2}<img id="vue3d-s${c.i}-fige" class="clip vue3d" src="../${c.fige}" ${tl(nR, nH)} data-track-index="0" alt="" />`);
  E.push(bandeauHTML(c.i).trimEnd());
  insetRuns.filter(r => r.i === c.i).forEach(r => {
    const a = r.a - c.f0, M = [];
    if (r.video) M.push(`${p2}<video id="fenetre-${r.j}" class="fenetre" src="../${r.video}" ${tl(a, r.nMove)} data-media-start="0" data-track-index="2" muted playsinline></video>`);
    if (r.fige) M.push(`${p2}<img id="fenetre-${r.j}-fige" class="clip fenetre" src="../${r.fige}" ${tl(a + r.nMove, r.nHold)} data-track-index="2" alt="" />`);
    E.push(fill(tpl('fenetre-coupe.html'), { ID: `cadre-fenetre-${r.j}`, DEBUT: S(T(a)), DUREE: S(T(r.b - r.a + 1)), MEDIAS: M.join('\n') }).trimEnd());
  });
  countRuns.filter(r => frames[r.a].i === c.i).forEach((r, j) => E.push(fill(tpl('compteur.html'), { ID: `compteur-s${c.i}-${j}`, DEBUT: S(T(r.a - c.f0)), DUREE: S(T(r.b - r.a + 1)),
    RONDS: [1, 2, 3, 4, 5, 6].map(q => `<i class="${q < r.c.num ? 'done' : q === r.c.num ? 'cur' : ''}">${q}</i>`).join(''), TOUR: String(r.c.pass), TOURS: String(r.c.R), BOULON: String(r.c.num) }).trimEnd()));
  slowRuns.filter(r => frames[r.a].i === c.i).forEach((r, j) => E.push(fill(tpl('ralenti.html'), { ID: `ralenti-s${c.i}-${j}`, DEBUT: S(T(r.a - c.f0)), DUREE: S(T(r.b - r.a + 1)) }).trimEnd()));
  whys.filter(w => w.i === c.i).forEach(w => {
    E.push(`${p2}<!-- « Pourquoi » de ${ms(w.s0)} à ${ms(w.s1)} s après le début de l'étape (bornée à la fin de l'étape) -->`);
    E.push(fill(tpl('pourquoi.html'), { ID: `pourquoi-s${c.i}`, DEBUT: S(T(w.a - c.f0)), DUREE: S(T(w.b - w.a + 1)), TEXTE: esc(w.texte) }).trimEnd());
  });
  writeComp(`${id}.html`, fill(tpl('etape.html'), { ...common(true), ID: id, ETAPE: esc(s.n), TITRE_ETAPE: esc(s.title), CADRE_X: String(IN_X - 4), CADRE_Y: String(IN_Y - 4),
    IN_X: String(IN_X), IN_Y: String(IN_Y), IN_W: String(IN_W), IN_H: String(IN_H), CORPS: E.join('\n') }));
  L.push(`${pad}  <!-- étape ${esc(s.n)} — ${esc(s.title)} -->`);
  L.push(`${pad}  <div id="${id}" class="clip hote-plein hote-etape" data-composition-id="${id}" data-composition-src="compositions/${id}.html" ${tm(P0 + c.f0, nR + nH)} data-track-index="${c.i % 2}" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
}
L.push(`${pad}</div>`);
if (!NO_END) {
  L.push(`${pad}<!-- carton de fin : ${END_F} images (make_video : END = ${ms(END)} s = max(4 ; voix de fin + 1,4), « -loop 1 -t END » à 24 i/s : nombre mesuré) ;`);
  L.push(`${pad}     fondu enchaîné d'entrée, fondu de fermeture de l'image ${REJEU.fermetureDebut} à la dernière (opacités mesurées) -->`);
  L.push(`${pad}<div id="carton-fin" class="clip hote-plein hote-carton-fin" data-composition-id="carton-fin" data-composition-src="compositions/carton-fin.html" ${tm(E0, END_F)} data-track-index="2" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
}
L.push(`${pad}<!-- voix (manifeste ${MANF && fs.existsSync(MANF) ? esc(path.basename(path.dirname(path.dirname(MANF))) + '/' + path.basename(path.dirname(MANF))) : 'aucun'}) : placées comme adelay, mixées sans normalisation -->`);
const TOT = T(TOTAL_F);
audio.forEach((a, j) => {
  // créneau = durée réelle du WAV (arrondie vers le bas au ms), bornée à la fin de la vidéo ; l'instant reste celui de adelay
  const d = Math.floor(Math.min(a.durWav, TOT - a.at) * 1000) / 1000; if (d <= 0) return;
  L.push(`${pad}<audio id="voix-${a.v.id}" src="${a.src}" data-start="${ms(a.at)}" data-duration="${S(d)}" data-media-start="0" data-volume="1" data-track-index="${3 + (j % 2)}"></audio>`);
});
const index = fill(tpl('index.html'), { ...common(false), GENERATED: `scénario ${SCEN}, ${new Date().toISOString().slice(0, 10)}`, TITRE_PAGE: `Accident au démontage du cône — montage HyperFrames (essai ${SCEN})`,
  COMP_ID: `video-${SCEN.toLowerCase()}`, DUREE: S(TOT), FPS: String(FPS),
  ENTREE_DUREE: dureeCle(REJEU.entree), ENTREE_CLES: cle('hf-fondu-entree', REJEU.entree),
  TEXTE_RENDU: TEXTE_HF ? '' : `      /* Le compilateur de HyperFrames injecte html,body,*{text-rendering:geometricPrecision} (même rendu du texte d'un système
         à l'autre). make_video.mjs rend ses bandeaux avec la valeur par défaut de Chromium (auto) : sans ce retour à « auto »,
         le texte des bandeaux est placé 1 px plus haut et dessiné autrement (PSNR du bandeau 24 dB au lieu de 31 dB).
         Même règle (sélecteur *), déclarée après : elle l'emporte. --texte-hyperframes la retire.
         CONSÉQUENCE : avec « auto », la mise en page du texte (et la réduction FIT des bandeaux) dépend du navigateur. Seul un rendu
         ou un snapshot fait par hf.sh (headless shell Chromium 141 imposé) fait foi ; l'aperçu du Studio, dans un Chrome complet,
         peut placer et réduire le texte autrement (et « preview » est de toute façon interdit : il injecte GSAP depuis un CDN). */
      html, body, * { text-rendering: auto; }`,
  CORPS: L.join('\n'), AJUSTER_JS: fill(tpl('ajuster-texte.js'), { NB_BANDEAUX: String(clips.length) }) });
fs.writeFileSync(path.join(OUT, 'index.html'), index);
fs.rmSync(path.join(OUT, '.travail'), { recursive: true, force: true });

// --- contrôle hors ligne du projet produit (commun.mjs) : aucune URL externe, chaque famille de police a son @font-face local ---
controleHorsLigne(OUT, fontRules);

// --- rapport ---
const rapport = {
  scenario: SCEN, frames: FRAMES, narration: MANF && fs.existsSync(MANF) ? MANF : null, fps: FPS, taille: [W, H],
  duree_s: TOT, images: TOTAL_F,
  segments: [{ nom: 'carton titre', debut: 0, images: TITLE_SHOWN }, { nom: 'partie 3D', debut: P0, images: N }, ...(NO_END ? [] : [{ nom: 'carton de fin', debut: E0, images: END_F }])],
  // montage de make_video.mjs rejoué : durées exactes (pour encoder.mjs : atrim = t_make_video) et opacités mesurées image par image
  montage: { titre_s: TITLE, titre_images_zoompan: TITLE_F, titre_images_montrees: TITLE_SHOWN, fin_s: NO_END ? null : END, fin_images: END_F,
    t_make_video: MV_T, opacites: { ouverture: REJEU.ouverture, entree_partie: REJEU.entree, ...(NO_END ? {} : { entree_fin: REJEU.sortie, fermeture_debut: REJEU.fermetureDebut, fermeture: REJEU.fermeture }) } },
  etapes: clips.map(c => ({ i: c.i, n: steps[c.i].n, titre: steps[c.i].title, debut: P0 + c.f0, images_gardees: c.rows.length, k: [c.rows[0].k, c.rows[c.rows.length - 1].k], fin_figee: c.hold, prolongation: c.prolonge })),
  pourquoi: whys.map(w => ({ i: w.i, debut: P0 + w.a, images: w.b - w.a + 1, texte: w.texte })),
  fenetre: insetRuns.map(r => ({ i: r.i, debut: P0 + r.a, images: r.b - r.a + 1, mobiles: r.nMove, figees: r.nHold })),
  compteur: countRuns.length, ralenti: slowRuns.length,
  voix: audio.map(a => ({ id: a.v.id, debut_s: +a.at.toFixed(3), adelay_ms: Math.round(a.at * 1000), duree_s: a.v.dur, duree_wav_s: +a.durWav.toFixed(4), source: a.orig })),
  encodage: { ...enc, secondes: +tEnc.toFixed(1) }, notes,
};
fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(rapport, null, 1));
console.log(`projet HyperFrames : ${OUT}`);
console.log(rapport.segments.map(s => `  ${(s.debut / FPS).toFixed(3).padStart(8)} s  ${s.nom} (${s.images} images)`).join('\n'));
console.log(`étapes : ${clips.map(c => `${steps[c.i].n}=${c.rows.length}+${c.hold}`).join(' · ')}`);
console.log(`calques : ${whys.length} « Pourquoi », ${insetRuns.length} fenêtres, ${countRuns.length} compteurs, ${slowRuns.length} ralentis · voix : ${audio.length} passages`);
console.log(`clips : ${enc.encodes} encodés, ${enc.cache} déjà à jour (${tEnc.toFixed(1)} s)`);
console.log(`durée ${TOT.toFixed(3)} s (${TOTAL_F} images)`);
for (const n of notes) console.log('! ' + n);
