#!/usr/bin/env python3
# Voix off en français québécois (Amazon Polly, voix neuronales fr-CA : Gabrielle ou Liam) à partir de video/narration.json.
# Un fichier par passage : video/narration/<scénario>/<id>.mp3 (consigne « c », pourquoi « p », intro, fin) + manifeste.json (durées).
#
# Usage : python3 video/tts.py --scen A [--voix Gabrielle|Liam] [--samples] [--fake]
#   --samples : deux échantillons (Gabrielle et Liam) dans video/narration/echantillons/
#   --fake    : silences de la durée estimée (2,6 mots/s), pour régler le montage sans service de synthèse
# Identifiants : AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (+ AWS_SESSION_TOKEN s'il y a lieu), AWS_REGION (défaut us-east-1). Module : boto3.
import argparse
import json
import os
import re
import subprocess
import sys
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
ap = argparse.ArgumentParser()
ap.add_argument('--scen', default='A')
ap.add_argument('--voix', default='Gabrielle')
ap.add_argument('--samples', action='store_true')
ap.add_argument('--fake', action='store_true')
ap.add_argument('--src', default=os.path.join(ROOT, 'video', 'narration.json'))
ap.add_argument('--out', default=os.path.join(ROOT, 'video', 'narration'))
a = ap.parse_args()


def ssml(text, rate='97%'):
    # pauses naturelles après les points ; le texte est lu tel quel (déjà écrit en toutes lettres dans narration.json)
    t = escape(text.strip())
    t = re.sub(r'([.!?:;])\s+', r'\1 <break time="350ms"/> ', t)
    return f'<speak><prosody rate="{rate}">{t}</prosody></speak>'


def duration(path):
    r = subprocess.run([FFMPEG, '-hide_banner', '-i', path], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', r.stderr)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0


def synth(text, voice, path):
    if a.fake:   # silence de la durée estimée
        d = max(0.6, len(text.split()) / 2.6)
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', f'{d:.2f}', '-q:a', '6', path], check=True)
        return
    import boto3
    polly = boto3.client('polly', region_name=os.environ.get('AWS_REGION', os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')))
    r = polly.synthesize_speech(Engine='neural', LanguageCode='fr-CA', VoiceId=voice, OutputFormat='mp3', SampleRate='24000', TextType='ssml', Text=ssml(text))
    with open(path, 'wb') as f:
        f.write(r['AudioStream'].read())


if a.samples:
    d = os.path.join(a.out, 'echantillons'); os.makedirs(d, exist_ok=True)
    txt = ('Étape 6. Remettre les trois boulons longs, sans bushing. '
           'Pourquoi? Sans bushing, les boulons longs vissent plus loin : ils gardent assez de filets en prise pour retenir le cône.')
    for v in ('Gabrielle', 'Liam'):
        p = os.path.join(d, f'echantillon_{v}.mp3'); synth(txt, v, p); print(p, f'{duration(p):.1f} s')
    sys.exit(0)

src = json.load(open(a.src, encoding='utf-8'))
items = src.get(a.scen) or []
out = os.path.join(a.out, a.scen); os.makedirs(out, exist_ok=True)
man = []


def add(ident, n, kind, text):
    if not text:
        return
    p = os.path.join(out, f'{ident}.mp3'); synth(text, a.voix, p)
    man.append({'id': ident, 'n': n, 'kind': kind, 'file': os.path.relpath(p, ROOT), 'dur': round(duration(p), 3), 'text': text})
    print(f'{ident:10s} {man[-1]["dur"]:5.1f} s  {text[:70]}')


def text_of(x):
    return x.get('voix') or x.get('texte') if isinstance(x, dict) else x


add('intro', '', 'intro', text_of(src.get(f'intro_{a.scen}')))
for i, it in enumerate(items):
    add(f'{i:02d}_c', it['n'], 'c', it.get('voix'))
    add(f'{i:02d}_p', it['n'], 'p', it.get('pourquoi_voix'))
add('fin', '', 'fin', text_of(src.get(f'fin_{a.scen}')))
json.dump({'scen': a.scen, 'voix': 'silence' if a.fake else a.voix, 'items': man}, open(os.path.join(out, 'manifeste.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(man)} passages · {sum(m["dur"] for m in man):.1f} s → {out}/manifeste.json')
