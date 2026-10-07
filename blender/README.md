# Vues réalistes (Blender)

Rendus photoréalistes (Cycles, tracé de rayons, CPU) de la tête de forage UM-012 et du mandrin, à partir du **même modèle 3D** que la page `index.html`.

- `tete_mandrin.glb` : export GLTFExporter de la scène three.js (tête, mandrin, banc, table des pièces retirées), état de l'étape 1 (manettes fermées, vérin relâché). Un maillage par pièce, nommé `référence + nom anglais` (ex. `5200517 Spring`). 1 unité = 10 cm.
- `etat_s5.json` : positions des pièces retirées après l'étape 5 (couvercle, couvert des mâchoires et leurs boulons posés sur la table).
- `scene.py` : reconstruit la scène Blender (import, échelle en mètres, matériaux PBR par pièce, éclairage d'atelier à 3 panneaux, sol béton, 4 caméras 35 mm, coupe du mandrin dans le même plan que le site) et rend les 4 vues dans `../renders/`.
- `tete_mandrin.blend` : la scène prête à ouvrir dans Blender (4 caméras `Cam 1…4` ; la coupe de la vue 3 et l'état « couvercle retiré » de la vue 4 sont appliqués par le script au moment du rendu).

## Rejouer

```bash
pip install bpy pillow          # module Blender pour Python 3.11+
cd blender
python3 scene.py                # 4 vues, 1600×1000, 192 échantillons, dénoiseur OpenImageDenoise
python3 scene.py --test         # aperçu 400×250, 32 échantillons
python3 scene.py --views 3 --samples 64 --no-blend
```

ou, avec Blender installé : `blender -b -P scene.py -- --views 1,2`.

Contraintes respectées : ressorts verts (0x2e8a44), machine propre (ni saleté ni graisse), peinture rouge sans peau d'orange marquée.

## Éclairage cuit pour la page (lightmaps)

- `export_static.mjs` : exporte, depuis la page, les pièces fixes de la tête et du banc (`LM_<g>_<i>`) et leurs occulteurs (`OC_*` : boulons, mandrin, table) en GLB, plus les décalages de la tête éclatée (`lm_work/lm_src.glb`, `lm_src.json`, non versionnés).
- `bake_lightmaps.py` : 2e couche UV « LM » (Smart UV Project, regroupement en atlas), cuisson Cycles *Diffuse* directe + indirecte sous un environnement blanc uniforme (tête assemblée, tête éclatée, banc), lissage dans les îlots, export vers `../lightmaps/`.

```bash
node export_static.mjs lm_work            # PLAYWRIGHT=… CHROME=… si besoin
python3 bake_lightmaps.py --src lm_work   # environ 5 min (CPU 4 cœurs, 256 échantillons)
```

Voir la section « Éclairage cuit (Blender) » du README principal.
