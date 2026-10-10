# Montage HyperFrames des vidéos de formation

Ce dossier monte les deux vidéos de formation avec [HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen, Apache-2.0),
CLI **0.8.144** figée, tout hors ligne. La 3D n'est pas recalculée : elle vient de la capture image par image de
`video/capture.mjs`. Le générateur produit une composition HTML qui reprend exactement le montage de `video/make_video.mjs` :
bandeaux, encadrés, fondus, cartons, durées et voix. HyperFrames la rend en PNG sans perte, puis `encoder.mjs` encode comme
make_video.

```
video/capture.mjs             3D image par image (lancée par make_video.mjs --bands-only)
  → video/hyperframes/gen.mjs   projet HyperFrames : index.html, compositions/, assets/ (3D en clips sans perte, polices, images)
  → hf.sh render                capture PNG sans perte (headless shell Chromium 141, environnement vide, hors ligne)
  → encoder.mjs                 x264 CRF 27 preset slow, yuv420p, AAC mono : réglages de make_video.mjs → MP4 + image d'aperçu
```

`video/make_video.mjs` reste la chaîne de référence : son montage est rejoué par gen.mjs, et les outils de `outils/` comparent
les deux chaînes (chronologie image par image, images, son).

## Les deux vidéos

| Fichier (dans `video/`) | Scénario | Contenu | Images |
|---|---|---|---|
| `procedure_boyles_h.mp4`, `procedure_poster.jpg` | A, « Procédure respectée » | Étapes 1 à 9 de PRO-OP-DD-005 en trois parties séparées par les rendus Blender, gros plans des pièces retirées avec fondus, compteur de tours, « Ralenti × ½ », fenêtre « ressorts en coupe », encadrés « Pourquoi », carton de fin « À retenir » | 2 773 (115,5 s, ≈ 9 Mo) |
| `accident_boyles_h.mp4`, `accident_poster.jpg` | D, reconstitution de l'accident | Boulons du cône retirés un par un, dernier boulon à l'impact drill, 8 étapes, fenêtre « ressorts en coupe », encadrés « Pourquoi », carton de fin « Ce qu'il fallait faire » | 1 714 (71,4 s, ≈ 4,1 Mo) |

Format commun : H.264 High (libx264 preset slow, CRF 27), yuv420p, 1280 × 720, 24 i/s, `+faststart`, couleurs BT.601 non
balisées (comme make_video.mjs). Image d'aperçu : image à 2,2 s (carton titre), JPEG `-q:v 5`. **Sans son pour l'instant** :
la voix québécoise s'ajoutera par un simple remontage (voir « Ajouter la voix »).

## Fichiers

