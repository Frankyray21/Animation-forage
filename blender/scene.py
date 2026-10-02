#!/usr/bin/env python3
"""Scène Blender (Cycles, CPU) de la tête de forage UM-012 et du mandrin Boyles H.

Rejouable : `python3 scene.py` (module bpy) ou `blender -b -P scene.py -- [options]`.
Entrées : tete_mandrin.glb (export three.js du site, 1 unité = 10 cm) et etat_s5.json
(positions des pièces retirées après l'étape 5 : couvercle, jaw cover, boulons).
Sorties : ../renders/*.jpg (4 vues), tete_mandrin.blend.

Options : --test (400×250, 32 échantillons) --views 1,2,3,4 --samples N --out DIR --no-blend
"""
import bpy, json, math, os, sys, time
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, 'tete_mandrin.glb')
S5 = os.path.join(HERE, 'etat_s5.json')
SC = 0.1                      # 1 unité GLB = 10 cm → mètres
FLOOR = -7.74 * SC            # plancher du site (repère monde)

# ---------- options ----------
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
def opt(name, default=None):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default
TEST = bool(opt('--test', False))
MID = bool(opt('--mid', False))   # 800×500 pour vérifier les matériaux
VIEWS = [int(v) for v in str(opt('--views', '1,2,3,4')).split(',')]
SAMPLES = int(opt('--samples', 32 if TEST else 64 if MID else 192))
OUT = opt('--out', os.path.join(HERE, '..', 'renders'))
SAVE_BLEND = not opt('--no-blend', False)
os.makedirs(OUT, exist_ok=True)

# ---------- import ----------
t0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
sc = bpy.context.scene
roots = [o for o in bpy.data.objects if o.parent is None]
machine = bpy.data.objects.new('Machine', None)      # racine : unités du site → mètres
machine.scale = (SC, SC, SC)
sc.collection.objects.link(machine)
for r in roots:
    r.parent = machine

def descend(o):
    yield o
    for c in o.children:
        yield from descend(c)
def ref_of(o):
    return o.name.split(' ')[0].split('.')[0]
def has_ref(root, ref):
    return any(ref_of(o) == ref for o in descend(root) if o.type == 'MESH')

groups = {}
for r in roots:
    for c in r.children:
        if has_ref(c, '3506870'): groups['clamp'] = c
        elif has_ref(c, 'UM-012-104A'): groups['head'] = c
        elif has_ref(c, 'Banc'): groups['bench'] = c
    if all(ref_of(c) == 'scene' for c in descend(r) if c.type == 'MESH'):   # table des pièces retirées, pupitre
        mats = {s.material.name.split('.')[0] for c in descend(r) if c.type == 'MESH' for s in c.material_slots if s.material}
        groups['console' if 'console' in mats else 'table'] = r
if 'console' in groups:                                   # pupitre à manettes : hors cadre
    for o in descend(groups['console']): o.hide_render = True
clamp_objs = [o for o in descend(groups['clamp']) if o.type == 'MESH']
head_objs = [o for o in descend(groups['head']) if o.type == 'MESH']
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
print(f'import {time.time() - t0:.1f} s : {len(meshes)} maillages, groupes {list(groups)}')

# ---------- matériaux PBR ----------
def lin(h):   # sRGB hex → linéaire
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c)

def pbr(name, color, metallic=0, rough=.5, coat=0, coat_rough=.12, aniso=0, bump=0, bump_scale=40, bump_dist=.0003, rough_var=0, spec=.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = coat_rough
    b.inputs['Anisotropic'].default_value = aniso
    b.inputs['Specular IOR Level'].default_value = spec
    if bump or rough_var:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = bump_scale
        nz.inputs['Detail'].default_value = 3
        nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
        if bump:
            bp = nt.nodes.new('ShaderNodeBump')
            bp.inputs['Strength'].default_value = bump
            bp.inputs['Distance'].default_value = bump_dist
            nt.links.new(nz.outputs['Fac'], bp.inputs['Height'])
            nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
        if rough_var:
            mr = nt.nodes.new('ShaderNodeMapRange')
            mr.inputs['From Min'].default_value = .3; mr.inputs['From Max'].default_value = .7
            mr.inputs['To Min'].default_value = rough - rough_var; mr.inputs['To Max'].default_value = rough + rough_var
            nt.links.new(nz.outputs['Fac'], mr.inputs['Value'])
            nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])
    return m

