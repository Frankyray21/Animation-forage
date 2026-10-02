#!/usr/bin/env python3
"""Cuisson de l'éclairage (Cycles, CPU) des pièces fixes de la tête UM-012 et du banc, pour index.html.

Rejouable : `python3 bake_lightmaps.py [--src DIR] [--out DIR] [--samples N] [--test]` (module bpy)
ou `blender -b -P bake_lightmaps.py -- [options]`.
Entrées (export_static.mjs) : DIR/lm_src.glb (cibles LM_<g>_<i>, occulteurs OC_*, nœud LM_root = repère du rig)
et DIR/lm_src.json (décalages de la tête éclatée). Défaut DIR = ./lm_work.
Sorties (../lightmaps) : head_lm.glb (géométrie des cibles + 2e UV « LM », Draco), head_a.jpg (tête assemblée),
head_e.jpg (tête éclatée), bench.jpg (banc).

Principe : environnement blanc uniforme (+ plancher clair), cuisson DIFFUSE directe + indirecte sans couleur.
Valeur 1 = surface dégagée ; < 1 = creux, contacts, intérieur (occlusion ambiante douce avec rebonds).
Le site l'applique en aoMap : seule la lumière d'ambiance est atténuée, pas les lumières directes.
"""
import bpy, bmesh, json, math, os, sys, time
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
def opt(name, default=None):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default
TEST = bool(opt('--test', False))
SRC = opt('--src', os.path.join(HERE, 'lm_work'))
OUT = opt('--out', os.path.join(HERE, '..', 'lightmaps'))
SAMPLES = int(opt('--samples', 16 if TEST else 256))
SIZE_H = int(opt('--size', 512 if TEST else 2048))     # atlas de la tête (assemblée et éclatée)
SIZE_C = SIZE_H // 2                                    # atlas du banc
MARGIN = 0.003                                          # marge entre îlots (fraction de l'atlas)
FLOOR_ALBEDO = .9                                       # plancher clair : peu d'assombrissement des faces du dessous
os.makedirs(OUT, exist_ok=True)
t0 = time.time()
def log(*a):
    print(f'[{time.time() - t0:6.1f} s]', *a, flush=True)

# ---------- import ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'lm_src.glb'), import_shading='NORMALS')
info = json.load(open(os.path.join(SRC, 'lm_src.json')))
sc = bpy.context.scene
root = bpy.data.objects['LM_root']
objs = [o for o in bpy.data.objects if o.type == 'MESH']
tg = {'h': [o for o in objs if o.name.startswith('LM_h_')], 'c': [o for o in objs if o.name.startswith('LM_c_')]}
log(f'import : {len(objs)} maillages, cibles tête {len(tg["h"])}, banc {len(tg["c"])}')
for o in objs:   # noms exacts (pas de suffixe .001)
    assert '.' not in o.name, o.name

# ---------- matériaux de cuisson : diffus gris (luminance de la couleur d'origine) ----------
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c]
def grey(h):
    r, g, b = lin(h)
    return min(.8, max(.05, .2126 * r + .7152 * g + .0722 * b))

imgs = {}
def new_img(name, size):
    im = bpy.data.images.new(name, size, size, alpha=False, float_buffer=True)
    im.colorspace_settings.name = 'Non-Color'
    imgs[name] = im
    return im
new_img('head_a', SIZE_H); new_img('head_e', SIZE_H); new_img('bench', SIZE_C)

def bake_mat(src_name, value, image=None):
    m = bpy.data.materials.new(src_name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bs = nt.nodes.new('ShaderNodeBsdfDiffuse')
    bs.inputs['Color'].default_value = (value, value, value, 1)
    nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    if image is not None:
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.name = 'LM'; tx.image = image
        nt.nodes.active = tx
    return m

cache = {}
for o in objs:
    g = o.name[3] if o.name.startswith('LM_') else None
    for s in o.material_slots:
        base = s.material.name.split('.')[0] if s.material else 'o_808080'
        hexc = base.split('_')[-1][:6]
        key = base + ('|' + g if g else '|o')
        if key not in cache:
            cache[key] = bake_mat(key, grey(hexc), imgs['head_a' if g == 'h' else 'bench'] if g else None)
        s.material = cache[key]
    if not o.material_slots:
        o.data.materials.append(cache.setdefault('o_808080|o', bake_mat('o_808080|o', .5)))
for m in list(bpy.data.materials):
    if '|' not in m.name and m.users == 0: bpy.data.materials.remove(m)

# plancher (repère Blender : z = hauteur) et environnement blanc uniforme
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, info['floorY']))
floor = bpy.context.active_object; floor.name = 'Plancher'
floor.data.materials.append(bake_mat('plancher', FLOOR_ALBEDO))
world = bpy.data.worlds.new('Blanc'); sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background') or world.node_tree.nodes.new('ShaderNodeBackground')
bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = 1.0
if not bg.outputs['Background'].is_linked:
    wo = world.node_tree.nodes.get('World Output') or world.node_tree.nodes.new('ShaderNodeOutputWorld')
    world.node_tree.links.new(bg.outputs['Background'], wo.inputs['Surface'])

