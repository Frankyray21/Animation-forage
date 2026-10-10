#!/usr/bin/env python3
# Compare deux vidéos du même montage, image par image et son : la vidéo HyperFrames (gen.mjs → hf.sh render png-sequence →
# encoder.mjs) et celle de video/make_video.mjs (accident_boyles_h.mp4), sur la chronologie de rapport.json.
#   1) flux (ffprobe) : codec, profil, taille, i/s, nombre d'images, format de pixels, balises de couleur, son, durées ;
#   2) image par image (décodage RVB, matrice par défaut des deux côtés : les deux fichiers sont non balisés) : PSNR de l'image,
#      de la zone 3D, du bandeau, de l'encadré « Pourquoi » et de la fenêtre en coupe quand ils sont affichés, par segment
#      (titre, fondu titre → 3D, partie, fondu 3D → fin, fin), et les 12 images les plus différentes ;
#   3) son : début de chaque passage (silencedetect), niveau RMS de chaque passage, décalage global (intercorrélation ± 50 ms),
#      écart maximal entre les deux pistes décodées.
# Lecture seule ; n'écrit que --sortie (JSON) s'il est donné.
# Usage : python3 -I video/hyperframes/outils/comparer-videos.py BUILD/rapport.json HF.mp4 MAKE_VIDEO.mp4 [--sortie comparaison.json]
import json, math, os, subprocess, sys
import numpy as np

args = [a for a in sys.argv[1:] if not a.startswith('--')]
rap_path, hf_path, mv_path = args[:3]
sortie = sys.argv[sys.argv.index('--sortie') + 1] if '--sortie' in sys.argv else None
FF, FP = os.environ.get('FFMPEG', 'ffmpeg'), os.environ.get('FFPROBE', 'ffprobe')
rap = json.load(open(rap_path, encoding='utf-8'))
FPS, (W, H), H3 = rap['fps'], rap['taille'], 620
seg = {s['nom']: s for s in rap['segments']}
P0, N = seg['partie 3D']['debut'], seg['partie 3D']['images']
E0 = seg['carton de fin']['debut'] if 'carton de fin' in seg else None
XF = len(rap['montage']['opacites']['entree_partie']) - 1   # images du fondu titre → 3D (10 à 12)
why = {n for w in rap['pourquoi'] for n in range(w['debut'], w['debut'] + w['images'])}
fen = {n for f in rap['fenetre'] for n in range(f['debut'], f['debut'] + f['images'])}
Z_WHY = (slice(18, 160), slice(18, 578))            # encadré « Pourquoi » (18, 18), 560 px de large au plus
Z_FEN = (slice(328, 612), slice(858, 1266))          # cadre de la fenêtre (IN_X − 4, IN_Y − 4), 408 × 284
out = {'flux': {}, 'images': [], 'son': {}}

