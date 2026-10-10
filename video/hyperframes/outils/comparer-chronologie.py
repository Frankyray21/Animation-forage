#!/usr/bin/env python3
# Compare, image par image, la chronologie produite par gen.mjs (rapport.json) à celle que calcule make_video.mjs lui-même
# (copie de travail préparée et lancée par outils/chronologie-make-video.mjs, arrêtée juste avant ffmpeg : compose.json +
# chronologie.json dans son dossier frames/montage).
# Points comparés : nombre d'images de la partie, étape et image 3D (k) de chaque image, fins figées et prolongations,
# images portant l'encadré « Pourquoi », images portant la fenêtre « ressorts en coupe » (et l'image de fenêtre k),
# début et durée des segments, instant de chaque voix.
# Scénario A (rapport.json de gen-a.mjs) : comparaison image par image des trois parties, fondus compris (plans superposés contre
# les { a, b, t } de compose.json), segments, repères des étapes, voix ; puis, si le projet a été écrit, minutage de chaque élément
# des sous-compositions et des hôtes (HTML) contre rapport.json. Voir comparer_a() plus bas.
# Usage : python3 -B video/hyperframes/outils/comparer-chronologie.py BUILD/rapport.json DOSSIER_MONTAGE_MAKE_VIDEO SCAN.json
import json, os, re, sys

rap = json.load(open(sys.argv[1], encoding='utf-8'))
work = sys.argv[2]
scan = json.load(open(sys.argv[3]))
comp = json.load(open(os.path.join(work, 'compose.json')))
chrono = json.load(open(os.path.join(work, 'chronologie.json')))
FPS = 24

def essai_de(rap):   # fenêtre d'essai de A (--fenetre) : « fenetre_essai » ; ancien rapport de A : « fenetre » (objet).
    # Pour D, « fenetre » est la liste des fenêtres « ressorts en coupe » : jamais une fenêtre d'essai.
    f = rap.get('fenetre_essai')
    if f is None and rap.get('scenario') == 'A' and isinstance(rap.get('fenetre'), dict): f = rap['fenetre']
    return f


