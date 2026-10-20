#!/usr/bin/env python3
# Vidéo 1 (script-v2) : ajouts montés autour du rendu HyperFrames calé sur la voix principale (gen-a.mjs --synchro), sans toucher au
# rendu ni à la synchro : chaque ajout est inséré à une coupe d'étape, et le même temps est inséré dans l'audio au même instant.
#   1. carte « ⏸ Arrêt — On en discute » au début de l'étape 2 (après l'étape 1) : silence ;
#   2. contre-exemple au début de l'étape 8 (après le « Pourquoi » de l'étape 7) : images du scénario B (capture.mjs --scen B) teintées
#      de rouge, calques de cartes.mjs, voix A_06_x (assembler.py, a_part/) phrase par phrase sur les gestes du scénario B, puis carte
#      « ✓ La bonne méthode » ;
#   3. carte « ⏸ À vous la parole » à la fin : silence.
# Fondus enchaînés de 0,5 s (12 images) entre la vidéo et chaque ajout. Images du scénario B : réduites comme la 3D du rendu
# (zone, 1280 × 620) ; trop d'images pour le temps de la voix : images sautées à intervalles réguliers (au plus × 2,5, jamais au
# ralenti) et repère « Vidéo accélérée × N » (même style que le rendu).
#
# Usage : python3 inserer.py --rendu DOSSIER_PNG[,DOSSIER_PNG…] --rapport BUILD/rapport.json --voix voix_principale.wav
#                            --a-part DOSSIER (assembler.py) --cartes DOSSIER (cartes.mjs) --plan-b DOSSIER (capture B)
#                            --sortie FICHIER.mp4 [--extraits] [--ffmpeg ffmpeg]
#   --rendu : séquences PNG de HyperFrames (frame_000001.png…), mises bout à bout (rendu en fenêtres) ; avec --fenetre-rendu A-B,
#             le rendu ne couvre que les images [A, B) de la vidéo principale (essai) : seules les insertions dans cette plage sont faites.
#   --extraits : essai, ne garde que 6 s avant et après chaque ajout.
# Encodage comme encoder.mjs (libx264 preset slow CRF 27, yuv420p, 24 i/s, +faststart ; AAC 128 kbit/s mono 48 kHz).
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
for k in ('rendu', 'rapport', 'voix', 'a-part', 'cartes', 'plan-b', 'sortie'): ap.add_argument('--' + k, required=True)
ap.add_argument('--fenetre-rendu'); ap.add_argument('--extraits', action='store_true')
ap.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', 'ffmpeg')); ap.add_argument('--crf', default='27')
a = ap.parse_args()
FPS, W, H, BAND = 24, 1280, 720, 100
H3 = H - BAND
XF = 12                     # fondu enchaîné : 0,5 s
ARRET, FIN, BONNE = 8.0, 10.0, 2.5   # durées des cartes (s)
LEAD, TAIL = .5, .6         # contre-exemple : voix après le fondu d'entrée, silence avant la carte « bonne méthode »
AMAX = 2.5                  # accélération maximale des images du scénario B
IN_W, IN_H = 400, 250; IN_X, IN_Y = W - IN_W - 18, H3 - IN_H - 38

R = json.load(open(a.rapport, encoding='utf-8'))
etapes = {b['etape']: b for b in R['synchro']['etapes']}
N = R['images']
F2, F8 = etapes['2']['debut_image'], etapes['8']['debut_image']
f0, f1 = (map(int, a.fenetre_rendu.split('-')) if a.fenetre_rendu else (0, N))
rendu = [os.path.join(d, f) for d in a.rendu.split(',') for f in sorted(os.listdir(d)) if f.startswith('frame_') and f.endswith('.png')]
if len(rendu) != f1 - f0: sys.exit(f'rendu : {len(rendu)} images, {f1 - f0} attendues ({f0}-{f1})')
lire_png = lambda f: np.asarray(Image.open(f).convert('RGB'), dtype=np.float32)
principal = lambda k: lire_png(rendu[k - f0])
carte = lambda nom: lire_png(os.path.join(a.cartes, nom + '.png'))
calque = lambda nom: np.asarray(Image.open(os.path.join(a.cartes, nom + '.png')).convert('RGBA'), dtype=np.float32)
def poser(fond, c):   # calque RGBA sur une image RGB
    al = c[..., 3:4] / 255; return fond * (1 - al) + c[..., :3] * al

# --- contre-exemple : images du scénario B calées sur les phrases de A_06_x ---
AP = json.load(open(os.path.join(a.a_part, 'a_part.json'), encoding='utf-8'))['A_06_x']
PH = AP['phrases']
if len(PH) != 5: sys.exit(f'A_06_x : {len(PH)} phrases, 5 attendues (Regardez… / Les ressorts… / Le dernier… : / il casse… / C\'est pour ça…)')
planB = json.load(open(os.path.join(a.plan_b, 'plan.json'), encoding='utf-8'))
scanB = {r['k']: r for r in json.load(open(os.path.join(a.plan_b, 'scan.json'), encoding='utf-8'))}
etape_B = lambda debut: next(i for i, s in enumerate(planB['steps']) if s['title'].startswith(debut))
# gestes du scénario B pour chaque phrase (indices d'étape de plan.json)
GROUPES = [[etape_B('Boulons 4, 1 et 3')], [etape_B('Boulon 5'), etape_B('Boulon 2')], [etape_B('Dernier boulon')], [etape_B('Le boulon casse')], []]
def images_B(etps):
    return [f for f in planB['frames'] if f['step'] in etps and scanB.get(f['k'], {}).get('keep') and not f.get('end')]
