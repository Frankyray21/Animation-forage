#!/usr/bin/env python3
# Tonalités d'un MP4 : segments où une fréquence domine (FFT par fenêtres de 20 ms), début, fin, fréquence, niveau.
# Usage : python3 -B video/hyperframes/outils/mesurer-tonalites.py FICHIER.mp4 FFMPEG
import subprocess, sys, numpy as np
r = subprocess.run([sys.argv[2], '-v', 'error', '-i', sys.argv[1], '-map', '0:a', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True)
x = np.frombuffer(r.stdout, np.float32); SR = 48000; N = 960
print(f'son : {len(x) / SR:.3f} s')
seg, cur = [], None
for i in range(len(x) // N):
    w = x[i * N:(i + 1) * N]; rms = float(np.sqrt(np.mean(w ** 2)) + 1e-12)
    f = None
    if 20 * np.log10(rms) > -45:
        sp = np.abs(np.fft.rfft(w * np.hanning(N), 8 * N)); f = round(float(np.argmax(sp)) * SR / (8 * N) / 5) * 5
    if cur and f is not None and abs(f - cur[2]) <= 10: cur[1] = (i + 1) * N / SR; cur[3].append(rms)
    else:
        if cur: seg.append(cur)
        cur = [i * N / SR, (i + 1) * N / SR, f, [rms]] if f is not None else None
if cur: seg.append(cur)
for a, b, f, l in seg:
    if b - a >= 0.1: print(f'  {a:6.3f} → {b:6.3f} s  {f:5d} Hz  {20 * np.log10(np.mean(l)):6.1f} dBFS')