| Chemin | Rôle |
|---|---|
| `gen.mjs` | Générateur (Node ≥ 22, bibliothèque standard ; ffmpeg) ; scénario D ici, `--scen A` → `gen-a.mjs` |
| `gen-a.mjs` | Scénario A : trois parties, rendus Blender, gros plans et fondus, ralenti, compteur, fenêtre ; `--fenetre`, `--chronologie-seule` |
| `commun.mjs` | Outils communs : ffmpeg et clips à signatures, polices locales, durée des WAV, contrôle hors ligne du projet |
| `encoder.mjs` | Encodage final de la séquence PNG, exactement comme make_video.mjs (vidéo, voix, image d'aperçu) |
| `hf.sh` | **Seule façon de lancer HyperFrames** (voir « Sécurité et hors ligne ») |
| `templates/` | Gabarits HTML, CSS et JS de la composition ; `licences/OFL-1.1.txt` (polices) |
| `installation/` | `package.json` et `package-lock.json` de l'arbre npm validé (HyperFrames 0.8.144 et ses dépendances exactes), pour `npm ci` hors du dépôt |
| `outils/netns-lo.py` | Utilisé par hf.sh : active `lo` dans l'espace réseau vide |
| `outils/chronologie-make-video.mjs` | Copie de contrôle de make_video.mjs (4 points modifiés) arrêtée avant ffmpeg : `chronologie.json` + `compose.json` |
| `outils/comparer-chronologie.py` | Chronologie de gen.mjs contre celle de make_video, image par image (et minutage HTML pour A) |
| `outils/comparer-fenetre.py` | MP4 de HyperFrames contre la vidéo de make_video, image par image, bilan par segment (vidéo entière en flux) |
| `outils/comparer-videos.py` | Deux MP4 du même montage (D surtout) : flux, PSNR par zone (3D, bandeau, « Pourquoi », fenêtre), son |
| `outils/comparer-png.py` | Deux séquences PNG identiques ? (reproductibilité du rendu) |
| `outils/tester-hors-ligne.mjs` | Contrôle hors ligne : 10 adresses externes refusées, aucun faux positif sur les projets de `HF_TRAVAIL` |
| `outils/manifeste-tonalites.mjs`, `outils/mesurer-tonalites.py` | Voix de test audibles (une tonalité par passage, durées de `tts.py --fake`) et leur mesure dans un MP4 |

Rien de ce dossier n'écrit dans le dépôt : projets, PNG, MP4 et caches vont dans `HF_TRAVAIL` ; la vidéo vérifiée est copiée
à la main dans `video/`.

## Installation (une fois, hors du dépôt)

- Node ≥ 22, Python 3, ffmpeg avec libx264 et ffprobe, util-linux (`unshare`, `setpriv`), `realpath` (coreutils).
  Pour les outils de comparaison et de mesure (`comparer-*.py`, `mesurer-tonalites.py`) : `python3 -m pip install numpy pillow`.
- HyperFrames, dans un dossier à part (l'installation n'a rien à faire dans le dépôt : hf.sh la refuse), **depuis l'arbre
  validé** de `installation/` : `npm ci` reprend exactement les versions qui ont servi aux rendus (puppeteer-core 25.13.0,
  sharp 0.35.5, @puppeteer/browsers 3.2.4…), alors qu'un simple `npm i hyperframes@0.8.144` prendrait les dernières versions
  permises par ses plages `^`. (Le `.gitignore` de `installation/` y garde ces deux fichiers, ignorés partout ailleurs.)
  ```sh
  DEPOT=/chemin/vers/Animation-forage
  mkdir -p ~/outils-hf && cp "$DEPOT"/video/hyperframes/installation/package*.json ~/outils-hf/
  (cd ~/outils-hf && npm ci)
  export HYPERFRAMES=~/outils-hf/node_modules/.bin/hyperframes
  ```
- Navigateur : headless shell Chromium 141 (révision Playwright 1194) :
  `npx playwright@1.56.1 install --only-shell chromium` (dans `~/.cache/ms-playwright` ou `$PLAYWRIGHT_BROWSERS_PATH`).
- Polices : la feuille Google Fonts et les woff2 de make_video.mjs dans `CDN_CACHE`. Le cache se remplit à la première
  exécution de make_video.mjs (étape 1 ci-dessous, avec accès réseau). Sans elles, gen.mjs prend DejaVu et le signale dans
  `rapport.json` (texte rendu autrement).
- Télémétrie : `cd "$HF_TRAVAIL" && "$DEPOT/video/hyperframes/hf.sh" telemetry disable` (une fois par `HF_TRAVAIL` ; elle est
  aussi coupée par les variables d'environnement de hf.sh).

## Variables d'environnement

| Variable | Utilisée par | Rôle (défaut) |
|---|---|---|
| `HYPERFRAMES` | hf.sh | **Requise** : `…/node_modules/.bin/hyperframes` de l'installation à part ; version 0.8.144 vérifiée à chaque appel |
| `HF_NAVIGATEUR` | hf.sh, chronologie-make-video.mjs | Headless shell (défaut : `$PLAYWRIGHT_BROWSERS_PATH`, sinon `~/.cache/ms-playwright`, puis `chromium_headless_shell-1194/chrome-linux/headless_shell`) |
| `HF_TRAVAIL` | tous | Dossier de travail **hors du dépôt** : projets, PNG, MP4, HOME/TMPDIR/cache de HyperFrames dans `.hf/` (défaut : `$TMPDIR/clam-hf`, sinon `/tmp/clam-hf`) |
| `FFMPEG`, `FFPROBE` | gen.mjs, encoder.mjs, hf.sh, outils | ffmpeg (avec libx264) et ffprobe (défaut : ceux du `PATH` ; gen.mjs et encoder.mjs lisent aussi `HYPERFRAMES_FFMPEG_PATH`) |
| `CDN_CACHE` | gen.mjs, chronologie-make-video.mjs | Cache des polices de make_video.mjs (défaut : `$TMPDIR/clam-cdn-cache`, comme make_video.mjs) ; `--fonts-cache` le remplace |
| `PLAYWRIGHT` | chronologie-make-video.mjs (et make_video.mjs) | Module `playwright/index.mjs` (défaut : `node_modules/playwright` du dépôt) |
| `TMPDIR` | tous | Base des défauts ci-dessus et du dossier de capture de make_video.mjs (`$TMPDIR/clam-video-frames-<scén.>`) |

## Refaire la vidéo de la procédure (A)

```sh
DEPOT=/chemin/vers/Animation-forage
export HYPERFRAMES=~/outils-hf/node_modules/.bin/hyperframes HF_TRAVAIL=${TMPDIR:-/tmp}/clam-hf
HFSH=$DEPOT/video/hyperframes/hf.sh
F=${TMPDIR:-/tmp}/clam-video-frames-A                     # capture 3D (défaut de make_video.mjs et de gen.mjs)
mkdir -p "$HF_TRAVAIL"

# 1) capture 3D et bandeaux de référence, arrêt avant la composition (plusieurs heures en WebGL logiciel ; --gpu --jobs 1 : minutes)
node "$DEPOT/video/make_video.mjs" --scen A --frames "$F" --bands-only
ls "$F"/f_*.jpg | wc -l; ls "$F"/ins_*.jpg | wc -l; ls "$F"/inset/in_*.jpg | wc -l

# 2) projet HyperFrames, sans voix (s'arrête s'il manque une image 3D, de gros plan ou de fenêtre)
nice -n 19 node "$DEPOT/video/hyperframes/gen.mjs" --scen A --frames "$F" --muet       # → $HF_TRAVAIL/A
grep -c SIMULATION "$HF_TRAVAIL/A/rapport.json"                                         # doit afficher 0
cd "$HF_TRAVAIL" && "$HFSH" lint A --verbose                                            # 0 erreur, 0 avertissement

# 3) rendu PNG sans perte (≈ 15 à 20 min, ≈ 6 Go de disque), puis encodage (≈ 2,5 min)
rm -rf "$HF_TRAVAIL/A-png"
(cd "$HF_TRAVAIL/A" && "$HFSH" render . --format png-sequence --output "$HF_TRAVAIL/A-png" \
  --workers 1 --fps 24 --video-frame-format png --no-browser-gpu) > "$HF_TRAVAIL/A-png.log" 2>&1
nice -n 19 node "$DEPOT/video/hyperframes/encoder.mjs" --build "$HF_TRAVAIL/A" --images "$HF_TRAVAIL/A-png" \
  --out "$HF_TRAVAIL/procedure_boyles_h.mp4" --poster "$HF_TRAVAIL/procedure_poster.jpg"

# 4) contrôle, copie dans le dépôt, nettoyage
"${FFPROBE:-ffprobe}" -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames,color_space:format=duration \
  -of compact "$HF_TRAVAIL/procedure_boyles_h.mp4"     # h264 High 1280×720 yuv420p 24/1 nb_frames=2773 color_space=unknown 115.54 s
cp "$HF_TRAVAIL/procedure_boyles_h.mp4" "$HF_TRAVAIL/procedure_poster.jpg" "$DEPOT/video/"
rm -rf "$HF_TRAVAIL/A-png" "$HF_TRAVAIL/.hf/cache"/*
# 5) site : nouvelle VERSION dans sw.js, libellés à jour (voir « Après une nouvelle vidéo »)
```

## Refaire la vidéo de l'accident (D)

```sh
F=${TMPDIR:-/tmp}/clam-video-frames-D                     # mêmes variables que pour A
node "$DEPOT/video/make_video.mjs" --scen D --frames "$F" --bands-only
nice -n 19 node "$DEPOT/video/hyperframes/gen.mjs" --scen D --frames "$F" --muet       # → $HF_TRAVAIL/D
grep -c SIMULATION "$HF_TRAVAIL/D/rapport.json"                                         # 0
cd "$HF_TRAVAIL" && "$HFSH" lint D --verbose
rm -rf "$HF_TRAVAIL/D-png"
(cd "$HF_TRAVAIL/D" && "$HFSH" render . --format png-sequence --output "$HF_TRAVAIL/D-png" \
  --workers 1 --fps 24 --video-frame-format png --no-browser-gpu) > "$HF_TRAVAIL/D-png.log" 2>&1   # ≈ 10 min, ≈ 4 Go
nice -n 19 node "$DEPOT/video/hyperframes/encoder.mjs" --build "$HF_TRAVAIL/D" --images "$HF_TRAVAIL/D-png" \
  --out "$HF_TRAVAIL/accident_boyles_h.mp4" --poster "$HF_TRAVAIL/accident_poster.jpg"
"${FFPROBE:-ffprobe}" -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames:format=duration \
  -of compact "$HF_TRAVAIL/accident_boyles_h.mp4"      # h264 High 1280×720 yuv420p 24/1 nb_frames=1714 71.42 s
cp "$HF_TRAVAIL/accident_boyles_h.mp4" "$HF_TRAVAIL/accident_poster.jpg" "$DEPOT/video/"
rm -rf "$HF_TRAVAIL/D-png" "$HF_TRAVAIL/.hf/cache"/*
# puis le site : nouvelle VERSION dans sw.js, libellés à jour (voir « Après une nouvelle vidéo »)
```

Un nouvel appel de gen.mjs ne réencode que les clips dont les images ont changé (signatures dans `.signatures/` du projet) ;
`--force` réencode tout.

## Après une nouvelle vidéo (dans le même commit que les MP4)

1. **`sw.js`** : changer `VERSION` (`clam-v9`, puis `clam-v10`…). La nouvelle installation compare la taille de chaque copie
   hors ligne à celle en ligne et télécharge la nouvelle vidéo en arrière-plan. Sans ce changement, le service worker ne repère
   la vidéo republiée qu'à son prochain démarrage (relevé de taille, filet de sécurité), et l'aperçu JPEG n'est rafraîchi
   qu'en arrière-plan (copie locale d'abord).
2. **Libellés**, si la durée, le son ou la taille changent : légende de `#vidAccSec` dans `index.html` ; notes de `#vidSec` et
   `#vidSecD` dans `animation.html` ; tableau « Vidéos » et texte d'intro de `README.md` ; tableaux de `video/README.md` et de
   ce fichier ; « environ 17 Mo » et `VID_EST` (somme des deux vidéos) dans `pwa.js`, « (13 Mo) » dans le commentaire de `sw.js`.
3. Publier `sw.js` avec les vidéos et leurs aperçus (`git add` des nouveaux fichiers : un aperçu absent du dépôt fait échouer
   toute l'installation du service worker).

## Ajouter la voix (plus tard : remontage seulement)

La capture 3D ne change pas. La voix allonge les étapes quand elle dépasse l'image, et décale donc toute la chronologie :
on refait gen.mjs, le rendu et l'encodage.

```sh
python3 "$DEPOT/video/tts.py" --scen A --voix Gabrielle          # Amazon Polly fr-CA → video/narration/A/*.mp3 + manifeste.json
nice -n 19 node "$DEPOT/video/hyperframes/gen.mjs" --scen A --frames "$F" --narration "$DEPOT/video/narration/A/manifeste.json"
# puis lint, render, encoder.mjs comme plus haut (même chose pour D) : AAC LC 48 kHz mono 128 kbit/s, MP3 d'origine
# enfin « Après une nouvelle vidéo » : VERSION de sw.js, et libellés (« sans son pour l'instant », durées, tailles)
```

Sans `--muet` ni `--narration`, gen.mjs prend `video/narration/<scén.>/manifeste.json` s'il existe (comme make_video.mjs).
Le projet contient les voix en WAV (placées à l'instant de `adelay` de make_video) ; encoder.mjs remixe les MP3 d'origine
avec le graphe audio de make_video (aresample, adelay, amix normalize=0, apad, atrim).

Essai sans service de synthèse : `python3 video/tts.py --scen A --fake --out "$HF_TRAVAIL/narration"` (silences aux durées
estimées), puis `node video/hyperframes/outils/manifeste-tonalites.mjs "$HF_TRAVAIL/narration/A/manifeste.json"
"$HF_TRAVAIL/narration-tonalites"` (une tonalité par passage, mêmes durées) ; après rendu,
`python3 -B video/hyperframes/outils/mesurer-tonalites.py FICHIER.mp4 "${FFMPEG:-ffmpeg}"` donne où tombe chaque voix. Pour un essai court
avec voix, `--fenetre DÉBUT-FIN` (A) coupe la vidéo en gardant la chronologie complète.

## Vérifications

```sh
# chronologie de make_video elle-même (copie de contrôle, bandeaux par le headless shell, hors ligne) puis comparaison :
node "$DEPOT/video/hyperframes/outils/chronologie-make-video.mjs" --scen A --frames "$F"      # [--narration MANIFESTE]
python3 -B "$DEPOT/video/hyperframes/outils/comparer-chronologie.py" "$HF_TRAVAIL/A/rapport.json" \
  "$HF_TRAVAIL/mv-chronologie-A/frames/montage" "$F/scan.json"                                 # BILAN : 0 écart(s)
# check complet sur une copie (check écrit dans le projet)
cd "$HF_TRAVAIL" && cp -al A A-copie-check && "$HFSH" check A-copie-check; rm -rf A-copie-check
# contre la vidéo que make_video fait du même montage (sa sortie et son aperçu dans un dossier à part ; compose.py et Pillow)
node "$DEPOT/video/make_video.mjs" --scen A --frames "$F" --skip-capture --muet --out "$HF_TRAVAIL/ref/procedure_boyles_h.mp4"
python3 -B "$DEPOT/video/hyperframes/outils/comparer-fenetre.py" "$HF_TRAVAIL/A/rapport.json" \
  "$HF_TRAVAIL/procedure_boyles_h.mp4" "$HF_TRAVAIL/ref/procedure_boyles_h.mp4" --ffmpeg "${FFMPEG:-ffmpeg}"
python3 -I "$DEPOT/video/hyperframes/outils/comparer-videos.py" "$HF_TRAVAIL/D/rapport.json" \
  "$HF_TRAVAIL/accident_boyles_h.mp4" "$HF_TRAVAIL/ref/accident_boyles_h.mp4"                # D : images par zone et son
node "$DEPOT/video/hyperframes/outils/tester-hors-ligne.mjs"                                   # 10/10 refusés, projets acceptés
```

Résultats de validation (2026-10-10, capture v4) : chronologie de A et de D contre make_video.mjs : **0 écart** image par image
(A sans son : 2 773 images, 116 éléments minutés ; D sans son : 1 714 images, dont partie 3D 1 558 ; D avec voix `--fake` :
partie 3D 2 010 images, voix ≤ 1,5 ms) ; lint 0 erreur, 0 avertissement ;
check sur A sans erreur ni avertissement ; deux rendus de suite identiques au bit près. Contre la vidéo de make_video : titre
≈ 36,5 dB, parties 3D ≈ 36 à 37 dB (zone 3D ≈ 38,5 dB), carton de fin ≈ 34 dB ; rendus Blender 26 à 33 dB (Ken Burns continu,
voir plus bas).

Valeurs typiques du rendu : capture 0,3 à 0,42 s par image (1 processus), extraction des clips 2 à 3 min, encodage ≈ 0,055 s
par image. Disque : PNG ≈ 1,9 Go (A) ou ≈ 1,1 Go (D), autant pendant le rendu, et ≈ 1,5 à 2 Go de cache d'extraction.

## Options

| gen.mjs | Effet |
|---|---|
| `--scen A\|D` | Scénario (défaut D) |
| `--frames DIR` | Capture : `plan.json`, `scan.json`, `f_*.jpg`, `inset/in_*.jpg` ; A aussi `inserts.json`, `ins_*.jpg` (défaut `$TMPDIR/clam-video-frames-<scén.>`) |
| `--narration MANIFESTE` / `--muet` | Manifeste de `tts.py` (défaut : `video/narration/<scén.>/manifeste.json` s'il existe) ; `--muet` : sans voix |
| `--out DIR` | Projet produit (défaut `$HF_TRAVAIL/<scén.>`) ; doit être un sous-dossier de `HF_TRAVAIL` |
| `--repo DIR` | Dépôt lu (narration.json, renders/, voix) ; défaut : le dépôt qui contient gen.mjs |
| `--simuler-manquantes`, `--simuler-fenetre` | Essais seulement : image manquante remplacée par la plus proche (signalé « SIMULATION » dans `rapport.json`) |
| `--texte-hyperframes` | Garde `text-rendering: geometricPrecision` injecté par HyperFrames (le texte s'écarte alors de make_video) |
| `--fonts-cache DIR` | Cache des polices (défaut `$CDN_CACHE`) ; vide → repli DejaVu signalé |
| `--threads 1`, `--gop 24`, `--force` | Fils ffmpeg, GOP des clips, réencoder même les clips à jour |
| D seulement : `--only-steps 0,2-4`, `--limit-frames N`, `--no-end`, `--simuler-pourquoi E:P` | Essais courts : étapes choisies, N premières images par étape, sans carton de fin ; encadré « Pourquoi » d'un autre passage |
| A seulement : `--fenetre DÉBUT-FIN`, `--chronologie-seule` | Essai court sur les images DÉBUT à FIN − 1 de la vidéo complète (chronologie complète, puis coupée) ; `rapport.json` seul, pour comparer-chronologie.py |

| encoder.mjs | Effet |
|---|---|
| `--build DIR`, `--images DIR`, `--out F.mp4` | Projet (pour `rapport.json`), séquence `frame_000001.png…` de HyperFrames, MP4 produit (dans `HF_TRAVAIL`) |
| `--poster F.jpg` | Image d'aperçu comme make_video.mjs (`-ss 2.2`, `-q:v 5`) |
| `--crf 27`, `--threads 1` | CRF de make_video ; fils x264 |

## Sécurité et hors ligne

hf.sh est la seule façon de lancer HyperFrames ; ne jamais appeler `$HYPERFRAMES` directement.

- **Environnement vide** (`env -i` puis liste blanche : PATH, HOME, TMPDIR, LANG, variables `HYPERFRAMES_*`) : aucun jeton, clé
  ni courriel n'atteint Chromium, dont les rapports de plantage enregistrent tout l'environnement du processus.
- **Hors ligne** : espace réseau vide, `lo` seul (activé par `outils/netns-lo.py`) : `unshare -n` en root ; pour un compte sans
  droits, `unshare -rn` (espace de noms utilisateur, même coupure ; Chromium n'y gagne aucun droit sur la machine). Tout accès
  réseau caché échoue au lieu de passer : police Google Fonts complétée en silence, téléchargement de navigateur, télémétrie,
  `snapshot --describe`. Si ni l'un ni l'autre n'est permis (noyau sans espaces de noms, espaces de noms utilisateur coupés),
  hf.sh l'**annonce par un avertissement** et la commande tourne sans isolation réseau ; les autres protections restent.
- **Navigateur imposé** (`HYPERFRAMES_BROWSER_PATH` = headless shell Chromium 141) : sans lui, HyperFrames prendrait un autre
  Chrome ou en téléchargerait un. La mise en page du texte dépend du navigateur : seul un rendu par hf.sh fait foi.
- **HOME, TMPDIR et cache** dans `$HF_TRAVAIL/.hf/` ; télémétrie coupée par les variables (`HYPERFRAMES_NO_TELEMETRY`,
  `DO_NOT_TRACK`, `HYPERFRAMES_NO_UPDATE_CHECK`, `HYPERFRAMES_SKIP_SKILLS`, `HYPERFRAMES_NO_AUTO_INSTALL`) et par
  `telemetry disable`.
- **Version vérifiée** (0.8.144) avant chaque commande ; **`nice -n 19`** toujours ; en root, **CAP_SYS_NICE retirée** de
  l'ensemble limite (`setpriv --bounding-set -sys_nice`), sans quoi Chromium remontait ses processus à nice −8 ou 0.
- **Sous-commandes permises** : `lint`, `check`, `render`, `snapshot` (avec `--describe false` ajouté d'office), `timeline`,
  `--version`, `telemetry disable`. Tout le reste est refusé : `preview` (le Studio injecte GSAP depuis jsDelivr), `usage`, `auth`,
  `login`, `publish`, `cloud`, `browser`, `doctor`, `upgrade`, `init`…
- **Jamais dans le dépôt** : hf.sh refuse un `HF_TRAVAIL`, un dossier courant ou un binaire HyperFrames situés dans le dépôt,
  et tout argument qui désigne un chemin du dépôt, quelle que soit l'option (`--output`, `--frames-cache-dir`, `-o=…`, `-o/…`) :
  toute valeur qui contient « / » ou qui existe est contrôlée.
- **gen.mjs** n'écrit que dans `--out`, sous-dossier de `HF_TRAVAIL` (chemins réels, liens résolus), jamais dans le dépôt (celui
  qui contient gen.mjs comme celui de `--repo`), le dossier des images ni un dossier de capture (`plan.json` ou `scan.json`) ; il vérifie que le projet ne contient **aucune
  adresse externe** (`http(s)://`, `ws(s)://`, `ftp://`, `//hôte` dans `src`, `href`, `srcset`, `poster`, `data`, `url()`,
  `@import`) et que **chaque famille de police** a son `@font-face` local (sinon HyperFrames la téléchargerait en silence).
- **encoder.mjs** n'écrit que `--out` et `--poster`, dans `HF_TRAVAIL`, hors du dépôt, du dossier des images et des PNG.
- **chronologie-make-video.mjs** n'écrit que dans son dossier de travail (sous `HF_TRAVAIL`) ; la copie de make_video refuse tout
  `--frames` autre que le sien (make_video vide `FRAMES/montage` sans condition) et tourne avec `env -i`, le headless shell,
  `unshare -n` (ou `-rn` sans droits) si possible et `nice -n 19`.
- Aucun secret n'est lu ni écrit : seul `tts.py` (voix) lit les identifiants AWS, et rien ici ne les transmet.

## Écarts connus avec make_video.mjs

1. **Lissage du texte** : HyperFrames dessine le texte des calques posés sur la 3D en niveaux de gris (règle `will-change`,
   rendu reproductible), make_video en sous-pixel ; même position, même taille, mêmes retours à la ligne.
2. **Ken Burns** (carton titre, rendus Blender) : zoom continu `transform: scale()` au lieu des recadrages entiers de `zoompan`,
   qui avancent par sauts ; même minutage et même cadrage. Choix voulu (mouvement plus régulier).
3. **Opacités des fondus** : mesurées image par image sur la chaîne de make_video, à ±1/255 près (arrondis de xfade).
4. **Encodage** : mêmes réglages, mais entrée PNG sans perte au lieu de JPEG : une perte de moins, pas identique au bit près.
5. `text-rendering: auto` est rétabli après la règle injectée par HyperFrames (bandeaux 1 px plus haut sinon).

## Licences

- **HyperFrames** (HeyGen) : Apache-2.0. Outil installé à part, ni copié ni redistribué ; la vidéo ne contient que des pixels.
  Le headless shell Chromium (Playwright) est lui aussi un outil installé à part.
- **Polices** Barlow Condensed (Copyright 2017 The Barlow Project Authors) et IBM Plex Sans (Copyright 2017 IBM Corp., nom
  réservé « Plex ») : SIL Open Font License 1.1 (`templates/licences/OFL-1.1.txt`). gen.mjs copie les woff2 dans
  `assets/fonts/` de chaque projet avec leur notice et le texte de la licence ; repli DejaVu avec sa licence.
- **Rendus Blender** du dépôt (`renders/01_ensemble.jpg`, `02_face_mandrin.jpg`, `03_coupe.jpg`, `04_couvercle_retire.jpg`) :
  œuvres du projet (rendus Cycles du modèle du dépôt), copiées telles quelles dans `assets/images/` des projets.