# ---------- 2e couche UV « LM » : Smart UV Project puis regroupement en un atlas par groupe ----------
def unwrap(group):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:
        me = o.data
        # sommets confondus fusionnés (le GLB de three.js sépare les faces) : îlots UV d'un seul tenant ;
        # normales, UV d'origine et couleurs restent portées par les coins
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(me); bm.free()
        if not me.uv_layers:                    # TEXCOORD_0 doit rester la couche d'origine
            me.uv_layers.new(name='UVMap')
        lm = me.uv_layers.get('LM') or me.uv_layers.new(name='LM')
        me.uv_layers.active = lm
        o.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(rotate=True, rotate_method='ANY', scale=True, margin_method='FRACTION', margin=MARGIN, shape_method='CONCAVE')
    bpy.ops.object.mode_set(mode='OBJECT')
for g in ('h', 'c'):
    unwrap(tg[g]); log(f'UV {g} : {len(tg[g])} objets')
for o in tg['h'] + tg['c']:
    assert [l.name for l in o.data.uv_layers][-1] == 'LM' and len(o.data.uv_layers) == 2, (o.name, [l.name for l in o.data.uv_layers])

# ---------- cuisson ----------
sc.render.engine = 'CYCLES'
cy = sc.cycles
cy.device = 'CPU'
cy.samples = SAMPLES
cy.use_denoising = False
cy.max_bounces = 4; cy.diffuse_bounces = 3; cy.glossy_bounces = 0; cy.transmission_bounces = 0
sc.render.bake.margin = 6 if SIZE_H <= 1024 else 10
sc.render.bake.margin_type = 'EXTEND'
sc.render.bake.use_clear = True
sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True; sc.render.bake.use_pass_color = False

# Cycles cuit objet par objet (une synchronisation de la scène par objet) : chaque groupe est cuit
# sur une copie fusionnée (mêmes UV « LM », mêmes matériaux) ; les originaux, masqués au rendu, sont exportés.
def bake(groups):
    proxies = []
    for group in groups:
        bpy.ops.object.select_all(action='DESELECT')
        dups = []
        for o in group:
            d = o.copy(); d.data = o.data.copy(); sc.collection.objects.link(d); dups.append(d); d.select_set(True)
            o.hide_render = True
        bpy.context.view_layer.objects.active = dups[0]
        bpy.ops.object.join()
        px = bpy.context.view_layer.objects.active
        px.data.uv_layers.active = px.data.uv_layers['LM']   # la cuisson suit la couche UV active
        proxies.append(px)
    bpy.ops.object.select_all(action='DESELECT')
    for p in proxies: p.select_set(True)
    bpy.context.view_layer.objects.active = proxies[0]
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, use_clear=True, margin=sc.render.bake.margin)
    for p in proxies:
        me = p.data; bpy.data.objects.remove(p, do_unlink=True); bpy.data.meshes.remove(me)
    for group in groups:
        for o in group: o.hide_render = False

def set_head_image(name):
    for k, m in cache.items():
        if k.endswith('|h'): m.node_tree.nodes['LM'].image = imgs[name]

# A : pose assemblée (tête sur le banc, mandrin, table, plancher)
tb = time.time()
set_head_image('head_a')
bake([tg['h'], tg['c']])
log(f'cuisson A (tête + banc) : {time.time() - tb:.0f} s')
# masque de couverture des îlots (pour le lissage) : triangles UV « LM » tracés à la taille de l'atlas
def coverage(group, size):
    from PIL import Image, ImageDraw
    im = Image.new('L', (size, size), 0); dr = ImageDraw.Draw(im)
    for o in group:
        me = o.data; uv = me.uv_layers['LM'].data
        me.calc_loop_triangles()
        for t in me.loop_triangles:
            dr.polygon([(uv[l].uv[0] * size, (1 - uv[l].uv[1]) * size) for l in t.loops], fill=255)
    return np.array(im)[::-1] > 0          # lignes de bas en haut, comme les pixels Blender
mask_h = coverage(tg['h'], SIZE_H)
mask_c = coverage(tg['c'], SIZE_C)

