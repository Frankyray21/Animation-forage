# Caler une vidéo sur un audio déjà enregistré (`gen-a.mjs --synchro`)

La voix de la vidéo 1 a été enregistrée d'un seul tenant dans ElevenLabs : un dialogue à deux voix, le formateur et un
travailleur, de 147,487 s. Le script est dans `A/script.json` (28 répliques). La vidéo suit cet audio, et non l'inverse. Les étapes
sont allongées ou accélérées pour que chaque « Étape N » apparaisse au moment où le formateur la dit. La vidéo produite est
muette : on pose l'audio d'origine dessus à 0 s, sans le couper ni le décaler.

```
voix.mp3 + script.json
  → aligner.py      instants de chaque réplique et de chaque phrase dans l'audio (bornes.json)
  → synchro-a.py    instants utiles au montage de la vidéo 1 (synchro.json)
  → gen.mjs --scen A --muet --synchro synchro.json   projet HyperFrames calé sur l'audio
  → hf.sh render (PNG) → encoder.mjs (vidéo muette, 24 i/s) → ffmpeg : audio d'origine ajouté (contrôle)
```

## Fichiers

| Chemin | Rôle |
|---|---|
| `aligner.py` | Alignement texte-audio, sans reconnaissance vocale ni réseau. Une synthèse de référence est produite phrase par phrase avec une voix Piper locale. Ensuite : MFCC (numpy), DTW à bande (`dtw.c`), recalage de chaque début sur la reprise de parole la plus proche et de chaque fin sur la fin de parole la plus proche (silencedetect −40 dB, 0,2 s). La hauteur de voix de chaque îlot est aussi mesurée |
| `dtw.c` | DTW à bande Sakoe-Chiba, compilé par aligner.py (`cc -O2`) |
| `synchro-a.py` | `synchro.json` de la vidéo 1 : intro, début de chaque étape, phrases « Pourquoi », 3 lignes de « À retenir », 5 questions et réponses. Instants arrondis à la milliseconde |
| `A/script.json` | Dialogue de la vidéo 1 tel qu'il a été donné à ElevenLabs (28 répliques : passage, orateur 1 = formateur, 2 = travailleur, texte) |
| `A/bornes.json`, `A/synchro.json` | Mesures de l'audio du 2026-10-10 (`ElevenLabs_2026-10-10T20_05_10__s100_v4.mp3`) et instants qui ont servi au rendu |

## Mesure de l'audio de la vidéo 1

- **Durée** : 147,487 s ; fin de la parole à 147,260 s. Vidéo : 3 540 images, soit 147,5 s.
- **Répliques confirmées** : 26 sur 28 tombent sur une reprise de parole à ±0,15 s. Trois largeurs de bande du DTW (0,05, 0,12 et 0,25) donnent les mêmes bornes.
- **Deux répliques signalées « à vérifier »** : la question 4, longue et coupée en deux îlots de voix aiguë (130,56–132,65 s et 132,95–135,33 s), et sa réponse. Le DTW place « Non. » 0,65 s trop tôt, dans la question. Le recalage retient 135,597 s, la reprise de la voix grave suivante, ce que confirme la hauteur de voix.
- **Ralenti et compteur** : « Regardez le compteur en haut à droite, pis la fenêtre en bas » commence à 65,93 s. Le compteur de tours est affiché de 58,5 s à 72,5 s et la fenêtre en coupe jusqu'à 68,0 s.

## Règles de montage (`gen-a.mjs --synchro`)

**Ordre des segments.**
1. Carton titre.
2. Rendu Blender 03, « 18 ressorts comprimés », pendant « Avec les dix-huit ressorts comprimés en arrière, hein ? ».
3. Rendu 04, « 9 boulons du cône », à partir de « Tant que le cône est boulonné ».
4. Étapes 1 à 3, rendu 02, étapes 4 et 5, étapes 6 à 9.
5. « À retenir ».
6. « Questions de l'équipe ».

**Début de chaque étape.** Elle commence 0,25 s avant « Étape N ». Quand elle entre par un fondu enchaîné de segment (0,5 s), ce fondu se termine au moment où la voix commence.

**Étape plus courte que sa voix.** Sa fin figée est prolongée (comme make_video), par exemple +2,2 s à l'étape 1.

**Étape plus longue que sa voix.**
1. Les fins figées sont d'abord raccourcies.
2. Ensuite, des images mobiles sont sautées à intervalles réguliers, avec le même facteur dans toute l'étape.
3. Ne sont jamais sautées : les images au ralenti (le repère « Ralenti × ½ » reste vrai) et les suites de 24 images ou moins.
4. Un repère « Accéléré × N », arrondi au demi, est affiché à la place du ralenti.