DEFS = {   # nom → paramètres ; couleurs du site conservées (ressorts verts 0x2e8a44)
    'paint_red':   dict(color=lin('8f0e0b'), rough=.45, coat=.2, coat_rough=.15, bump=.05, bump_scale=60, bump_dist=.00015),
    'cast_iron':   dict(color=lin('737a80'), metallic=.55, rough=.72, bump=.35, bump_scale=120, bump_dist=.0006, rough_var=.08),
    'steel':       dict(color=lin('c9ced3'), metallic=1, rough=.3, aniso=.35, rough_var=.03),
    'steel_light': dict(color=lin('b9c0c6'), metallic=1, rough=.4),
    'steel_sheet': dict(color=lin('9aa1a7'), metallic=.9, rough=.5, rough_var=.06, bump=.08, bump_scale=8, bump_dist=.0004),
    'zinc_yellow': dict(color=lin('d4b05a'), metallic=1, rough=.33, coat=.15),
    'zinc_grey':   dict(color=lin('9da3a8'), metallic=.9, rough=.5, rough_var=.05),
    'black_matte': dict(color=lin('242628'), metallic=.25, rough=.62),
    'black_oxide': dict(color=lin('35383b'), metallic=.85, rough=.42),
    'black_paint': dict(color=lin('26292c'), metallic=.1, rough=.55, coat=.1),
    'cavity':      dict(color=lin('1e2022'), rough=.85),
    'rubber':      dict(color=lin('141516'), rough=.72),
    'rubber_red':  dict(color=lin('8a1c14'), rough=.6),
    'rubber_green': dict(color=lin('3fa65a'), rough=.55),
    'rubber_blue': dict(color=lin('2a47a8'), rough=.55),
    'spring':      dict(color=lin('2e8a44'), metallic=.25, rough=.45, coat=.1),
    'brass':       dict(color=lin('c8a24a'), metallic=1, rough=.32),
    'beige':       dict(color=lin('e3dcb4'), rough=.4),
    'white':       dict(color=lin('e8eaeb'), rough=.45, coat=.1),
    'hose':        dict(color=lin('b4b9bd'), metallic=.75, rough=.5, aniso=.5, bump=.25, bump_scale=300, bump_dist=.0002),
    'paint_bench': dict(color=lin('3f6f8f'), rough=.5, coat=.15, bump=.06, bump_scale=30, bump_dist=.0002),
    'paint_table': dict(color=lin('5d6770'), rough=.5, coat=.1),
    'coupe':       dict(color=lin('3a3d40'), metallic=.2, rough=.7),
    'concrete':    dict(color=lin('b8b4ad'), rough=.8, rough_var=.1, bump=.15, bump_scale=3, bump_dist=.002),
}
MATS = {}
def get_mat(key):
    if key not in MATS: MATS[key] = pbr(key, **DEFS[key])
    return MATS[key]