dur_ph = [(PH[j + 1]['reprise'] if j + 1 < 5 else PH[4]['fin_parole']) - PH[j]['reprise'] for j in range(5)]
segs, t = [], LEAD + XF / FPS
for j in range(5):
    src = images_B(GROUPES[j]) if GROUPES[j] else []
    lent = sum(1 for f in src if f.get('slow'))
    if j == 3:   # projection : toutes ses images (ralenti compris), voix « il casse… » au début, « C'est pour ça… » à la fin
        n = max(len(src), round((dur_ph[3] + dur_ph[4] + .4) * FPS))
        segs.append({'j': 3, 'src': src, 'n': n, 't': t}); t += n / FPS; break
    n = max(round(dur_ph[j] * FPS), int(np.ceil((len(src) - lent) / AMAX)) + lent if src else 0)
    segs.append({'j': j, 'src': src, 'n': n, 't': t}); t += n / FPS
fin_voix = segs[-1]['t'] + segs[-1]['n'] / FPS
# instants de chaque phrase dans l'ajout : au début de son segment ; la dernière à la fin de la projection
pose = {j: segs[j]['t'] for j in range(4)}; pose[4] = fin_voix - dur_ph[4] - .2
N_CE = int(round((fin_voix + TAIL) * FPS)) + XF + int(BONNE * FPS) + XF
def plan_contre():   # pour chaque image de l'ajout : ('B', k, facteur) | ('fige', k) | ('bonne', None)
    L = []
    for s in segs:
        src, n = s['src'], s['n']
        if not src: L += [L[-1] if L else ('noir',)] * n; continue
        lents = [f for f in src if f.get('slow')]
        if len(src) <= n: choix = src + [src[-1]] * (n - len(src)); fac = 1
        else:   # images mobiles sautées régulièrement, images au ralenti gardées
            vifs = [f for f in src if not f.get('slow')]; m = n - len(lents)
            pris = set(vifs[round(i * (len(vifs) - 1) / max(1, m - 1))]['k'] for i in range(m))
            choix = [f for f in src if f.get('slow') or f['k'] in pris]; fac = len(vifs) / max(1, m)
            choix += [choix[-1]] * (n - len(choix))
        L += [('B', f['k'], fac if not f.get('slow') else 1, f['step']) for f in choix]
    return L
PL = plan_contre()
print(f'contre-exemple : {N_CE / FPS:.2f} s ; segments ' + ', '.join(f"{s['j']}:{s['n'] / FPS:.2f}s/{len(s['src'])}img" for s in segs))

cache = {}
def image_B(k, step, fac):
    if k not in cache:
        if len(cache) > 64: cache.clear()
        im = Image.open(os.path.join(a.plan_b, f'f_{k:05d}.jpg')).convert('RGB').resize((W, H3), Image.BOX)
        cache[k] = np.asarray(im, dtype=np.float32)
    x = np.zeros((H, W, 3), np.float32); v = cache[k]
    rouge = np.array([200, 30, 30], np.float32); x[:H3] = v * .82 + rouge * .18   # teinte rouge du contre-exemple
    fin = os.path.join(a.plan_b, 'inset', f'in_{k:05d}.jpg')
    if os.path.exists(fin):
        x = poser(x, calque('fenetre-cadre'))
        x[IN_Y:IN_Y + IN_H, IN_X:IN_X + IN_W] = np.asarray(Image.open(fin).convert('RGB').resize((IN_W, IN_H), Image.LANCZOS), dtype=np.float32)
    x = poser(x, calque(f'contre-{step}'))
    if fac >= 1.25:
        tags = [1.5, 2, 2.5, 3, 3.5, 4, 5, 6]; g = min(tags, key=lambda v: abs(v - fac))
        x = poser(x, calque('accelere-' + str(g).replace('.', '_')))
    return x

# --- montage : liste des images de sortie (fonctions) et de l'audio ---
SR = 48000
def lire_audio(f):
    raw = subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
voix = lire_audio(a.voix); ce = lire_audio(os.path.join(a.a_part, 'a_part', 'A_06_x.wav'))
def audio_contre():
    y = np.zeros(int(round(N_CE / FPS * SR)), np.float32)
    for j in range(5):
        s0, s1 = int(round(PH[j]['reprise'] * SR)), int(round((PH[j]['fin_parole'] + .05) * SR))
        p = int(round(pose[j] * SR)); seg = ce[s0:s1]; y[p:p + len(seg)] += seg[:max(0, len(y) - p)]
    return y
def fondu(u, v, n):   # n images de u vers v (exclusives)
    return [(lambda i: (lambda: u() * (1 - (i + 1) / (n + 1)) + v() * ((i + 1) / (n + 1))))(i) for i in range(n)]
