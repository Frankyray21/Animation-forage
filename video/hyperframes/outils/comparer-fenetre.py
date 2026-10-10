#!/usr/bin/env python3
# Scénario A : MP4 encodé par encoder.mjs contre les mêmes images de la vidéo de référence de make_video (essai court --fenetre :
# images DÉBUT … FIN − 1 de la vidéo complète, d'après rapport.json ; vidéo complète : toutes les images). Les deux sont des H.264
# CRF 27 : PSNR image par image, global, zone 3D (y < 620) et bandeau (y ≥ 620), puis recalage : pour chaque image, la meilleure
# image de référence à ± 2. Lecture en flux (deux ffmpeg en tube, 5 images de référence en mémoire) : la vidéo complète de A
# (2 773 images) passe sans charger 15 Go en mémoire. Bilan par segment de rapport.json (titre, parties, rendus Blender, fin ;
# une image de fondu enchaîné compte pour le segment qui entre).
# Usage : python3 -B video/hyperframes/outils/comparer-fenetre.py BUILD/rapport.json ESSAI.mp4 REFERENCE.mp4 [--ffmpeg CHEMIN] [--sortie JSON]
#         (défaut de --ffmpeg : $FFMPEG, sinon ffmpeg du PATH)
import collections, json, math, os, subprocess, sys
import numpy as np

rap = json.load(open(sys.argv[1], encoding='utf-8'))
essai, ref = sys.argv[2], sys.argv[3]
FF = sys.argv[sys.argv.index('--ffmpeg') + 1] if '--ffmpeg' in sys.argv else os.environ.get('FFMPEG', 'ffmpeg')
sortie = sys.argv[sys.argv.index('--sortie') + 1] if '--sortie' in sys.argv else None
W, H, H3 = 1280, 720, 620
FB = W * H * 3


def essai_de(rap):   # fenêtre d'essai de A (--fenetre) : « fenetre_essai » ; ancien rapport de A : « fenetre » (objet).
    # Pour D, « fenetre » est la liste des fenêtres « ressorts en coupe » : jamais une fenêtre d'essai.
    f = rap.get('fenetre_essai')
    if f is None and rap.get('scenario') == 'A' and isinstance(rap.get('fenetre'), dict): f = rap['fenetre']
    return f
A0 = essai_de(rap)['debut'] if essai_de(rap) else 0
N = rap['images']


def flux(f, a, n):   # images a … a + n − 1 de f, une à une (RVB 8 bits)
    vf = f"select='between(n\\,{a}\\,{a + n - 1})',setpts=N/24/TB"
    p = subprocess.Popen([FF, '-v', 'error', '-i', f, '-vf', vf, '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(FB)
        if len(b) < FB: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    p.wait()
    if p.returncode: sys.exit(f'{f} : ffmpeg code {p.returncode}')


def ps(a, b):
    m = np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2)
    return 99.0 if m == 0 else 10 * math.log10(255 ** 2 / m)


r0 = max(0, A0 - 2); off = A0 - r0   # deux images de marge de chaque côté pour le recalage
fy = flux(ref, r0, N + off + 2)
tampon = collections.OrderedDict(); fin_ref = [False]; ny = [0]
def image_ref(j):   # image j (indice dans la plage lue) de la référence, ou None après la fin
    while j not in tampon and not fin_ref[0]:
        try: tampon[ny[0]] = next(fy); ny[0] += 1
        except StopIteration: fin_ref[0] = True
    return tampon.get(j)


res = []; nx = 0
for i, x in enumerate(flux(essai, 0, N)):
    nx += 1; j = i + off
    y = image_ref(j)
    if y is None: sys.exit(f'{ref} : plus d’image de référence à l’image {A0 + i} de la vidéo')
    r = {'image': i, 'image_video': A0 + i, 'psnr': round(ps(x, y), 2), 'psnr_3d': round(ps(x[:H3], y[:H3]), 2), 'psnr_bandeau': round(ps(x[H3:], y[H3:]), 2)}
    cand = {}
    for d in range(-2, 3):
        if j + d < 0: continue
        z = image_ref(j + d)
        if z is not None: cand[d] = ps(x[:H3], z[:H3])
    r['meilleur_decalage'] = max(cand, key=cand.get)
    res.append(r)
    for k in [k for k in tampon if k < j - 1]: del tampon[k]   # l'image suivante a besoin de j − 1 … j + 3
if nx != N: sys.exit(f'{essai} : {nx} images, rapport.json en annonce {N}')
moy = lambda k, L=res: round(sum(r[k] for r in L) / len(L), 2)
print(f"{N} images (vidéo {A0} à {A0 + N - 1}) : PSNR moyen {moy('psnr')} dB · 3D {moy('psnr_3d')} · bandeau {moy('psnr_bandeau')} · min {min(r['psnr'] for r in res)} dB")
dec = [r for r in res if r['meilleur_decalage'] != 0]
print(f"recalage 3D : {N - len(dec)} images sur la bonne image de référence, {len(dec)} décalées" + (f" ({', '.join(str(r['image_video']) + ':' + str(r['meilleur_decalage']) for r in dec[:12])}{' …' if len(dec) > 12 else ''})" if dec else ''))
segs = rap.get('segments') or []
if segs:
    print('par segment (images de la vidéo complète ; PSNR moyen · 3D · bandeau · min ; décalées) :')
    for k, s in enumerate(segs):
        fin = segs[k + 1]['debut'] if k + 1 < len(segs) else 10 ** 9
        L = [r for r in res if s['debut'] <= r['image_video'] < fin]
        if L: print(f"  {s['nom']:9s} {L[0]['image_video']:5d}–{L[-1]['image_video']:5d} : {moy('psnr', L):6.2f} · {moy('psnr_3d', L):6.2f} · {moy('psnr_bandeau', L):6.2f} · min {min(r['psnr'] for r in L):6.2f} dB ; {sum(r['meilleur_decalage'] != 0 for r in L)} décalées")
if sortie: json.dump(res, open(sortie, 'w'), indent=1)
