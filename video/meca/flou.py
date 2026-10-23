# Film du mécanisme : moyenne des sous-images de capture.mjs --film --mb N (f_<k>_<j>.jpg → f_<k>.jpg), flou de mouvement.
# Usage : python3 video/meca/flou.py DOSSIER_CAPTURE
import glob, os, re, sys
import numpy as np
from PIL import Image
d = sys.argv[1]; groupes = {}
for f in glob.glob(os.path.join(d, 'f_*_*.jpg')):
    m = re.match(r'f_(\d+)_(\d+)\.jpg$', os.path.basename(f))
    if m: groupes.setdefault(m.group(1), []).append(f)
for k, fs in sorted(groupes.items()):
    acc = sum(np.asarray(Image.open(f), dtype=np.float32) for f in fs) / len(fs)
    Image.fromarray(np.clip(acc + .5, 0, 255).astype(np.uint8)).save(os.path.join(d, f'f_{k}.jpg'), quality=93)
print(f'{len(groupes)} images moyennées')
