#!/usr/bin/env python3
# Allonge un audio de dialogue en insérant des pauses de silence dans ses silences existants (aucun mot coupé ni modifié), et
# décale en conséquence tous les instants de bornes.json (aligner.py). Sert quand la vidéo calée sur l'audio va trop vite :
# pauses avant les « Étape N », entre question et réponse, et après une étape dont l'image demande plus de temps que sa voix.
#
# Plan des pauses (JSON) : {"pauses": [{"avant": "12", "duree": 1.0, "raison": "…"}, {"avant": "12.3", …}, …], "fin": 1.0}
#   « avant » : réplique (« 12 ») ou phrase (« 12.3 », phrase 3 de la réplique 12, numérotation de bornes.json) devant laquelle
#   la pause est insérée, au milieu du silence qui la précède (vérifié : niveau sous −45 dBFS au point de coupe) ; « fin » :
#   silence ajouté après la dernière parole.
# Usage : python3 allonger.py --audio voix.mp3 --bornes bornes.json --plan pauses.json --sortie DOSSIER [--ffmpeg ffmpeg]
# Sortie : voix_allongee.wav (PCM 48 kHz mono, à encoder ensuite), voix_allongee.mp3, bornes.json (instants décalés, même forme,
#          avec la liste des pauses appliquées).
import argparse, json, os, subprocess
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--audio', required=True); ap.add_argument('--bornes', required=True); ap.add_argument('--plan', required=True)
ap.add_argument('--sortie', required=True); ap.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', 'ffmpeg'))
a = ap.parse_args()
os.makedirs(a.sortie, exist_ok=True)
SR = 48000
B = json.load(open(a.bornes, encoding='utf-8')); plan = json.load(open(a.plan, encoding='utf-8'))
raw = subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', a.audio, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).copy()
duree0 = len(x) / SR

phr = sorted(B['phrases'], key=lambda p: p['reprise'])
def cible(cle):   # instant de reprise visé et fin de parole qui le précède
    if '.' in cle:
        i, j = map(int, cle.split('.')); p = next(q for q in phr if q['ligne'] == i and q['phrase'] == j)
    else:
        i = int(cle); p = next(q for q in phr if q['ligne'] == i and q['phrase'] == 0)
    k = phr.index(p)
    if k == 0: raise SystemExit(f'« {cle} » : pas de pause avant la première phrase')
    return p['reprise'], phr[k - 1]['fin_parole']

coupes = []
for e in plan['pauses']:
    r, f = cible(str(e['avant']))
    if not (f < r): raise SystemExit(f"« {e['avant']} » : pas de silence entre {f} et {r}")
    t = (f + r) / 2
    n = int(round(t * SR)); w = x[max(0, n - 480):n + 480]
    niv = 20 * np.log10(np.sqrt(np.mean(w ** 2)) + 1e-12)
    if niv > -45:   # milieu du silence occupé (souffle, bruit de bouche) : point le plus calme du silence, par pas de 10 ms
        cands = [(20 * np.log10(np.sqrt(np.mean(x[max(0, m - 480):m + 480] ** 2)) + 1e-12), m)
                 for m in range(int((f + .03) * SR), int((r - .03) * SR), 480)]
        if cands: niv, n = min(cands); t = n / SR
    if niv > -45: raise SystemExit(f"« {e['avant']} » : coupe à {t:.3f} s dans un passage à {niv:.1f} dBFS (pas un silence)")
    coupes.append({'avant': str(e['avant']), 't': round(t, 4), 'duree': float(e['duree']), 'niveau_dbfs': round(float(niv), 1),
                   'raison': e.get('raison', '')})
coupes.sort(key=lambda c: c['t'])
if len({c['t'] for c in coupes}) != len(coupes): raise SystemExit('deux pauses au même endroit')

# audio : morceaux entre les coupes, silences insérés, silence de fin
morceaux, prec = [], 0
for c in coupes:
    n = int(round(c['t'] * SR)); morceaux += [x[prec:n], np.zeros(int(round(c['duree'] * SR)), dtype=np.float32)]; prec = n
morceaux += [x[prec:], np.zeros(int(round(float(plan.get('fin', 0)) * SR)), dtype=np.float32)]
y = np.concatenate(morceaux)
pcm = (np.clip(y, -1, 1) * 32767).round().astype('<i2').tobytes()
wav = os.path.join(a.sortie, 'voix_allongee.wav')
subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', wav], input=pcm, check=True)
subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k',
                os.path.join(a.sortie, 'voix_allongee.mp3')], check=True)

# instants décalés : + somme des pauses insérées avant (coupes strictement antérieures)
def dec(t):
    return round(t + sum(c['duree'] for c in coupes if c['t'] < t), 6) if isinstance(t, (int, float)) else t
CLES = ('reprise', 'fin_parole', 'dtw_debut', 'dtw_fin')
for l in B['repliques'] + B['phrases']:
    for k in CLES:
        if k in l: l[k] = dec(l[k])
B['fin_parole'] = dec(B['fin_parole'])
B['duree'] = len(y) / SR
B['allongement'] = {'audio_source': os.path.basename(a.audio), 'duree_source': round(duree0, 3), 'duree': round(len(y) / SR, 3),
                    'pauses': coupes, 'fin': float(plan.get('fin', 0))}
json.dump(B, open(os.path.join(a.sortie, 'bornes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"{duree0:.3f} s → {len(y) / SR:.3f} s : {len(coupes)} pauses ({sum(c['duree'] for c in coupes):.2f} s) + fin {float(plan.get('fin', 0)):.2f} s")
for c in coupes: print(f"  {c['t']:8.3f} s  +{c['duree']:.2f} s  avant {c['avant']:5s} ({c['niveau_dbfs']} dBFS)  {c['raison']}")
