#!/usr/bin/env node
// Textes à l'écran de la vidéo 1 en anglais : applique traduction.json (français → anglais) aux compositions d'un projet de gen-a.mjs,
// après la génération (le montage, les durées et la synchro ne changent pas). Hors commentaires HTML et blocs <style>. Espaces souples
// (espace, espace insécable, &nbsp;), apostrophes ' et ’ indifférentes ; {n}… : nombres repris (virgule décimale → point) ; « … » → “…”.
// Puis relève tout texte visible qui semble encore français (accents, mots courants) : la commande échoue s'il en reste.
// Usage : node traduire.mjs DOSSIER_PROJET        (compositions/*.html et index.html, modifiés sur place)
// Module : import { traduire, resteFrancais } from './traduire.mjs' (cartes.mjs --lang en).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { paires } = JSON.parse(fs.readFileSync(path.join(HERE, 'traduction.json'), 'utf8'));
const ESP = '(?:[ \\u00a0]|&nbsp;)+', APO = "(?:'|’|&#39;|&apos;)";
const REGLES = [...paires].sort((a, b) => b[0].length - a[0].length).map(([fr, en]) => {
  const noms = [];
  let src = fr.replace(/[.*+?^${}()|[\]\\]/g, c => (c === '{' || c === '}') ? c : '\\' + c)
    .replace(/\{([a-z])\}/g, (_, v) => { noms.push(v); return '(\\d+(?:[.,]\\d+)?)'; })
    .replace(/ /g, ESP).replace(/'|’/g, APO);
  return { re: new RegExp(src, 'g'), en, noms };
});
export function traduire(texte) {
  let n = 0;
  for (const { re, en, noms } of REGLES) texte = texte.replace(re, (...m) => {
    n++; let s = en; noms.forEach((v, i) => { s = s.replace(`{${v}}`, m[1 + i].replace(',', '.')); }); return s; });
  texte = texte.replace(/«(?:[  ]|&nbsp;)*/g, '“').replace(/(?:[  ]|&nbsp;)*»/g, '”');
  return { texte, n };
}
// texte visible (hors commentaires, style, script, balises) qui semble français
const MOTS = /\b(le|la|les|des|du|et|pour|avec|sans|sous|pas|une|est|sont|ressorts?|boulons?|étape|cône|mâchoires|clé|retirer|dévisser|tour|fois)\b/i;
export function resteFrancais(html) {
  const vis = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<title>[\s\S]*?<\/title>/g, ' ').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/ /g, ' ');
  return vis.split('\n').map(l => l.trim()).filter(l => l && (/[àâçéèêëîïôûùœÀÉÈ]/.test(l) || MOTS.test(l)));
}
function horsCommentaires(html, f) {   // applique f au texte hors commentaires et <style>
  return html.split(/(<!--[\s\S]*?-->|<style[\s\S]*?<\/style>)/).map((p, i) => i % 2 ? p : f(p)).join('');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] || '');
  const fichiers = [path.join(dir, 'index.html'), ...fs.readdirSync(path.join(dir, 'compositions')).filter(f => f.endsWith('.html')).map(f => path.join(dir, 'compositions', f))];
  let total = 0; const restes = [];
  for (const f of fichiers) {
    const h = fs.readFileSync(f, 'utf8');
    const h2 = horsCommentaires(h, p => { const r = traduire(p); total += r.n; return r.texte; });
    if (h2 !== h) fs.writeFileSync(f, h2);
    for (const l of resteFrancais(h2)) restes.push(`${path.basename(f)} : ${l}`);
  }
  console.log(`${fichiers.length} fichiers, ${total} remplacements`);
  if (restes.length) { console.log([...new Set(restes)].join('\n')); process.exit(1); }
}
