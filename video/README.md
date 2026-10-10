# Vidéos de formation

Deux vidéos pour la formation sur le démontage du cône du mandrin (PRO-OP-DD-005), montées avec HyperFrames
(`video/hyperframes/`, détails dans [hyperframes/README.md](hyperframes/README.md)) :

| Fichier | Scénario | Contenu | Durée |
|---|---|---|---|
| `procedure_boyles_h.mp4` + `procedure_poster.jpg` | A, « Procédure respectée » | Intro à deux voix et rendus Blender, étapes 1 à 9 calées sur la voix, « À retenir », questions de l'équipe ; **avec le son** (dialogue ElevenLabs, AAC mono 48 kHz 128 kbit/s) | 147,5 s (3 540 images, ≈ 11 Mo) |
| `accident_boyles_h.mp4` + `accident_poster.jpg` | D, reconstitution de l'accident | Boulons du cône retirés un par un, dernier boulon desserré à l'impact drill, carton de fin « Ce qu'il fallait faire » | 71,4 s (1 714 images, ≈ 4,1 Mo) |

Format commun : H.264 High (libx264, preset slow, CRF 27), yuv420p, 1280 × 720, 24 i/s, `+faststart`, couleurs BT.601 non
balisées. **Procédure avec le son** : vidéo calée sur l'audio du dialogue (voir « Voix » et [hyperframes/synchro/README.md](hyperframes/synchro/README.md)) ;
accident sans son pour l'instant. Image d'aperçu :
le carton titre (image à 2,2 s).

