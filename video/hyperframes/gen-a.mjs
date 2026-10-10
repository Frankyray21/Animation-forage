// Scénario A (« Procédure respectée », 9 étapes) : appelé par gen.mjs avec --scen A (même entrée, mêmes garde-fous, mêmes options
// générales). Reproduit video/make_video.mjs pour A (CONF A : slow '60.8-64.52:2', inset ['7'], inserts true, ref « Procédure »,
// accent #f2c230) :
//   - trois parties (étapes 1–3 | 4–5 | 6–9, make_video.mjs:210) séparées par les rendus Blender 02_face_mandrin (après l'étape 3),
//     03_coupe et 04_couvercle_retire (après l'étape 5), en Ken Burns 1,00 → 1,06 avec bandeau « Rendu Blender » (lignes 150-154, 278-296) ;
//   - dans chaque étape (lignes 214-249) : images gardées avant le gros plan, arrêt de HOLD_PRE images, fondu de 8 images vers le gros
//     plan tournant des pièces retirées (inserts.json, bandeau « Pièces retirées »), fondu de 8 images vers le retour (AFTER_KEEP
//     dernières images, rien si moins de AFTER_MIN, entier à la dernière étape), fin figée de HOLD_END images, prolongée par la voix ;
//     fondu aussi au début de l'étape suivante quand l'étape finit sur le gros plan ;
//   - calques image par image (decorate, lignes 251-266) : fenêtre « ressorts en coupe » (étape 7), compteur de tours (scan.json
//     count), « Ralenti × ½ » (plan.json slow, hors images figées), « Pourquoi » pendant sa voix ;
//   - carton titre, carton de fin « À retenir », fondus enchaînés de 0,5 s, voix (lignes 288-317).
// Chaque plan (« clip » de make_video) devient une sous-composition qui dure jusqu'à la fin du fondu vers le plan suivant (figée
// dessous) ; le plan suivant y entre avec l'opacité (j + 1) / 9 de compose.py. gen-a.mjs vérifie, image par image, que cette
// superposition redonne exactement la description de chaque image calculée comme make_video (decorate).
// Montage (durées des segments, fondus enchaînés, fondus d'ouverture et de fermeture) : chaîne ffmpeg de make_video rejouée à
// 128 × 72, deux passes (couleurs alternées décalées), nombre d'images et opacités mesurés.
//
// Options propres à A :
//   --fenetre DÉBUT-FIN   essai court : images DÉBUT (incluse) à FIN (exclue) de la vidéo complète, chronologie inchangée (tout est
//                         calculé sur la vidéo entière puis coupé) ; ne peut pas commencer dans le carton titre (sauf 0) ni dans le
//                         carton de fin ;
//   --chronologie-seule   n'écrit que rapport.json (aucun média, aucun HTML) : pour comparer-chronologie.py ;
//   --synchro FICHIER     vidéo calée sur un audio continu déjà enregistré (dialogue ElevenLabs) : FICHIER = synchro.json (instants
//                         de l'audio : intro, début de chaque étape, « Pourquoi », lignes « À retenir », questions). Avec --muet
//                         (l'audio est ajouté après l'encodage). Écarts voulus avec make_video, propres à ce mode :
//                           - ordre : carton titre, rendus de l'intro 03 (« 18 ressorts », dit dans l'intro), 04 (« tant que le cône est
//                             boulonné ») et 02 (« on regarde ça étape par étape »), parties 1, 2 et 3, « À retenir », « Questions de
//                             l'équipe » (aucun rendu entre les parties : la voix d'une étape va jusqu'à « Étape N » suivant) ;
//                           - chaque étape commence SYN_AVANCE s avant « Étape N » (fondu enchaîné de segment : fini à la voix) ;
//                             étape plus courte que sa voix : fin figée prolongée ; plus longue : fins figées raccourcies, puis
//                             images mobiles sautées à intervalles réguliers (jamais les images au ralenti), repère « Vidéo accélérée
//                             × N » (masqué pendant un « Pourquoi », qui occupe le même haut d'image ; gros plans tournants accélérés
//                             sans repère : rotation de présentation, pas un geste en temps réel) ;
//                           - « Pourquoi » pendant la phrase qui l'explique ; lignes de « À retenir » montrées quand elles sont dites ;
//                             carton « Questions de l'équipe » (question, puis réponse quand le formateur répond) ; fondu final 0,25 s
//                             (après la dernière parole) ; début de segment arrondi à l'image inférieure (fondu fini avant la voix).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { outilsFfmpeg, polices, dureeWav, controleHorsLigne } from './commun.mjs';

