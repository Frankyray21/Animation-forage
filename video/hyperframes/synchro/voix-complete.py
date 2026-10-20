#!/usr/bin/env python3
# Vidéo 1, enregistrement complet du script (A/script-v2.json, toutes les répliques d'un seul tenant) : sépare la voix principale (sur
# laquelle la vidéo est calée) des passages montés à part (contre-exemple A_06_x, inséré avec ses images par inserer.py), et coupe la
# fin de l'enregistrement après la dernière réplique (sons ajoutés par ElevenLabs ensuite). Même sortie qu'assembler.py.
#
# Usage : python3 voix-complete.py --audio enregistrement.mp3 --bornes DOSSIER/bornes.json --sortie DOSSIER
#                                  [--fin 268.1] [--a-part A_06_x] [--ffmpeg ffmpeg]
#   --bornes : aligner.py sur l'enregistrement avec le script complet (script-v2.json : passage, orateur, texte).
#   --fin : instant de coupe de la fin (défaut : fin de parole de la dernière réplique + 0,05 s) ; 1 s de silence est ajoutée.
#   Passage à part : retiré de [sa reprise, reprise de la réplique suivante) ; le silence qui le précédait reste.
# Sortie : voix_principale.wav et .mp3, bornes.json (instants décalés), a_part/<passage>.wav, a_part.json.
import argparse, json, os, subprocess
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--audio', required=True); ap.add_argument('--bornes', required=True); ap.add_argument('--sortie', required=True)
ap.add_argument('--fin', type=float); ap.add_argument('--a-part', default='A_06_x'); ap.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', 'ffmpeg'))
a = ap.parse_args()
SR = 48000
os.makedirs(os.path.join(a.sortie, 'a_part'), exist_ok=True)
raw = subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', a.audio, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).copy()
def ecrire(y, f):
    subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', f],
                   input=(np.clip(y, -1, 1) * 32767).round().astype('<i2').tobytes(), check=True)
B = json.load(open(a.bornes, encoding='utf-8'))
L, P = B['repliques'], B['phrases']
part = set(a.a_part.split(','))
# phrases mal recalées (une phrase qui chevauche la précédente : le DTW n'a pas trouvé de silence entre elles) : toutes les phrases de
# la réplique sont reprises sur les îlots de parole (silences.json d'aligner.py), chacune recevant une suite d'îlots dont la durée suit
# au mieux sa longueur de texte (programmation dynamique, coupures seulement aux silences)
S = json.load(open(os.path.join(os.path.dirname(a.bornes), 'silences.json'), encoding='utf-8'))['silences']
corrigees = []
for li in sorted({p['ligne'] for p in P}):
    ph = [p for p in P if p['ligne'] == li]
    if all(ph[k]['reprise'] >= ph[k - 1]['fin_parole'] - 1e-6 for k in range(1, len(ph))): continue
    l0, l1 = L[li]['reprise'], L[li]['fin_parole']
    il, tc = [], l0   # îlots de parole de la réplique
    for s0, s1 in S:
        if s1 <= l0 or s0 >= l1: continue
        if s0 > tc: il.append((tc, s0))
        tc = max(tc, s1)
    if tc < l1: il.append((tc, l1))
    n, m = len(ph), len(il)
    if m < n: raise SystemExit(f'réplique {li} : {n} phrases, {m} îlots de parole')
    car = [len(p['texte']) for p in ph]; parole = sum(b - a for a, b in il); taux = parole / sum(car)
    INF = float('inf'); C = [[INF] * (m + 1) for _ in range(n + 1)]; R = [[0] * (m + 1) for _ in range(n + 1)]; C[0][0] = 0
    for k in range(1, n + 1):
        for e in range(k, m + 1):
            for b in range(k - 1, e):
                if C[k - 1][b] == INF: continue
                d = sum(v - u for u, v in il[b:e]); c = C[k - 1][b] + (d - car[k - 1] * taux) ** 2
                if c < C[k][e]: C[k][e], R[k][e] = c, b
    e, bornes_ph = m, []
    for k in range(n, 0, -1): b = R[k][e]; bornes_ph.append((il[b][0], il[e - 1][1])); e = b
    for p, (u, v) in zip(ph, reversed(bornes_ph)): p['reprise'], p['fin_parole'] = round(u, 6), round(v, 6)
    corrigees.append(f'{li} ({L[li]["passage"]})')
