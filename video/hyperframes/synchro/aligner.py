#!/usr/bin/env python3
# Alignement d'un audio de dialogue déjà enregistré (ElevenLabs…) sur son script, pour caler une vidéo dessus (gen-a.mjs --synchro).
#
# Méthode (sans reconnaissance vocale ni réseau) :
#   1. silences de l'audio (ffmpeg silencedetect, -40 dB, 0,2 s) → reprises de parole et fins de parole ;
#   2. synthèse de référence du même texte, phrase par phrase, avec une voix locale Piper (bornes connues exactement) ;
#   3. MFCC des deux audios (numpy seul) puis DTW à bande (dtw.c, compilé ici) : chaque borne de la synthèse → instant de l'audio ;
#   4. chaque début est recalé sur la reprise de parole la plus proche, chaque fin sur la fin de parole la plus proche ; l'écart
#      est noté (au-delà de 0,3 s : « à vérifier »), avec la hauteur médiane de la voix de l'îlot (formateur grave, travailleur aigu).
# Vidéo 1 (2026-10-10) : 28 répliques, 63 phrases ; 26 répliques recalées à ±0,15 s, 2 à vérifier (une question longue, coupée en
# deux îlots, et la réponse qui la suit : voir README.md).
#
# Usage : python3 aligner.py --audio voix.mp3 --script script.json --piper-modele fr-siwis-low.onnx --espeak-data DOSSIER
#                            --sortie DOSSIER [--ffmpeg ffmpeg] [--bande 0.12]
#   script.json : liste de répliques {passage, orateur, texte} dans l'ordre de l'audio.
#   Python : numpy ; pour la synthèse : piper-tts 1.2.0 et piper-phonemize 1.1.0 (dans un venv), voix Piper fr « siwis » (CC BY 4.0,
#   non fournie). --espeak-data : dossier espeak-ng-data de piper-phonemize, par un chemin court (espeak-ng refuse les chemins longs).
# Sortie : bornes.json (phrases et répliques : début et fin DTW, reprise et fin de parole retenues, écarts, hauteur de voix),
#          silences.json, et les fichiers de travail (synthese.wav, *.f32, carte.txt).
import argparse, io, json, os, re, subprocess, wave
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--audio', required=True); ap.add_argument('--script', required=True)
ap.add_argument('--piper-modele', required=True); ap.add_argument('--espeak-data', required=True)
ap.add_argument('--sortie', required=True); ap.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', 'ffmpeg'))
ap.add_argument('--bande', type=float, default=.12)
a = ap.parse_args()
os.makedirs(a.sortie, exist_ok=True)
S = lambda *p: os.path.join(a.sortie, *p)
SR = 16000

def ffmpeg(*args, capture=False):
    r = subprocess.run([a.ffmpeg, '-hide_banner', '-nostdin', *args], capture_output=True, text=True)
    if r.returncode: raise SystemExit(f'ffmpeg : {r.stderr[-400:]}')
    return r.stderr

# 1) audio réel : PCM 16 kHz mono, silences
ffmpeg('-y', '-loglevel', 'error', '-i', a.audio, '-ac', '1', '-ar', str(SR), '-f', 's16le', S('reel.raw'))
log = ffmpeg('-i', a.audio, '-af', 'silencedetect=n=-40dB:d=0.2', '-f', 'null', '-')
sil, deb = [], None
for l in log.splitlines():
    m = re.search(r'silence_start: ([0-9.]+)', l)
    if m: deb = float(m.group(1))
    m = re.search(r'silence_end: ([0-9.]+)', l)
    if m and deb is not None: sil.append((deb, float(m.group(1)))); deb = None
reel = np.fromfile(S('reel.raw'), dtype=np.int16).astype(np.float64) / 32768
duree = len(reel) / SR
fin_parole = sil[-1][0] if sil and sil[-1][1] >= duree - .05 else duree
reprises = [0.0] + [b for _, b in sil]
fins = [x for x, _ in sil] + ([] if fin_parole < duree else [duree])
json.dump({'duree': duree, 'fin_parole': fin_parole, 'silences': sil}, open(S('silences.json'), 'w'), indent=1)

# 2) synthèse de référence, phrase par phrase (coupure après . ? :), silences connus entre phrases et répliques
import piper_phonemize as pp, piper.voice as pv
pv.phonemize_espeak = lambda t, v: pp.phonemize_espeak(t, v, data_path=a.espeak_data)
voix = pv.PiperVoice.load(a.piper_modele, config_path=a.piper_modele + '.json')
if voix.config.sample_rate != SR: raise SystemExit(f'voix Piper à {voix.config.sample_rate} Hz : 16 kHz attendus')
# mots anglais du métier : graphie phonétique pour la voix française (seulement pour la synthèse de référence)
PRON = [('jaws', 'djôz'), ('bolts', 'boltes'), ('bushing', 'bouchingue'), ('Clam', 'Clamme'), ('Chuck', 'Tcheuk'), ('bowl', 'bôle'),
        ('job', 'djobe'), ('drill', 'drile')]
