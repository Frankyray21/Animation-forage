#!/usr/bin/env python3
# synchro.json de la vidéo 1 (scénario A) à partir de bornes.json (aligner.py) : seulement des instants de l'audio ; les règles de
# montage (avance de l'image, fondus, accéléré…) sont dans gen-a.mjs --synchro.
# Répliques attendues (A/script.json, 28 répliques) : 0–3 intro à deux voix ; 4 à 17 = 00_c, 00_p, 01_c … 08_c, fin ; 18–27 = cinq
# questions (travailleur) et leurs réponses (formateur). Phrases utilisées : intro 2.1 (« Tant que le cône est boulonné »), fin 17.1–17.3
# (les trois lignes de « À retenir »), étape 7 : 12.2 et 12.3 (repères de contrôle).
# Usage : python3 synchro-a.py --bornes bornes.json --sortie synchro.json [--audio voix_A_elevenlabs.mp3]
import argparse, json
ap = argparse.ArgumentParser()
ap.add_argument('--bornes', required=True); ap.add_argument('--sortie', required=True); ap.add_argument('--audio', default=None)
a = ap.parse_args()
B = json.load(open(a.bornes, encoding='utf-8'))
L, P = B['repliques'], B['phrases']
if len(L) != 28: raise SystemExit(f'{len(L)} répliques : 28 attendues (script de la vidéo 1)')
attendu = ['A_intro'] * 4 + ['A_00_c', 'A_00_p', 'A_01_c', 'A_02_c', 'A_03_c', 'A_04_c', 'A_05_c', 'A_05_p', 'A_06_c', 'A_06_p',
           'A_07_c', 'A_07_p', 'A_08_c', 'A_fin'] + ['A_questions'] * 10
if [l['passage'] for l in L] != attendu: raise SystemExit('ordre des passages inattendu')
r3 = lambda x: round(x, 3)   # à la milliseconde, comme silencedetect
deb = lambda i: r3(L[i]['reprise'])
fin = lambda i: r3(L[i]['fin_parole'])
ph = lambda i, j: r3(next(p['reprise'] for p in P if p['ligne'] == i and p['phrase'] == j))
for l in L:
    if l['a_verifier']: print(f"! réplique {l['ligne']} ({l['texte'][:40]}…) : écart {l['ecart_debut']:+.2f} / {l['ecart_fin']:+.2f} s, à vérifier")
S = {
  'audio': a.audio or B['audio'], 'duree_audio': round(B['duree'], 3), 'fin_parole': r3(B['fin_parole']),
  'intro': {'titre': deb(0), 'r03': deb(1), 'r04': ph(2, 1), 'fin': fin(3)},
  'etapes': {'1': {'c': deb(4), 'p': [deb(5), fin(5)]}, '2': {'c': deb(6)}, '3': {'c': deb(7)}, '4': {'c': deb(8)}, '5': {'c': deb(9)},
             '6': {'c': deb(10), 'p': [deb(11), fin(11)]}, '7': {'c': deb(12), 'p': [deb(13), fin(13)]},
             '8': {'c': deb(14), 'p': [deb(15), fin(15)]}, '9': {'c': deb(16)}},
  'reperes_etape7': {'un_tour': ph(12, 2), 'compteur_fenetre': ph(12, 3)},
  'fin': {'debut': deb(17), 'lignes': [ph(17, 1), ph(17, 2), ph(17, 3)], 'fin_parole': fin(17)},
  'questions': [{'q': deb(18 + 2 * n), 'r': deb(19 + 2 * n), 'fin': fin(19 + 2 * n)} for n in range(5)],
}
json.dump(S, open(a.sortie, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{a.sortie} : {S["duree_audio"]} s, 9 étapes, 5 questions')
