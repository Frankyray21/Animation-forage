# Vidéo de la procédure

`procedure_boyles_h.mp4` : scénario A « Procédure respectée » (étapes 1 à 9 de PRO-OP-DD-005) sur le mandrin, pour la formation. H.264 (libx264, yuv420p, CRF 27, preset slow, `+faststart`), 1280 × 720, 24 i/s, sans son. `procedure_poster.jpg` : image d'aperçu (carton titre).

## Fichiers

- `capture.mjs` : capture image par image de l'animation d'`animation.html`. La page est servie par un petit serveur local ; une copie modifiée en mémoire reçoit les crochets de capture (une image calculée sur demande avec dt = 1/24 s, horloge virtuelle pour la respiration du travailleur, rendu sautable pour le préchauffage, vue seule à 1280 × 720 avec un bandeau « numéro · titre de l'étape »). Qualité haute, coupe active, numéros des boulons et encadré procédure, travailleur visible. Chaque étape est capturée à 1×, plus une image exacte de fin d'étape. L'encadré procédure est gardé au-dessus du bandeau (marge basse `PAD_B`, 104 px par défaut ; `--scan` écrit sa position à chaque image, sans rendu). Écrit `f_00000.jpg…` et `plan.json`. Une tranche (`--from`, `--to`) rejoue d'abord les images précédentes sans rendu : le résultat est identique à une capture d'un seul tenant.
- `make_video.mjs` : lance la capture en parallèle (`--jobs`), rend les cartons (titre, légendes des rendus Blender, « À retenir ») en PNG, puis monte et encode avec ffmpeg : titre sur `renders/01_ensemble.jpg` (3,5 s), étapes 1–3, `02_face_mandrin` (3 s), étapes 4–5, `03_coupe` (3 s), `04_couvercle_retire` (3 s), étapes 6–9, fin (4 s) ; fin de chaque étape figée 1,5 s, Ken Burns (zoom 1,00 → 1,06) sur les rendus, fondus enchaînés de 0,5 s.

## Refaire la vidéo

```bash
npm i playwright && npx playwright install chromium   # ou PLAYWRIGHT=/chemin/vers/playwright/index.mjs
node video/make_video.mjs                             # capture + montage (WebGL logiciel : ~2 h 25 sur 4 cœurs, 1 646 images)
node video/make_video.mjs --skip-capture              # remonter seulement, à partir des images déjà capturées
```

Options : `--frames DIR` (images capturées ; défaut : `$TMPDIR/clam-video-frames`), `--jobs 3`, `--crf 27`, `--out FICHIER`. Variables : `FFMPEG` (défaut `ffmpeg`, avec libx264), `CHROME` (exécutable chromium), `THREE_DIR` (copie locale du paquet `three@0.160.0` au lieu du CDN), `CDN_CACHE` (cache des fichiers CDN et des polices, téléchargés par `curl`, qui suit le mandataire HTTPS).

Capture seule, pour contrôler quelques images : `node video/capture.mjs --out /tmp/f --from 800 --to 801` ; `--info` affiche les étapes et leur durée.
