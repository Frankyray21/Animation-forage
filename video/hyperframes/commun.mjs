// Outils communs aux deux scénarios (gen.mjs pour D, gen-a.mjs pour A) : code déplacé tel quel de gen.mjs (ffmpeg, clips sans
// perte avec signatures, polices locales, durée des WAV, contrôle hors ligne du projet produit). Aucune dépendance hors bibliothèque standard.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

// --- outils ffmpeg (ex-gen.mjs:292-321) ---
export function outilsFfmpeg({ FFMPEG, THREADS, GOP, FORCE, OUT, FPS }) {
  function ffmpeg(args) {
    const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-threads', THREADS, ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
    if (r.status !== 0) throw new Error(`ffmpeg : code ${r.status} (${args.join(' ').slice(0, 200)}…)`);
  }
  // réduction : décodage JPEG → RVB pleine définition (suréchantillonnage bilinéaire de la chrominance), puis moyenne de zone,
  // comme PIL Image.BOX dans compose.py:44-45 (mesuré sur f_00100 : 53,9 dB, écart max. 4/255) ; fenêtre : Lanczos (compose.py:54)
  const RGB = 'scale=w=iw:h=ih:flags=bilinear+accurate_rnd+full_chroma_int+full_chroma_inp,format=gbrp';
  const ENC = ['-c:v', 'libx264rgb', '-qp', '0', '-preset', 'veryfast', '-g', GOP, '-pix_fmt', 'rgb24', '-threads', THREADS];   // H.264 RVB sans perte
  const sig = (files, vf) => crypto.createHash('sha1').update(JSON.stringify([vf, ENC, files.map(f => { const s = fs.statSync(f); return [f, s.size, s.mtimeMs]; })])).digest('hex');
  // signatures des clips déjà encodés (hors du dossier servi par HyperFrames) : un nouvel appel ne réencode que ce qui a changé
  const sigFile = out => path.join(OUT, '.signatures', path.relative(OUT, out).replace(/[\\/]/g, '__') + '.sig');
  function upToDate(out, key) { return !FORCE && fs.existsSync(out) && fs.existsSync(sigFile(out)) && fs.readFileSync(sigFile(out), 'utf8') === key; }
  const saveSig = (out, key) => { fs.mkdirSync(path.join(OUT, '.signatures'), { recursive: true }); fs.writeFileSync(sigFile(out), key); };
  function encodeSeq(files, out, vf) {
    const key = sig(files, vf); if (upToDate(out, key)) return 'cache';
    const tmp = path.join(OUT, '.travail', 'seq-' + path.basename(out, '.mp4'));
    fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    const ext = path.extname(files[0]);
    files.forEach((f, j) => fs.symlinkSync(f, path.join(tmp, String(j).padStart(5, '0') + ext)));
    ffmpeg(['-framerate', String(FPS), '-start_number', '0', '-i', path.join(tmp, '%05d' + ext), '-vf', vf, ...ENC, '-r', String(FPS), '-an', out]);
    fs.rmSync(tmp, { recursive: true, force: true });
    saveSig(out, key); return 'encodé';
  }
  function still(file, out, vf) {
    const key = sig([file], vf); if (upToDate(out, key)) return;
    ffmpeg(['-i', file, '-vf', vf, '-frames:v', '1', out]); saveSig(out, key);
  }
  return { ffmpeg, RGB, ENC, sig, sigFile, upToDate, saveSig, encodeSeq, still };
}