def comparer_a():
    W = 1280
    def norm(spec):   # description d'une image de compose.json (make_video), sans les positions
        if isinstance(spec, dict) and 'a' in spec:
            return ('fondu', norm(spec['a']), norm(spec['b']), round(spec['t'], 9))
        d = spec if isinstance(spec, dict) else {'f': spec}
        src, band = d['f']
        ins = os.path.basename(d['in'][0]) if d.get('in') else None
        return (os.path.basename(src), os.path.basename(band)[:-4], ins, tuple(os.path.basename(x[0])[:-4] for x in d.get('ov', [])))
    def desc_plan(pl):   # images du plan reconstruites depuis rapport.json (sources, bandeau, suites de calques)
        out = []
        for l in range(pl['images']):
            src = pl['sources'][min(l, pl['mobiles'] - 1)]
            ins = None
            for a, b, ks in pl['fenetre']:
                if a <= l < b: ins = 'in_%05d.jpg' % ks[l - a]
            ov = [f"cnt{k}" for a, b, k in pl['compteur'] if a <= l < b]
            ov += ['slow' for a, b in pl['ralenti'] if a <= l < b]
            ov += [f"why{pl['i']}" for a, b in pl['pourquoi'] if a <= l < b]
            out.append((src, pl['bandeau'], ins, tuple(ov)))
        return out
    ecarts, total = [], 0
    for P in rap['parties']:
        mv = [norm(x) for x in comp['seqs'][P['p']]['frames']]
        plans = [(pl, desc_plan(pl)) for pl in P['plans']]
        gen = []
        for n in range(P['images']):
            cov = [(pl, d) for pl, d in plans if pl['debut'] <= n < pl['debut'] + pl['images']]
            if len(cov) == 1:
                gen.append(cov[0][1][n - cov[0][0]['debut']])
            elif len(cov) == 2:
                (pa, da), (pb, db) = cov
                gen.append(('fondu', da[n - pa['debut']], db[n - pb['debut']], round((n - pb['debut'] + 1) / 9, 9)))
            else:
                gen.append(('?', len(cov)))
        total += len(mv)
        if len(mv) != len(gen): ecarts.append(f"{P['nom']} : make_video {len(mv)} images, gen {len(gen)}")
        for n, (a, b) in enumerate(zip(mv, gen)):
            if a != b: ecarts.append(f"{P['nom']}, image {n} : make_video={a} gen={b}")
        fondus = sum(1 for x in mv if x[0] == 'fondu')
        gp = sum(1 for x in mv if x[0] != 'fondu' and x[0].startswith('ins_'))
        cnt = lambda pred: sum(1 for x in mv for y in ([x[1], x[2]] if x[0] == 'fondu' else [x]) if pred(y))
        print(f"{P['nom']:9s}: make_video {len(mv)} images, gen {P['images']} ; {len(P['plans'])} plans ; fondus {fondus} images ; gros plans {gp} ; "
              f"fenêtre {cnt(lambda y: y[2] is not None)} ; compteur {cnt(lambda y: any(o.startswith('cnt') for o in y[3]))} ; "
              f"ralenti {cnt(lambda y: 'slow' in y[3])} ; « Pourquoi » {cnt(lambda y: any(o.startswith('why') for o in y[3]))} (côtés de fondu comptés à part)")
    print(f"écarts image par image ({total} images) : {len(ecarts)}" + ''.join('\n  ' + e for e in ecarts[:12]))
    if chrono['nframes'] != [P['images'] for P in rap['parties']]:
        print(f"  ÉCART nombre d'images des parties : make_video {chrono['nframes']}, gen {[P['images'] for P in rap['parties']]}")
    sm = [(m['part'], m['i'], m['f0'], m['f1']) for m in chrono['stepMarks']]
    sg = [(P['p'], e['i'], e['f0'], e['f1']) for P in rap['parties'] for e in P['etapes']]
    print(f"repères des étapes (f0, f1) : {'identiques (' + str(len(sm)) + ')' if sm == sg else 'ÉCART ' + str(sm) + ' / ' + str(sg)}")
    print('segments (make_video : from / dur ; gen : from / dur / première image / images montrées) :')
    ec_seg = 0
    for s, g in zip(chrono['segs'], rap['segments']):
        ok = abs(s['from'] - g['from']) < 1e-9 and abs(s['dur'] - g['dur']) < 1e-9
        ec_seg += not ok
        print(f"  {s['name']:9s} make_video {s['from']:9.3f} / {s['dur']:8.4f}   gen {g['from']:9.3f} / {g['dur']:8.4f} / {g['debut']:5d} / {g['images']:5d}{'' if ok else '  ÉCART'}")
    if len(chrono['segs']) != len(rap['segments']): ec_seg += 1; print('  ÉCART : nombre de segments')
    print(f"durée totale : make_video {chrono['t']:.4f} s, gen {rap['montage']['t_make_video']:.4f} s ({round(rap['montage']['t_make_video'] * FPS)} images ; "
          f"vidéo HF {rap['images']} images{', fenêtre ' + str(essai_de(rap)) if essai_de(rap) else ''})")
    va = {a['id']: a['at'] for a in chrono['audio']}
    vb = {v['id']: v.get('at_video_complete_s', v['debut_s']) for v in rap['voix']}
    diff = [(i, va.get(i), vb.get(i)) for i in sorted(set(va) | set(vb)) if va.get(i) is None or vb.get(i) is None or abs(va[i] - vb[i]) > 0.0015]
    if essai_de(rap): diff = [d for d in diff if d[2] is not None]   # fenêtre : seules les voix qui y tombent sont dans le projet
    print(f"voix : {len(va)} passages make_video, {len(vb)} gen ; écart > 1,5 ms : {diff if diff else 'aucun'}")
    return len(ecarts) + ec_seg + (sm != sg) + len(diff)


def verifier_html_a(build):   # minutage de chaque élément écrit contre rapport.json (plans dans la fenêtre)
    tm = lambda h, i: (lambda m: (round(float(m.group(1)) * FPS, 6), round(float(m.group(2)) * FPS, 6)) if m else None)(
        re.search(r'id="' + re.escape(i) + r'"[^>]*?data-start="([^"]+)" data-duration="([^"]+)"', h))
    index = open(os.path.join(build, 'index.html'), encoding='utf-8').read()
    A0 = essai_de(rap)['debut'] if essai_de(rap) else 0
    plans = {pl['id']: (P, pl) for P in rap['parties'] for pl in P['plans']}
    err, n_el = [], 0
    for w in rap['projet']['plans']:
        P, pl = plans[w['id']]
        v0, v1 = w['v0'], w['v1']
        h = open(os.path.join(build, 'compositions', pl['id'] + '.html'), encoding='utf-8').read()
        att = {pl['id']: (P['debut'] + pl['debut'] + v0 - A0, v1 - v0)}
        def put(i, a, b):
            a, b = max(a, v0), min(b, v1)
            if b > a: att[i] = (a - v0, b - a)
        put(f"vue3d-{pl['id']}", 0, pl['mobiles']); put(f"vue3d-{pl['id']}-fige", pl['mobiles'], pl['images'])
        runs = lambda lst: [r for r in lst if min(r[1], v1) > max(r[0], v0)]
        for j, (a, b, ks) in enumerate(runs(pl['fenetre'])):
            put(f"cadre-{pl['id']}-{j}", a, b); put(f"fenetre-{pl['id']}-{j}", a, min(b, pl['mobiles'])); put(f"fenetre-{pl['id']}-{j}-fige", max(a, pl['mobiles']), b)
        for nom, lst in (('compteur', pl['compteur']), ('ralenti', pl['ralenti']), ('pourquoi', pl['pourquoi'])):
            for j, r in enumerate(runs(lst)): put(f"{nom}-{pl['id']}-{j}", r[0], r[1])
        for i, (a, d) in att.items():
            n_el += 1
            got = tm(index if i == pl['id'] else h, i)
            if got != (a, d): err.append(f"{i} : attendu {(a, d)}, HTML {got}")
        ids = set(re.findall(r'id="((?:vue3d|cadre|fenetre|compteur|ralenti|pourquoi)-[^"]+)"', h))
        for i in ids - set(att): err.append(f"{i} : élément en trop dans {pl['id']}.html")
    print(f"HTML : {n_el} éléments minutés vérifiés (plans dans la fenêtre : {len(rap['projet']['plans'])}) ; écarts : {len(err)}" + ''.join('\n  ' + e for e in err[:12]))
    return len(err)