# --- 1) flux ---
def probe(p):
    r = subprocess.run([FP, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)
CLES_V = ['codec_name', 'profile', 'width', 'height', 'pix_fmt', 'r_frame_rate', 'nb_frames', 'color_space', 'color_range', 'color_primaries', 'color_transfer', 'duration']
CLES_A = ['codec_name', 'profile', 'sample_rate', 'channels', 'bit_rate', 'duration']
pa, pb = probe(hf_path), probe(mv_path)
print('1) flux                     HyperFrames            make_video')
for typ, cles in (('video', CLES_V), ('audio', CLES_A)):
    sa = next((s for s in pa['streams'] if s['codec_type'] == typ), {}); sb = next((s for s in pb['streams'] if s['codec_type'] == typ), {})
    for k in cles:
        va, vb = sa.get(k, '—'), sb.get(k, '—')
        marque = '' if va == vb or k in ('bit_rate',) else '   <-- différent'
        print(f'   {typ:5s} {k:16s} {str(va):22s} {str(vb):22s}{marque}')
        out['flux'][f'{typ}.{k}'] = [va, vb]
print(f"   durée du fichier       {pa['format']['duration']:22s} {pb['format']['duration']:22s}")
print(f"   images attendues (rapport.json) : {rap['images']}")

# --- 2) images ---
def lecteur(p):
    pr = subprocess.Popen([FF, '-hide_banner', '-loglevel', 'error', '-i', p, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = pr.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    pr.wait()
def psnr(a, b):
    m = np.mean((a.astype(np.float32) - b.astype(np.float32)) ** 2)
    return 99.0 if m == 0 else 10 * math.log10(255 ** 2 / m)
def classe(n):
    if n < P0: return 'titre'
    if n < P0 + XF: return 'fondu titre → 3D'
    if E0 is None or n < E0: return 'partie 3D'
    if n < E0 + 12: return 'fondu 3D → fin'
    return 'carton de fin'
na = nb = 0
for n, (a, b) in enumerate(zip(lecteur(hf_path), lecteur(mv_path))):
    r = {'n': n, 'classe': classe(n), 'image': round(psnr(a, b), 2)}
    if P0 <= n < (E0 if E0 is not None else 10 ** 9):
        r['3d'] = round(psnr(a[:H3], b[:H3]), 2); r['bandeau'] = round(psnr(a[H3:], b[H3:]), 2)
        if n in why: r['pourquoi'] = round(psnr(a[Z_WHY], b[Z_WHY]), 2)
        if n in fen: r['fenetre'] = round(psnr(a[Z_FEN], b[Z_FEN]), 2)
    out['images'].append(r)
na = int(pa['streams'][0].get('nb_frames', 0)); nb = int(pb['streams'][0].get('nb_frames', 0))
print(f'\n2) images comparées : {len(out["images"])} (HyperFrames {na}, make_video {nb}, rapport {rap["images"]})')
def stat(sel, cle):
    v = sorted(r[cle] for r in out['images'] if sel(r) and cle in r)
    return f'{v[0]:6.2f} / {sum(v) / len(v):6.2f} / {v[len(v) // 2]:6.2f} dB ({len(v)} images)' if v else '—'
print('   PSNR min / moyenne / médiane')
for c in ('titre', 'fondu titre → 3D', 'partie 3D', 'fondu 3D → fin', 'carton de fin'):
    print(f'   {c:18s} image   {stat(lambda r: r["classe"] == c, "image")}')
for cle, nom in (('3d', 'zone 3D'), ('bandeau', 'bandeau'), ('pourquoi', '« Pourquoi »'), ('fenetre', 'fenêtre')):
    print(f'   partie 3D          {nom:7s} {stat(lambda r: True, cle)}')
pires = sorted(out['images'], key=lambda r: r['image'])[:12]
print('   images les plus différentes :', ', '.join(f"{r['n']} ({r['classe']}, {r['image']} dB)" for r in pires))

# --- 3) son ---
def pcm(p):
    r = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-i', p, '-vn', '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.int16).astype(np.float64) / 32768
def debuts(p):
    r = subprocess.run([FF, '-hide_banner', '-i', p, '-af', 'silencedetect=noise=-45dB:d=0.08', '-f', 'null', '-'], capture_output=True, text=True)
    return [round(float(l.split('silence_end: ')[1].split()[0]), 3) for l in r.stderr.splitlines() if 'silence_end' in l]
sa, sb = pcm(hf_path), pcm(mv_path)
print(f'\n3) son : {len(sa) / 48000:.3f} s contre {len(sb) / 48000:.3f} s')
if len(sa) and len(sb):
    L = min(len(sa), len(sb)); x, y = sa[:L], sb[:L]
    lag = max(range(-2400, 2401, 48), key=lambda d: float(np.dot(x[max(0, d):L + min(0, d)], y[max(0, -d):L - max(0, d)])))
    print(f'   décalage global estimé : {lag / 48:.0f} ms ; écart maximal échantillon par échantillon : {np.max(np.abs(x - y)):.4f} (pleine échelle 1)')
    out['son'].update(decalage_ms=lag / 48, ecart_max=float(np.max(np.abs(x - y))))
    for v in rap['voix']:
        i0, i1 = int((v['debut_s'] + .05) * 48000), int((v['debut_s'] + min(v['duree_s'], 5) - .05) * 48000)
        ra, rb = (20 * math.log10(np.sqrt(np.mean(s[i0:i1] ** 2)) + 1e-12) for s in (sa, sb))
        print(f"   {v['id']:6s} à {v['debut_s']:8.3f} s : RMS {ra:7.2f} contre {rb:7.2f} dBFS")
da, db = debuts(hf_path), debuts(mv_path)
print('   débuts détectés (silencedetect) HyperFrames :', da)
print('                                   make_video  :', db)
out['son'].update(debuts_hf=da, debuts_mv=db)
if sortie:
    json.dump(out, open(sortie, 'w', encoding='utf-8'), indent=1)
    print('détail :', sortie)
