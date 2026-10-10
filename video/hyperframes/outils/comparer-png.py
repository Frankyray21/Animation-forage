#!/usr/bin/env python3
# Deux séquences PNG (frame_000001.png…) : images différentes, pixels différents, et pour une 3e séquence (ancienne), où elles diffèrent.
# Usage : python3 -B video/hyperframes/outils/comparer-png.py DOSSIER_A DOSSIER_B [DOSSIER_ANCIEN]
import sys, os, numpy as np
from PIL import Image
A, B = sys.argv[1], sys.argv[2]; C = sys.argv[3] if len(sys.argv) > 3 else None
fs = sorted(f for f in os.listdir(A) if f.startswith('frame_'))
assert fs == sorted(f for f in os.listdir(B) if f.startswith('frame_')), 'séquences de longueurs différentes'
diff_ab, diff_ac, zones = [], [], {}
for f in fs:
    a = np.asarray(Image.open(os.path.join(A, f)).convert('RGB')).astype(int); b = np.asarray(Image.open(os.path.join(B, f)).convert('RGB')).astype(int)
    if (a != b).any(): diff_ab.append(f)
    if C:
        c = np.asarray(Image.open(os.path.join(C, f)).convert('RGB')).astype(int)
        m = (a != c).any(axis=2)
        if m.any():
            ys, xs = np.nonzero(m); diff_ac.append((f, int(m.sum()), int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()), int(np.abs(a - c).max())))
print(f'{len(fs)} images ; A ≠ B : {len(diff_ab)} {diff_ab[:5]}')
if C:
    print(f'A ≠ ancien : {len(diff_ac)} images')
    for d in diff_ac[:8]: print('  ', d)
    if diff_ac:
        print('  boîte englobante de toutes les différences : x', min(d[2] for d in diff_ac), '-', max(d[4] for d in diff_ac), ' y', min(d[3] for d in diff_ac), '-', max(d[5] for d in diff_ac))
