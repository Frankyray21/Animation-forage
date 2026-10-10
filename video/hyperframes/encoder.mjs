#!/usr/bin/env node
// Encodage final d'une séquence PNG rendue par HyperFrames (« hf.sh render … --format png-sequence »), à l'identique de
// video/make_video.mjs:310-328 :
//   - vidéo : norm de make_video (settb, setpts, fps=24, format=yuv420p, setsar=1), libx264 preset slow CRF 27, yuv420p, -r 24,
//     +faststart ; conversion RVB → YUV par la matrice par défaut de ffmpeg (BT.601), flux non balisé : même rendu des couleurs
//     que la vidéo A actuelle (procedure_boyles_h.mp4) sur la même page ;
//   - voix : MP3 d'origine du manifeste, aresample=48000 + adelay (instants calculés par gen.mjs comme make_video), amix
//     normalize=0, apad, atrim à la durée t de make_video ; AAC 128 kbit/s (mono comme les voix) ;
//   - image d'aperçu (--poster) : make_video.mjs:328 (-ss 2.2, -q:v 5).
// La capture de HyperFrames en PNG est sans perte : la seule perte est cet encodage, le même que celui de make_video.mjs.
//
// Scénarios D et A (rapport.json de gen.mjs ou de gen-a.mjs) ; essai court de A (--fenetre) : voix coupées au début de la fenêtre.
// Usage : node video/hyperframes/encoder.mjs --build $HF_TRAVAIL/D --images $HF_TRAVAIL/D-png --out $HF_TRAVAIL/accident_boyles_h.mp4
//                          [--poster $HF_TRAVAIL/accident_poster.jpg] [--crf 27] [--threads 1]
// N'écrit que --out et --poster, qui doivent être dans HF_TRAVAIL (défaut : $TMPDIR/clam-hf), hors du dépôt et du dossier des images
// (chemins réels) : la vidéo vérifiée est ensuite copiée à la main dans video/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = fs.realpathSync(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.resolve(HERE, '..', '..');   // encoder.mjs est dans video/hyperframes du dépôt
const ARGV = process.argv.slice(2);
const arg = (k, d) => { const i = ARGV.indexOf('--' + k); return i < 0 ? d : ARGV[i + 1]; };
const FFMPEG = process.env.FFMPEG || process.env.HYPERFRAMES_FFMPEG_PATH || 'ffmpeg';
const TRAVAIL = path.resolve(process.env.HF_TRAVAIL || path.join(os.tmpdir(), 'clam-hf'));
const BUILD = path.resolve(arg('build', path.join(TRAVAIL, 'D')));
const IMAGES = path.resolve(arg('images', ''));
const OUT = path.resolve(arg('out', ''));
const POSTER = arg('poster', null) ? path.resolve(arg('poster')) : null;
const CRF = String(+arg('crf', 27)), THREADS = String(+arg('threads', 1) || 1);
if (!arg('images') || !arg('out')) throw new Error('usage : node encoder.mjs --build BUILD --images DOSSIER_PNG --out FICHIER.mp4 [--poster FICHIER.jpg]');

const rap = JSON.parse(fs.readFileSync(path.join(BUILD, 'rapport.json'), 'utf8'));
// garde-fou : sorties dans HF_TRAVAIL seulement (chemin réel de l'ancêtre existant), jamais dans le dépôt ni le dossier des images
const reel = p => { let q = p; const r = []; while (!fs.existsSync(q)) { r.unshift(path.basename(q)); q = path.dirname(q); } return path.join(fs.realpathSync(q), ...r); };
const inside = (p, dir) => p === dir || p.startsWith(dir + path.sep);
{
  const TRAVAIL_R = reel(TRAVAIL), REPO_R = reel(REPO);
  if (inside(TRAVAIL_R, REPO_R) || inside(REPO_R, TRAVAIL_R)) throw new Error(`HF_TRAVAIL ${TRAVAIL} (${TRAVAIL_R}) : doit être hors du dépôt ${REPO_R}`);
  for (const f of [OUT, POSTER].filter(Boolean)) {
    const R = reel(f);
    if (!inside(R, TRAVAIL_R) || R === TRAVAIL_R) throw new Error(`${f} (${R}) : la sortie doit être dans ${TRAVAIL_R} (HF_TRAVAIL)`);
    for (const p of [REPO_R, rap.frames && reel(path.resolve(rap.frames)), reel(IMAGES)].filter(Boolean))
      if (inside(R, p)) throw new Error(`${f} (${R}) : interdit (${p})`);
  }
}
const FPS = rap.fps, [W, H] = rap.taille;
if (!rap.montage || rap.montage.t_make_video == null) throw new Error(`${BUILD}/rapport.json : produit par une ancienne version de gen.mjs (pas de montage.t_make_video)`);