Facteurs obtenus pour la vidéo 1 : étape 4 × 1,4, étape 5 × 3,2, étape 6 × 1,01 (2 images), étape 7 × 1,9 hors ralenti. Les gros plans tournants sont accélérés sans repère.

**« Pourquoi ».** L'encadré reste affiché pendant la phrase qui l'explique : de 0,15 s avant à 0,6 s après.

**« À retenir ».** Chaque ligne apparaît 0,15 s avant d'être dite. La troisième ligne, « Un tour à la fois, dans l'ordre de 1 à 6 », est dite dans l'audio : elle s'ajoute aux deux lignes de make_video.

**« Questions de l'équipe ».**
- Une carte par question : la question entre guillemets dès qu'elle est posée, puis la réponse quand le formateur répond.
- Le texte change sans superposition : une carte disparaît en 0,3 s, puis la suivante apparaît en 0,3 s.
- Fonds en fondu enchaîné : images de l'animation 3D (`f_01792`, `f_01847`, `f_01241`) et rendus Blender du dépôt (02, 01). Aucune image n'est générée.
- Fondu final de 0,5 s, au lieu de 0,8 s, pour ne pas assombrir la dernière phrase.

**Contrôles du générateur.** Il s'arrête si :
- un segment ou une étape ne commence pas à l'image visée (cibles vérifiées sur le rejeu ffmpeg du montage) ;
- la durée totale n'est pas celle de l'audio arrondie à l'image supérieure ;
- une étape ne peut pas tenir dans son temps.

**Bilan dans `rapport.json`.** La clé `synchro` donne, pour chaque étape : images source et images retenues, prolongation, fins figées retirées, images sautées, facteur.

## Commandes (vidéo 1)

```sh
# 1. Alignement (venv avec piper-tts 1.2.0, piper-phonemize 1.1.0 et numpy ; voix Piper fr « siwis » low, CC BY 4.0)
python3 video/hyperframes/synchro/aligner.py --audio voix_A_elevenlabs.mp3 \
  --script video/hyperframes/synchro/A/script.json --piper-modele fr-siwis-low.onnx \
  --espeak-data <espeak-ng-data de piper-phonemize, chemin court> --sortie $HF_TRAVAIL/synchro-A
python3 video/hyperframes/synchro/synchro-a.py --bornes $HF_TRAVAIL/synchro-A/bornes.json \
  --sortie $HF_TRAVAIL/synchro-A/synchro.json --audio voix_A_elevenlabs.mp3
# lire les répliques « à vérifier » ; corriger synchro.json à la main si la hauteur de voix le justifie (voir plus haut)

# 2. Projet, rendu et encodage (mêmes garde-fous que d'habitude : hf.sh, hors ligne)
node video/hyperframes/gen.mjs --scen A --frames <images v4-A> --muet --synchro video/hyperframes/synchro/A/synchro.json \
  --out $HF_TRAVAIL/A-synchro
video/hyperframes/hf.sh lint $HF_TRAVAIL/A-synchro
(cd $HF_TRAVAIL/A-synchro && <dépôt>/video/hyperframes/hf.sh render . --format png-sequence --output $HF_TRAVAIL/A-synchro-png \
  --workers 1 --fps 24 --video-frame-format png --no-browser-gpu)
node video/hyperframes/encoder.mjs --build $HF_TRAVAIL/A-synchro --images $HF_TRAVAIL/A-synchro-png \
  --out $HF_TRAVAIL/procedure_synchro_muet.mp4 --poster $HF_TRAVAIL/procedure_synchro_poster.jpg
# 3. Contrôle avec la voix (la vidéo muette reste celle qu'on livre)
ffmpeg -i $HF_TRAVAIL/procedure_synchro_muet.mp4 -i voix_A_elevenlabs.mp3 -map 0:v -map 1:a -c:v copy \
  -af "aresample=48000,apad" -c:a aac -b:a 128k -t 147.5 -movflags +faststart $HF_TRAVAIL/procedure_synchro_avec_voix.mp4
```

**Espace disque.** HyperFrames refuse de capturer si l'estimation brute (images × 1280 × 720 × 4 octets, soit 13,05 Go pour
3 540 images) dépasse 90 % de l'espace libre. Il faut donc environ 14,5 Go libres, même si les PNG réels font environ 3 Go.
`--fenetre DÉBUT-FIN` permet de rendre en plusieurs morceaux identiques image par image.
