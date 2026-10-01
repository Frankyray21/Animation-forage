// Statistiques techniques d'un modèle GLB/GLTF, sans le modifier.
// Usage : node tools/miner/inspect.mjs public/models/miner/miner-original.glb > public/models/miner/STATS.md
// Dépendances (dev) : npm i -D @gltf-transform/core @gltf-transform/extensions
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const file = process.argv[2];
if (!file) { console.error('usage: node inspect.mjs <fichier.glb>'); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file);
const root = doc.getRoot();

let verts = 0, tris = 0, prims = 0;
const meshes = root.listMeshes();
for (const m of meshes) for (const p of m.listPrimitives()) {
  prims++;
  const pos = p.getAttribute('POSITION'); if (pos) verts += pos.getCount();
  const idx = p.getIndices(); const n = idx ? idx.getCount() : (pos ? pos.getCount() : 0);
  if (p.getMode() === 4) tris += n / 3;
}
const imgSize = buf => {   // PNG / JPEG / WebP : largeur × hauteur lues dans l'en-tête
  if (!buf) return '?';
  const b = Buffer.from(buf);
  if (b.readUInt32BE(0) === 0x89504e47) return `${b.readUInt32BE(16)}×${b.readUInt32BE(20)}`;
  if (b[0] === 0xff && b[1] === 0xd8) { let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const t = b[i + 1], l = b.readUInt16BE(i + 2); if (t >= 0xc0 && t <= 0xcf && t !== 0xc4 && t !== 0xc8 && t !== 0xcc) return `${b.readUInt16BE(i + 7)}×${b.readUInt16BE(i + 5)}`; i += 2 + l; } }
  if (b.toString('ascii', 8, 12) === 'WEBP') return 'WebP';
  return '?';
};
const out = [];
out.push(`# Statistiques — ${file}`, '');
out.push(`| Mesure | Valeur |`, `| --- | --- |`);
out.push(`| Taille du fichier | ${(fs.statSync(file).size / 1048576).toFixed(2)} Mo |`);
out.push(`| Vertices | ${verts.toLocaleString('fr-CA')} |`);
out.push(`| Triangles | ${Math.round(tris).toLocaleString('fr-CA')} |`);
out.push(`| Meshes / primitives | ${meshes.length} / ${prims} |`);
out.push(`| Matériaux | ${root.listMaterials().length} |`);
out.push(`| Textures | ${root.listTextures().length} |`);
out.push(`| Squelette (skins) | ${root.listSkins().length ? 'oui : ' + root.listSkins().map(s => s.listJoints().length + ' os').join(', ') : 'non'} |`);
out.push(`| Animations | ${root.listAnimations().length ? root.listAnimations().map(a => a.getName() || '(sans nom)').join(', ') : 'aucune'} |`);
out.push('', '## Matériaux et textures', '');
for (const m of root.listMaterials()) {
  const slots = [['Base color', m.getBaseColorTexture()], ['Normal', m.getNormalTexture()], ['Metal/Rough', m.getMetallicRoughnessTexture()], ['AO', m.getOcclusionTexture()], ['Émissive', m.getEmissiveTexture()]]
    .filter(([, t]) => t).map(([n, t]) => `${n} ${imgSize(t.getImage())} (${t.getMimeType()})`);
  out.push(`- **${m.getName() || '(sans nom)'}** — metallic ${m.getMetallicFactor()}, roughness ${m.getRoughnessFactor()}${slots.length ? ' — ' + slots.join(', ') : ''}`);
}
out.push('', '## Nœuds (hiérarchie)', '');
const walk = (n, d) => { const m = n.getMesh(), s = n.getSkin(); out.push(`${'  '.repeat(d)}- ${n.getName() || '(sans nom)'}${m ? ` [mesh ${m.getName() || ''}, ${m.listPrimitives().length} prim.]` : ''}${s ? ' [skin]' : ''}`); n.listChildren().forEach(c => walk(c, d + 1)); };
for (const sc of root.listScenes()) sc.listChildren().forEach(n => walk(n, 0));
// boîte englobante (unités du fichier ; glTF = mètres)
const { getBounds } = await import('@gltf-transform/core');
const bb = getBounds(root.listScenes()[0]);
out.push('', `## Boîte englobante`, '', `min ${bb.min.map(v => v.toFixed(3)).join(', ')} — max ${bb.max.map(v => v.toFixed(3)).join(', ')} — dimensions ${bb.max.map((v, i) => (v - bb.min[i]).toFixed(3)).join(' × ')} (x × y × z)`);
console.log(out.join('\n'));