if corrigees: print('phrases reprises sur les îlots de parole : répliques ' + ', '.join(corrigees))
fin = a.fin if a.fin else L[-1]['fin_parole'] + .05
if fin < L[-1]['fin_parole'] - .3: raise SystemExit(f'--fin {fin} avant la fin de parole alignée de la dernière réplique ({L[-1]["fin_parole"]:.3f})')

coupes, AP = [], {}   # [début, fin) retirés de la voix principale
for i, l in enumerate(L):
    if l['passage'] not in part: continue
    if i + 1 >= len(L): raise SystemExit(f'{l["passage"]} : dernière réplique, pas de passage à part en fin')
    c0, c1 = l['reprise'], L[i + 1]['reprise']; coupes.append((c0, c1))
    s = x[int(round(c0 * SR)):int(round((l['fin_parole'] + .05) * SR))]
    ecrire(s, os.path.join(a.sortie, 'a_part', f'{l["passage"]}.wav'))
    AP[l['passage']] = {'apres': L[i - 1]['passage'], 'duree': len(s) / SR, 'source': [round(c0, 6), round(l['fin_parole'], 6)],
                        'phrases': [{**{k: p[k] for k in ('texte', 'hauteur_hz') if k in p}, 'passage': l['passage'], 'orateur': l['orateur'],
                                     'reprise': round(p['reprise'] - c0, 6), 'fin_parole': round(p['fin_parole'] - c0, 6)}
                                    for p in P if p['ligne'] == i]}
def dec(t):   # instant dans la voix principale
    return round(t - sum(c1 - c0 for c0, c1 in coupes if c1 <= t + 1e-9), 6)
morceaux, t = [], 0.0
for c0, c1 in coupes: morceaux.append(x[int(round(t * SR)):int(round(c0 * SR))]); t = c1
morceaux += [x[int(round(t * SR)):int(round(fin * SR))], np.zeros(SR, dtype=np.float32)]
y = np.concatenate(morceaux)
n = int(.01 * SR); y[int(round(dec(fin) * SR)) - n:int(round(dec(fin) * SR))] *= np.linspace(1, 0, n)   # fondu de 10 ms à la coupe de fin
wav = os.path.join(a.sortie, 'voix_principale.wav'); ecrire(y, wav)
subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', os.path.join(a.sortie, 'voix_principale.mp3')], check=True)
garde = [i for i, l in enumerate(L) if l['passage'] not in part]
nouv = {i: j for j, i in enumerate(garde)}
CLES = ('reprise', 'fin_parole', 'dtw_debut', 'dtw_fin')
BL = [{**l, 'ligne': nouv[i], **{k: dec(l[k]) for k in CLES if k in l}} for i, l in enumerate(L) if i in nouv]
BP = [{**p, 'ligne': nouv[p['ligne']], **{k: dec(p[k]) for k in CLES if k in p}} for p in P if p['ligne'] in nouv]
json.dump({'audio': 'voix_principale.wav', 'duree': len(y) / SR, 'fin_parole': BL[-1]['fin_parole'], 'repliques': BL, 'phrases': BP,
           'enregistrement': {'audio': os.path.basename(a.audio), 'duree': len(x) / SR, 'fin_coupee': round(fin, 3), 'a_part': {k: v['source'] for k, v in AP.items()}}},
          open(os.path.join(a.sortie, 'bornes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(AP, open(os.path.join(a.sortie, 'a_part.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'voix principale : {len(BL)} répliques, {len(y) / SR:.3f} s (enregistrement {len(x) / SR:.3f} s, coupé à {fin:.3f} s) ; à part : '
      + ', '.join(f'{k} {v["duree"]:.2f} s' for k, v in AP.items()))