def classify(mname, ref):
    n = mname.split('.')[0]
    hx = n.split('_')[1] if n.startswith('mat_') else ''
    if ref == '5200517' or n == 'spring': return 'spring'
    if ref == '3506907': return 'cavity' if hx == '0d0f10' else 'zinc_grey'          # jaw cover : zinc gris
    if ref == '3506906': return 'cavity' if hx == '0d0f10' else 'black_matte'        # cap holder : noir mat
    if n in ('grey', 'springBlock') or hx == '9aa0a5': return 'cast_iron'            # corps du mandrin, cône
    if n in ('machined', 'oiled', 'leverRod') or hx in ('c4cacf', 'bcc2c7', 'b4babf', '9ea4a9'): return 'steel'
    if n in ('steelLight', 'valve') or hx == 'a7afb5': return 'steel_light'
    if hx == 'c9b878': return 'zinc_yellow'
    if n == 'brass' or hx in ('c8a24a', 'd8c63c'): return 'brass'
    if n == 'boltBlack' or hx == '2e3134': return 'black_oxide'
    if n in ('console',) or hx in ('1d0f21', '1d1f21', '3b4247', '1b1d1f'): return 'black_paint'
    if n == 'pocket' or hx == '0d0f10': return 'cavity'
    if hx == '141516': return 'rubber'
    if n in ('sealRed', 'grip') or hx == '8a1c14': return 'rubber_red'
    if n == 'green': return 'rubber_green'
    if hx == '2a47a8': return 'rubber_blue'
    if n == 'blue' or hx in ('a8120f', '9e110e'): return 'paint_red'
    if hx == 'e3dcb4': return 'beige'
    if hx in ('e8eaeb', 'ffffff'): return 'white'
    if hx == 'b4b9bd': return 'hose'
    if n == 'bench': return 'paint_bench'
    if n == 'benchTop': return 'steel_sheet'
    if hx == '5d6770': return 'paint_table'
    return 'steel'

spring_block = set()
for o in meshes:
    for s in o.material_slots:
        if not s.material: continue
        if s.material.name.split('.')[0] == 'springBlock': spring_block.add(o.name)
        s.material = get_mat(classify(s.material.name, ref_of(o)))
for m in list(bpy.data.materials):
    if m.users == 0: bpy.data.materials.remove(m)

# ---------- décor, lumières ----------
bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, FLOOR))
floor = bpy.context.active_object
floor.name = 'Sol béton'
floor.data.materials.append(get_mat('concrete'))

world = bpy.data.worlds.new('Atelier')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (.58, .62, .68, 1)
bg.inputs['Strength'].default_value = .4

def area(name, loc, target, size, energy, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA')
    d.shape = 'RECTANGLE'; d.size = size; d.size_y = size * .7; d.energy = energy; d.color = color
    o = bpy.data.objects.new(name, d)
    sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o
C = (-0.35, 0.1, 0.5)   # centre de la tête (m)
area('Clé chaude', (1.4, -1.7, 2.0), C, 1.6, 380, (1, .95, .88))
area('Remplissage froid', (-1.8, -2.0, 1.1), C, 2.6, 150, (.88, .93, 1))
area('Contre-jour', (-0.7, 2.2, 1.7), C, 1.4, 300)

# ---------- coupe (vue 3) : moitié avant du mandrin retirée, même plan que le site ----------
def wbox(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

def cutter(name, y1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y1 - 5, 0))
    c = bpy.context.active_object
    c.name = name; c.scale = (20, 10, 20)
    c.data.materials.append(get_mat('coupe'))
    c.hide_render = True; c.hide_viewport = True; c.display_type = 'WIRE'
    return c
cut_main = cutter('Coupe (plan)', 0.0)
cut_deep = cutter('Coupe (logements des ressorts)', 2.0 * 0.0254)   # bloc des ressorts ouvert 2 po plus loin
cut_targets = [o for o in clamp_objs if ref_of(o) != '5200517']   # ressorts dessinés entiers
cut_targets += [o for o in head_objs if ref_of(o) == 'SHC500-4000' or (ref_of(o) == 'W500' and -0.34 < wbox(o)[0].x < -0.29)]
cut_meshes, cut_hidden = {}, []
def sharpen(bm, angle=math.radians(32)):   # arêtes vives conservées après fusion des sommets
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > angle: e.smooth = False
def cut_mesh(o):
    """Maillage coupé de o : booléen exact (faces de coupe en gris sombre) ; bissection si le maillage est ouvert."""
    import bmesh
    lo, hi = wbox(o)
    src = o.data
    bm = bmesh.new(); bm.from_mesh(src)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    sharpen(bm)
    closed = all(e.is_manifold for e in bm.edges)
    merged = bpy.data.meshes.new(src.name + ' fusion'); bm.to_mesh(merged); merged.materials.clear()
    for m in src.materials: merged.materials.append(m)
    o.data = merged
    out = None
    if closed:
        md = o.modifiers.new('Coupe', 'BOOLEAN')
        md.operation = 'DIFFERENCE'; md.solver = 'EXACT'; md.material_mode = 'TRANSFER'
        md.object = cut_deep if o.name in spring_block else cut_main
        dg = bpy.context.evaluated_depsgraph_get()
        ev = o.evaluated_get(dg)
        res = bpy.data.meshes.new_from_object(ev)
        o.modifiers.remove(md)
        pts = [o.matrix_world @ v.co for v in res.vertices]
        ok = pts and all(lo.x - .01 <= p.x <= hi.x + .01 and lo.z - .01 <= p.z <= hi.z + .01 and p.y >= -.01 for p in pts)
        if ok: out = res
        else: bpy.data.meshes.remove(res)
    if out is None:   # bissection locale, sans bouchage
        y1 = 2.0 * 0.0254 if o.name in spring_block else 0.0
        inv = o.matrix_world.inverted()
        co = inv @ Vector((0, y1, 0))
        no = (inv.to_3x3() @ Vector((0, -1, 0))).normalized()
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=True)
        out = bpy.data.meshes.new(src.name + ' coupe'); bm.to_mesh(out)
        for m in src.materials: out.materials.append(m)
    bm.free()
    o.data = src
    bpy.data.meshes.remove(merged)
    out.name = src.name + ' coupe'
    return out, closed