if rap.get('scenario') == 'A':
    n = comparer_a()
    build = os.path.dirname(os.path.abspath(sys.argv[1]))
    if not rap.get('chronologie_seule') and os.path.isdir(os.path.join(build, 'compositions')):
        n += verifier_html_a(build)
    print(f"BILAN : {n} écart(s)")
    sys.exit(1 if n else 0)

# make_video : une description par image (compose.py), cas D sans fondu interne
mv = []
for spec in comp['seqs'][0]['frames']:
    d = spec if isinstance(spec, dict) else {'f': spec}
    src, band = d['f']
    k = int(re.search(r'f_(\d+)\.jpg$', src).group(1)); i = int(re.search(r's(\d+)\.png$', band).group(1))
    why = any(re.search(r'why\d+\.png$', p) for p, *_ in d.get('ov', []))
    ins = int(re.search(r'in_(\d+)\.jpg$', d['in'][0]).group(1)) if d.get('in') else None
    mv.append((k, i, why, ins))
# gen.mjs : reconstruit depuis rapport.json
seg = {s['nom']: s for s in rap['segments']}; P0 = seg['partie 3D']['debut']
gen = []
for e in rap['etapes']:
    rows = [r for r in scan if r['step'] == e['i'] and r['keep']][:e['images_gardees']]
    gen += [(r['k'], e['i']) for r in rows] + [(rows[-1]['k'], e['i'])] * e['fin_figee']
why = {w['debut'] - P0 + j for w in rap['pourquoi'] for j in range(w['images'])}
ins = {f['debut'] - P0 + j for f in rap['fenetre'] for j in range(f['images'])}
gen = [(k, i, n in why, k if n in ins else None) for n, (k, i) in enumerate(gen)]

ecarts = []
if len(mv) != len(gen):
    ecarts.append(f'nombre d’images de la partie : make_video {len(mv)}, gen {len(gen)}')
for n, (a, b) in enumerate(zip(mv, gen)):
    for j, nom in enumerate(('image 3D k', 'étape', '« Pourquoi »', 'fenêtre (k)')):
        if a[j] != b[j]:
            ecarts.append(f'image {n} de la partie : {nom} make_video={a[j]} gen={b[j]}')
print(f"partie 3D : make_video {len(mv)} images, gen {len(gen)} images")
print(f"« Pourquoi » : make_video {sum(x[2] for x in mv)} images, gen {sum(x[2] for x in gen)}")
print(f"fenêtre : make_video {sum(x[3] is not None for x in mv)} images, gen {sum(x[3] is not None for x in gen)}")
print(f"écarts image par image : {len(ecarts)}" + (''.join('\n  ' + e for e in ecarts[:12])))
# segments et durée totale
print('segments (début s / durée s) :')
for s, g in zip(chrono['segs'], rap['segments']):
    print(f"  {s['name']:10s} make_video {s['from']:8.3f} / {s['dur']:8.3f}   gen {g['debut'] / FPS:8.3f} / {g['images'] / FPS:8.3f}")
print(f"durée totale : make_video {chrono['t']:.3f} s, gen {rap['duree_s']:.3f} s ({rap['images']} images)")
# voix
va = {a['id']: a['at'] for a in chrono['audio']}; vb = {v['id']: v['debut_s'] for v in rap['voix']}
diff = [(i, va.get(i), vb.get(i)) for i in sorted(set(va) | set(vb)) if va.get(i) is None or vb.get(i) is None or abs(va[i] - vb[i]) > 0.0015]
print(f"voix : {len(va)} passages make_video, {len(vb)} gen ; écart > 1,5 ms : {diff if diff else 'aucun'}")