script = json.load(open(a.script, encoding='utf-8'))
pcm, morceaux, t = [], [], 0
for i, r in enumerate(script):
    ph = [m.strip() for m in re.split(r'(?<=[.?:])\s+', r['texte']) if m.strip()]
    for j, m in enumerate(ph):
        txt = m
        for x, y in PRON: txt = txt.replace(x, y)
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as f: voix.synthesize(txt, f, length_scale=1.0, sentence_silence=0.0)
        buf.seek(0)
        with wave.open(buf) as f: s = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16)
        nz = np.nonzero(np.abs(s) > 300)[0]; s = s[nz[0]:nz[-1] + 1]
        morceaux.append({'ligne': i, 'phrase': j, 'passage': r['passage'], 'orateur': r.get('orateur'), 'texte': m,
                         'synth_debut': t / SR, 'synth_fin': (t + len(s)) / SR})
        pcm += [s, np.zeros(int((.3 if j == len(ph) - 1 else .15) * SR), dtype=np.int16)]
        t += len(s) + len(pcm[-1])
synth = np.concatenate(pcm)
with wave.open(S('synthese.wav'), 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(synth.tobytes())

# 3) MFCC (fenêtre 25 ms, pas 10 ms, 40 bandes mel, c1..c13 + log-énergie, normalisés par fichier) et DTW
def mfcc(x):
    x = np.append(x[0], x[1:] - .97 * x[:-1])
    win, hop, nfft = 400, 160, 512
    n = 1 + (len(x) - win) // hop
    fr = x[np.arange(win)[None, :] + hop * np.arange(n)[:, None]] * np.hamming(win)
    P = np.abs(np.fft.rfft(fr, nfft)) ** 2 / nfft
    mel = lambda f: 2595 * np.log10(1 + f / 700); imel = lambda m: 700 * (10 ** (m / 2595) - 1)
    b = np.floor((nfft + 1) * imel(np.linspace(mel(60), mel(7600), 42)) / SR).astype(int)
    fb = np.zeros((40, nfft // 2 + 1))
    for m in range(1, 41):
        fb[m - 1, b[m - 1]:b[m]] = (np.arange(b[m - 1], b[m]) - b[m - 1]) / max(1, b[m] - b[m - 1])
        fb[m - 1, b[m]:b[m + 1]] = (b[m + 1] - np.arange(b[m], b[m + 1])) / max(1, b[m + 1] - b[m])
    E = np.log(P @ fb.T + 1e-10)
    C = E @ np.cos(np.pi / 40 * (np.arange(40)[None, :] + .5) * np.arange(14)[:, None]).T
    F = np.hstack([C[:, 1:14], np.log(P.sum(1) + 1e-10)[:, None]])
    return ((F - F.mean(0)) / (F.std(0) + 1e-8)).astype(np.float32)
mfcc(reel).tofile(S('reel.f32')); mfcc(synth.astype(np.float64) / 32768).tofile(S('synthese.f32'))
ici = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['cc', '-O2', '-o', S('dtw'), os.path.join(ici, 'dtw.c'), '-lm'], check=True)
subprocess.run([S('dtw'), S('reel.f32'), S('synthese.f32'), '14', str(a.bande), S('carte.txt')], check=True)
carte = [int(l) for l in open(S('carte.txt'))]
vers_reel = lambda ts: carte[min(len(carte) - 1, max(0, round(ts * 100)))] / 100

# hauteur médiane de la voix (autocorrélation, 70–400 Hz) de chaque îlot de parole
def hauteur(t0, t1):
    f0 = []
    for s in range(int(t0 * SR), int(t1 * SR) - 640, 160):
        fr = reel[s:s + 640] - reel[s:s + 640].mean()
        if np.sqrt((fr ** 2).mean()) < .01: continue
        sp = np.fft.rfft(fr, 1280); ac = np.fft.irfft(sp * np.conj(sp))[:640]
        k = np.argmax(ac[SR // 400:SR // 70]) + SR // 400
        if ac[k] / ac[0] >= .45: f0.append(SR / k)
    return round(float(np.median(f0)), 1) if f0 else None

# 4) recalage sur les reprises et fins de parole
for m in morceaux:
    d, f = vers_reel(m['synth_debut']), vers_reel(m['synth_fin'])
    r = min(reprises, key=lambda x: abs(x - d)); e = min(fins, key=lambda x: abs(x - f))
    m.update(dtw_debut=d, dtw_fin=f, reprise=r, fin_parole=e, ecart_debut=round(d - r, 3), ecart_fin=round(f - e, 3),
             a_verifier=abs(d - r) > .3 or abs(f - e) > .3, hauteur_hz=hauteur(r, max(r + .2, e)))
lignes = []
for i, r in enumerate(script):
    ms = [m for m in morceaux if m['ligne'] == i]
    lignes.append({'ligne': i, 'passage': r['passage'], 'orateur': r.get('orateur'), 'texte': r['texte'],
                   'reprise': ms[0]['reprise'], 'fin_parole': ms[-1]['fin_parole'], 'ecart_debut': ms[0]['ecart_debut'],
                   'ecart_fin': ms[-1]['ecart_fin'], 'a_verifier': ms[0]['ecart_debut'] ** 2 > .09 or ms[-1]['ecart_fin'] ** 2 > .09})
json.dump({'audio': os.path.basename(a.audio), 'duree': duree, 'fin_parole': fin_parole, 'repliques': lignes, 'phrases': morceaux},
          open(S('bornes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for l in lignes:
    print(f"{l['ligne']:2d} {l['passage']:12s} o{l['orateur']} {l['reprise']:8.3f} → {l['fin_parole']:8.3f}"
          f"  ({l['ecart_debut']:+.2f} / {l['ecart_fin']:+.2f}){'  À VÉRIFIER' if l['a_verifier'] else ''}  {l['texte'][:50]}")
