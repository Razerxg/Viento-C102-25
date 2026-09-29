# 📥 A verificar — Figuras 5.3-5A y 5.3-5B, cubiertas de vertiente única

**Qué hay que hacer con este documento:** controlar cada renglón contra el PDF del
capítulo 5 y avisar. Hasta entonces las dos figuras están **transcriptas pero desactivadas**:
viven en `FIGURAS_PENDIENTES` de `src/constants/cyrCurvas.js`, fuera de `FIGURAS` y de
`FIGURAS_LISTA`, y la selección de figura sigue devolviendo «no implementada» para
vertiente única con θ > 3°. Activarlas es mover el bloque; es el paso que no se da sin el
visto bueno.

## Por qué éstas y no las otras

Las Figuras 5.3-1 y 5.3-2A a 5.3-2G tienen sus curvas escritas **como ecuación** en las
Tablas C 5.3-1 a C 5.3-8 del comentario, así que su transcripción se verifica sola: hay un
test que evalúa las ecuaciones y las compara contra los puntos de quiebre, con 560
comparaciones y tolerancia 0,005.

**Las Figuras 5.3-5A y 5B no tienen ecuación.** El comentario no las incluye. La única
fuente es el gráfico, y un coeficiente leído a ojo da una presión plausible y un cálculo
equivocado que ningún control posterior detecta. De ahí este documento.

## Cómo se leyeron

No a ojo: **midiendo la imagen**.

1. La página se rasteriza a **300 dpi** y a **600 dpi**, por separado.
2. Se calibran los dos ejes con las **líneas de grilla**: 19 renglones de −3,0 a 0,6 de 0,2
   en 0,2, y ocho columnas en 0,1 · 1 · 2 · 5 · 10 · 20 · 50 · 100 m².
   · La grilla se distingue de las curvas **por color** —la grilla es clara, el trazo
     oscuro—. Detectarla por «cuánta fila ocupa» no sirve: una curva plana es un renglón
     largo de píxeles oscuros y entra como línea de grilla, corriendo toda la calibración.
   · Un renglón de grilla que una curva plana parte en dos se vuelve a unir, y los
     renglones tapados por una curva se identifican **por su índice** y no por su posición
     en la lista: con la lista sola, un renglón faltante correría todos los de abajo 0,2 y
     el error sería invisible.
3. Se sigue cada trazo columna por columna y se lee su valor.

La herramienta está en el repositorio: `docs/lectura-figuras/leer-grafico.py`. Una
transcripción que no se puede repetir no se puede auditar —el día que alguien dude de un
−1,6 tiene que poder volver a medirlo, no discutir contra una tabla escrita a mano—:

```
python3 docs/lectura-figuras/leer-grafico.py capitulo5.pdf 43 --dpi 300
python3 docs/lectura-figuras/leer-grafico.py capitulo5.pdf 44 --dpi 600
```

**Residuo de la calibración del eje vertical: 0,005.** Las dos lecturas —300 y 600 dpi—
coinciden dentro de **0,003**.

Los quiebres detectados caen en **A = 1 y A = 10 m²**, sobre líneas de grilla rotuladas, y
todos los valores son múltiplos de 0,1. La poligonal de dos puntos reproduce el trazo
medido en 29 áreas repartidas por todo el rango con un **desvío máximo de 0,02**, que es el
ancho de la propia línea del gráfico.

---

## Figura 5.3-5A — vertiente única, 3° < θ ≤ 10°

`h` = **altura del alero**, siempre (la notación dice «La altura del alero se utilizará
para θ ≤ 10°», y la figura entera es θ ≤ 10°).

### Curvas