Mise en page : la 3D occupe le haut de l'image (1280 × 620) et un bandeau de 100 px en dessous donne la barre des étapes, le
numéro et le titre de l'étape, et la consigne. Dans la procédure, cette consigne est le texte exact de l'encadré « procédure »
de l'animation, sans reformulation : texte principal en jaune, détail (repères, numéros de pièce, clé) en gris. Les plans où
le travailleur porte les pièces à la table, et ses marches entre le banc et la table, sont coupés. À leur place, un gros plan
tournant (2,5 s, fondus de 8 images) montre la ou les pièces retirées, posées sur la table et en surbrillance ; le bandeau
affiche alors « Pièces retirées » et leurs numéros. Calques posés sur la 3D : encadré « Pourquoi » (en haut à gauche),
compteur de tours du desserrage en étoile et repère « Ralenti × ½ » (procédure, étape 7), fenêtre « ressorts en coupe »
(en bas à droite ; étape 7, et étape « ! » de l'accident). Fin d'étape figée 0,6 s ; fondus enchaînés de 0,5 s entre les parties.

Montage de la procédure (avec la voix, `gen.mjs --synchro`) : titre sur `renders/01_ensemble.jpg`, puis `03_coupe`, `04_couvercle_retire`
et `02_face_mandrin` pendant l'intro à deux voix, étapes 1–9 calées sur « Étape N », « À retenir » (3 lignes), questions de
l'équipe. Montage muet d'origine (sans `--synchro`, inchangé) : titre (3,5 s), étapes 1–3, `02_face_mandrin` (3 s), étapes 4–5,
`03_coupe` et `04_couvercle_retire` (3 s chacun), étapes 6–9, fin (4 s). Les rendus Blender ont un Ken Burns (zoom
1,00 → 1,06) au-dessus du bandeau. L'accident : titre, les 8 étapes d'un seul tenant, fin.

## Chaîne de montage

```
capture.mjs (3D image par image, lancée par make_video.mjs)
  → hyperframes/gen.mjs   composition HyperFrames (bandeaux, calques, fondus, cartons, voix) dans $HF_TRAVAIL, hors du dépôt
  → hyperframes/hf.sh render --format png-sequence   rendu PNG sans perte, headless shell Chromium 141, hors ligne
  → hyperframes/encoder.mjs   encodage x264/AAC aux réglages de make_video.mjs → MP4 + image d'aperçu, copiés ensuite ici
```

gen.mjs ne recalcule pas la 3D et ne réinvente pas le montage : il rejoue celui de `make_video.mjs` (durées, nombre d'images,
opacités des fondus mesurés image par image) et le transpose en composition HTML. `make_video.mjs` reste la **chaîne de
référence et de comparaison** : la chronologie de gen.mjs lui est identique image par image (0 écart pour A et pour D).

## Fichiers

- `capture.mjs` : capture image par image de l'animation d'`animation.html`. La page est servie par un petit serveur local.
  Une copie modifiée en mémoire reçoit les crochets de capture : une image calculée sur demande avec dt = 1/24 s, une horloge
  virtuelle pour la respiration du travailleur, un rendu sautable, la vue 3D seule sans encadré ni puces, et des repères sans
  le × de fermeture. Réglages : qualité haute, coupe automatique, numéros des boulons, travailleur visible, rendu suréchantillonné
  2× (`--ss`). Modes :
  - `--scan` : relevé sans rendu → `scan.json` (pour chaque image : plan de caméra, coupe, consigne de l'encadré procédure, image
    gardée ou non, compteur de tours) ; `plan.json` (étapes, temps de chaque image, ralentis) est écrit à chaque appel ;
  - (par défaut) : rendu des seules images gardées → `f_00000.jpg…`. Une tranche (`--from`, `--to`) rejoue d'abord les images
    précédentes sans rendu, si bien que le résultat est identique à une capture d'un seul tenant ;
  - `--inserts` : gros plans des pièces retirées → `ins_<étape>_<n>.jpg` et `inserts.json`. Chaque gros plan est placé là où
    commence le plan coupé, avec la pièce montrée à la fin du plan de table (`--insat pull` : au moment où elle sort du mandrin) ;
  - `--inset 7` (avec `--keepfrom scan.json`, 640 × 400, sans bandeau) : fenêtre « ressorts en coupe » → `inset/in_*.jpg` ;
    `--slow` : ralentis de l'animation.
- `hyperframes/` : générateur de la composition (`gen.mjs`, `gen-a.mjs`, `commun.mjs`), gabarits, lanceur sécurisé de
  HyperFrames (`hf.sh`), encodage (`encoder.mjs`), outils de vérification (`outils/`).
- `make_video.mjs` : chaîne de référence. Capture en tranches parallèles équilibrées (`--jobs`), puis bandeaux, encadrés et
  cartons rendus en PNG par chromium (le texte trop long est réduit, jamais coupé), composition par `compose.py`, montage et
  encodage ffmpeg. Sert aussi à lancer la capture (`--bands-only` : capture et bandeaux, arrêt avant la composition).
- `compose.py` (Pillow) : composition image par image de make_video.mjs. La 3D est réduite par moyenne de zone, le bandeau collé
  en dessous ; au retour d'un gros plan, seules les 18 dernières images du plan sont gardées (travailleur immobile), ou aucune
  si le plan fait moins de 40 images (sauf l'étape 9).
- `narration.json` : textes validés de la narration et des encadrés « Pourquoi » ; `tts.py` : voix off (Amazon Polly, fr-CA).

## Refaire les vidéos

Prérequis : Node ≥ 22, ffmpeg avec libx264 et ffprobe, Python 3, util-linux (`unshare`, `setpriv`) ; pour la capture,
Playwright et chromium (`npm i --no-save playwright && npx playwright install chromium`, ou `PLAYWRIGHT=…/playwright/index.mjs`) ;
pour la comparaison avec make_video et les outils de mesure, `python3 -m pip install pillow numpy` ; pour le rendu,
HyperFrames 0.8.144 installé **hors du dépôt** depuis l'arbre npm validé (`hyperframes/installation/`, dépendances exactes)
et le headless shell Chromium 141 :

```sh
mkdir -p ~/outils-hf && cp "$(git rev-parse --show-toplevel)"/video/hyperframes/installation/package*.json ~/outils-hf/
(cd ~/outils-hf && npm ci)                                       # HyperFrames 0.8.144 et l'arbre validé, pas les dernières versions
npx playwright@1.56.1 install --only-shell chromium            # chromium_headless_shell-1194
```

Procédure (A) ; pour l'accident, remplacer `A` par `D`, et les noms de sortie par `accident_boyles_h.mp4` et
`accident_poster.jpg` (1 714 images attendues) :

```sh
DEPOT=$(git rev-parse --show-toplevel)
export HYPERFRAMES=~/outils-hf/node_modules/.bin/hyperframes HF_TRAVAIL=${TMPDIR:-/tmp}/clam-hf
HFSH=$DEPOT/video/hyperframes/hf.sh
F=${TMPDIR:-/tmp}/clam-video-frames-A
mkdir -p "$HF_TRAVAIL"

node "$DEPOT/video/make_video.mjs" --scen A --frames "$F" --bands-only      # capture 3D (+ polices dans CDN_CACHE), arrêt avant le montage
nice -n 19 node "$DEPOT/video/hyperframes/gen.mjs" --scen A --frames "$F" --muet      # → $HF_TRAVAIL/A ; s'arrête s'il manque une image
grep -c SIMULATION "$HF_TRAVAIL/A/rapport.json"                                        # 0
cd "$HF_TRAVAIL" && "$HFSH" lint A --verbose                                           # 0 erreur, 0 avertissement
rm -rf "$HF_TRAVAIL/A-png"
(cd "$HF_TRAVAIL/A" && "$HFSH" render . --format png-sequence --output "$HF_TRAVAIL/A-png" \
  --workers 1 --fps 24 --video-frame-format png --no-browser-gpu) > "$HF_TRAVAIL/A-png.log" 2>&1
nice -n 19 node "$DEPOT/video/hyperframes/encoder.mjs" --build "$HF_TRAVAIL/A" --images "$HF_TRAVAIL/A-png" \
  --out "$HF_TRAVAIL/procedure_boyles_h.mp4" --poster "$HF_TRAVAIL/procedure_poster.jpg"
"${FFPROBE:-ffprobe}" -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames:format=duration \
  -of compact "$HF_TRAVAIL/procedure_boyles_h.mp4"       # h264 High 1280×720 yuv420p 24/1, 2773 images, 115.54 s
cp "$HF_TRAVAIL/procedure_boyles_h.mp4" "$HF_TRAVAIL/procedure_poster.jpg" "$DEPOT/video/"
rm -rf "$HF_TRAVAIL/A-png" "$HF_TRAVAIL/.hf/cache"/*                                  # ≈ 2 Go de PNG + cache d'extraction
```

**Après la copie dans `video/`, dans le même commit** : changer `VERSION` dans `sw.js` (`clam-v9`…) pour que les copies hors
ligne déjà enregistrées soient comparées à la nouvelle vidéo et renouvelées en arrière-plan (sans ce changement, le service
worker ne la repère qu'à son prochain démarrage) ; mettre à jour les libellés si la durée, le son ou la taille changent (voir
« Voix », étape 4) ; `git add` des nouveaux fichiers (un aperçu absent du dépôt fait échouer l'installation du service worker).

Durées : la capture 3D prend plusieurs heures en WebGL logiciel sur 4 cœurs. Avec une carte graphique,
`node video/make_video.mjs --gpu --jobs 1 …` ouvre chromium dans une fenêtre visible et calcule les images sur la carte : la
capture prend quelques minutes (la ligne « WebGL : … » du journal nomme la carte utilisée). Ensuite, gen.mjs prend de quelques
secondes à 2 min, le rendu HyperFrames ≈ 15 à 20 min pour A et ≈ 10 min pour D, l'encodage 1 à 3 min. Prévoir ≈ 6 Go de
disque pour A, ≈ 4 Go pour D, dans `HF_TRAVAIL`.

Variables : `HYPERFRAMES` (requis pour hf.sh), `HF_TRAVAIL` (dossier de travail hors dépôt, défaut `$TMPDIR/clam-hf`),
`HF_NAVIGATEUR` (headless shell ; défaut : `chromium_headless_shell-1194` de `$PLAYWRIGHT_BROWSERS_PATH` ou de
`~/.cache/ms-playwright`), `FFMPEG` et `FFPROBE` (défaut : ceux du `PATH`), `CDN_CACHE` (polices et fichiers CDN téléchargés
par `curl`, qui suit le mandataire HTTPS ; défaut `$TMPDIR/clam-cdn-cache`), et pour la capture `PLAYWRIGHT`, `CHROME`,
`THREE_DIR` (copie locale du paquet `three@0.160.0` au lieu du CDN).

Pour contrôler quelques images 3D, capture seule : `node video/capture.mjs --out /tmp/f --from 800 --to 801`. `--info` affiche
les étapes et leur durée. La capture reprend là où elle s'est arrêtée avec `--skip-existing`.

## Voix

**Procédure (fait, 2026-10-10)** : la voix est un dialogue à deux voix enregistré d'un seul tenant dans ElevenLabs (abonnement de
l'auteur ; script `hyperframes/synchro/A/script.json`). La vidéo est calée dessus par `gen.mjs --scen A --muet --synchro`, puis
l'audio d'origine est posé tel quel (sans traitement, −19,6 LUFS) : voir [hyperframes/synchro/README.md](hyperframes/synchro/README.md).

**Autre voie (voix de synthèse placée par passage)**, pour l'accident ou sans enregistrement d'un seul tenant, sans refaire la capture :

1. `python3 "$DEPOT/video/tts.py" --scen A --voix Gabrielle` (Amazon Polly, voix neuronales fr-CA ; identifiants AWS dans
   l'environnement) → `video/narration/A/*.mp3` et `video/narration/A/manifeste.json` (durée de chaque passage) ;
2. `node "$DEPOT/video/hyperframes/gen.mjs" --scen A --frames "$F" --narration "$DEPOT/video/narration/A/manifeste.json"` : chaque voix est placée
   comme dans make_video.mjs (intro sur le titre, consigne puis « Pourquoi » au début de chaque étape, conclusion sur le carton
   de fin) et l'étape est prolongée quand la voix dépasse l'image ;
3. lint, rendu et encodage comme plus haut : encoder.mjs mixe les MP3 d'origine (AAC mono 128 kbit/s) ;
4. après la copie dans `video/` : changer `VERSION` dans `sw.js` (`clam-v9`…), pour que les copies hors ligne muettes soient
   comparées et renouvelées ; retirer « sans son pour l'instant » et mettre à jour les durées (la voix prolonge des étapes) dans
   `index.html` (légende de `#vidAccSec`), `animation.html` (notes de `#vidSec` et `#vidSecD`), `README.md` (tableau « Vidéos »
   et intro) et les deux README de `video/` ; recalculer « environ 17 Mo » et `VID_EST` dans `pwa.js`, et « (13 Mo) » dans le
   commentaire de `sw.js`, d'après les nouvelles tailles (l'AAC ajoute ≈ 1 Mo par minute).

Même chose pour D. Pour régler le montage sans service de synthèse : `tts.py --fake --out "$HF_TRAVAIL/narration"` (silences
aux durées estimées) et `video/hyperframes/outils/manifeste-tonalites.mjs` (une tonalité audible par passage) ; voir
[hyperframes/README.md](hyperframes/README.md).

## Chaîne de référence (make_video.mjs) et comparaison

`make_video.mjs` fait tout le montage par Pillow et ffmpeg ; il sert de référence pour vérifier la chaîne HyperFrames.
**Sans `--out`, il écrit dans `video/`** : pour une comparaison, toujours donner une sortie hors dépôt.

```sh
python3 -m pip install pillow numpy
node "$DEPOT/video/make_video.mjs" --scen A --frames "$F" --skip-capture --muet --out "$HF_TRAVAIL/ref/procedure_boyles_h.mp4"
node "$DEPOT/video/make_video.mjs" --scen A --frames "$F" --skip-capture --bands-only    # bandeaux et cartons seulement (montage/)
node "$DEPOT/video/hyperframes/outils/chronologie-make-video.mjs" --scen A --frames "$F" # chronologie de make_video (copie de contrôle)
python3 -B "$DEPOT/video/hyperframes/outils/comparer-chronologie.py" "$HF_TRAVAIL/A/rapport.json" \
  "$HF_TRAVAIL/mv-chronologie-A/frames/montage" "$F/scan.json"                          # BILAN : 0 écart(s)
python3 -B "$DEPOT/video/hyperframes/outils/comparer-fenetre.py" "$HF_TRAVAIL/A/rapport.json" \
  "$HF_TRAVAIL/procedure_boyles_h.mp4" "$HF_TRAVAIL/ref/procedure_boyles_h.mp4"          # PSNR image par image, par segment
```

Options de make_video.mjs : `--scen A|D`, `--frames DIR` (défaut `$TMPDIR/clam-video-frames-<scén.>`), `--jobs 3`, `--gpu`,
`--skip-capture`, `--bands-only`, `--muet`, `--crf 27`, `--out FICHIER` ; variables `FFMPEG`, `PYTHON` (défaut `python3` ; sous
Windows, `PYTHON=python`), `PLAYWRIGHT`, `CHROME`, `THREE_DIR`, `CDN_CACHE`.

Écarts connus de la chaîne HyperFrames, voulus ou négligeables : texte des calques en niveaux de gris (sous-pixel dans
make_video), Ken Burns continu au lieu des recadrages entiers de `zoompan`, opacités des fondus à ±1/255, encodage aux mêmes
réglages mais depuis des PNG sans perte.

## Hors ligne et sécurité

- HyperFrames ne se lance que par `video/hyperframes/hf.sh` : environnement vidé (`env -i`, aucun jeton ni clé ne passe au
  navigateur), espace réseau vide (`unshare -n` en root, `unshare -rn` sans droits ; si aucun n'est permis, avertissement
  explicite et rendu sans isolation),
  télémétrie coupée, headless shell imposé, version 0.8.144 vérifiée, `nice -n 19` (et CAP_SYS_NICE retirée en root).
  Sous-commandes permises : `lint`, `check`, `render`, `snapshot` (sans description par un service externe), `timeline`,
  `--version`, `telemetry disable` ; `preview`, `usage`, `auth`, `login`, `publish`, `cloud`… sont refusées.
- Rien n'est écrit dans le dépôt : gen.mjs, encoder.mjs et hf.sh refusent toute sortie, tout dossier de travail et tout chemin
  situés dans le dépôt (hf.sh : quelle que soit l'option), le dossier des images ou un dossier de capture. La vidéo est copiée à la main après contrôle.
- La composition ne contient aucune adresse externe (contrôlé par gen.mjs) et embarque ses polices.
- Aucun secret n'est lu ni écrit par la chaîne de montage ; seul `tts.py` lit les identifiants AWS, pour la voix.

## Licences

- HyperFrames (HeyGen) : Apache-2.0 ; outil installé à part, ni copié dans le dépôt ni redistribué (la vidéo ne contient que
  des pixels).
- Polices Barlow Condensed et IBM Plex Sans : SIL Open Font License 1.1 (`hyperframes/templates/licences/OFL-1.1.txt`,
  copiée avec les notices dans chaque projet).
- Rendus Blender (`renders/*.jpg`) : œuvres du projet (rendus Cycles du modèle du dépôt), utilisées telles quelles.
