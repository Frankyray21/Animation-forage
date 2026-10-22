# Film du mécanisme : anti-scintillement des images de capture.mjs --film, avant montage.mjs (--img DOSSIER_SORTIE).
# Usage : python3 video/meca/anti-scintillement.py DOSSIER_CAPTURE DOSSIER_SORTIE
# anti-scintillement : un pixel dont les images voisines (k−1, k+1) concordent mais dont l'image k s'écarte (oscillation d'une image
# à l'autre) prend la moyenne de ses voisines ; en mouvement (voisines différentes), l'image k est gardée telle quelle (pas de bord doublé)
import numpy as np, sys
from PIL import Image
src, dst, N, T = sys.argv[1], sys.argv[2], 1080, 18
L = lambda k: np.asarray(Image.open(f'{src}/f_{min(N-1,max(0,k)):05d}.jpg'), dtype=np.int16)
a, b = L(0), L(0)
for k in range(N):
    c = L(k + 1)
    ok = (np.abs(a - c).max(axis=2, keepdims=True) < T)
    out = np.where(ok, np.median(np.stack([a, b, c]), axis=0), b)
    Image.fromarray(out.astype(np.uint8)).save(f'{dst}/f_{k:05d}.jpg', quality=93)
    a, b = b, c
