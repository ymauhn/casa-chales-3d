"""Converte os renders do Blender (flats-3d/saida) em WebP para o site: miniaturas dos cômodos,
o pôster de entrada e os panoramas 360° (equirretangulares 8192x4096 -> 4096x2048).
Uso: py -3 -X utf8 pipeline/imagens.py <worktrees do flats-3d>   (só lê lá; escreve em public/)"""
import os, sys, pathlib
from PIL import Image

W = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else os.environ["FLATS3D_WORKTREES"])   # pasta com as worktrees flat-04 e casa-chales-web
PUB = pathlib.Path(__file__).resolve().parent.parent / "public"

def webp(orig, dest, largura, q=80):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(orig) as im:
        im = im.convert("RGB")
        if im.width > largura:
            im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
        im.save(dest, "WEBP", quality=q, method=5)
    print(f"{dest.relative_to(PUB)}  {dest.stat().st_size / 1e3:.0f} kB")

for imovel, pasta in [("flat-04", W / "flat-04/saida/flat-04"), ("casa-chales", W / "casa-chales-web/saida/casa-chales")]:
    for png in sorted(pasta.glob("*.png")):
        n = png.stem
        if n.startswith(imovel + "-"):          # vistas Cycles: miniatura + versão grande (pôster/galeria)
            v = n[len(imovel) + 1:]
            webp(png, PUB / "img" / imovel / f"{v}.webp", 640, 78)
            if v in ("aerea", "fachada", "topo"):
                webp(png, PUB / "img" / imovel / f"{v}-grande.webp", 1600, 80)
        elif n.startswith("unreal-"):            # capturas do Unreal: só miniatura
            webp(png, PUB / "img" / imovel / f"{n}.webp", 640, 78)

pano = W / "casa-chales-web/saida/casa-chales/panoramas"
for p in ["entrada", "piscina", "gourmet", "varanda_suspensa", "salao", "suite", "banheiro", "suite_baixo", "varanda_baixo"]:
    if (pano / f"{p}.png").exists():
        webp(pano / f"{p}.png", PUB / "pano" / f"{p}.webp", 4096, 78)

# miniaturas tiradas do panorama (paradas sem vista Cycles boa): recorte de 90° em volta da direção do ponto
# (yaw_graus de web/tour-pontos.json: 0 = +y do modelo, cresce para +x; no equirretangular, u = 0,5 + yaw/360)
for p, yaw in [("entrada", 0), ("varanda_baixo", 90)]:
    orig = PUB / "pano" / f"{p}.webp"
    if not orig.exists():
        continue
    with Image.open(orig) as im:
        w, h = im.size
        cx = round((0.5 + yaw / 360) * w) % w
        caixa = (cx - w // 8, h // 2 - round(w / 8 * 0.625), cx + w // 8, h // 2 + round(w / 8 * 0.625))
        corte = im.convert("RGB").crop(caixa).resize((640, 400), Image.LANCZOS)
        dest = PUB / "img" / "casa-chales" / f"pano-{p}.webp"
        corte.save(dest, "WEBP", quality=78, method=5)
        print(f"{dest.relative_to(PUB)}  {dest.stat().st_size / 1e3:.0f} kB")

# ambiente (IBL) de cada cômodo: o panorama em 1024x512, leve para o PMREM do three (src/tour.js, ambientePerto)
for orig in sorted((PUB / "pano").glob("*.webp")):
    dest = PUB / "pano" / "env" / orig.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(orig) as im:
        im.convert("RGB").resize((1024, 512), Image.LANCZOS).save(dest, "WEBP", quality=82, method=5)
    print(f"{dest.relative_to(PUB)}  {dest.stat().st_size / 1e3:.0f} kB")