// séquence : frame_000001.png … frame_N.png (numérotation de HyperFrames), N = images du projet, 1280 × 720
const imgs = fs.readdirSync(IMAGES).filter(f => /^frame_\d{6}\.png$/.test(f)).sort();
if (imgs.length !== rap.images) throw new Error(`${IMAGES} : ${imgs.length} images, le projet en a ${rap.images}`);
imgs.forEach((f, i) => { if (f !== `frame_${String(i + 1).padStart(6, '0')}.png`) throw new Error(`${IMAGES} : séquence trouée à ${f}`); });
{
  const b = Buffer.alloc(24), fd = fs.openSync(path.join(IMAGES, imgs[0]), 'r'); fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (w !== W || h !== H) throw new Error(`${imgs[0]} : ${w} × ${h}, attendu ${W} × ${H}`);
}

// graphe : make_video.mjs:274 (norm), 318-326 (voix, encodage)
const inputs = ['-framerate', String(FPS), '-start_number', '1', '-i', path.join(IMAGES, 'frame_%06d.png')];
const chains = [`[0:v]settb=AVTB,setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1[v]`];
const labels = rap.voix.map((v, j) => {
  if (!fs.existsSync(v.source)) throw new Error(`voix introuvable : ${v.source}`);
  inputs.push('-i', v.source);
  // scénario A, essai court (--fenetre) : voix commencée avant la fenêtre → début coupé (coupe_s) ; sinon graphe identique à make_video
  chains.push(`[${1 + j}:a]aresample=48000${v.coupe_s ? `,atrim=start=${v.coupe_s},asetpts=PTS-STARTPTS` : ''},adelay=${v.adelay_ms}:all=1[a${j}]`);
  return `[a${j}]`;
});
const amap = [];
if (labels.length) {
  // durée t de make_video ; essai court de A (--fenetre) : durée de la fenêtre. « fenetre » de D = liste des fenêtres « ressorts
  // en coupe » (jamais une fenêtre d'essai) ; un rapport de A antérieur au renommage portait la fenêtre d'essai sous « fenetre » (objet).
  const essai = rap.fenetre_essai || (rap.scenario === 'A' && rap.fenetre && !Array.isArray(rap.fenetre) ? rap.fenetre : null);
  const tAudio = essai ? essai.duree_s : rap.montage.t_make_video;
  if (typeof tAudio !== 'number' || !(tAudio > 0)) throw new Error(`${BUILD}/rapport.json : durée audio introuvable`);
  chains.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad,atrim=0:${tAudio.toFixed(3)}[aout]`);
  amap.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '128k');
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const run = args => { const r = spawnSync(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'] }); if (r.status !== 0) throw new Error(`ffmpeg : code ${r.status}`); };
const t0 = Date.now();
run(['-y', '-hide_banner', '-loglevel', 'error', '-filter_complex_threads', '1', ...inputs, '-filter_complex', chains.join(';\n'), '-map', '[v]', ...(amap.length ? amap : ['-an']),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', '-threads', THREADS, OUT]);
const tEnc = (Date.now() - t0) / 1000;
if (POSTER) run(['-y', '-hide_banner', '-loglevel', 'error', '-ss', '2.2', '-i', OUT, '-frames:v', '1', '-q:v', '5', POSTER]);
console.log(`${OUT} : ${imgs.length} images, ${labels.length} voix, ${(fs.statSync(OUT).size / 1e6).toFixed(2)} Mo, encodé en ${tEnc.toFixed(1)} s` + (POSTER ? ` · ${POSTER}` : ''));
