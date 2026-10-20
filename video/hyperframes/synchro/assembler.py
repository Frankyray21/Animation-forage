#!/usr/bin/env python3
# Nouvelle voix de la vidéo 1 à partir de l'audio déjà enregistré (et allongé) et d'un enregistrement des seuls ajouts : chaque réplique
# du nouveau script (A/script-v2.json) est reprise de l'ancien audio, de l'enregistrement des ajouts, ou des deux (début gardé de
# l'ancien audio, fin « a_enregistrer » prise dans les ajouts). Les silences entre répliques gardées à la suite sont ceux de l'ancien
# audio ; ailleurs : le silence qui précédait la réplique dans l'ancien audio, ou la médiane des silences du même genre. Les instants
# (bornes.json, même forme que celle d'aligner.py) sont reportés exactement, sans nouvel alignement.
#
# Usage : python3 assembler.py --ancien-audio voix_allongee.wav --anciennes-bornes A/bornes-allonge.json --script A/script-v2.json
#                              --ajouts-audio ajouts.mp3 --ajouts-bornes DOSSIER/bornes.json --sortie DOSSIER
#                              [--a-part A_06_x] [--ffmpeg ffmpeg]
#   --ajouts-bornes : aligner.py sur l'enregistrement des ajouts avec A/script-ajouts.json (fait par --script-ajouts ci-dessous).
#   --a-part : passages gardés hors de la voix principale (contre-exemple : inséré au montage, avec ses images) → a_part/<passage>.wav
# python3 assembler.py --script A/script-v2.json --script-ajouts A/script-ajouts.json : écrit le script de l'enregistrement des ajouts.
# Sortie : voix_principale.wav (48 kHz mono) et .mp3, bornes.json, a_part/*.wav et a_part.json, assemblage.json (morceaux).
import argparse, json, os, subprocess
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--script', required=True); ap.add_argument('--script-ajouts')
ap.add_argument('--ancien-audio'); ap.add_argument('--anciennes-bornes'); ap.add_argument('--ajouts-audio'); ap.add_argument('--ajouts-bornes')
ap.add_argument('--sortie'); ap.add_argument('--a-part', default='A_06_x'); ap.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', 'ffmpeg'))
a = ap.parse_args()
SR = 48000
V2 = json.load(open(a.script, encoding='utf-8'))
AJ = [(i, l) for i, l in enumerate(V2) if l.get('a_enregistrer')]
if a.script_ajouts:   # script de l'enregistrement des ajouts : un passage par texte à enregistrer, dans l'ordre du script
    json.dump([{'passage': l['passage'], 'orateur': l['orateur'], 'texte': l['a_enregistrer'], 'ligne_v2': i} for i, l in AJ],
              open(a.script_ajouts, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{a.script_ajouts} : {len(AJ)} passages'); raise SystemExit
for k in ('ancien_audio', 'anciennes_bornes', 'ajouts_audio', 'ajouts_bornes', 'sortie'):
    if not getattr(a, k): raise SystemExit(f'--{k.replace("_", "-")} manquant')
os.makedirs(os.path.join(a.sortie, 'a_part'), exist_ok=True)

def lire(f):
    raw = subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
def ecrire(x, f):
    pcm = (np.clip(x, -1, 1) * 32767).round().astype('<i2').tobytes()
    subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', f], input=pcm, check=True)
norm = lambda t: ' '.join(t.split())

X = {'ancien': lire(a.ancien_audio), 'ajouts': lire(a.ajouts_audio)}
B = json.load(open(a.anciennes_bornes, encoding='utf-8')); BA = json.load(open(a.ajouts_bornes, encoding='utf-8'))
OL, OP = B['repliques'], B['phrases']
if len(BA['repliques']) != len(AJ): raise SystemExit(f'ajouts : {len(BA["repliques"])} passages alignés, {len(AJ)} attendus')
for (i, l), r in zip(AJ, BA['repliques']):
    if norm(r['texte']) != norm(l['a_enregistrer']): raise SystemExit(f'ajouts : « {r["texte"][:40]}… » au lieu de « {l["a_enregistrer"][:40]}… »')
    if r.get('a_verifier'): print(f"! ajout {l['passage']} ({r['texte'][:40]}…) : écart {r['ecart_debut']:+.2f} / {r['ecart_fin']:+.2f} s, à vérifier")
ajout_de = {i: n for n, (i, _) in enumerate(AJ)}
phr = lambda P, li: sorted([p for p in P if p['ligne'] == li], key=lambda p: p['phrase'])

# gain des ajouts : même niveau de parole (RMS des passages parlés) que l'ancien audio, à ±6 dB
def rms_parole(x, L):
    s = np.concatenate([x[int(l['reprise'] * SR):int(l['fin_parole'] * SR)] for l in L]); return float(np.sqrt(np.mean(s ** 2)))
gain = float(np.clip(rms_parole(X['ancien'], OL) / max(1e-9, rms_parole(X['ajouts'], BA['repliques'])), .5, 2))

# morceaux de chaque réplique : [source, début, fin, phrases (instants de la source)]
utilises, R = set(), []
for i, l in enumerate(V2):
    m, pre = [], norm(l['texte'][:len(l['texte']) - len(l.get('a_enregistrer', ''))])
    if pre:   # début (ou toute la réplique) repris de l'ancien audio
        k = next((k for k, o in enumerate(OL) if k not in utilises and o['passage'] == l['passage'] and
                  (norm(o['texte']) == pre if not l.get('a_enregistrer') else norm(o['texte']).startswith(pre))), None)
        if k is None: raise SystemExit(f'réplique {i} ({l["passage"]}) : début « {pre[:40]}… » absent de l\'ancien audio')
        utilises.add(k); P, acc = [], ''
        for p in phr(OP, k):
            if norm(acc) == pre: break
            P.append(p); acc += ' ' + p['texte']
        if norm(acc) != pre: raise SystemExit(f'réplique {i} : « {pre[:40]}… » ne finit pas sur une fin de phrase de l\'ancien audio')
        m.append({'src': 'ancien', 'ligne_src': k, 't0': OL[k]['reprise'], 't1': P[-1]['fin_parole'], 'phrases': P,
                  'suite': next((p['reprise'] for p in phr(OP, k) if p['phrase'] == P[-1]['phrase'] + 1), None)})
    if l.get('a_enregistrer'):
        n = ajout_de[i]; r = BA['repliques'][n]
        m.append({'src': 'ajouts', 'ligne_src': n, 't0': r['reprise'], 't1': r['fin_parole'], 'phrases': phr(BA['phrases'], n)})
    R.append({'i': i, 'l': l, 'm': m})
non_pris = [OL[k]['passage'] for k in range(len(OL)) if k not in utilises and OL[k]['passage'] not in ('A_05_c', 'A_05_p')]
if non_pris: print(f'! répliques de l\'ancien audio non reprises : {non_pris}')

# silences : avant une réplique de l'ancien audio, celui qui la précédait ; entre deux répliques consécutives de l'ancien audio, le
# même ; sinon médiane des silences de l'ancien audio du même genre (question → réponse, réponse → question, avant « Étape », autre)
gaps = {}
for k in range(1, len(OL)):
    g = OL[k]['reprise'] - OL[k - 1]['fin_parole']
    genre = 'etape' if OL[k]['texte'].startswith('Étape') else 'q' if OL[k]['passage'] == 'A_questions' and OL[k]['orateur'] == 2 else \
        'r' if OL[k]['passage'] == 'A_questions' else 'autre'
    gaps.setdefault(genre, []).append(g)
med = {g: float(np.median(v)) for g, v in gaps.items()}
def silence_avant(prec, r):
    d = r['m'][0]
    if d['src'] == 'ancien' and prec and prec['m'][-1]['src'] == 'ancien' and prec['m'][-1]['ligne_src'] == d['ligne_src'] - 1 \
       and prec['m'][-1]['t1'] == OL[d['ligne_src'] - 1]['fin_parole']:
        return OL[d['ligne_src']]['reprise'] - OL[d['ligne_src'] - 1]['fin_parole']
    if d['src'] == 'ancien' and d['ligne_src'] > 0: return OL[d['ligne_src']]['reprise'] - OL[d['ligne_src'] - 1]['fin_parole']
    l = r['l']; return med['etape' if l['texte'].startswith('Étape') else 'q' if l['passage'] == 'A_questions' and l['orateur'] == 2 else
                      'r' if l['passage'] == 'A_questions' else 'autre']
INTRA = .45   # entre le début gardé et la fin enregistrée d'une même réplique (si l'ancien audio n'a pas de phrase suivante)

morceaux = lambda x, t0, t1: x[int(round(t0 * SR)):int(round(t1 * SR))]
FONDU = int(.008 * SR)
def adoucir(s):
    s = s.copy(); n = min(FONDU, len(s) // 2)
    if n: s[:n] *= np.linspace(0, 1, n); s[-n:] *= np.linspace(1, 0, n)
    return s
def monter(lignes, t_debut, tete=0.0):
    out, t, BL, BP, journal = [np.zeros(int(round(tete * SR)), dtype=np.float32)], tete, [], [], []
    prec = None
    for q, r in enumerate(lignes):
        if q: g = silence_avant(prec, r); out.append(np.zeros(int(round(g * SR)), dtype=np.float32)); t += g
        deb = t; P = []
        for j, d in enumerate(r['m']):
            if j:
                g = (d0['suite'] - d0['t1']) if d0.get('suite') else INTRA; out.append(np.zeros(int(round(g * SR)), dtype=np.float32)); t += g
            s = adoucir(morceaux(X[d['src']], d['t0'], d['t1'])) * (gain if d['src'] == 'ajouts' else 1)
            out.append(s.astype(np.float32))
            for p in d['phrases']:
                P.append({**{k: v for k, v in p.items() if k in ('texte', 'hauteur_hz')}, 'passage': r['l']['passage'], 'orateur': r['l']['orateur'],
                          'reprise': round(t + p['reprise'] - d['t0'], 6), 'fin_parole': round(t + p['fin_parole'] - d['t0'], 6), 'source': d['src']})
            journal.append({'ligne': q, 'passage': r['l']['passage'], 'source': d['src'], 'ligne_source': d['ligne_src'], 'de': round(d['t0'], 6),
                            'a': round(d['t1'], 6), 'vers': round(t, 6)})
            t += len(s) / SR; d0 = d
        BL.append({'ligne': q, 'passage': r['l']['passage'], 'orateur': r['l']['orateur'], 'texte': r['l']['texte'], 'reprise': round(deb, 6),
                   'fin_parole': round(t, 6), 'ecart_debut': 0, 'ecart_fin': 0, 'a_verifier': False})
        for j, p in enumerate(P): BP.append({'ligne': q, 'phrase': j, **p, 'ecart_debut': 0, 'ecart_fin': 0, 'a_verifier': False})
        prec = r
    return np.concatenate(out), BL, BP, journal, t

prin = [r for r in R if r['l']['passage'] not in a.a_part.split(',')]
queue = B['duree'] - B['fin_parole']
y, BL, BP, journal, fin = monter(prin, 0, tete=OL[0]['reprise'])
y = np.concatenate([y, np.zeros(int(round(queue * SR)), dtype=np.float32)])
wav = os.path.join(a.sortie, 'voix_principale.wav'); ecrire(y, wav)
subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k',
                os.path.join(a.sortie, 'voix_principale.mp3')], check=True)
json.dump({'audio': 'voix_principale.wav', 'duree': len(y) / SR, 'fin_parole': fin, 'repliques': BL, 'phrases': BP,
           'assemblage': {'ancien_audio': os.path.basename(a.ancien_audio), 'ajouts_audio': os.path.basename(a.ajouts_audio),
                          'gain_ajouts': round(gain, 3), 'silences_medians': {k: round(v, 3) for k, v in med.items()}, 'morceaux': journal}},
          open(os.path.join(a.sortie, 'bornes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
AP = {}
for r in R:
    if r['l']['passage'] not in a.a_part.split(','): continue
    z, L, P, _, f = monter([r], 0)
    ecrire(z, os.path.join(a.sortie, 'a_part', f"{r['l']['passage']}.wav"))
    AP[r['l']['passage']] = {'apres': V2[r['i'] - 1]['passage'], 'duree': len(z) / SR, 'phrases': P}
json.dump(AP, open(os.path.join(a.sortie, 'a_part.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'voix principale : {len(BL)} répliques, {len(y) / SR:.3f} s (gain des ajouts {gain:.2f}) ; à part : '
      + ', '.join(f'{k} {v["duree"]:.2f} s' for k, v in AP.items()))