n_open = 0
for o in cut_targets:
    lo, hi = wbox(o)
    if hi.y <= 0.001: cut_hidden.append(o)
    elif lo.y < -0.001:
        cut_meshes[o.name], closed = cut_mesh(o)
        n_open += not closed
print(f'coupe : {len(cut_meshes)} pièces coupées ({n_open} maillages ouverts bissectés), {len(cut_hidden)} pièces de la moitié retirée')
orig_mesh = {n: bpy.data.objects[n].data for n in cut_meshes}
def set_cut(on):
    for n, me in cut_meshes.items(): bpy.data.objects[n].data = me if on else orig_mesh[n]
    for o in cut_hidden: o.hide_render = on

# ---------- état « couvercle retiré » (étape 5) ----------
s5 = json.load(open(S5))
bpy.data.texts.new('etat_s5.json').write(json.dumps(s5))
orig = {n: bpy.data.objects[n].matrix_world.copy() for n in s5 if n in bpy.data.objects}
def set_s5(on):
    for n, M in s5.items():
        if n in bpy.data.objects:
            bpy.data.objects[n].matrix_world = (machine.matrix_world @ Matrix(M)) if on else orig[n]

# ---------- caméras ----------
def cam_fit(cam, target, dirn, pts, margin, fstop):
    cam.location = Vector(target) + Vector(dirn).normalized()
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    w, h = sc.render.resolution_x, sc.render.resolution_y
    tx = cam.data.sensor_width / 2 / cam.data.lens
    ty = tx * h / w
    inv = cam.matrix_world.inverted()
    d = -1e9
    for p in pts:
        q = inv @ p
        depth = -q.z
        d = max(d, abs(q.x) * margin / tx - depth, abs(q.y) * margin / ty - depth)
    cam.location += Vector(dirn).normalized() * d   # recule jusqu'à tout cadrer
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = (Vector(target) - cam.location).length
    cam.data.dof.aperture_fstop = fstop

def pts_of(objs):
    out = []
    for o in objs:
        if o.hide_render: continue
        out += [o.matrix_world @ Vector(c) for c in o.bound_box]
    return out

bench_objs = [o for o in descend(groups['bench']) if o.type == 'MESH']
table_objs = [o for o in descend(groups['table']) if o.type == 'MESH'] if 'table' in groups else []
front = [o for o in clamp_objs if wbox(o)[1].x > -0.2]          # avant du mandrin (couvercle, jaw cover, boulons)
cone_bolts = [o for o in clamp_objs if ref_of(o) in ('B500-6500', 'B500-8000', '2920390', '3506870')]
moved = [bpy.data.objects[n] for n in s5 if n in bpy.data.objects]

