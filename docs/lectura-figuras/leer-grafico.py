#!/usr/bin/env python3
"""
Lee las curvas de (GC_p) de una figura del capítulo 5 midiendo la imagen.

Es la herramienta con la que se transcribieron las Figuras 5.3-5A y 5.3-5B, que NO tienen
ecuación en el comentario. Está en el repositorio porque una transcripción que no se puede
repetir no se puede auditar: el día que alguien dude de un −1,6 tiene que poder volver a
medirlo, no discutir contra una tabla escrita a mano.

No corre en el flujo normal ni en el CI. Necesita `pdftoppm` (poppler), Pillow y numpy:

    python3 leer-grafico.py capitulo5.pdf 43 --dpi 300
    python3 leer-grafico.py capitulo5.pdf 43 --dpi 600     # la segunda lectura

── QUÉ HACE, Y POR QUÉ ASÍ ────────────────────────────────────────────────────────────
1. Rasteriza la página y recorta el gráfico.
2. Calibra los dos ejes con las LÍNEAS DE GRILLA: 19 renglones de −3,0 a 0,6 de 0,2 en 0,2
   y ocho columnas en 0,1 · 1 · 2 · 5 · 10 · 20 · 50 · 100 m².
   · La grilla se distingue del trazo POR COLOR —clara contra oscuro— y no por cuánta fila
     ocupa: una curva plana es un renglón largo de píxeles oscuros, entra como línea de
     grilla y corre toda la calibración del eje. Pasó en la primera versión.
   · Un renglón partido en dos por una curva se vuelve a unir, y los renglones TAPADOS por
     una curva se identifican por su ÍNDICE y no por su posición en la lista: con la lista
     sola, un renglón faltante corre todos los de abajo 0,2 y el error es invisible.
3. Lee el valor de cada trazo en las áreas que se le pidan.

El residuo de la calibración vertical se imprime siempre: si sube de 0,01, la lectura no
sirve y hay que mirar el recorte.
"""
import argparse, subprocess, sys, tempfile, os
from PIL import Image
import numpy as np

AREAS_GRILLA = (0.1, 1, 2, 5, 10, 20, 50, 100)
MUESTRAS = (0.5, 1, 1.5, 2, 3, 5, 7, 10, 15, 20, 50, 100)


def grupos(idx, tol=3):
    """Agrupa índices contiguos y devuelve el centro de cada grupo."""
    g, act = [], []
    for i in idx:
        if act and i - act[-1] <= tol:
            act.append(i)
        else:
            if act:
                g.append(sum(act) / len(act))
            act = [i]
    if act:
        g.append(sum(act) / len(act))
    return g


def rasterizar(pdf, pagina, dpi, destino):
    subprocess.run(["pdftoppm", "-f", str(pagina), "-l", str(pagina), "-r", str(dpi),
                    "-png", pdf, destino], check=True)
    for suf in (f"-{pagina}.png", f"-{pagina:02d}.png", f"-{pagina:03d}.png"):
        if os.path.exists(destino + suf):
            return destino + suf
    raise SystemExit("pdftoppm no dejó el PNG donde se esperaba")


def leer(png, dpi, muestras):
    esc = dpi / 300.0
    rec = tuple(int(v * esc) for v in (600, 1600, 2000, 3000))
    a = np.asarray(Image.open(png).convert("RGB").crop(rec)).astype(int)
    m = a.mean(axis=2)
    H, W = m.shape
    claro = (m > 195) & (m < 248)
    osc = m < 160

    gy = grupos([y for y in range(H) if claro[y, :].sum() > 400 * esc], tol=int(16 * esc))
    gx = grupos([x for x in range(W) if claro[:, x].sum() > 700 * esc], tol=int(6 * esc))
    if len(gx) != len(AREAS_GRILLA):
        raise SystemExit(f"se esperaban {len(AREAS_GRILLA)} columnas de grilla y hay {len(gx)}")

    paso = (gy[-1] - gy[0]) / 18
    buenos = [(y, round((y - gy[0]) / paso)) for y in gy
              if abs((y - gy[0]) / paso - round((y - gy[0]) / paso)) < 0.2]
    py = np.polyfit([y for y, _ in buenos], [-3.0 + 0.2 * k for _, k in buenos], 1)
    resY = max(abs(np.polyval(py, y) - (-3.0 + 0.2 * k)) for y, k in buenos)
    px = np.polyfit([np.log10(A) for A in AREAS_GRILLA], gx, 1)
    resX = max(abs(np.polyval(px, np.log10(A)) - g) for A, g in zip(AREAS_GRILLA, gx))

    print(f"{png}  ·  {len(gy)} renglones de grilla ({len(gy) - len(buenos)} descartados)")
    print(f"residuo del eje vertical: {resY:.4f}   ·   del horizontal: {resX:.1f} px")
    if resY > 0.01:
        print("⚠ residuo alto: la calibración no sirve, revisar el recorte")

    for A in muestras:
        x = int(round(float(np.polyval(px, np.log10(A)))))
        col = osc[:, max(0, x - int(4 * esc)):x + int(5 * esc)].any(axis=1)
        vs = [round(float(np.polyval(py, y)), 3)
              for y in grupos([y for y in range(H) if col[y]], tol=int(4 * esc))]
        print(f"  A = {A:6}: {[v for v in vs if -3.0 < v < 0.65]}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pdf")
    ap.add_argument("pagina", type=int, help="página del PDF del capítulo (43 y 44 son las 5.3-5A y 5B)")
    ap.add_argument("--dpi", type=int, default=300)
    args = ap.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        leer(rasterizar(args.pdf, args.pagina, args.dpi, os.path.join(tmp, "p")),
             args.dpi, MUESTRAS)
