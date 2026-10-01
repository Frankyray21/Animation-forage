// Retire proprement des nœuds (et leurs meshes, matériaux et textures devenus inutiles) d'un GLB.
// L'original n'est jamais modifié : on écrit un nouveau fichier.
// Usage : node tools/miner/remove-nodes.mjs public/models/miner/miner-original.glb public/models/miner/miner.glb "Sign" "Paper_Text"
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';

const [src, dst, ...names] = process.argv.slice(2);
if (!src || !dst || !names.length) { console.error('usage: node remove-nodes.mjs <entrée.glb> <sortie.glb> <nom de nœud>...'); process.exit(1); }
if (src === dst) { console.error('La sortie doit être un autre fichier : l\'original est conservé intact.'); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
let n = 0;
for (const node of doc.getRoot().listNodes()) {
  if (names.includes(node.getName())) { console.log('retiré :', node.getName()); node.dispose(); n++; }
}
if (!n) { console.error('Aucun nœud trouvé avec ces noms. Liste les nœuds avec inspect.mjs.'); process.exit(1); }
await doc.transform(prune());   // supprime meshes, matériaux et textures orphelins
await io.write(dst, doc);
console.log(`${n} nœud(s) retiré(s) → ${dst}`);
