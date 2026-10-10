# Caler une vidéo sur un audio déjà enregistré (`gen-a.mjs --synchro`)

La voix de la vidéo 1 a été enregistrée d'un seul tenant dans ElevenLabs : un dialogue à deux voix, le formateur et un
travailleur, de 147,487 s. Le script est dans `A/script.json` (28 répliques).

C'est la vidéo qui suit cet audio, et non l'inverse. Les étapes sont allongées ou accélérées pour que chaque « Étape N »
apparaisse au moment où le formateur la dit. La vidéo produite est muette : on pose l'audio d'origine dessus à 0 s, sans le
couper ni le décaler.

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
| `aligner.py` | Aligne le texte sur l'audio, sans reconnaissance vocale ni réseau (détails sous le tableau) |
| `dtw.c` | DTW à bande Sakoe-Chiba, compilé par aligner.py (`cc -O2`) |
| `synchro-a.py` | Produit le `synchro.json` de la vidéo 1 (contenu sous le tableau) |
| `A/script.json` | Dialogue de la vidéo 1 tel qu'il a été donné à ElevenLabs (28 répliques : passage, orateur 1 = formateur, 2 = travailleur, texte) |
| `A/bornes.json`, `A/synchro.json` | Mesures de l'audio du 2026-10-10 (`ElevenLabs_2026-10-10T20_05_10__s100_v4.mp3`) et instants qui ont servi au rendu |

**Étapes de `aligner.py`.**
1. Synthèse de référence du texte, phrase par phrase, avec une voix Piper locale.
2. MFCC (numpy) des deux audios, puis DTW à bande (`dtw.c`).
3. Recalage de chaque début sur la reprise de parole la plus proche, et de chaque fin sur la fin de parole la plus proche. Silences : silencedetect, −40 dB, au moins 0,15 s.
4. Hauteur de voix de chaque îlot de parole.

**Contenu de `synchro.json`.** Les instants sont arrondis à la milliseconde :
- intro et rendus de l'intro ;
- pour chaque étape : début de « Étape N », phrase « Pourquoi » et fin de sa parole ;
- les 3 lignes de « À retenir » ;
- les 5 questions et leurs réponses.

## Mesure de l'audio de la vidéo 1

**Durée.** 147,487 s, avec une fin de parole à 147,260 s. La vidéo fait 3 540 images, soit 147,5 s.

**Répliques.** Les 28 répliques tombent sur une reprise de parole à ±0,15 s près. Trois largeurs de bande du DTW (0,05, 0,12 et 0,25) donnent les mêmes bornes.

**Seuil de pause.** Il est de 0,15 s parce que la pause entre la question 4 et le « Non. » du formateur ne dure que 0,198 s. Avec 0,2 s, elle était manquée, et la réponse était tirée sur la reprise suivante, 0,83 s trop tard (135,597 s au lieu de 134,775 s).

**Contre-vérification indépendante.** Cinq méthodes ont été employées : pauses à quatre seuils, modèles de timbre des deux locuteurs, repérage du mot « Étape », débit syllabique, six autres DTW. Elles confirment les 42 instants. Les 9 « Étape N » sont confirmés à 0,011 s près.

**Étape 7.** « Regardez le compteur en haut à droite, pis la fenêtre en bas » commence à 65,93 s. Le compteur de tours est affiché de 58,5 à 72,5 s, la fenêtre en coupe jusqu'à 68,0 s.

## Règles de montage (`gen-a.mjs --synchro`)

**Ordre des segments.**
1. Carton titre.
2. Rendus Blender de l'intro, chacun sur sa réplique :
   - 03, « 18 ressorts comprimés », sur « Avec les dix-huit ressorts comprimés en arrière, hein ? » ;
   - 04, « 9 boulons du cône », sur « Tant que le cône est boulonné… » ;
   - 02, « Face avant », sur « Correct. On regarde ça étape par étape ».
3. Étapes 1 à 9, en trois parties enchaînées par des fondus.
4. « À retenir », puis « Questions de l'équipe ».

Aucun rendu n'est placé entre les parties. Une étape garde donc son image jusqu'au « Étape N » suivant. C'était le défaut d'un premier montage : le rendu 02 placé après l'étape 3 couvrait « mais les ressorts, eux, poussent encore ».

**Début d'une étape.** L'étape commence 0,25 s avant que « Étape N » soit dit, au plus près de l'image. Quand elle entre par un fondu enchaîné de segment, de 0,5 s, son début est arrondi à l'image inférieure : le fondu est donc fini quand la voix commence.

**Étape plus courte que sa voix.** Sa fin figée est prolongée, comme dans make_video. Par exemple : +2,2 s à l'étape 1, +3,2 s à l'étape 3 (image du cadenas).

**Étape plus longue que sa voix.**
1. Les fins figées sont d'abord raccourcies.
2. Ensuite, des images mobiles sont sautées à intervalles réguliers, avec le même facteur pour toute l'étape.
3. Ne sont jamais sautées :
   - les images au ralenti (le repère « Ralenti × ½ » reste vrai) ;
   - les suites de 24 images ou moins ;
   - les suites qui, une fois accélérées, tomberaient sous 24 images.