| Zona | Tramo | A [m²] | (GC_p) |
|---|---|---|---|
| Todas | positivo, meseta | A ≤ 1 | **+0,3** |
| Todas | positivo, recta | 1 → 10 | +0,3 → +0,2 |
| Todas | positivo, meseta | A ≥ 10 | **+0,2** |
| **1** | negativo | todo el rango | **−1,1** (constante) |
| **2** | negativo, meseta | A ≤ 1 | **−1,3** |
| **2** | negativo, recta | 1 → 10 | −1,3 → −1,2 |
| **2** | negativo, meseta | A ≥ 10 | **−1,2** |
| **2′** | negativo, meseta | A ≤ 1 | **−1,6** |
| **2′** | negativo, recta | 1 → 10 | −1,6 → −1,5 |
| **2′** | negativo, meseta | A ≥ 10 | **−1,5** |
| **3** | negativo, meseta | A ≤ 1 | **−1,8** |
| **3** | negativo, recta | 1 → 10 | −1,8 → −1,2 |
| **3** | negativo, meseta | A ≥ 10 | **−1,2** |
| **3′** | negativo, meseta | A ≤ 1 | **−2,6** |
| **3′** | negativo, recta | 1 → 10 | −2,6 → −1,6 |
| **3′** | negativo, meseta | A ≥ 10 | **−1,6** |

⚠ **Las curvas 3 y 2′ se cruzan** alrededor de A ≈ 3 m²: la 3 arranca más succionada
(−1,8 contra −1,6) y termina menos (−1,2 contra −1,5). No es un error de lectura; es lo
que dibuja la figura, y conviene mirarlo con atención porque es donde un trazado a ojo se
equivoca de curva.

### Zonificación, leída del diagrama

- Franja de **2a** contra el alero **ALTO**: zona **3′** en los **4a** de cada punta,
  zona **2′** en el medio.
- Franja de **2a** contra el alero **BAJO**: zona **3** en los **2a** de cada punta,
  zona **2** en el medio.
- Franjas de **2a** en los dos bordes restantes: zona **2′**.
- El resto: zona **1**.

**No está implementada**: al activar las curvas hay que agregar esta zonificación a
`engine/cyrZonas.js` como un layout propio, con su test de regiones.

---

## Figura 5.3-5B — vertiente única, 10° < θ ≤ 30°

`h` = **altura media de la cubierta** (su notación no trae la salvedad del alero).

### Curvas

| Zona | Tramo | A [m²] | (GC_p) |
|---|---|---|---|
| Todas | positivo, meseta | A ≤ 1 | **+0,4** |
| Todas | positivo, recta | 1 → 10 | +0,4 → +0,3 |
| Todas | positivo, meseta | A ≥ 10 | **+0,3** |
| **1** | negativo, meseta | A ≤ 1 | **−1,3** |
| **1** | negativo, recta | 1 → 10 | −1,3 → −1,1 |
| **1** | negativo, meseta | A ≥ 10 | **−1,1** |
| **2** | negativo, meseta | A ≤ 1 | **−1,6** |
| **2** | negativo, recta | 1 → 10 | −1,6 → −1,2 |
| **2** | negativo, meseta | A ≥ 10 | **−1,2** |
| **3** | negativo, meseta | A ≤ 1 | **−2,9** |
| **3** | negativo, recta | 1 → 10 | −2,9 → −2,0 |
| **3** | negativo, meseta | A ≥ 10 | **−2,0** |

### Zonificación, leída del diagrama

- Franja de **2a** contra el alero **ALTO**: zona **3** en los **4a** de cada punta,
  zona **2** en el medio.
- Franja de **a** contra el alero **BAJO**: zona **2**.
- Franjas de **a** en los dos bordes restantes: zona **2**.
- El resto: zona **1**.

No hay zonas primadas: es la diferencia visible con la 5.3-5A.

---

## Qué mirar, en orden de riesgo

1. **Los valores de meseta izquierda** (A ≤ 1): −1,1 · −1,3 · −1,6 · −1,8 · −2,6 en la 5A
   y −1,3 · −1,6 · −2,9 en la 5B. Son los que gobiernan chapas y fijaciones.
2. **Los valores de meseta derecha** (A ≥ 10): −1,1 · −1,2 · −1,5 · −1,2 · −1,6 en la 5A.
   ⚠ Ahí la **2 y la 3 terminan las dos en −1,2**, y la 2′ queda por debajo de la 3.
3. **Que los quiebres estén en 1 y 10 m²** y no en 2 o en 20.
4. **La zona 1 de la 5A es una recta horizontal** en −1,1: es la única curva de las dos
   figuras que no cambia con el área.
5. **La zonificación**, sobre todo cuál alero lleva las zonas primadas.