VIEWS_DEF = {
    1: dict(name='01_ensemble', fr='Tête et mandrin sur le banc', target=(-0.33, 0.15, 0.45), dirn=(1.0, -1.1, 0.42), fstop=8,
            fit=lambda: pts_of(head_objs + clamp_objs), margin=1.3),
    2: dict(name='02_face_mandrin', fr='Face avant du mandrin', target=(-0.1, 0, 0.476), dirn=(1.0, -0.5, 0.38), fstop=4,
            fit=lambda: pts_of(front), margin=1.18),
    3: dict(name='03_coupe', fr='Mandrin en coupe', target=(-0.19, 0, 0.476), dirn=(0.42, -1.0, 0.5), fstop=5.6,
            fit=lambda: pts_of(clamp_objs), margin=1.0, cut=True),
    4: dict(name='04_couvercle_retire', fr='Couvercle retiré, 9 boulons du cône', target=(-0.1, -0.02, 0.45), dirn=(1.0, -0.62, 0.36), fstop=5.6,
            fit=lambda: pts_of([o for o in cone_bolts + front if o.name not in s5]), margin=1.3, s5=True),
}

# ---------- rendu ----------
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = .02
sc.cycles.use_denoising = True
try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception as e: print('dénoiseur', e)
sc.cycles.max_bounces = 8; sc.cycles.glossy_bounces = 6; sc.cycles.caustics_reflective = sc.cycles.caustics_refractive = False
sc.render.use_persistent_data = True
sc.render.resolution_x, sc.render.resolution_y = (400, 250) if TEST else (800, 500) if MID else (1600, 1000)
sc.render.resolution_percentage = 100
sc.render.film_transparent = False
sc.view_settings.view_transform = 'AgX'
for lk in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Medium Contrast'):
    try: sc.view_settings.look = lk; break
    except Exception: pass
sc.view_settings.exposure = 0.0
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_depth = '8'

cams = {}
for k, v in VIEWS_DEF.items():
    cd = bpy.data.cameras.new(v['name']); cd.lens = 35; cd.sensor_width = 36
    co = bpy.data.objects.new(f'Cam {k} {v["name"]}', cd)
    sc.collection.objects.link(co)
    cams[k] = co
for k, v in VIEWS_DEF.items():   # cadrage dans l'état de chaque vue
    if v.get('s5'): set_s5(True)
    cam_fit(cams[k], v['target'], v['dirn'], v['fit'](), v['margin'], v['fstop'])
    if v.get('s5'): set_s5(False)
sc.camera = cams[1]

if SAVE_BLEND:   # état de départ (manettes fermées, coupe désactivée), 4 caméras
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'tete_mandrin.blend'), compress=True)
    print('blend enregistré', os.path.getsize(os.path.join(HERE, 'tete_mandrin.blend')) // 1024, 'Ko')

def to_jpeg(png, jpg, limit=400 * 1024):
    try:
        from PIL import Image
    except ImportError:
        print('PIL absent : PNG conservé'); return
    im = Image.open(png).convert('RGB')
    for q in (85, 82, 78, 74, 70):
        im.save(jpg, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(jpg) <= limit: break
    print(f'  {os.path.basename(jpg)} q={q} {os.path.getsize(jpg) // 1024} Ko')

times = {}
for k in VIEWS:
    v = VIEWS_DEF[k]
    set_cut(bool(v.get('cut'))); set_s5(bool(v.get('s5')))
    sc.camera = cams[k]
    suffix = '_test' if TEST else '_mid' if MID else ''
    png = os.path.join(OUT, v['name'] + suffix + '.png')
    sc.render.filepath = png
    t = time.time()
    bpy.ops.render.render(write_still=True)
    times[k] = time.time() - t
    print(f'vue {k} {v["name"]} : {times[k]:.0f} s')
    if not TEST and not MID:
        to_jpeg(png, os.path.join(OUT, v['name'] + '.jpg'))
        os.remove(png)
    set_cut(False); set_s5(False)
print('temps de rendu', {k: round(t) for k, t in times.items()})