export async function genererA(C) {
  const { HERE, REPO, SCEN, FRAMES, OUT, MANF, FFMPEG, FONTS_CACHE, THREADS, GOP, FORCE, SIM_MISSING, SIM_INSET, TEXTE_HF, arg, has,
    CONF, FPS, W, H, BAND, H3, XF, HOLD_END, IN_W, IN_H, IN_X, IN_Y, PAD, plan, scan, steps, VOICE, notes, narrOf, voiceOf, estDur, nb, esc,
    fImg, inImg, jpegOk, rowByK } = C;
  // make_video.mjs:35-36, 289
  const HOLD_PRE = Math.round(.4 * FPS), XFN = 8, AFTER_KEEP = Math.round(.75 * FPS), AFTER_MIN = 40, INS = 3;
  const XF_F = Math.round(XF * FPS);
  const CHRONO = has('chronologie-seule');
  const readJ = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  if (has('synchro') && (!arg('synchro') || arg('synchro').startsWith('--'))) throw new Error('--synchro FICHIER : synchro.json manquant');
  const SYN_F = arg('synchro', null) ? path.resolve(arg('synchro')) : null;
  const SYN = SYN_F ? readJ(SYN_F) : null;
  if (SYN && VOICE.length) throw new Error('--synchro : ajouter --muet (la voix est l’audio de synchro.json, ajouté après l’encodage)');
  const SYN_AVANCE = .25, FONDU_FIN = SYN ? .25 : .8;   // avance de l'image sur « Étape N » (coupe) ; fondu de fermeture (make_video : 0,8 s)
  // --synchro : textes des encadrés et des cartons ajoutés (pas les bandeaux, texte de la procédure inchangé) : espace insécable aussi
  // devant ? ! ; et dans les mesures (« 1 ½ po »)
  const nbx = t => SYN ? nb(t).replace(/ ([?!;])/g, '\u00a0$1').replace(/(\d) ([½¼¾⅛])/g, '$1\u00a0$2').replace(/ (po)\b/g, '\u00a0$1') : nb(t);
  const T = f => f / FPS, S = x => String(x), ms = x => String(Math.round(x * 1000) / 1000);
  const p5 = k => String(k).padStart(5, '0'), p2 = j => String(j).padStart(2, '0');
  const { ffmpeg, RGB, sig, sigFile, upToDate, saveSig, encodeSeq, still } = outilsFfmpeg({ FFMPEG, THREADS, GOP, FORCE, OUT, FPS });
  const VF_3D = `${RGB},scale=${W}:${H3}:flags=area+accurate_rnd,format=rgb24`;   // compose.py:44-45 (BOX) — 3D et gros plans
  const VF_IN = `${RGB},scale=${IN_W}:${IN_H}:flags=lanczos+accurate_rnd,format=rgb24`;   // compose.py:54 (LANCZOS)

  // --- données propres à A (make_video.mjs:57, 80-83, 117-154) ---
  const insFile = path.join(FRAMES, 'inserts.json');
  const ins = CONF.inserts && fs.existsSync(insFile) ? readJ(insFile) : [];
  if (CONF.inserts && !ins.length) notes.push('ATTENTION : inserts.json absent : aucun gros plan (comme make_video.mjs:57)');
  const consOf = i => { const rows = scan.filter(r => r.step === i && r.cons); return (rows.find(r => new RegExp(`étape ${steps[i].n}(?!\\d)`).test(r.cons)) || { cons: '' }).cons; };
  const split = c => { const [m, s = ''] = c.split('<small>'); return { main: m.trim(), small: s.replace('</small>', '').trim() }; };
  const INS_TXT = { '4': 'Couvert des mâchoires + 3 boulons ¾', '5': 'Couvercle + 9 boulons ½', '6': '3 bushings', '7': '6 boulons ½ × 6 ½', '8': '3 boulons longs ½ × 8', '9': 'Cône et mâchoires' };
  const stepIdx = n => steps.findIndex(s => s.n === n);
  const bandes = {};   // nom du calque de make_video → contenu de bandHTML
  steps.forEach((s, i) => {
    const { main, small } = split(consOf(i));
    const same = main.replace(/<[^>]+>/g, '') === s.title;   // consigne identique au titre : seul le détail est ajouté
    bandes[`s${i}`] = { i, title: s.title, main: same ? small : main, small: same ? '' : small };
    const gp = ins.find(x => x.step === i);
    if (gp) bandes[`i${i}`] = { i, title: s.title, chip: 'Pièces retirées', main: INS_TXT[s.n] || '', small: (gp.ids || []).join(' · ') };
  });
  bandes.r02 = { i: stepIdx('4'), still: true, title: 'Face avant : couvert des mâchoires (jaw cover) et porte-capuchon (cap holder)' };
  bandes.r03 = { i: stepIdx('6'), still: true, title: 'Coupe : 18 ressorts comprimés derrière le cône (bowl)' };
  bandes.r04 = { i: stepIdx('6'), still: true, title: 'Couvercle retiré : 9 boulons du cône, dont 3 longs de retenue' };
  if (SYN) { bandes.r03.i = -1; bandes.r04.i = -1; bandes.r02.i = -1; }   // --synchro : rendus 03, 04 et 02 dans l'intro (barre d'étapes vide)
  const whyTxt = i => { const nr = narrOf(i); return nr && nr.pourquoi_ecran ? nr.pourquoi_ecran : null; };
  // compteurs (make_video.mjs:140-146) : une clé par tour et boulon des lignes de scan.json des étapes de CONF.inset
  const compteurs = new Map();
  scan.forEach(r => { if (r.count && CONF.inset.includes(r.n) && SCEN === 'A') compteurs.set(`${r.count.pass}_${r.count.num}`, r.count); });

  // --- sources des images (capture complète, ou simulation signalée) ---
  let avail3d = null, simCount = 0, simGp = 0;
  const src3d = k => {
    if (jpegOk(fImg(k))) return fImg(k);
    if (!SIM_MISSING) throw new Error(`image 3D manquante : f_${p5(k)}.jpg ; --simuler-manquantes pour la remplacer`);
    avail3d = avail3d || scan.filter(r => r.keep && jpegOk(fImg(r.k))).map(r => r.k);
    if (!avail3d.length) throw new Error('aucune image 3D disponible');
    let best = avail3d[0]; for (const a of avail3d) if (Math.abs(a - k) < Math.abs(best - k) || (Math.abs(a - k) === Math.abs(best - k) && a < best)) best = a;
    simCount++; return fImg(best);
  };
  const srcGp = file => {
    const f = path.join(FRAMES, file); if (jpegOk(f)) return f;
    if (!SIM_MISSING) throw new Error(`gros plan manquant : ${file} ; --simuler-manquantes pour le remplacer`);
    const x = ins.find(y => y.file === file), memes = ins.filter(y => y.step === x.step && jpegOk(path.join(FRAMES, y.file)));
    if (!memes.length) throw new Error(`gros plan ${file} : aucune image de l'étape ${x.n} disponible`);
    const j = ins.filter(y => y.step === x.step).indexOf(x);
    let best = memes[0]; for (const y of memes) { const jy = ins.filter(z => z.step === x.step).indexOf(y); if (Math.abs(jy - j) < Math.abs(ins.filter(z => z.step === x.step).indexOf(best) - j)) best = y; }
    simGp++; return path.join(FRAMES, best.file);
  };
  const srcOf = x => x.type === 'gp' ? srcGp(x.file) : src3d(x.k);
  let simInset = null, simInsetN = 0;
  const insetCache = new Map();
  const insetSrc = k => {   // fenêtre « ressorts en coupe » : make_video.mjs:254 (incrustée seulement si l'image existe)
    if (insetCache.has(k)) return insetCache.get(k);
    let r = null;
    if (jpegOk(inImg(k))) r = inImg(k);
    else if (SIM_INSET) {
      if (!simInset) {   // une image du plan « hyd » (la caméra de la fenêtre) recadrée 16:10 et réduite à 640 × 400 comme la capture --inset
        const hyd = scan.find(x => x.cam === 'hyd' && jpegOk(fImg(x.k)));
        if (hyd) {
          simInset = { k: hyd.k, f: path.join(OUT, '.travail', 'fenetre-simulee.png') };
          if (!CHRONO) { fs.mkdirSync(path.dirname(simInset.f), { recursive: true }); ffmpeg(['-i', fImg(hyd.k), '-vf', 'crop=ih*1.6:ih,scale=640:400:flags=lanczos', '-frames:v', '1', simInset.f]); }
        }
      }
      if (simInset) { r = simInset.f; simInsetN++; }
    } else if (fs.existsSync(inImg(k))) throw new Error(`fenêtre : ${inImg(k)} incomplète (capture en cours ?) ; --simuler-fenetre pour la remplacer`);
    insetCache.set(k, r); return r;
  };

  // --- 1) parties (make_video.mjs:210-249) : plans, fondus, fins figées, prolongations, repères des étapes ---
  const PARTS = [[0, 2], [3, 4], [5, 8]];
  if (steps.length !== 9) throw new Error(`plan.json : ${steps.length} étapes (le découpage en parties de make_video.mjs:210 en suppose 9)`);
  const stepMarks = [];
  // --synchro : images visées (première image de chaque segment, de chaque étape) d'après les instants de l'audio
  const f24 = t => Math.round(t * FPS), f24s = t => Math.floor(t * FPS + 1e-9);   // étapes : au plus près ; segments : fondu fini avant la voix
  let CIB = null;
  if (SYN) {
    const E = SYN.etapes, c = n => { if (!E[n] || typeof E[n].c !== 'number') throw new Error(`${SYN_F} : étape ${n} sans début`); return E[n].c; };
    if (typeof SYN.intro.r02 !== 'number') throw new Error(`${SYN_F} : intro.r02 manquant (synchro-a.py récent)`);
    const seg = { titre: 0, r03: f24s(SYN.intro.r03 - XF), r04: f24s(SYN.intro.r04 - XF), r02: f24s(SYN.intro.r02 - XF), 'partie 1': f24s(c('1') - XF),
      'partie 2': f24s(c('4') - XF), 'partie 3': f24s(c('6') - XF), fin: f24s(SYN.fin.debut - XF), questions: f24s(SYN.questions[0].q - XF) };
    const total = Math.ceil(SYN.duree_audio * FPS - 1e-9);         // la vidéo couvre tout l'audio
    const suivant = { 0: 'partie 2', 1: 'partie 3', 2: 'fin' };
    const etape = PARTS.map(([a, b], p) => {   // début de chaque étape (image absolue) et fin de la partie (fondu suivant compris)
      const S0 = seg[`partie ${p + 1}`], fin = seg[suivant[p]] + XF_F, A = [];
      for (let i = a; i <= b; i++) A.push(i === a ? S0 : f24(c(steps[i].n) - SYN_AVANCE));
      return { S0, fin, A, D: A.map((x, j) => (j + 1 < A.length ? A[j + 1] : fin) - x) };
    });
    const ordre = ['titre', 'r03', 'r04', 'r02', 'partie 1', 'partie 2', 'partie 3', 'fin', 'questions'];
    ordre.forEach((n, j) => { if (j && !(seg[n] > seg[ordre[j - 1]] + XF_F)) throw new Error(`--synchro : segment ${n} (image ${seg[n]}) trop près du précédent`); });
    if (!(total > seg.questions + 5 * FPS)) throw new Error('--synchro : questions trop courtes');
    etape.forEach((e, p) => e.D.forEach((d, j) => {
      const n = steps[PARTS[p][0] + j].n, f = E[n].f;
      if (d < 2 * FPS) throw new Error(`--synchro : étape ${n} : ${d} images seulement`);
      // l'image de l'étape reste jusqu'à la fin de sa parole (à 0,1 s près ; fondu de sortie compris)
      if (typeof f === 'number' && (e.A[j] + d) / FPS < f - .1) throw new Error(`--synchro : étape ${n} quittée à ${((e.A[j] + d) / FPS).toFixed(3)} s, parole jusqu'à ${f} s`);
    }));
    CIB = { seg, total, etape };
  }
  // --synchro : met l'étape à D images exactement (voir l'en-tête) ; renvoie le bilan
  const HOLD_MIN = 2, HOLD_MIN_FIN = 6, MIN_GP = 24 + XFN, MIN_FONDU = XFN + 4, MIN_PLAN = 6;   // gros plan : ≥ 1 s hors fondu d'entrée
  const auRalenti = x => x.type === 'plan' && !!(plan.frames[x.k] && plan.frames[x.k].slow);
  const arrondi = r => Math.round(r * 2) / 2;   // repère au demi près, posé seulement s'il dit plus que « × 1 »
  const etiquette = r => `Vidéo accélérée × ${String(arrondi(r)).replace('.', ',')}`;
  function recaler(cl, D) {
    const tot = () => cl.reduce((s, c) => s + c.frames.length + c.hold, 0), last = cl[cl.length - 1];
    const bilan = { images_source: tot(), images: D, prolongation: 0, figees_retirees: 0, sautees: 0, facteur: 1 };
    let delta = D - tot();
    if (delta >= 0) { last.hold += delta; last.prolonge = delta; bilan.prolongation = delta; return bilan; }
    for (const c of cl) {   // 1) fins figées raccourcies (le plan d'avant le gros plan d'abord, la fin de l'étape ensuite)
      const r = Math.min(Math.max(0, c.hold - (c === last ? HOLD_MIN_FIN : HOLD_MIN)), -delta);
      c.hold -= r; delta += r; bilan.figees_retirees += r; if (!delta) return bilan;
    }
    // 2) images mobiles sautées à intervalles réguliers, même facteur pour tous les plans de l'étape ; gardées telles quelles : les
    //    images au ralenti et toute suite d'au plus COURT images mobiles (pas d'accéléré ni de repère « Accéléré » d'une demi-seconde)
    const COURT = FPS;
    //    (une suite plus longue mais qui, accélérée, tomberait sous COURT images est aussi gardée : calcul refait jusqu'à stabilité)
    const fixe = (c, r) => { const f = new Array(c.frames.length).fill(false); let j = 0;
      while (j < c.frames.length) { if (auRalenti(c.frames[j])) { f[j++] = true; continue; }
        let e = j; while (e < c.frames.length && !auRalenti(c.frames[e])) e++;
        if (e - j <= COURT || (c.genre !== 'gros-plan' && Math.ceil((e - j) / r) < COURT)) for (let q = j; q < e; q++) f[q] = true;
        j = e; }
      return f; };
    const besoin = D - cl.reduce((s, c) => s + c.hold, 0);
    let info, garde, somme, hi = 1;
    for (let tour = 0; tour < 8; tour++) {
      const r0 = hi;
      info = cl.map(c => { const fx = fixe(c, r0), lent = fx.filter(Boolean).length, vif = c.frames.length - lent;
        const min = c.genre === 'gros-plan' ? MIN_GP : c.fade ? MIN_FONDU : MIN_PLAN;
        return { fx, lent, vif, minVif: Math.min(vif, Math.max(1, min - lent)) }; });
      garde = r => info.map(x => x.lent + Math.min(x.vif, Math.max(x.minVif, Math.ceil(x.vif / r - 1e-9))));
      somme = r => garde(r).reduce((s, n) => s + n, 0);
      const rMax = Math.max(1, ...info.map(x => x.vif)) + 1;   // au-delà, garde() ne change plus
      if (somme(rMax) > besoin) throw new Error(`--synchro : étape ${steps[cl[0].i].n} : ${D} images visées, impossible (minimum ${somme(rMax) + D - besoin})`);
      let lo = 1; hi = rMax;   // plus petit facteur qui tient dans le besoin
      for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (somme(m) <= besoin) hi = m; else lo = m; }
      if (Math.abs(hi - r0) < 1e-6 || cl.every((c, q) => fixe(c, hi).every((v, j) => v === info[q].fx[j]))) break;
    }
    const n = garde(hi);
    cl.forEach((c, q) => {
      const x = info[q], nVif = n[q] - x.lent;
      if (nVif === x.vif) return;
      const vifs = c.frames.map((f, j) => x.fx[j] ? -1 : j).filter(j => j >= 0);
      const pris = new Set(nVif === 1 ? [vifs[0]] : [...Array(nVif)].map((_, j) => vifs[Math.round(j * (x.vif - 1) / (nVif - 1))]));
      const fac = x.vif / nVif;
      if (arrondi(fac) > 1) for (const j of pris) if (c.frames[j].type === 'plan') c.frames[j].acc = etiquette(fac);
      c.frames = c.frames.filter((f, j) => x.fx[j] || pris.has(j));
      if (c.frames.length !== n[q]) throw new Error('recaler : décompte');
      c.acceleration = fac;
      bilan.sautees += x.vif - nVif;
    });
    bilan.facteur = +(Math.max(...cl.map(c => c.acceleration || 1))).toFixed(3);
    const reste = besoin - n.reduce((s, v) => s + v, 0);
    if (reste < 0) throw new Error(`recaler : étape ${steps[cl[0].i].n} : ${-reste} images de trop`);
    last.hold += reste; last.prolonge = (last.prolonge || 0) + reste; bilan.prolongation = reste;
    if (tot() !== D) throw new Error('recaler : durée');
    return bilan;
  }
  const bilansSynchro = [];
  const parties = PARTS.map(([a, b], p) => {
    const clips = [];
    for (let i = a; i <= b; i++) {
      const rows = scan.filter(r => r.step === i && r.keep);
      const gp = ins.filter(x => x.step === i), at = gp.length ? gp[0].at : Infinity;
      const F = r => ({ type: 'plan', k: r.k, i });
      const before = rows.filter(r => r.k < at).map(F);
      let after = rows.filter(r => r.k >= at).map(F);
      if (gp.length && i < steps.length - 1) after = after.length < AFTER_MIN ? [] : after.slice(-AFTER_KEEP);
      const fade = clips.length > 0 && !!clips[clips.length - 1].ins;   // l'étape précédente finit sur un gros plan
      if (before.length) clips.push({ frames: before, hold: gp.length ? HOLD_PRE : HOLD_END, fade, i, genre: 'avant' });
      if (gp.length) clips.push({ frames: gp.map(x => ({ type: 'gp', file: x.file, i })), hold: 0, fade: true, ins: true, i, genre: 'gros-plan' });
      if (after.length) clips.push({ frames: after, hold: HOLD_END, fade: gp.length > 0, i, genre: 'retour' });
    }
    for (const c of clips) c.prolonge = 0;
    if (SYN) for (let i = a; i <= b; i++) {   // --synchro : chaque étape à la durée que lui laisse l'audio
      const cl = clips.filter(c => c.i === i), D = CIB.etape[p].D[i - a];
      bilansSynchro.push({ etape: steps[i].n, debut_image: CIB.etape[p].A[i - a], debut_s: +(CIB.etape[p].A[i - a] / FPS).toFixed(3),
        voix_s: SYN.etapes[steps[i].n].c, ...recaler(cl, D) });
    }
    else for (let i = a; i <= b; i++) {   // voix plus longue que l'image : fin de l'étape prolongée (make_video.mjs:231-237)
      const cl = clips.filter(c => c.i === i); if (!cl.length) continue;
      const have = cl.reduce((s, c) => s + c.frames.length + c.hold, 0) / FPS;
      const vc = voiceOf(i, 'c'), vp = voiceOf(i, 'p');
      const need = (vc ? PAD + vc.dur : 0) + (vp ? PAD + vp.dur : 0) + (vc || vp ? .5 : 0);
      if (need > have) { const x = Math.ceil((need - have) * FPS); cl[cl.length - 1].hold += x; cl[cl.length - 1].prolonge = x; }
    }
    const frames = [];
    for (const c of clips) {   // make_video.mjs:238-248, en notant les bornes de chaque plan
      let f = c.frames; c.debut = frames.length; c.nF = 0; c.nM = c.frames.length;
      if (c.fade && frames.length) {
        if (f.length <= XFN) throw new Error(`étape ${steps[c.i].n} : plan de ${f.length} images, pas plus long que le fondu (${XFN}) : cas non pris en charge`);
        const L = frames[frames.length - 1];
        c.nF = Math.min(XFN, f.length);
        f.slice(0, XFN).forEach((x, j) => frames.push({ a: L, b: x, t: (j + 1) / (XFN + 1), i: x.i, k: x.k }));
        f = f.slice(XFN);
      }
      frames.push(...f);
      for (let r = 0; r < c.hold; r++) frames.push({ ...frames[frames.length - 1], hold: true });
      c.fin = frames.length;
    }
    for (let i = a; i <= b; i++) { const f0 = frames.findIndex(x => x.i === i), f1 = frames.length - 1 - [...frames].reverse().findIndex(x => x.i === i); if (f0 >= 0) stepMarks.push({ part: p, i, f0, f1 }); }
    return { p, a, b, clips, frames, N: frames.length };
  });
  if (SYN) for (const P of parties) {   // contrôle : parties et débuts d'étape aux images visées
    const e = CIB.etape[P.p];
    if (P.N !== e.fin - e.S0) throw new Error(`--synchro : partie ${P.p + 1} : ${P.N} images, ${e.fin - e.S0} visées`);
    stepMarks.filter(m => m.part === P.p).forEach(m => { if (e.S0 + m.f0 !== e.A[m.i - P.a]) throw new Error(`--synchro : étape ${steps[m.i].n} à l'image ${e.S0 + m.f0}, visée ${e.A[m.i - P.a]}`); });
  }

  // description d'une image comme decorate (make_video.mjs:251-266) : source, bandeau, fenêtre, compteur, ralenti, « Pourquoi »
  function desc(x, n, p) {
    if (x.a) return { a: desc(x.a, n, p), b: desc(x.b, n, p), t: x.t };
    const r = x.k != null ? rowByK.get(x.k) : null, pk = x.k != null ? plan.frames[x.k] : null;
    const d = { src: x.type === 'gp' ? x.file : `f_${p5(x.k)}.jpg`, band: (x.type === 'gp' ? 'i' : 's') + x.i, inset: null, cnt: null, slow: false, why: null };
    if (r && CONF.inset.includes(r.n) && r.cam !== 'hyd' && !r.cut && insetSrc(x.k)) d.inset = x.k;
    if (r && r.count && compteurs.has(`${r.count.pass}_${r.count.num}`)) d.cnt = `${r.count.pass}_${r.count.num}`;
    if (pk && pk.slow && !x.hold) d.slow = true;
    const m = stepMarks.find(s => s.part === p && s.i === x.i);
    if (SYN) {   // « Pourquoi » pendant la phrase qui l'explique (instants de l'audio)
      const w = whyTxt(x.i) && SYN.etapes[steps[x.i].n].p, t = (CIB.etape[p].S0 + n) / FPS;
      if (w && t >= w[0] - .15 && t <= w[1] + .6) d.why = x.i;
      d.acc = x.acc && !x.hold && d.why == null ? x.acc : null;   // repère « Vidéo accélérée × N », pas pendant un « Pourquoi »
    } else if (m && whyTxt(x.i)) {
      const vc = voiceOf(x.i, 'c'), vp = voiceOf(x.i, 'p'), nr = narrOf(x.i), t = (n - m.f0) / FPS;
      const s0 = vp ? PAD + (vc ? vc.dur + PAD : 0) : PAD + estDur(nr && nr.voix), s1 = s0 + (vp ? vp.dur + .8 : Math.max(4, nr.pourquoi_ecran.length / 14));
      if (t >= s0 && t <= s1) d.why = x.i;
    }
    return d;
  }
  const memeDesc = (u, v) => JSON.stringify(u) === JSON.stringify(v);
  // plans : images propres (fondu d'entrée compris), fin figée, puis prolongement figé pendant le fondu du plan suivant
  let nPlans = 0;
  for (const P of parties) {
    P.clips.forEach((c, j) => {
      const next = P.clips[j + 1];
      c.id = `plan-${P.p + 1}-${p2(j)}`; c.j = j; c.ordre = nPlans++;
      c.ext = next && next.nF ? next.nF : 0;
      c.total = c.fin - c.debut + c.ext;
      c.objs = [];
      for (let n = c.debut; n < c.fin + c.ext; n++) c.objs.push(n < c.debut + c.nF ? P.frames[n].b : n < c.fin ? P.frames[n] : P.frames[n].a);
      c.desc = c.objs.map((x, l) => desc(x, c.debut + l, P.p));
      c.band = c.desc[0].band;
      if (!c.desc.every(d => d.band === c.band)) throw new Error(`${c.id} : bandeau variable dans le plan`);
      const lastSrc = c.desc[c.nM - 1].src;
      c.desc.forEach((d, l) => { if (l >= c.nM && d.src !== lastSrc) throw new Error(`${c.id} : image figée inattendue à ${l}`); });
    });
    // contrôle : chaque image de la partie = un plan, ou deux plans superposés (fondu) — exactement la description de make_video
    for (let n = 0; n < P.N; n++) {
      const spec = desc(P.frames[n], n, P.p);
      const cov = P.clips.filter(c => n >= c.debut && n < c.debut + c.total);
      if (spec.a) {
        const [ca, cb] = cov;
        const ok = cov.length === 2 && cb.nF > 0 && n < cb.debut + cb.nF && memeDesc(spec.a, ca.desc[n - ca.debut]) && memeDesc(spec.b, cb.desc[n - cb.debut])
          && Math.abs(spec.t - (n - cb.debut + 1) / (XFN + 1)) < 1e-12;
        if (!ok) throw new Error(`partie ${P.p + 1}, image ${n} : le fondu ne correspond pas à la superposition des plans`);
      } else if (cov.length !== 1 || !memeDesc(spec, cov[0].desc[n - cov[0].debut])) throw new Error(`partie ${P.p + 1}, image ${n} : description différente de make_video`);
    }
  }
  if (simInsetN) notes.push(`SIMULATION : fenêtre « ressorts en coupe » absente (chronologie complète) pour ${new Set([...insetCache].filter(([, v]) => v && simInset && v === simInset.f).map(([k]) => k)).size} images (inset/ pas encore capturé) ; image fixe tirée de f_${p5(simInset.k)}.jpg (caméra hyd) recadrée à 640 × 400`);

  // --- 2) segments (make_video.mjs:288-308) et montage rejoué ---
  const vIntro = VOICE.find(v => v.id === 'intro'), vFin = VOICE.find(v => v.id === 'fin');
  // --synchro : durée de chaque segment = écart entre les images visées + fondu (le dernier va jusqu'au bout de l'audio)
  const durSyn = (a, b) => (CIB.seg[b] - CIB.seg[a]) / FPS + XF;
  const TITLE = SYN ? durSyn('titre', 'r03') : Math.max(3.5, vIntro ? vIntro.dur + 1.2 : 0);
  const END = SYN ? durSyn('fin', 'questions') : Math.max(4, vFin ? vFin.dur + 1.4 : 0);
  const SEGS = SYN ? [
    { nom: 'titre', type: 'titre', dur: TITLE },
    { nom: 'r03', type: 'rendu', dur: durSyn('r03', 'r04'), image: '03_coupe.jpg' },
    { nom: 'r04', type: 'rendu', dur: durSyn('r04', 'r02'), image: '04_couvercle_retire.jpg' },
    { nom: 'r02', type: 'rendu', dur: durSyn('r02', 'partie 1'), image: '02_face_mandrin.jpg' },
    { nom: 'partie 1', type: 'partie', p: 0 },
    { nom: 'partie 2', type: 'partie', p: 1 },
    { nom: 'partie 3', type: 'partie', p: 2 },
    { nom: 'fin', type: 'fin', dur: END },
    { nom: 'questions', type: 'questions', dur: (CIB.total - CIB.seg.questions) / FPS },
  ] : [
    { nom: 'titre', type: 'titre', dur: TITLE },
    { nom: 'partie 1', type: 'partie', p: 0 },
    { nom: 'r02', type: 'rendu', dur: INS, image: '02_face_mandrin.jpg' },
    { nom: 'partie 2', type: 'partie', p: 1 },
    { nom: 'r03', type: 'rendu', dur: INS, image: '03_coupe.jpg' },
    { nom: 'r04', type: 'rendu', dur: INS, image: '04_couvercle_retire.jpg' },
    { nom: 'partie 3', type: 'partie', p: 2 },
    { nom: 'fin', type: 'fin', dur: END },
  ];
  const K = SEGS.length;
  for (const s of SEGS) {
    if (s.type === 'partie') { s.N = parties[s.p].N; s.dur = s.N / FPS; }
    if (s.type === 'titre' || s.type === 'rendu') s.n = Math.round(s.dur * FPS);   // zoompan d=n (make_video.mjs:279)
  }
  // instants de make_video (lignes 302-308) : s.from = offset arrondi au ms (voix) ; t = durée totale (atrim)
  let MV_T = SEGS[0].dur; SEGS[0].from = 0; SEGS[0].S = 0;
  SEGS.slice(1).forEach(s => {
    const off = MV_T - XF; s.off = off; s.from = +off.toFixed(3); MV_T = off + s.dur;
    // xfade : offset (chaîne « %.4f » lue en µs) ramené à la base de temps 1/24 (arrondi au plus proche) = première image du fondu
    s.S = Math.round(Math.round(parseFloat(off.toFixed(4)) * 1e6) * FPS / 1e6);
  });
  const REJEU = rejouer();
  const TOTAL_F = REJEU.nb;
  SEGS.forEach((s, k) => { s.vis = k < K - 1 ? SEGS[k + 1].S + SEGS[k + 1].w.length - 1 - s.S : TOTAL_F - s.S; });
  for (const s of SEGS) if (s.type === 'partie' && s.vis !== s.N) throw new Error(`${s.nom} : ${s.N} images, ${s.vis} visibles d'après le rejeu`);
  if (SYN) {   // le rejeu ffmpeg doit redonner exactement les images visées
    for (const s of SEGS) if (s.S !== CIB.seg[s.nom]) throw new Error(`--synchro : ${s.nom} commence à l'image ${s.S} (rejeu), visée ${CIB.seg[s.nom]}`);
    if (TOTAL_F !== CIB.total) throw new Error(`--synchro : ${TOTAL_F} images (rejeu), ${CIB.total} visées`);
  }
  const E0 = SEGS[K - 1].S;

  function rejouer() {
    const dir = path.join(OUT, '.travail', 'rejeu'); fs.mkdirSync(dir, { recursive: true });
    // 128 × 72 (cadre 3D 128 × 62, bandeau 128 × 10) : hauteurs paires (yuv420p) ; à 64 × 36 le cadre 3D de 31 lignes laissait 2 lignes noires
    const RW = 128, RH = 72, RH3 = 62;
    const img = {}, plein = {}, bande = {};
    for (const c of ['white', 'black']) {
      img[c] = path.join(dir, `kb-${c}.png`); ffmpeg(['-f', 'lavfi', '-i', `color=c=${c}:s=128x80:d=1`, '-frames:v', '1', img[c]]);
      plein[c] = path.join(dir, `plein-${c}.png`); ffmpeg(['-f', 'lavfi', '-i', `color=c=${c}:s=${RW}x${RH}:d=1`, '-frames:v', '1', plein[c]]);
      bande[c] = path.join(dir, `bande-${c}.png`); ffmpeg(['-f', 'lavfi', '-i', `color=c=${c}:s=${RW}x${RH - RH3}:d=1`, '-frames:v', '1', bande[c]]);
    }
    const norm = `settb=AVTB,setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1`;
    // chaîne de make_video.mjs:278-308 à 128 × 72 (cadre 3D 128 × 62 + bandeau 128 × 10), chaque segment d'une couleur unie
    const passe = col => {
      const inputs = [], ch = []; let ni = 0; const inp = (...a) => { inputs.push(...a); return ni++; };
      SEGS.forEach((s, k) => {
        const c = col(k), l = `s${k}`;
        if (s.type === 'titre' || s.type === 'rendu') {
          const full = s.type === 'titre', n = s.n;
          const a = inp('-i', img[c]), b = inp('-loop', '1', '-t', String(s.dur), '-i', full ? plein[c] : bande[c]);
          ch.push(`[${a}:v]scale=320:200,crop=320:${full ? 180 : 155},zoompan=z='1+0.06*on/${n - 1}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${n}:s=${RW}x${full ? RH : RH3}:fps=${FPS},setsar=1,pad=${RW}:${RH}:0:0[${l}k]`,
            `[${l}k][${b}:v]overlay=0:${full ? 0 : RH3}:shortest=1,${norm}${full ? ',fade=t=in:st=0:d=0.6' : ''}[${l}]`);
        } else if (s.type === 'partie') {
          const a = inp('-f', 'lavfi', '-i', `color=c=${c}:s=${RW}x${RH}:r=${FPS}`);
          ch.push(`[${a}:v]trim=end_frame=${s.N},${norm}[${l}]`);
        } else {   // carton de fin (et --synchro : questions) ; fondu de fermeture sur le dernier segment seulement
          const a = inp('-loop', '1', '-t', String(s.dur), '-i', plein[c]);
          ch.push(`[${a}:v]${norm}${k === K - 1 ? `,fade=t=out:st=${s.dur - FONDU_FIN}:d=${FONDU_FIN}` : ''}[${l}]`);
        }
      });
      let cur = 's0', t = SEGS[0].dur;
      SEGS.slice(1).forEach((s, i) => { const off = t - XF, o = i === K - 2 ? 'v' : `x${i}`; ch.push(`[${cur}][s${i + 1}]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(4)}[${o}]`); cur = o; t = off + s.dur; });
      const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-threads', THREADS, '-filter_complex_threads', '1', ...inputs,
        '-filter_complex', ch.join(';'), '-map', '[v]', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], { maxBuffer: 1 << 28 });
      if (r.status !== 0) throw new Error(`rejeu du montage : ffmpeg code ${r.status} ${r.stderr}`);
      const NP = RW * RH, fs1 = NP * 3 / 2, nbI = r.stdout.length / fs1;
      if (!Number.isInteger(nbI)) throw new Error('rejeu du montage : sortie tronquée');
      const op = [];   // part du blanc à chaque image (Y = 16 + 219 × part)
      for (let f = 0; f < nbI; f++) { let s = 0; for (let j = 0; j < NP; j++) s += r.stdout[f * fs1 + j]; op.push(Math.min(1, Math.max(0, (s / NP - 16) / 219))); }
      return op;
    };
    // passe 1 : titre blanc (fondu d'ouverture mesurable) ; passe 2 : carton de fin blanc (fondu de fermeture mesurable)
    const col1 = k => k % 2 ? 'black' : 'white', col2 = k => (K - 1 - k) % 2 ? 'black' : 'white';
    const op1 = passe(col1), op2 = passe(col2);
    if (op1.length !== op2.length) throw new Error('rejeu : nombre d’images différent entre les deux passes');
    const nbI = op1.length;
    const un = x => x > 0.998, zero = x => x < 0.002;
    const poids = (op, col, k, f) => col(k) === 'white' ? op[f] : 1 - op[f];   // part du segment k dans l'image f
    for (let k = 1; k < K; k++) {   // fondu enchaîné vers le segment k : poids de k aux images S, S + 1, … jusqu'à 100 %
      const s = SEGS[k], w = [];
      if (!zero(poids(op1, col1, k, s.S - 1)) || !zero(poids(op1, col1, k, s.S)) || (s.S + 1 < nbI && zero(poids(op1, col1, k, s.S + 1)) && !un(poids(op1, col1, k, s.S + 1))))
        throw new Error(`rejeu : le fondu vers « ${s.nom} » ne commence pas à l'image ${s.S}`);
      for (let j = 0; j <= XF_F; j++) {
        const a = poids(op1, col1, k, s.S + j), b = poids(op2, col2, k, s.S + j);
        // les deux sens du fondu (blanc → noir, noir → blanc) diffèrent d'un à deux niveaux (troncature de xfade) : moyenne des deux
        if (Math.abs(a - b) > 1.5 / 219) throw new Error(`rejeu : passes discordantes au fondu vers « ${s.nom} » (image ${s.S + j} : ${a} / ${b})`);
        const m = un(a) && un(b) ? 1 : (a + b) / 2;
        w.push(m); if (un(m)) break;
      }
      if (!un(w[w.length - 1])) throw new Error(`rejeu : fondu vers « ${s.nom} » non terminé`);
      s.w = w;
    }
    const K0 = op1.findIndex(un); if (K0 < 0 || K0 >= SEGS[1].S) throw new Error('rejeu : fondu d’ouverture non terminé avant la partie');
    const EF = SEGS[K - 1].S, finImages = nbI - EF, wOut = SEGS[K - 1].w;
    let k0 = finImages - 1; while (k0 > wOut.length - 1 && !un(op2[EF + k0])) k0--;   // dernière image à 100 % avant la fermeture
    return { nb: nbI, ouverture: op1.slice(0, K0 + 1), fermetureDebut: k0, fermeture: op2.slice(EF + k0, nbI) };
  }

  // --- 3) voix (make_video.mjs:309-317) ---
  const audio = [];
  if (vIntro) audio.push({ v: vIntro, at: .6 });
  for (const m of stepMarks) {
    const seg = SEGS.find(s => s.type === 'partie' && s.p === m.part), t0 = seg.from + m.f0 / FPS, vc = voiceOf(m.i, 'c'), vp = voiceOf(m.i, 'p');
    if (vc) audio.push({ v: vc, at: t0 + PAD });
    if (vp) audio.push({ v: vp, at: t0 + PAD + (vc ? vc.dur + PAD : 0) });
  }
  if (vFin) audio.push({ v: vFin, at: SEGS[K - 1].from + .7 });

  // --- 4) fenêtre d'essai (--fenetre DÉBUT-FIN, images de la vidéo complète) ---
  let A0 = 0, B0 = TOTAL_F;
  if (arg('fenetre', null)) {
    const m = /^(\d+)-(\d+)$/.exec(arg('fenetre'));
    if (!m) throw new Error('--fenetre DÉBUT-FIN (numéros d’images, fin exclue)');
    [A0, B0] = [+m[1], Math.min(+m[2], TOTAL_F)];
    if (!(A0 < B0)) throw new Error(`--fenetre ${arg('fenetre')} : vide (vidéo de ${TOTAL_F} images)`);
    if (A0 > 0 && A0 < SEGS[0].vis) throw new Error('--fenetre : ne peut commencer dans le carton titre que s’il commence à 0');
    if (A0 > E0) throw new Error(`--fenetre : ne peut pas commencer dans le carton de fin (image ${E0})`);
  }
  const DUREE_F = B0 - A0;

  // rapport (parties, plans, calques image par image en intervalles locaux) : sert à comparer-chronologie.py
  const runs = (arr, v0, v1, key) => {   // suites d'images consécutives de même clé (non nulle), en indices locaux [a, b)
    const out = []; let cur = null;
    for (let l = v0; l < v1; l++) {
      const k = key(arr[l], l);
      if (k != null && cur && cur.k === k && cur.b === l) cur.b = l + 1;
      else { if (cur) out.push(cur); cur = k != null ? { k, a: l, b: l + 1 } : null; }
    }
    if (cur) out.push(cur); return out;
  };
  const planRapport = c => ({ id: c.id, i: c.i, n: steps[c.i].n, genre: c.genre, debut: c.debut, images: c.total, fondu: c.nF, mobiles: c.nM,
    figees: c.fin - c.debut - c.nM, prolongation: c.prolonge, prolongement_fondu: c.ext, bandeau: c.band,
    sources: c.frames.map(x => x.type === 'gp' ? x.file : `f_${p5(x.k)}.jpg`),
    fenetre: runs(c.desc, 0, c.total, d => d.inset != null ? 'f' : null).map(r => [r.a, r.b, c.desc.slice(r.a, r.b).map(d => d.inset)]),
    compteur: runs(c.desc, 0, c.total, d => d.cnt).map(r => [r.a, r.b, r.k]),
    ralenti: runs(c.desc, 0, c.total, d => d.slow ? 's' : null).map(r => [r.a, r.b]),
    pourquoi: runs(c.desc, 0, c.total, d => d.why != null ? 'w' : null).map(r => [r.a, r.b]),
    ...(SYN ? { accelere: runs(c.desc, 0, c.total, d => d.acc).map(r => [r.a, r.b, r.k]), acceleration: c.acceleration || 1 } : {}) });
  const voixRapport = [];
  const rapport = () => ({
    scenario: SCEN, frames: FRAMES, narration: MANF && fs.existsSync(MANF) ? MANF : null, fps: FPS, taille: [W, H],
    duree_s: T(DUREE_F), images: DUREE_F, fenetre_essai: A0 || B0 !== TOTAL_F ? { debut: A0, fin: B0, duree_s: T(DUREE_F), images_video_complete: TOTAL_F } : null,
    segments: SEGS.map(s => ({ nom: s.nom, type: s.type, debut: s.S, images: s.vis, from: s.from, dur: s.dur, ...(s.w ? { entree: s.w } : {}) })),
    montage: { titre_s: TITLE, titre_images_zoompan: SEGS[0].n, titre_images_montrees: SEGS[0].vis, fin_s: END, fin_images: SEGS.find(s => s.type === 'fin').vis,
      ...(SYN ? { questions_s: SEGS[K - 1].dur, questions_images: SEGS[K - 1].vis, fondu_fermeture_s: FONDU_FIN } : {}), t_make_video: MV_T,
      opacites: { ouverture: REJEU.ouverture, fermeture_debut: REJEU.fermetureDebut, fermeture: REJEU.fermeture } },
    parties: parties.map(P => ({ p: P.p, nom: SEGS.find(s => s.p === P.p).nom, debut: SEGS.find(s => s.p === P.p).S, images: P.N,
      etapes: stepMarks.filter(m => m.part === P.p).map(m => ({ i: m.i, n: steps[m.i].n, f0: m.f0, f1: m.f1 })), plans: P.clips.map(planRapport) })),
    voix: voixRapport, notes,
    ...(SYN ? { synchro: { fichier: SYN_F, audio: SYN.audio, duree_audio: SYN.duree_audio, avance_s: SYN_AVANCE, segments_vises: CIB.seg, images_visees: CIB.total,
      etapes: bilansSynchro } } : {}),
  });
  if (CHRONO) {
    for (const a of audio) voixRapport.push({ id: a.v.id, debut_s: +a.at.toFixed(3), adelay_ms: Math.round(a.at * 1000), duree_s: a.v.dur });
    fs.mkdirSync(OUT, { recursive: true });
    fs.rmSync(path.join(OUT, '.travail'), { recursive: true, force: true });
    fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify({ ...rapport(), chronologie_seule: true }, null, 1));
    console.log(`chronologie seule : ${path.join(OUT, 'rapport.json')} (${TOTAL_F} images, ${T(TOTAL_F).toFixed(3)} s)`);
    for (const n of notes) console.log('! ' + n);
    return;
  }

  // --- 5) écriture du projet ---
  fs.mkdirSync(OUT, { recursive: true });
  for (const d of ['assets/3d', 'assets/images', 'assets/fonts', 'assets/fenetre', 'compositions', 'assets/voix']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  for (const f of fs.globSync ? fs.globSync('assets/**/*.sig', { cwd: OUT }) : []) fs.rmSync(path.join(OUT, f));
  for (const f of fs.readdirSync(path.join(OUT, 'compositions'))) fs.rmSync(path.join(OUT, 'compositions', f));
  const tpl = name => fs.readFileSync(path.join(HERE, 'templates', name), 'utf8');
  const fill = (s, v) => s.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => { if (!(k in v)) throw new Error(`gabarit : {{${k}}} sans valeur`); return v[k]; });
  const fontRules = polices({ OUT, FONTS_CACHE, HERE, notes });
  const fontsFor = dir => fontRules.split('{{FONT_DIR}}').join(dir);
  const baseCss = fill(tpl('base.css'), { ACCENT: CONF.accent, BADGE_FG: '#111518', MAIN_FG: '#f2c230', INSET_BOX_W: String(IN_W + 8), INSET_BOX_H: String(IN_H + 34) });
  const common = sub => ({ W: String(W), H: String(H), H3: String(H3), BAND: String(BAND), FONTS_CSS: fontsFor(sub ? '../assets/fonts/' : 'assets/fonts/'), BASE_CSS: baseCss });
  const writeComp = (name, html) => fs.writeFileSync(path.join(OUT, 'compositions', name), html);
  const cle = (nom, vals) => `@keyframes ${nom} { ${vals.map((v, j) => `${+(100 * j / (vals.length - 1)).toFixed(6)}% { opacity: ${+v.toFixed(4)}; }`).join(' ')} }`;
  const dureeCle = vals => S(T(vals.length - 1));
  const tl = (a, n) => `data-start="${S(T(a))}" data-duration="${S(T(n))}"`;
  // bandeaux (bandHTML de make_video.mjs:117-123 ; A : lignes 129-135, 150-154)
  const prog = i => `<div class="prog">${steps.map((s, j) => `<i class="${j < i ? 'done' : j === i ? 'cur' : ''}"></i>`).join('')}</div>`;
  // bandeaux de A : deux plans (ou un plan et un rendu Blender) se superposent pendant chaque fondu, bandeau compris (voulu, comme
  // make_video) ; « check » le signale (content_overlap). La dispense data-layout-allow-overlap n'est pas héritée : elle est posée
  // ici sur chaque bloc de texte de la copie du bandeau propre à A (templates/bandeau.html et la sortie de D ne changent pas).
  // Seuls les bandeaux sont dispensés : un chevauchement entre calques (« Pourquoi », compteur, « Ralenti »…) reste signalé.
  const CONTENEURS = /class="(pos-bandeau|band|prog|txt|c|badge)"/;
  const dispense = html => html.replace(/<(div|span|b)((?: class="[^"]*")?)>/g, (m, tag, cls) => CONTENEURS.test(cls) ? m : `<${tag}${cls} data-layout-allow-overlap>`);
  const bandeau = nom => { const b = bandes[nom];
    return dispense(fill(tpl('bandeau.html'), { PROG: prog(b.i), BADGE: b.still ? '' : `<div class="badge"><span>Étape</span><b>${esc(steps[b.i].n)}</b></div>`,
      TITRE: nb(esc(b.title)), CHIP: b.chip ? `<span class="chip">${b.chip}</span>` : '', MAIN: b.main ? `<span class="m">${nb(b.main)}</span>` : '',
      SMALL: b.small ? `<span class="s">${nb(b.small)}</span>` : '', REF: b.still ? 'Rendu Blender' : CONF.ref })); };
  const KB_W = W;   // scale=3200:2000 ramené à la largeur du cadre
  const KB_H = Math.round(W * 2000 / 3200);
  const enc = { encodes: 0, cache: 0 }, utilises = new Set();
  const t3d = Date.now();
  const clip = (files, rel, vf) => { utilises.add(rel); enc[encodeSeq(files, path.join(OUT, rel), vf) === 'cache' ? 'cache' : 'encodes']++; };
  const fige = (file, rel, vf) => { utilises.add(rel); still(file, path.join(OUT, rel), vf); };

  const L = [], pad = '      ', STY = [];
  let nBandes = 0, piste = 0;
  const rapportFen = { plans: [], rendus: [] };
  SEGS.forEach((s, k) => {
    const g0 = Math.max(s.S, A0), g1 = Math.min(s.S + s.vis, B0); if (g1 <= g0) return;
    const z = k + 1;
    if (s.type === 'titre') {   // make_video.mjs:166 (textes A), 290 ; carton-titre.html commun avec D
      fs.copyFileSync(path.join(REPO, 'renders', '01_ensemble.jpg'), path.join(OUT, 'assets/images/01_ensemble.jpg'));
      writeComp('carton-titre.html', fill(tpl('carton-titre.html'), { ...common(true), IMAGE: '../assets/images/01_ensemble.jpg',
        OUV_DUREE: dureeCle(REJEU.ouverture), OUV_CLES: cle('titre-ouverture', REJEU.ouverture), DUREE_TITRE: S(T(s.vis)),
        KB_W: String(KB_W), KB_H: String(KB_H), KB_TOP: String(-(KB_H - H) / 2), KB_OX: String(W / 2), KB_OY: String(KB_H / 2),
        KB_DUREE: S((s.n - 1) / FPS), KB_ZOOM: '1.06', COULEUR: '#f2c230', KICKER: 'Vidéo de formation · Tête UM-012-100UG',
        TITRE: nb("Démonter le cône d'un mandrin — PRO-OP-DD-005"), SOUS_TITRE: nb('Les ressorts (springs) restent comprimés : suivre chaque étape') }));
      L.push(`${pad}<!-- carton titre : ${s.vis} images montrées (TITLE = ${ms(TITLE)} s, zoompan de ${s.n} images ; nombre mesuré par le rejeu ffmpeg) -->`);
      L.push(`${pad}<div id="carton-titre" class="clip hote-plein" style="z-index: ${z}" data-composition-id="carton-titre" data-composition-src="compositions/carton-titre.html" ${tl(g0 - A0, g1 - g0)} data-track-index="2" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
    } else if (s.type === 'rendu') {   // make_video.mjs:278-283 (full = false), 293-296
      const id = `rendu-${s.nom}`, d0 = g0 - s.S;
      fs.copyFileSync(path.join(REPO, 'renders', s.image), path.join(OUT, 'assets/images', s.image));
      const ch = Math.round(3200 * H3 / W);   // crop=3200:1550 (centré) : décalage (2000 − 1550) / 2 à l'échelle
      writeComp(`${id}.html`, fill(tpl('rendu-blender.html'), { ...common(true), ID: id, TITRE_RENDU: `Rendu Blender ${s.image}`,
        ENTREE_DUREE: dureeCle(s.w), ENTREE_CLES: cle(`${id}-entree`, s.w), DECALAGE: S(-T(d0)), IMAGE: `../assets/images/${s.image}`,
        DUREE: S(T(s.vis)), KB_W: String(KB_W), KB_H: String(KB_H), KB_TOP: String(-((2000 - ch) / 2) * W / 3200), KB_OX: String(W / 2),
        KB_OY: String(KB_H / 2), KB_DUREE: S((s.n - 1) / FPS), KB_ZOOM: '1.06', BANDEAU: bandeau(s.nom).trimEnd() }));
      nBandes++;
      L.push(`${pad}<!-- rendu Blender ${s.image} (${s.nom}) : ${s.vis} images, entrée en fondu enchaîné sur ${s.w.length - 1} images (opacités mesurées) -->`);
      L.push(`${pad}<div id="${id}" class="clip hote-plein" style="z-index: ${z}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" ${tl(g0 - A0, g1 - g0)} data-track-index="${(SYN ? s.nom === 'r03' || s.nom === 'r02' : s.nom === 'r04') ? 3 : 2}" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
      rapportFen.rendus.push({ nom: s.nom, debut: g0 - A0, images: g1 - g0, decalage: d0 });
    } else if (s.type === 'partie') {
      const P = parties[s.p], cls = `p${s.p + 1}`;
      STY.push(`      ${cle(`entree-${cls}`, s.w)}`, `      .partie.${cls} { animation-name: entree-${cls}; animation-duration: ${dureeCle(s.w)}s; }`);
      L.push(`${pad}<!-- ${s.nom} (étapes ${steps[P.a].n} à ${steps[P.b].n}) : images ${s.S} à ${s.S + s.N - 1} ; fondu enchaîné d'entrée sur ${s.w.length - 1} images (opacités mesurées) -->`);
      L.push(`${pad}<div class="partie ${cls}" style="z-index: ${z}; animation-delay: ${S(T(s.S - A0))}s">`);
      for (const c of P.clips) {
        const h0 = s.S + c.debut, q0 = Math.max(h0, A0), q1 = Math.min(h0 + c.total, B0); if (q1 <= q0) continue;
        const v0 = q0 - h0, v1 = q1 - h0;
        ecrirePlan(P, c, v0, v1);
        nBandes++;
        L.push(`${pad}  <!-- étape ${esc(steps[c.i].n)} — ${c.genre} : ${c.nM} images${c.nF ? ` (fondu d'entrée ${c.nF})` : ''} + figées ${c.fin - c.debut - c.nM}${c.prolonge ? ` (dont prolongation ${c.prolonge})` : ''}${c.ext ? ` + ${c.ext} sous le fondu suivant` : ''} -->`);
        L.push(`${pad}  <div id="${c.id}" class="clip hote-plein hote-plan" data-composition-id="${c.id}" data-composition-src="compositions/${c.id}.html" ${tl(q0 - A0, q1 - q0)} data-track-index="${piste++ % 2}" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
      }
      L.push(`${pad}</div>`);
    } else if (SYN && s.type === 'fin') {   // --synchro : « À retenir », chaque ligne montrée quand elle est dite
      const d0 = g0 - s.S, t0 = s.S / FPS;
      const ligne = (txt, color, t) => LINE(txt, color).replace('<div style="', `<div class="ligne" style="animation-delay:${S(+(t - .15 - t0 - T(d0)).toFixed(4))}s;`);
      const [l1, l2, l3] = SYN.fin.lignes;
      writeComp('carton-fin.html', fill(tpl('carton-fin-synchro.html'), { ...common(true), ENTREE_DUREE: dureeCle(s.w), ENTREE_CLES: cle('fin-entree', s.w),
        DECALAGE: S(-T(d0)), KICKER: 'À retenir · PRO-OP-DD-005',
        LIGNES: [ligne('Jamais un boulon du cône enlevé au complet sous charge', '#ff5d52', l1),   // mot pour mot l'audio (« un boulon »)
          ligne("Remettre les 3 boulons longs sans bushing (étape 6) avant l'étape 7", '#57c486', l2),
          ligne("Un tour à la fois, dans l'ordre de 1 à 6", '#f2c230', l3)].join('') }));
      L.push(`${pad}<!-- carton « À retenir » (--synchro) : ${s.vis} images, lignes montrées à ${SYN.fin.lignes.map(x => ms(x)).join(', ')} s (audio) -->`);
      L.push(`${pad}<div id="carton-fin" class="clip hote-plein" style="z-index: ${z}" data-composition-id="carton-fin" data-composition-src="compositions/carton-fin.html" ${tl(g0 - A0, g1 - g0)} data-track-index="2" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
    } else if (s.type === 'questions') {   // --synchro : « Questions de l'équipe »
      ecrireQuestions(s, g0, g1, z);
    } else {   // carton de fin (make_video.mjs:161-167, 299-300) ; carton-fin.html commun avec D
      writeComp('carton-fin.html', fill(tpl('carton-fin.html'), { ...common(true),
        ENTREE_DUREE: dureeCle(s.w), ENTREE_CLES: cle('fin-entree', s.w),
        FERM_DEBUT: S(T(REJEU.fermetureDebut)), FERM_DUREE: dureeCle(REJEU.fermeture), FERM_CLES: cle('fin-fermeture', REJEU.fermeture),
        KICKER: 'À retenir · PRO-OP-DD-005',
        LIGNES: [LINE('Ne jamais retirer les boulons du cône au complet sous charge', '#ff5d52'), LINE("Remettre les 3 boulons longs sans bushing (étape 6) avant l'étape 7", '#57c486')].join('') }));
      L.push(`${pad}<!-- carton de fin : ${s.vis} images (END = ${ms(END)} s ; nombre mesuré), fermeture de l'image ${REJEU.fermetureDebut} à la dernière -->`);
      L.push(`${pad}<div id="carton-fin" class="clip hote-plein" style="z-index: ${z}" data-composition-id="carton-fin" data-composition-src="compositions/carton-fin.html" ${tl(g0 - A0, g1 - g0)} data-track-index="2" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
    }
  });
  function LINE(txt, color) { return `<div style="font-family:'Barlow Condensed',sans-serif;font-size:46px;font-weight:600;line-height:1.12;text-wrap:balance;border-left:6px solid ${color};padding-left:22px;margin-bottom:24px">${nbx(txt)}</div>`; }

  // --synchro : « Questions de l'équipe » (une carte par question, réponse montrée quand le formateur répond). Fonds : images de
  // l'animation 3D (v4-A) et rendus Blender du dépôt, ramenés à 1280 × 720 (couverture, centré), sans outil posé sur un boulon.
  function ecrireQuestions(s, g0, g1, z) {
    const QR = [
      { q: 'Pis si un boulon veut pas se défaire ?', r: "On ne force pas à l'impact drill sous charge. On arrête et on en parle au superviseur avant de continuer.", fond: path.join(REPO, 'renders', '04_couvercle_retire.jpg') },
      { q: 'Pendant que je dévisse, je me place où ?', r: "Hors de l'axe du mandrin. Jamais devant le cône : s'il part, c'est là qu'il s'en va.", fond: path.join(REPO, 'renders', '02_face_mandrin.jpg') },
      { q: 'Pis si le cône reste coincé ?', r: 'On ne le frappe pas pour le décoincer, et on ne reste pas devant : les ressorts poussent encore, il peut être projeté.', fond: fImg(1847) },
      { q: "Si les boulons longs sont durs à remettre, on peut-tu sauter l'étape 6 ?", r: "Non. Les 3 boulons longs retiennent le cône si quelque chose lâche. Sans eux, rien ne l'arrête.", fond: fImg(1241) },
      { q: 'Pis si quelque chose me semble pas normal ?', r: 'On arrête et on en parle au superviseur. On regarde ça ensemble avant de continuer.', fond: path.join(REPO, 'renders', '01_ensemble.jpg') },
    ];
    if (SYN.questions.length !== QR.length) throw new Error(`${SYN_F} : ${SYN.questions.length} questions, ${QR.length} textes`);
    const d0 = g0 - s.S, t0 = s.S / FPS, Dq = T(s.vis), FX = .3;
    const pc = t => `${+(100 * Math.min(Dq, Math.max(0, t)) / Dq).toFixed(4)}%`;
    const cles = (nom, pts) => `@keyframes ${nom} { ${pts.map(([t, v]) => `${pc(t)} { ${v} }`).join(' ')} }`;
    // fenêtre de chaque carte (temps du segment) : jusqu'à la fin de la réponse dite + FX (sans dépasser la question suivante − 0,05 s,
    // ni remonter avant elle − 0,35 s) ; la carte suivante commence là
    const Q = SYN.questions;
    const fin = Q.map((x, n) => n + 1 < Q.length ? Math.min(Q[n + 1].q - .05, Math.max(Q[n + 1].q - .35, (x.fin ?? Q[n + 1].q - .35 - FX) + FX)) - t0 : Dq);
    const deb = Q.map((x, n) => n ? fin[n - 1] : 0);
    const K_ = [], FONDS = [], CARTES = [];
    QR.forEach((x, n) => {
      const a = deb[n], b = fin[n], dern = n === QR.length - 1;
      // fond : fondu enchaîné, 0 → 1 sur [a, a + FX], 1 → 0 sur [b, b + FX], zoom 1 → 1,04 sur [a, b] (CSS interpole chaque propriété
      // entre les images clés qui la nomment) ; carte (texte) : sans superposition, 1 → 0 sur [b − FX, b] puis la suivante 0 → 1 sur
      // [a, a + FX] (a = b de la précédente). Première carte : 1 dès 0 ; dernière : 1 jusqu'au bout.
      const fond = [[0, `opacity: ${n ? 0 : 1}; transform: scale(1);`], ...(n ? [[a, 'opacity: 0; transform: scale(1);'], [a + FX, 'opacity: 1;']] : []),
        [b, 'opacity: 1; transform: scale(1.04);'], ...(dern ? [] : [[b + FX, 'opacity: 0;']]), [Dq, `opacity: ${dern ? 1 : 0}; transform: scale(1.04);`]];
      const carte = [[0, `opacity: ${n ? 0 : 1};`], ...(n ? [[a, 'opacity: 0;'], [a + FX, 'opacity: 1;']] : []),
        ...(dern ? [] : [[b - FX, 'opacity: 1;'], [b, 'opacity: 0;']]), [Dq, `opacity: ${dern ? 1 : 0};`]];
      K_.push(cles(`fond-${n + 1}`, fond), cles(`carte-${n + 1}`, carte));
      const rel = `assets/images/question-${n + 1}.png`;
      fige(x.fond, rel, `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}`);
      FONDS.push(`          <img id="fond-question-${n + 1}" class="fond anime clip" style="animation-name: fond-${n + 1}" src="../${rel}" data-start="0" data-duration="${S(Dq)}" data-track-index="${n}" alt="" />`);
      const rep = +(SYN.questions[n].r - .15 - t0 - T(d0)).toFixed(4);
      CARTES.push(`          <div class="carte anime" style="animation-name: carte-${n + 1}">
            <div class="kicker">Questions de l'équipe · ${n + 1} / ${QR.length}</div>
            <div class="qui" style="color:#f2c230">Question</div>
            <div class="question">${nbx(esc(`« ${x.q} »`))}</div>
            <div class="reponse" style="animation-delay: ${S(rep)}s"><div class="qui" style="color:#57c486">Réponse</div><div class="t">${nbx(esc(x.r))}</div></div>
          </div>`);
    });
    writeComp('questions.html', fill(tpl('questions.html'), { ...common(true), ENTREE_DUREE: dureeCle(s.w), ENTREE_CLES: cle('questions-entree', s.w),
      DECALAGE: S(-T(d0)), DUREE: S(Dq), FERM_DEBUT: S(T(REJEU.fermetureDebut - d0)), FERM_DUREE: dureeCle(REJEU.fermeture), FERM_CLES: cle('questions-fermeture', REJEU.fermeture),
      CLES: K_.join('\n        '), FONDS: FONDS.join('\n'), CARTES: CARTES.join('\n') }));
    L.push(`${pad}<!-- « Questions de l'équipe » (--synchro) : ${s.vis} images ; questions à ${SYN.questions.map(x => ms(x.q)).join(', ')} s, réponses à ${SYN.questions.map(x => ms(x.r)).join(', ')} s (audio) ; fermeture de l'image ${REJEU.fermetureDebut} à la dernière -->`);
    L.push(`${pad}<div id="questions" class="clip hote-plein" style="z-index: ${z}" data-composition-id="questions" data-composition-src="compositions/questions.html" ${tl(g0 - A0, g1 - g0)} data-track-index="3" data-width="${W}" data-height="${H}" data-no-timeline></div>`);
  }

  // un plan = une sous-composition ; [v0, v1) : images du plan dans la fenêtre (temps locaux décalés de v0)
  function ecrirePlan(P, c, v0, v1) {
    const E = [], q = '          ', id = c.id, nM = c.nM, loc = l => l - v0;
    const coupe = (a, b) => [Math.max(a, v0), Math.min(b, v1)];
    // pistes (data-track-index : voies du Studio, ignorées au rendu) : au plus 3 éléments minutés par voie et par fichier
    // (lint timeline_track_too_dense, MAX_TIMED_ELEMENTS_PER_TRACK = 3) ; les gabarits communs avec D gardent leur voie, remplacée ici
    // vidéos imbriquées : temps local (défaut de HyperFrames) déclaré explicitement (lint nested_media_start_basis_ambiguous)
    const voie = (html, de, base, j) => html.replace(`data-track-index="${de}"`, `data-track-index="${base + Math.floor(j / 3)}"`);
    E.push(`${q}<!-- ${c.genre === 'gros-plan' ? `gros plan des pièces retirées (${c.frames[0].file} …)` : `images gardées k ${c.frames[0].k} à ${c.frames[nM - 1].k}`} : ${nM} images mobiles, puis image figée -->`);
    const [m0, m1] = coupe(0, nM);
    if (m1 > m0) {
      const rel = `assets/3d/${id}${m0 > 0 || m1 < nM ? `-${m0}-${m1}` : ''}.mp4`;
      clip(c.frames.slice(m0, m1).map(srcOf), rel, VF_3D);
      E.push(`${q}<video id="vue3d-${id}" class="vue3d" src="../${rel}" ${tl(loc(m0), m1 - m0)} data-media-start="0" data-hf-media-start-basis="local" data-track-index="0" muted playsinline></video>`);
    }
    const [f0, f1] = coupe(nM, c.total);
    if (f1 > f0) {
      const rel = `assets/3d/${id}-fin.png`; fige(srcOf(c.frames[nM - 1]), rel, VF_3D);
      E.push(`${q}<img id="vue3d-${id}-fige" class="clip vue3d" src="../${rel}" ${tl(loc(f0), f1 - f0)} data-track-index="0" alt="" />`);
    }
    E.push(bandeau(c.band).trimEnd());
    runs(c.desc, v0, v1, d => d.inset != null ? 'f' : null).forEach((r, j) => {
      const M = [], nom = `assets/fenetre/${id}-${j}`;
      const [a1, b1] = [r.a, Math.min(r.b, nM)], [a2, b2] = [Math.max(r.a, nM), r.b];
      if (b1 > a1) { clip(c.desc.slice(a1, b1).map(d => insetSrc(d.inset)), nom + '.mp4', VF_IN);
        M.push(`${q}<video id="fenetre-${id}-${j}" class="fenetre" src="../${nom}.mp4" ${tl(loc(a1), b1 - a1)} data-media-start="0" data-hf-media-start-basis="local" data-track-index="2" muted playsinline></video>`); }
      if (b2 > a2) { fige(insetSrc(c.desc[b2 - 1].inset), nom + '-fin.png', VF_IN);
        M.push(`${q}<img id="fenetre-${id}-${j}-fige" class="clip fenetre" src="../${nom}-fin.png" ${tl(loc(a2), b2 - a2)} data-track-index="${20 + Math.floor(j / 3)}" alt="" />`); }
      E.push(voie(fill(tpl('fenetre-coupe.html'), { ID: `cadre-${id}-${j}`, DEBUT: S(T(loc(r.a))), DUREE: S(T(r.b - r.a)), MEDIAS: M.join('\n') }), 2, 10, j).trimEnd());
    });
    runs(c.desc, v0, v1, d => d.cnt).forEach((r, j) => { const cc = compteurs.get(r.k);
      E.push(voie(fill(tpl('compteur.html'), { ID: `compteur-${id}-${j}`, DEBUT: S(T(loc(r.a))), DUREE: S(T(r.b - r.a)),
        RONDS: [1, 2, 3, 4, 5, 6].map(x => `<i class="${x < cc.num ? 'done' : x === cc.num ? 'cur' : ''}">${x}</i>`).join(''), TOUR: String(cc.pass), TOURS: String(cc.R), BOULON: String(cc.num) }), 4, 30, j).trimEnd()); });
    runs(c.desc, v0, v1, d => d.slow ? 's' : null).forEach((r, j) => E.push(voie(fill(tpl('ralenti.html'), { ID: `ralenti-${id}-${j}`, DEBUT: S(T(loc(r.a))), DUREE: S(T(r.b - r.a)) }), 4, 50, j).trimEnd()));
    if (SYN) runs(c.desc, v0, v1, d => d.acc).forEach((r, j) => E.push(voie(fill(tpl('accelere.html'), { ID: `accelere-${id}-${j}`, DEBUT: S(T(loc(r.a))), DUREE: S(T(r.b - r.a)), TEXTE: esc(r.k) }), 4, 55, j).trimEnd()));
    runs(c.desc, v0, v1, d => d.why != null ? 'w' : null).forEach((r, j) => {
      E.push(`${q}<!-- « Pourquoi » de l'étape ${esc(steps[c.i].n)} (make_video.mjs:259-264, pendant sa voix) -->`);
      E.push(voie(fill(tpl('pourquoi.html'), { ID: `pourquoi-${id}-${j}`, DEBUT: S(T(loc(r.a))), DUREE: S(T(r.b - r.a)), TEXTE: esc(nbx(whyTxt(c.i))) }), 3, 60, j).trimEnd());
    });
    let anim = '', cles = '';
    if (c.nF) {   // fondu d'entrée : (j + 1) / 9 aux images 0 … nF − 1, puis 1 (compose.py:36-37)
      const vals = [...Array(c.nF)].map((_, j) => (j + 1) / (XFN + 1)).concat([1]);
      anim = `\n                  animation-name: ${id}-entree; animation-duration: ${dureeCle(vals)}s; animation-delay: ${S(-T(v0))}s;\n                  animation-timing-function: linear; animation-iteration-count: 1; animation-fill-mode: both;`;
      cles = cle(`${id}-entree`, vals);
    }
    writeComp(`${id}.html`, fill(tpl('plan.html'), { ...common(true), ID: id, TITRE_PLAN: `Étape ${esc(steps[c.i].n)} — ${c.genre}`, ENTREE_ANIM: anim, ENTREE_CLES: cles,
      CADRE_X: String(IN_X - 4), CADRE_Y: String(IN_Y - 4), IN_X: String(IN_X), IN_Y: String(IN_Y), IN_W: String(IN_W), IN_H: String(IN_H),
      CORPS: E.join('\n') }));
    rapportFen.plans.push({ id, partie: P.p + 1, v0, v1 });
  }
  const tEnc = (Date.now() - t3d) / 1000;
  for (const d of ['assets/3d', 'assets/fenetre'])   // restes d'un appel précédent : retirés du dossier servi
    for (const f of fs.readdirSync(path.join(OUT, d))) if (!utilises.has(`${d}/${f}`)) { fs.rmSync(path.join(OUT, d, f)); fs.rmSync(sigFile(path.join(OUT, d, f)), { force: true }); }
  for (const f of fs.readdirSync(path.join(OUT, 'assets/images'))) if (!['01_ensemble.jpg', ...SEGS.filter(s => s.image).map(s => s.image)].includes(f) && !utilises.has(`assets/images/${f}`)) fs.rmSync(path.join(OUT, 'assets/images', f));

  // voix : WAV PCM dans le projet (voir gen.mjs, même raison), placées comme adelay ; fenêtre : début coupé (data-media-start)
  const TOT = T(DUREE_F), fen0 = T(A0);
  L.push(`${pad}<!-- voix (manifeste ${MANF && fs.existsSync(MANF) ? esc(path.basename(path.dirname(path.dirname(MANF))) + '/' + path.basename(path.dirname(MANF))) : 'aucun'}) : placées comme adelay, mixées sans normalisation -->`);
  const voixUtilisees = new Set();
  audio.forEach((a, j) => {
    let f = path.resolve(REPO, a.v.file);
    if (!fs.existsSync(f) && MANF) f = path.join(path.dirname(MANF), path.basename(a.v.file));
    if (!fs.existsSync(f)) throw new Error(`voix introuvable : ${a.v.file}`);
    const at = a.at - fen0, coupeS = Math.max(0, -at), debut = Math.max(0, at);
    if (debut >= TOT || at + a.v.dur <= 0) return;   // hors de la fenêtre
    const src = `assets/voix/${a.v.id}.wav`, out = path.join(OUT, src), key = sig([f], 'pcm_s16le');
    if (!upToDate(out, key)) { ffmpeg(['-i', f, '-map', '0:a:0', '-c:a', 'pcm_s16le', out]); saveSig(out, key); }
    voixUtilisees.add(path.basename(src));
    const durWav = dureeWav(out), d = Math.floor(Math.min(durWav - coupeS, TOT - debut) * 1000) / 1000;
    voixRapport.push({ id: a.v.id, debut_s: +debut.toFixed(3), adelay_ms: Math.round(debut * 1000), ...(coupeS ? { coupe_s: +coupeS.toFixed(3) } : {}), at_video_complete_s: +a.at.toFixed(3),
      duree_s: a.v.dur, duree_wav_s: +durWav.toFixed(4), source: f });
    if (d <= 0) return;
    L.push(`${pad}<audio id="voix-${a.v.id}" src="${src}" data-start="${ms(debut)}" data-duration="${S(d)}" data-media-start="${ms(coupeS)}" data-volume="1" data-track-index="${4 + (j % 2)}"></audio>`);
  });
  for (const f of fs.readdirSync(path.join(OUT, 'assets/voix'))) if (!voixUtilisees.has(f)) fs.rmSync(path.join(OUT, 'assets/voix', f));

  const TEXTE_RENDU = TEXTE_HF ? '' : `      /* Le compilateur de HyperFrames injecte html,body,*{text-rendering:geometricPrecision}. make_video.mjs rend ses calques avec
         la valeur par défaut de Chromium (auto) : même règle (sélecteur *), déclarée après, pour retrouver la mise en page du texte
         de make_video (voir gen.mjs et README.md). --texte-hyperframes la retire. Seul un rendu ou un snapshot fait par hf.sh
         (headless shell Chromium 141 imposé) fait foi. */
      html, body, * { text-rendering: auto; }`;
  const index = fill(tpl('index-a.html'), { ...common(false), GENERATED: `scénario ${SCEN}, ${new Date().toISOString().slice(0, 10)}${A0 || B0 !== TOTAL_F ? `, fenêtre d'essai : images ${A0} à ${B0 - 1} sur ${TOTAL_F}` : ''}`,
    TITRE_PAGE: `Démonter le cône d'un mandrin — montage HyperFrames (scénario ${SCEN})`, COMP_ID: `video-${SCEN.toLowerCase()}`, DUREE: S(TOT), FPS: String(FPS),
    TEXTE_RENDU, STYLES_SEGMENTS: STY.join('\n'), CORPS: L.join('\n'),
    AJUSTER_JS: fill(tpl('ajuster-texte.js'), { NB_BANDEAUX: String(nBandes) }) + '\n' + fill(tpl('positionner-calques.js'), { W: String(W) }) });
  fs.writeFileSync(path.join(OUT, 'index.html'), index);
  fs.rmSync(path.join(OUT, '.travail'), { recursive: true, force: true });
  controleHorsLigne(OUT, fontRules);

  if (simCount) notes.push(`SIMULATION : ${simCount} images 3D manquantes remplacées par l'image disponible la plus proche`);
  if (simGp) notes.push(`SIMULATION : ${simGp} images de gros plan manquantes (capture en cours) remplacées par l'image disponible la plus proche de la même étape`);
  const R = { ...rapport(), encodage: { ...enc, secondes: +tEnc.toFixed(1) }, projet: rapportFen };
  fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(R, null, 1));
  console.log(`projet HyperFrames (scénario A) : ${OUT}`);
  console.log(SEGS.map(s => `  ${(s.S / FPS).toFixed(3).padStart(8)} s  ${s.nom} (${s.vis} images)`).join('\n'));
  console.log(`plans : ${parties.map(P => P.clips.map(c => `${steps[c.i].n}${c.genre === 'gros-plan' ? 'G' : c.genre === 'retour' ? 'R' : ''}=${c.nM}+${c.fin - c.debut - c.nM}`).join(' ')).join(' | ')}`);
  console.log(`durée ${T(TOTAL_F).toFixed(3)} s (${TOTAL_F} images)${A0 || B0 !== TOTAL_F ? ` ; fenêtre ${A0}-${B0} : ${DUREE_F} images (${TOT.toFixed(3)} s)` : ''} · voix : ${voixRapport.length} passages · clips : ${enc.encodes} encodés, ${enc.cache} à jour (${tEnc.toFixed(1)} s)`);
  for (const n of notes) console.log('! ' + n);
}
