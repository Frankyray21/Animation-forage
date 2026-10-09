#!/usr/bin/env python3
# Composition des images de la vidéo : 3D suréchantillonnée réduite (moyenne de zone) + bandeau de consigne en dessous,
# incrustations (fenêtre « ressorts en coupe », compteur de tours, encadré « Pourquoi », ralenti) et fondus calculés image par image.
# Appelé par make_video.mjs avec un fichier de travaux JSON :
#   { "w": 1280, "h3": 620, "band": 100, "seqs": [ { "dir": "...", "frames": [ spec, ... ] } ] }
#   spec : [src, bandPng] | [srcA, bandA, srcB, bandB, a] (fondu)
#          | { "f": [src, bandPng], "ovu": [[png, x, y]], "in": [img, x, y, w, h], "ov": [[png, x, y], ...] } | { "a": spec, "b": spec, "t": a } (fondu)
# Usage : python3 video/compose.py travaux.json   (Pillow requis ; fonctionne aussi sous Windows)
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

SIZE = {}
_cache = {}


def init(w, h3, band):
    SIZE.update(w=w, h3=h3, band=band)


def png(path, size=None):
    key = (path, size)
    if key not in _cache:
        im = Image.open(path)
        im = im.convert('RGBA')
        if size and im.size != size:
            im = im.resize(size, Image.LANCZOS)
        _cache[key] = im
    return _cache[key]


def frame(spec):
    if isinstance(spec, dict) and 'a' in spec:
        return Image.blend(frame(spec['a']), frame(spec['b']), spec['t'])
    if isinstance(spec, list) and len(spec) == 5:
        return Image.blend(frame(spec[:2]), frame(spec[2:4]), spec[4])
    d = spec if isinstance(spec, dict) else {'f': spec}
    src, band_png = d['f']
    w, h3 = SIZE['w'], SIZE['h3']
    im = Image.open(src).convert('RGB')
    if im.size != (w, h3):
        im = im.resize((w, h3), Image.BOX)   # 2 × 2 → 1 : moyenne de zone (anti-scintillement)
    out = Image.new('RGB', (w, h3 + SIZE['band']))
    out.paste(im, (0, 0))
    out.paste(png(band_png, (w, SIZE['band'])).convert('RGB'), (0, h3))
    for p, x, y in d.get('ovu', []):   # calques sous la fenêtre incrustée (cadre)
        o = png(p)
        out.paste(o, (x, y), o)
    if d.get('in'):   # fenêtre incrustée (image réduite à la taille voulue)
        p, x, y, iw, ih = d['in']
        out.paste(Image.open(p).convert('RGB').resize((iw, ih), Image.LANCZOS), (x, y))
    for p, x, y in d.get('ov', []):   # calques PNG avec transparence
        o = png(p)
        out.paste(o, (x, y), o)
    return out


def work(args):
    dst, spec = args
    frame(spec).save(dst, quality=94, subsampling=0)
    return dst


def main():
    job = json.load(open(sys.argv[1], encoding='utf-8'))
    tasks = []
    for s in job['seqs']:
        os.makedirs(s['dir'], exist_ok=True)
        for i, spec in enumerate(s['frames']):
            tasks.append((os.path.join(s['dir'], f'{i:05d}.jpg'), spec))
    with ProcessPoolExecutor(max_workers=int(job.get('jobs') or os.cpu_count() or 2),
                             initializer=init, initargs=(job['w'], job['h3'], job['band'])) as ex:
        for k, _ in enumerate(ex.map(work, tasks, chunksize=16)):
            if k % 500 == 0:
                print(f'composition {k}/{len(tasks)}', flush=True)
    print(f'composition : {len(tasks)} images', flush=True)


if __name__ == '__main__':
    main()
