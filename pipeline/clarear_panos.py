"""Exposição automática dos panoramas Cycles escuros (renders noturnos que ficam quase pretos numa tela comum).
Em linear: ganho até a mediana de luminância chegar à meta, com compressão suave dos realces (Reinhard estendido),
para as lâmpadas não estourarem. Gera public/pano/8k e public/pano (4096) a partir dos PNG; o public/pano/env (a luz do 3D) não muda.
Uso: py -3 -X utf8 pipeline/clarear_panos.py <pasta dos PNG 8192> [meta_p50_srgb=110]
"""
import pathlib
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ORIG = pathlib.Path(sys.argv[1])
META = float(sys.argv[2]) if len(sys.argv) > 2 else 110
PUB = pathlib.Path(__file__).resolve().parent.parent / "public" / "pano"
PONTOS = ["entrada", "piscina", "gourmet", "varanda_suspensa", "salao", "suite", "banheiro", "suite_baixo", "varanda_baixo"]


def para_linear(v):
    return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)


def para_srgb(v):
    v = np.clip(v, 0, 1)
    return np.where(v <= 0.0031308, 12.92 * v, 1.055 * np.power(v, 1 / 2.4) - 0.055)


for p in PONTOS:
    with Image.open(ORIG / f"{p}.png") as im:
        rgb = np.asarray(im.convert("RGB"), dtype=np.float32) / 255
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    p50 = float(np.percentile(lum[::4, ::4], 50)) * 255
    if p50 < META * 0.8:
        lin = para_linear(rgb)
        ganho = min(8.0, float(para_linear(np.float32(META / 255)) / max(para_linear(np.float32(p50 / 255)), 1e-4)))
        x = lin * ganho
        W = 4.0   # branco: acima disso satura; abaixo, compressão suave
        x = x * (1 + x / (W * W)) / (1 + x)   # em x = W dá exatamente 1
        rgb = para_srgb(x)
        print(f"{p}: p50 {p50:.0f} -> ganho {ganho:.2f}")
    else:
        print(f"{p}: p50 {p50:.0f}, sem ajuste")
    img = Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8))
    for pasta, largura, q in [(PUB / "8k", 8192, 80), (PUB, 4096, 78)]:   # o env (luz do 3D) fica com o render original
        pasta.mkdir(parents=True, exist_ok=True)
        (img if img.width == largura else img.resize((largura, largura // 2), Image.LANCZOS)).save(pasta / f"{p}.webp", "WEBP", quality=q, method=4)
    del rgb, lum, img
