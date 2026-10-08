# Vidéo de la procédure

`procedure_boyles_h.mp4` : scénario A « Procédure respectée » (étapes 1 à 9 de PRO-OP-DD-005) sur le mandrin, pour la formation. H.264 (libx264, yuv420p, CRF 27, preset slow, `+faststart`), 1280 × 720, 24 i/s, sans son. `procedure_poster.jpg` : image d'aperçu (carton titre).

Mise en page : la 3D occupe le haut de l'image (1280 × 620) et un bandeau de 100 px en dessous donne la barre des 9 étapes, le numéro et le titre de l'étape, et la consigne de la procédure. Cette consigne est le texte exact de l'encadré « procédure » de l'animation, sans reformulation : texte principal en jaune, détail (repères, numéros de pièce, clé) en gris. Rien ne couvre la 3D. Les plans où le travailleur porte les pièces à la table, et ses marches entre le banc et la table, sont coupés. À leur place, un gros plan tournant (2,5 s) montre la ou les pièces retirées, posées sur la table et en surbrillance, sans le travailleur ni les étiquettes. Le bandeau affiche alors « Pièces retirées » et leurs numéros.

## Fichiers

- `capture.mjs` : capture image par image de l'animation d'`animation.html`. La page est servie par un petit serveur local. Une copie modifiée en mémoire reçoit les crochets de capture : une image calculée sur demande avec dt = 1/24 s, une horloge virtuelle pour la respiration du travailleur, un rendu sautable, la vue 3D seule sans encadré ni puces, et des repères sans le × de fermeture. Réglages : qualité haute, coupe automatique, numéros des boulons, travailleur visible, rendu suréchantillonné 2× (`--ss`). Modes :
  - `--scan` : relevé sans rendu → `scan.json` (pour chaque image : plan de caméra, coupe, consigne de l'encadré procédure, image gardée ou non) ;
  - (par défaut) : rendu des seules images gardées → `f_00000.jpg…`. Une tranche (`--from`, `--to`) rejoue d'abord les images précédentes sans rendu, si bien que le résultat est identique à une capture d'un seul tenant ;
  - `--inserts` : gros plans des pièces retirées → `ins_<étape>_<n>.jpg` et `inserts.json`. Chaque gros plan est placé là où commence le plan coupé, avec la pièce montrée à la fin du plan de table (`--insat pull` : au moment où elle sort du mandrin).
- `make_video.mjs` : capture en tranches parallèles équilibrées (`--jobs`), puis bandeaux et cartons rendus en PNG par chromium (titre, rendus Blender, « À retenir »). Le texte trop long est réduit, jamais coupé.
- `compose.py` (Pillow) : composition image par image. La 3D est réduite par moyenne de zone, le bandeau collé en dessous ; fondus de 8 images vers et depuis chaque gros plan ; fin d'étape figée 0,6 s.
- Montage et encodage ffmpeg (fait par `make_video.mjs`) :
  - titre sur `renders/01_ensemble.jpg` (3,5 s) ;
  - étapes 1–3 ;
  - `02_face_mandrin` (3 s) ;
  - étapes 4–5 ;
  - `03_coupe` et `04_couvercle_retire` (3 s chacun) ;
  - étapes 6–9 ;
  - fin (4 s).

  Les rendus Blender ont un Ken Burns (zoom 1,00 → 1,06) au-dessus du bandeau ; fondus enchaînés de 0,5 s.

## Refaire la vidéo

```bash
npm i playwright && npx playwright install chromium   # ou PLAYWRIGHT=/chemin/vers/playwright/index.mjs
pip install pillow
node video/make_video.mjs                             # relevé + capture + gros plans + montage (WebGL logiciel : plusieurs heures sur 4 cœurs)
node video/make_video.mjs --skip-capture              # remonter seulement, à partir des images déjà capturées
node video/make_video.mjs --skip-capture --bands-only # bandeaux et cartons seulement (dossier montage/), pour les vérifier
```

Options : `--frames DIR` (images capturées ; défaut : `$TMPDIR/clam-video-frames`), `--jobs 3`, `--crf 27`, `--out FICHIER`.

Variables :
- `FFMPEG` (défaut `ffmpeg`, avec libx264) ;
- `PYTHON` (défaut `python3`) ;
- `CHROME` (exécutable chromium) ;
- `THREE_DIR` (copie locale du paquet `three@0.160.0` au lieu du CDN) ;
- `CDN_CACHE` (cache des fichiers CDN et des polices, téléchargés par `curl`, qui suit le mandataire HTTPS).

Pour contrôler quelques images, capture seule : `node video/capture.mjs --out /tmp/f --from 800 --to 801`. `--info` affiche les étapes et leur durée. La capture reprend là où elle s'est arrêtée avec `--skip-existing`.