sortie, audio, journal = [], [], []
def principal_jusqua(k1, k0):
    for k in range(k0, k1): sortie.append((lambda k: lambda: principal(k))(k))
def avec_silence(n): audio.append(np.zeros(int(round(n / FPS * SR)), np.float32))
k = f0; voix_t = f0 / FPS
def avancer(k1):
    global k, voix_t
    principal_jusqua(k1, k); audio.append(voix[int(round(voix_t * SR)):int(round(k1 / FPS * SR))]); k = k1; voix_t = k1 / FPS
def inserer_carte(nom, duree, avant, apres):
    c = carte(nom); n0 = len(sortie)
    sortie.extend(fondu(lambda: principal(avant) if avant is not None else np.zeros((H, W, 3), np.float32), lambda: c, XF))
    sortie.extend([lambda: c] * int(duree * FPS))
    if apres is not None: sortie.extend(fondu(lambda: c, lambda: principal(apres), XF))
    avec_silence(len(sortie) - n0); journal.append({'ajout': nom, 'image': n0, 'images': len(sortie) - n0})
if f0 < F2 <= f1 - 1:
    avancer(F2); inserer_carte('arret-A_00_p', ARRET, F2 - 1, F2)
if f0 < F8 <= f1 - 1:
    avancer(F8); n0 = len(sortie); bonne = carte('bonne-methode')
    premiere = PL[0]
    sortie.extend(fondu(lambda: principal(F8 - 1), lambda: image_B(premiere[1], premiere[3], 1), XF))
    lead = int(round(LEAD * FPS)); sortie.extend([lambda: image_B(premiere[1], premiere[3], 1)] * lead)
    for e in PL: sortie.append((lambda e: lambda: image_B(e[1], e[3], e[2]))(e))
    reste = N_CE - XF - int(BONNE * FPS) - XF - (len(sortie) - n0)
    der = PL[-1]; sortie.extend([lambda: image_B(der[1], der[3], 1)] * max(0, reste))
    sortie.extend(fondu(lambda: image_B(der[1], der[3], 1), lambda: bonne, XF)); sortie.extend([lambda: bonne] * int(BONNE * FPS))
    sortie.extend(fondu(lambda: bonne, lambda: principal(F8), XF))
    y = audio_contre(); nimg = len(sortie) - n0; y = np.concatenate([y, np.zeros(max(0, int(round(nimg / FPS * SR)) - len(y)), np.float32)])[:int(round(nimg / FPS * SR))]
    audio.append(y); journal.append({'ajout': 'contre-exemple', 'image': n0, 'images': nimg, 'phrases': {j: round(pose[j], 3) for j in pose}})
avancer(f1)
if f1 == N:
    n0 = len(sortie); c = carte('arret-fin')
    sortie.extend(fondu(lambda: principal(N - 1), lambda: c, XF)); sortie.extend([lambda: c] * int(FIN * FPS))
    avec_silence(len(sortie) - n0); journal.append({'ajout': 'arret-fin', 'image': n0, 'images': len(sortie) - n0})

# --- extraits (essai) : 6 s autour de chaque ajout ---
garder = None
if a.extraits:
    garder = set()
    for j in journal:
        for i in range(max(0, j['image'] - 6 * FPS), min(len(sortie), j['image'] + j['images'] + 6 * FPS)): garder.add(i)
    garder = sorted(garder)
y = np.concatenate(audio)
if garder is not None:
    y = np.concatenate([y[int(round(i / FPS * SR)):int(round((i + 1) / FPS * SR))] for i in garder])
    sortie = [sortie[i] for i in garder]
wav = a.sortie + '.wav'
subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', wav],
               input=(np.clip(y, -1, 1) * 32767).round().astype('<i2').tobytes(), check=True)
enc = subprocess.Popen([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-i', wav, '-map', '0:v', '-map', '1:a', '-vf', f'settb=AVTB,setpts=PTS-STARTPTS,fps={FPS},format=yuv420p,setsar=1',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', a.crf, '-pix_fmt', 'yuv420p', '-r', str(FPS),
                        '-af', 'aresample=48000,apad', '-c:a', 'aac', '-b:a', '128k', '-ac', '1', '-shortest', '-movflags', '+faststart', a.sortie], stdin=subprocess.PIPE)
for i, f in enumerate(sortie):
    enc.stdin.write(np.clip(f(), 0, 255).round().astype(np.uint8).tobytes())
    if i % 480 == 0: print(f'image {i}/{len(sortie)}', flush=True)
enc.stdin.close(); enc.wait()
if enc.returncode: sys.exit('ffmpeg : échec de l\'encodage')
json.dump({'images': len(sortie), 'duree_s': len(sortie) / FPS, 'principal': {'images': N, 'etape2': F2, 'etape8': F8}, 'ajouts': journal},
          open(a.sortie + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{a.sortie} : {len(sortie)} images ({len(sortie) / FPS:.2f} s) ; ajouts : ' + ', '.join(f"{j['ajout']} à l'image {j['image']}" for j in journal))
