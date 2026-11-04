#!/usr/bin/env bash
# Leva a luz assada (saída do assar_luz.py do flats-3d) para o site: atlas PNG -> WebP e glb com a UV "luz" otimizado.
# --palette false mantém os nomes dos materiais (o site separa vidro, água e emissores pelo nome, no luz.json).
# Uso: bash pipeline/luz.sh <imovel> <pasta de saída do assar_luz>
set -euo pipefail
IMOVEL="$1"; ORIG="$2"
mkdir -p "public/luz/$IMOVEL"
cp "$ORIG/luz.json" "public/luz/$IMOVEL/luz.json"
py -3 -X utf8 -c "
import sys, pathlib
from PIL import Image
o, d = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
for p in o.glob('*.png'):
    if p.name.startswith('_'): continue
    Image.open(p).convert('RGB').save(d / (p.stem + '.webp'), 'WEBP', quality=88, method=5); print(p.stem, (d / (p.stem + '.webp')).stat().st_size // 1000, 'kB')
" "$ORIG" "public/luz/$IMOVEL"
npx gltf-transform optimize "$ORIG/$IMOVEL.glb" "public/modelos/$IMOVEL-luz.glb" \
  --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --join false --palette false --prune-attributes false
