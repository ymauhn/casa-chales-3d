"""Exporta só a vegetação (coleção Paisagismo) do .blend do flats-3d num GLB à parte, para o site carregar depois da casa.
O glTF não leva textura procedural: cada Principled volta à cor e à rugosidade do imovel JSON, como no exportar() do
construir.py. As cópias ligadas (a mata em variantes) saem como a mesma malha, e o gltf-transform vira instâncias.

  blender --background <casa-chales.blend> --python pipeline/exportar_paisagismo.py -- <imovel.json> <saida.glb>
"""
import json
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
espec_path, saida = args[:2]
FORA = tuple(args[2].split(",")) if len(args) > 2 and args[2] else ()   # prefixos de objetos que ficam de fora
with open(espec_path, encoding="utf-8") as f:
    mats = json.load(f)["materiais"]

col = bpy.data.collections.get("Paisagismo")
assert col, "o .blend não tem a coleção Paisagismo"
col.hide_viewport = False
col.hide_render = False


def liberar(lc):
    if lc.collection == col or col.name in [c.name for c in lc.collection.children_recursive]:
        lc.exclude = False
        lc.hide_viewport = False
    for filho in lc.children:
        liberar(filho)


liberar(bpy.context.view_layer.layer_collection)

obs = [o for o in col.all_objects if o.type == "MESH" and not o.name.startswith(FORA)]
for mat in {s.material for o in obs for s in o.material_slots if s.material}:
    if not mat.use_nodes:
        continue
    nt = mat.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not b:
        continue
    # material com imagem (as árvores do Poly Haven: cartões de folha com alfa) vai como está, com recorte de alfa
    if any(n.type == "TEX_IMAGE" and n.image for n in nt.nodes):
        if hasattr(mat, "blend_method"):
            mat.blend_method = "CLIP"
        continue
    e = mats.get(mat.name, {})
    for entrada in b.inputs:
        for elo in list(entrada.links):
            nt.links.remove(elo)
    b.inputs["Base Color"].default_value = tuple(e.get("cor", (0.18, 0.26, 0.1)))[:3] + (1.0,)
    b.inputs["Roughness"].default_value = e.get("rugosidade", 0.85)

for o in bpy.context.view_layer.objects:
    o.select_set(False)
for o in obs:
    o.hide_set(False)
    o.hide_viewport = False
    o.select_set(True)
print("objetos da vegetação:", len(obs), "malhas distintas:", len({o.data.name for o in obs}),
      "triângulos (soma das cópias):", sum(len(o.data.loop_triangles) if o.data.loop_triangles else len(o.data.polygons) for o in obs))
bpy.ops.export_scene.gltf(filepath=saida, export_format="GLB", use_selection=True, export_apply=True,
                          export_lights=False, export_cameras=False)
print("glb:", saida)