// --- polices (ex-gen.mjs:331-367) : feuille Google Fonts mise en cache par make_video.mjs (même URL, même nom de cache,
// make_video.mjs:84, 179-184), fichiers copiés dans OUT/assets/fonts ; repli DejaVu signalé. Renvoie les règles @font-face,
// avec {{FONT_DIR}} à la place du dossier des polices. ---
export const FONT_URL = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap';
export function polices({ OUT, FONTS_CACHE, HERE, notes }) {
  const cacheName = url => path.join(FONTS_CACHE, url.replace(/[^a-z0-9.]+/gi, '_').slice(-180));
  let fontRules = '';
  const cssFile = cacheName(FONT_URL);
  let ok = fs.existsSync(cssFile);
  if (ok) {
    const css = fs.readFileSync(cssFile, 'utf8'), urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)\s]+/g) || [])];
    ok = urls.every(u => fs.existsSync(cacheName(u)));
    if (ok) {
      fontRules = css;
      for (const u of urls) { const name = u.split('/').slice(-3).join('-'); fs.copyFileSync(cacheName(u), path.join(OUT, 'assets/fonts', name)); fontRules = fontRules.split(u).join('{{FONT_DIR}}' + name); }
    }
  }
  for (const f of fs.readdirSync(path.join(OUT, 'assets/fonts'))) {   // restes d'un appel précédent (autre jeu de polices)
    const garder = ok ? /\.woff2$|^OFL-/.test(f) : /^DejaVu/.test(f);
    if (!garder) fs.rmSync(path.join(OUT, 'assets/fonts', f));
  }
  const OFL = fs.readFileSync(path.join(HERE, 'templates', 'licences', 'OFL-1.1.txt'), 'utf8');
  const ofl = (fichier, copyright) => fs.writeFileSync(path.join(OUT, 'assets/fonts', fichier), `${copyright}\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\nThis license is copied below, and is also available with a FAQ at:\nhttp://scripts.sil.org/OFL\n\n${OFL}`);
  if (ok) {   // licences des polices copiées (OFL 1.1 : chaque copie porte la notice et le texte de la licence)
    ofl('OFL-Barlow-Condensed.txt', 'Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow)');
    ofl('OFL-IBM-Plex-Sans.txt', 'Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"\n(name table of the woff2 files: "Copyright 2019 IBM Corp. All rights reserved.")');
  } else {   // police manquante : polices locales du système (DejaVu), signalées ; pas de DejaVu condensée sur cette machine
    const dv = '/usr/share/fonts/truetype/dejavu/';
    const sys = [['Barlow Condensed', 'DejaVuSans-Bold.ttf', '100 900'], ['IBM Plex Sans', 'DejaVuSans.ttf', '100 550'], ['IBM Plex Sans', 'DejaVuSans-Bold.ttf', '551 900']]
      .filter(([, f]) => fs.existsSync(dv + f));
    for (const fam of ['Barlow Condensed', 'IBM Plex Sans'])
      if (!sys.some(([g]) => g === fam)) throw new Error(`polices : ni le cache ${FONTS_CACHE} ni une police DejaVu de ${dv} pour « ${fam} »`);
    for (const [fam, f, wt] of sys) { fs.copyFileSync(dv + f, path.join(OUT, 'assets/fonts', f)); fontRules += `@font-face { font-family: '${fam}'; src: url({{FONT_DIR}}${f}) format('truetype'); font-weight: ${wt}; }\n`; }
    const lic = '/usr/share/doc/fonts-dejavu-core/copyright';
    if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(OUT, 'assets/fonts', 'DejaVu-LICENCE.txt'));
    else notes.push(`POLICES : licence DejaVu introuvable (${lic}) ; à joindre avant toute diffusion du projet`);
    notes.push(`POLICES : feuille Google Fonts absente du cache ${FONTS_CACHE} ; remplacées par DejaVu (système : ${[...new Set(sys.map(s => s[1]))].join(', ')}) — rendu du texte différent de make_video.mjs`);
  }
  return fontRules;
}

// --- durée réelle d'un WAV (ex-gen.mjs:422-433) : en-tête RIFF, taille du bloc data ÷ octets par seconde ---
export function dureeWav(f) {
  const b = fs.readFileSync(f);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${f} : pas un WAV`);
  let o = 12, octetsParSeconde = 0;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4); let n = b.readUInt32LE(o + 4);
    if (id === 'fmt ') octetsParSeconde = b.readUInt32LE(o + 16);
    if (id === 'data') { if (n === 0xffffffff || o + 8 + n > b.length) n = b.length - o - 8; return n / octetsParSeconde; }
    o += 8 + n + (n & 1);
  }
  throw new Error(`${f} : bloc data absent`);
}

// --- contrôle hors ligne du projet produit (ex-gen.mjs:509-529) : aucune URL externe, et chaque famille de police nommée a son
// @font-face local. HyperFrames télécharge en silence depuis Google Fonts toute famille employée sans @font-face (et l'échec ne
// bloque pas le rendu) : une famille ajoutée à la main dans un gabarit doit donc arrêter le générateur ici. ---
export function controleHorsLigne(OUT, fontRules) {
  const GENERIQUES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'emoji', 'math', 'inherit', 'initial', 'unset', 'revert']);
  const declarees = new Set([...fontRules.matchAll(/font-family:\s*['"]?([^;'"]+)['"]?\s*;/g)].map(m => m[1].trim().toLowerCase()));
  const fichiers = ['index.html', ...fs.readdirSync(path.join(OUT, 'compositions')).map(f => path.join('compositions', f))];
  for (const f of fichiers) {
    const html = fs.readFileSync(path.join(OUT, f), 'utf8');
    // toute URL à schéma réseau, ou adresse sans schéma (« //hôte… ») dans un attribut de ressource, un url() ou un @import :
    // avec ou sans chemin, port, adresse IP ou « ? » collé à l'hôte (l'ancienne forme exigeait « hôte.tld/ »)
    const url = html.match(/\b(?:https?|wss?|ftp):\/\/|(?:src|href|srcset|poster|data)\s*=\s*["']?\s*\/\/|url\(\s*["']?\s*\/\/|@import\s+["']\s*\/\//i);
    if (url) throw new Error(`${f} : adresse externe « ${url[0]} » (tout doit être local)`);
    const familles = [];
    for (const m of html.matchAll(/font-family\s*:\s*([^;}"]*(?:"[^"]*"[^;}"]*)*)/g)) familles.push(...m[1].split(','));
    for (const m of html.matchAll(/(?:^|[;{\s])font\s*:\s*[^;}]*?\d(?:px|pt|em|rem|%)(?:\s*\/\s*[\d.]+[a-z%]*)?\s+([^;}]+)/g)) familles.push(...m[1].split(','));
    for (const x of familles) {
      const nom = x.trim().replace(/^['"]|['"]$/g, '').replace(/&quot;/g, '').trim().toLowerCase();
      if (!nom || GENERIQUES.has(nom) || nom.startsWith('var(')) continue;
      if (!declarees.has(nom)) throw new Error(`${f} : police « ${nom} » sans @font-face local (HyperFrames la téléchargerait)`);
    }
  }
}
