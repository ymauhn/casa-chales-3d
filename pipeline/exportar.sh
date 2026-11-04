#!/usr/bin/env bash
# Refaz os modelos do site a partir do flats-3d, sem mexer nele: copia os scripts e o imóvel de um branch
# (git archive), roda o construir.py no Blender em linha de comando (--render nao --exportar), comprime com o
# gltf-transform (meshopt + WebP 1024; --join false mantém os nomes das malhas, que o site usa para achar forro
# e telhado) e copia o colisao.json. As imagens (miniaturas e panoramas) saem do pipeline/imagens.py.
#
# Uso (Git Bash, na raiz do site):  bash pipeline/exportar.sh flat-04        (ou casa-chales)
# Regras da máquina: um Blender por vez e só com mais de 6 GB de RAM livres. O flat 04 levou 29 s (03/11);
# a casa monta mata e paisagismo antes de esconder na exportação e não foi medida aqui: em medição.
set -euo pipefail
IMOVEL="${1:?flat-04 ou casa-chales}"
FLATS3D="${FLATS3D:?defina FLATS3D com a pasta do repositório flats-3d}"
BLENDER="${BLENDER:-C:/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
case "$IMOVEL" in
  flat-04) BRANCH=flat-04 ;;
  casa-chales) BRANCH=casa-chales-web ;;
  *) echo "imóvel desconhecido: $IMOVEL"; exit 1 ;;
esac
TMP="$(mktemp -d)"
git -C "$FLATS3D" archive "$BRANCH" scripts imoveis | tar -x -C "$TMP"
(cd "$TMP" && "$BLENDER" --background --factory-startup --python scripts/construir.py -- \
  --imovel "imoveis/$IMOVEL.json" --saida "$TMP/saida" --render nao --exportar)
npx gltf-transform optimize "$TMP/saida/$IMOVEL.glb" "public/modelos/$IMOVEL.glb" \
  --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --join false
cp "$TMP/saida/colisao.json" "public/colisao/$IMOVEL.json"
echo "pronto: public/modelos/$IMOVEL.glb e public/colisao/$IMOVEL.json (temporários em $TMP)"