4. Le repère « Vidéo accélérée × N » (arrondi au demi, seulement s'il dit plus que « × 1 ») est affiché à la place du ralenti. Il dit clairement que c'est la vidéo qui va plus vite, pas le geste. Il est masqué pendant un « Pourquoi », qui occupe le même haut d'image.
5. Les gros plans tournants des pièces retirées restent visibles au moins 1 s après leur fondu d'entrée. Ils sont accélérés sans repère : c'est une rotation de présentation.

Facteurs obtenus pour la vidéo 1 :

| Étape | Facteur |
|---|---|
| 4 | × 1,4 |
| 5 | × 3,5 |
| 6 | × 1,01 (2 images) |
| 7 | × 1,9, hors ralenti |

**« Pourquoi ».** L'encadré est affiché pendant la phrase qui l'explique, de 0,15 s avant à 0,6 s après.

**« À retenir ».** Chaque ligne apparaît 0,15 s avant d'être dite, et reprend l'audio mot pour mot :
1. « Jamais un boulon du cône enlevé au complet sous charge » ;
2. « Remettre les 3 boulons longs sans bushing (étape 6) avant l'étape 7 » ;
3. « Un tour à la fois, dans l'ordre de 1 à 6 ».

La ligne 1 est volontairement au singulier : le pluriel de make_video, « les boulons », pouvait se lire « pas tous à la fois ».

**« Questions de l'équipe ».**
- **Carte.** Une carte par question : la question entre guillemets, telle que dite, dès qu'elle est posée. Puis la réponse, en français écrit, quand le formateur répond.
- **Enchaînement.** La carte reste jusqu'à la fin de la réponse dite, sans dépasser la question suivante. Le texte change sans superposition : 0,3 s de disparition, puis 0,3 s d'apparition.
- **Fonds.** Fondu enchaîné entre des images de l'animation 3D (`f_01847`, `f_01241`) et des rendus Blender du dépôt (04, 02, 01). Aucun fond ne montre un outil posé sur un boulon, et aucune image n'est générée.
- **Fin.** Fondu final de 0,25 s, après la dernière parole.

**Typographie.** Pour les textes ajoutés et les « Pourquoi », une espace insécable est posée devant ? ! ; et à l'intérieur des mesures (« 1 ½ po »). Les bandeaux, qui portent le texte de la procédure, ne changent pas.

**Contrôles du générateur.** Il s'arrête dans chacun de ces cas :
- un segment ou une étape ne commence pas à l'image visée (vérifié sur le rejeu ffmpeg du montage) ;
- la durée n'est pas celle de l'audio arrondie à l'image supérieure ;
- une étape ne peut pas tenir dans son temps ;
- **une étape quitte l'écran plus de 0,1 s avant la fin de sa parole.**

`rapport.json` contient un bilan par étape, sous la clé `synchro`.

**Capture à utiliser.** Les images 3D de A au relevé de compteur corrigé, `v4-A-hf` : seul son `scan.json` diffère, sur le champ `count` de l'étape 7. Avec l'ancien relevé, le compteur alterne entre deux tours.

## Commandes (vidéo 1)

```sh
# 1. Alignement (venv avec piper-tts 1.2.0, piper-phonemize 1.1.0 et numpy ; voix Piper fr « siwis » low, CC BY 4.0)
python3 video/hyperframes/synchro/aligner.py --audio voix_A_elevenlabs.mp3 \
  --script video/hyperframes/synchro/A/script.json --piper-modele fr-siwis-low.onnx \
  --espeak-data <espeak-ng-data de piper-phonemize, chemin court> --sortie $HF_TRAVAIL/synchro-A
python3 video/hyperframes/synchro/synchro-a.py --bornes $HF_TRAVAIL/synchro-A/bornes.json \
  --sortie $HF_TRAVAIL/synchro-A/synchro.json --audio voix_A_elevenlabs.mp3
# lire les répliques signalées « à vérifier » (écart > 0,3 s) avant de continuer

# 2. Projet, rendu et encodage (mêmes garde-fous que d'habitude : hf.sh, hors ligne)
node video/hyperframes/gen.mjs --scen A --frames <capture A, relevé corrigé> --muet \
  --synchro video/hyperframes/synchro/A/synchro.json --out $HF_TRAVAIL/A-synchro
video/hyperframes/hf.sh lint $HF_TRAVAIL/A-synchro
(cd $HF_TRAVAIL/A-synchro && <dépôt>/video/hyperframes/hf.sh render . --format png-sequence --output $HF_TRAVAIL/A-synchro-png \
  --workers 1 --fps 24 --video-frame-format png --no-browser-gpu)
node video/hyperframes/encoder.mjs --build $HF_TRAVAIL/A-synchro --images $HF_TRAVAIL/A-synchro-png \
  --out $HF_TRAVAIL/procedure_synchro_muet.mp4 --poster $HF_TRAVAIL/procedure_synchro_poster.jpg
# 3. Contrôle avec la voix (la vidéo muette reste celle qu'on livre)
ffmpeg -i $HF_TRAVAIL/procedure_synchro_muet.mp4 -i voix_A_elevenlabs.mp3 -map 0:v -map 1:a -c:v copy \
  -af "aresample=48000,apad" -c:a aac -b:a 128k -t 147.5 -movflags +faststart $HF_TRAVAIL/procedure_synchro_avec_voix.mp4
```

**Espace disque.** HyperFrames refuse de capturer si l'estimation brute dépasse 90 % de l'espace libre. Cette estimation
compte images × 1280 × 720 × 4 octets, soit 13,05 Go pour 3 540 images. Il faut donc environ 14,5 Go libres en plus du
cache d'extraction (environ 1,6 Go), même si les PNG réels font environ 2 Go. Avec `--fenetre DÉBUT-FIN`, on peut rendre
en plusieurs morceaux, identiques image par image.