# E : tête éclatée (pièces écartées, sans banc, mandrin, table ni plancher)
tb = time.time()
others = [o for o in objs if not o.name.startswith(('LM_h_', 'OC_h_'))] + [floor]
for o in others: o.hide_render = True
moved = []
for o in objs:
    d = info['deltas'].get(o.name)
    if d and o.name.startswith(('LM_h_', 'OC_h_')):
        dv = Vector((d[0], -d[2], d[1]))          # repère glTF (y vers le haut) → Blender (z vers le haut), dans le repère du rig
        o.location = o.location + dv; moved.append((o, dv))
bpy.context.view_layer.update()
set_head_image('head_e')
bake([tg['h']])
for o, dv in moved: o.location = o.location - dv
for o in others: o.hide_render = False
set_head_image('head_a')
bpy.context.view_layer.update()
log(f'cuisson E (tête éclatée) : {time.time() - tb:.0f} s')

# ---------- lissage dans les îlots (bruit de Monte-Carlo), marges reconstruites, enregistrement JPEG ----------
def blur(a, s):
    r = int(3 * s + .5); k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * s * s)); k /= k.sum()
    a = np.pad(a, r, mode='edge')
    a = np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), 1, a)
def dilate(v, m, n):
    v = v.copy(); m = m.copy()
    for _ in range(n):
        acc = np.zeros_like(v); cnt = np.zeros_like(v)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            mv = np.roll(np.roll(m, dy, 0), dx, 1); vv = np.roll(np.roll(v, dy, 0), dx, 1)
            acc += vv * mv; cnt += mv
        new = (~m) & (cnt > 0)
        v[new] = acc[new] / cnt[new]; m = m | new
    v[~m] = 1.0
    return v
stats = {}
def save(image, mask, fname, sigma):
    from PIL import Image
    w, h = image.size
    v = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, 4)[..., :3].mean(-1)
    mf = mask.astype(np.float32)
    sm = blur(v * mf, sigma) / np.maximum(blur(mf, sigma), 1e-4)
    v = np.where(mask, sm, v)
    v = dilate(v, mask, 12)
    v = np.clip(v, 0, 1)
    stats[fname] = {'moyenne': float(v[mask].mean()), 'p05': float(np.percentile(v[mask], 5)), 'p50': float(np.percentile(v[mask], 50)), 'couverture': float(mask.mean())}
    Image.fromarray((v[::-1] * 255 + .5).astype(np.uint8), 'L').save(os.path.join(OUT, fname), quality=90, optimize=True)
    log(f'{fname} : {os.path.getsize(os.path.join(OUT, fname)) // 1024} Ko, {json.dumps(stats[fname])}')
# l'image Blender a son origine en bas ; le glTF retourne v (v' = 1 - v) : on enregistre de haut en bas (flipY = false côté site)
save(imgs['head_a'], mask_h, 'head_a.jpg', 1.5)
save(imgs['head_e'], mask_h, 'head_e.jpg', 1.5)
save(imgs['bench'], mask_c, 'bench.jpg', 1.5)

# ---------- export : cibles seules, 2 couches UV, couleurs de sommet, Draco ----------
for o in objs:
    if not o.name.startswith('LM_'): bpy.data.objects.remove(o, do_unlink=True)
bpy.data.objects.remove(floor, do_unlink=True)
for o in tg['h'] + tg['c']:
    o.data.uv_layers.active = o.data.uv_layers[0]
    for s in o.material_slots:     # matériaux légers (le site ne garde que leur nom : m<k>_…)
        s.material.node_tree.nodes['LM'].image = None
bpy.ops.object.select_all(action='DESELECT')
for o in tg['h'] + tg['c'] + [root]: o.select_set(True)
glb = os.path.join(OUT, 'head_lm.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
    export_texcoords=True, export_normals=True, export_tangents=False, export_vertex_color='ACTIVE', export_all_vertex_colors=False,
    export_materials='EXPORT', export_image_format='NONE', export_animations=False, export_extras=False,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
    export_draco_position_quantization=16, export_draco_normal_quantization=12,
    export_draco_texcoord_quantization=14, export_draco_color_quantization=10)
log(f'head_lm.glb : {os.path.getsize(glb) // 1024} Ko')
json.dump({'cibles': {g: [o.name for o in tg[g]] for g in tg}, 'atlas': stats, 'samples': SAMPLES, 'taille': [SIZE_H, SIZE_C],
           'duree_s': round(time.time() - t0)}, open(os.path.join(OUT, 'bake_info.json'), 'w'), ensure_ascii=False, indent=1)
log('terminé')
