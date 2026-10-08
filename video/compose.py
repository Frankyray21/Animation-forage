#!/usr/bin/env python3
# Composition des images de la vidéo : 3D suréchantillonnée réduite (moyenne de zone) + bandeau de consigne en dessous,
# fondus enchaînés calculés image par image. Appelé par make_video.mjs avec un fichier de travaux JSON :
#   { "w": 1280, "h3": 620, "band": 100, "seqs": [ { "dir": "...", "frames": [ [src, bandPng] | [srcA, bandA, srcB, bandB, a] ] } ] }
# Usage : python3 video/compose.py travaux.json   (Pillow requis ; fonctionne aussi sous Windows)
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

SIZE = {}
_band_cache = {}


def init(w, h3, band):
    SIZE.update(w=w, h3=h3, band=band)


def band(path):
    if path not in _band_cache:
        _band_cache[path] = Image.open(path).convert('RGB').resize((SIZE['w'], SIZE['band']), Image.LANCZOS)
    return _band_cache[path]


def frame(src, band_png):
    w, h3 = SIZE['w'], SIZE['h3']
    im = Image.open(src).convert('RGB')
    if im.size != (w, h3):
        im = im.resize((w, h3), Image.BOX)   # 2 × 2 → 1 : moyenne de zone (anti-scintillement)
    out = Image.new('RGB', (w, h3 + SIZE['band']))
    out.paste(im, (0, 0))
    out.paste(band(band_png), (0, h3))
    return out


def work(args):
    dst, spec = args
    if len(spec) == 2:
        im = frame(*spec)
    else:
        a, ba, b, bb, t = spec
        im = Image.blend(frame(a, ba), frame(b, bb), t)
    im.save(dst, quality=94, subsampling=0)
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
