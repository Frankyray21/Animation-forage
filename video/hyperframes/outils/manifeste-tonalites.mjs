#!/usr/bin/env node
// Manifeste de voix « tonalités » : même format et MÊMES DURÉES que le manifeste --fake de video/tts.py (donc exactement la même
// chronologie que la copie de make_video lancée avec --fake : fins prolongées, « Pourquoi », instants des voix), mais chaque
// passage est une tonalité audible de fréquence propre au lieu d'un silence : on entend et on mesure où chaque voix tombe dans
// n'importe quelle fenêtre d'essai (--fenetre), y compris une voix commencée avant la fenêtre (début coupé).
//   passage j (ordre du manifeste) : sinus 330 + 55·j Hz, 24 kHz mono MP3 (comme tts.py), volume 0,5, fondus de 15 ms.
// Usage : node video/hyperframes/outils/manifeste-tonalites.mjs MANIFESTE_FAKE DOSSIER_SORTIE [--repo DIR]   (écrit DOSSIER_SORTIE/<scen>/,
//         hors du dépôt)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const [src, outDir] = process.argv.slice(2).filter((a, i, l) => !a.startsWith('--') && l[i - 1] !== '--repo');
if (!src || !outDir) throw new Error('usage : node outils/manifeste-tonalites.mjs MANIFESTE_FAKE DOSSIER_SORTIE [--repo DIR]');
const DEPOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');   // dépôt qui contient cet outil
const i = process.argv.indexOf('--repo'), REPO = path.resolve(i < 0 ? DEPOT : process.argv[i + 1]);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const fake = JSON.parse(fs.readFileSync(src, 'utf8'));
const D = path.join(path.resolve(outDir), fake.scen);
const dans = (p, dir) => (p + path.sep).startsWith(dir + path.sep);   // chemin réel du parent de la sortie, comparé au dépôt (--repo et celui de l'outil)
const sortieR = path.join(fs.realpathSync(path.dirname(path.resolve(outDir))), path.basename(path.resolve(outDir)));
if ([REPO, DEPOT].some(d => dans(sortieR, fs.realpathSync(d)))) throw new Error('sortie dans le dépôt : refusée');
fs.mkdirSync(D, { recursive: true });
const items = fake.items.map((x, j) => {
  const hz = 330 + 55 * j, f = path.join(D, `${x.id}.mp3`), d = x.dur;
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `sine=frequency=${hz}:sample_rate=24000:duration=${d}`,
    '-af', `volume=0.5,afade=t=in:d=0.015,afade=t=out:st=${Math.max(0, d - 0.015).toFixed(3)}:d=0.015`, '-ac', '1', '-q:a', '4', f], { stdio: 'inherit' });
  if (r.status) throw new Error('ffmpeg');
  return { ...x, file: path.relative(REPO, f), essai: `tonalité ${hz} Hz` };
});
fs.writeFileSync(path.join(D, 'manifeste.json'), JSON.stringify({ scen: fake.scen, voix: 'tonalités (durées du manifeste --fake)', items }, null, 1));
console.log(`${items.length} passages → ${path.join(D, 'manifeste.json')}`);
for (const x of items) console.log(`  ${x.id.padEnd(6)} ${x.dur.toFixed(2).padStart(6)} s  ${x.essai}`);
