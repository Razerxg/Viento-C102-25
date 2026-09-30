# Para controlar contra el papel — art. 5.9, aleros adosados a paredes

Hoja de control de la transcripción. Los coeficientes salen de las **Tablas C 5.9-1 a
C 5.9-4** del comentario, que es donde el reglamento los escribe como ecuación —«los valores
de (GC_p) de las figuras se dan en formato de ecuación en las Tablas C 5.9-1 a C 5.9-4»—.
**No se leyó ningún valor de los cuatro gráficos**, que en el PDF son imágenes sin capa de
texto: no hizo falta, porque las ecuaciones están.

Eso hace que esta transcripción se verifique sola, como las de la 5.3-1 y 5.3-2A a 2G y a
diferencia de las 5.3-5A/5B: `tests/aleroAdosado.test.js` escribe las cuatro tablas **otra
vez**, como ecuaciones y con los coeficientes tal cual —`−1,15 + 0,4 log A`—, y las evalúa en
diez áreas contra las poligonales de `src/constants/aleroAdosado.js`. Son dos transcripciones
independientes del mismo papel: una cifra mal copiada de un lado no cierra contra el otro.

## Las cuatro tablas, para cotejar renglón por renglón

Las áreas del barrido son **0,5 · 1 · 1,5 · 2 · 5 · 10 · 20 · 50 · 100 · 200 m²**, y caen
justo sobre los tres puntos de quiebre de las cuatro tablas —1, 10 y 100 m²—, que es donde un
tramo mal convertido se separa. Hay un test que exige que esa cobertura siga siendo cierta.

### Tabla C 5.9-1 — superficies, `h ≤ 20 m` (Fig. 5.9-1A, pág. Cap. 5-189)

| Fila | A ≤ 1 | 1 < A ≤ 10 | A > 10 | Poligonal |
|---|---|---|---|---|
| negativos, superficie superior | −1,15 | −1,15 + 0,4 log A | −0,75 | `[1, −1,15] · [10, −0,75]` |
| negativos, superficie inferior | −0,8 | −0,8 + 0,15 log A | −0,65 | `[1, −0,80] · [10, −0,65]` |
| positivos, ambas superficies | 0,8 | 0,8 − 0,2 log A | 0,6 | `[1, 0,80] · [10, 0,60]` |

### Tabla C 5.9-2 — presión neta, `h ≤ 20 m` (Fig. 5.9-1B, pág. Cap. 5-190)

| Fila | A ≤ 1 | 1 < A ≤ 10 | A > 10 | Poligonal |
|---|---|---|---|---|
| negativos, `0,9 ≤ h_c/h_e ≤ 1` | −1,4 | −1,4 + 0,3 log A | −1,1 | `[1, −1,40] · [10, −1,10]` |
| negativos, `0,5 < h_c/h_e < 0,9` | −0,9 | −0,9 + 0,25 log A | −0,65 | `[1, −0,90] · [10, −0,65]` |
| negativos, `h_c/h_e ≤ 0,5` | −0,6 | −0,6 + 0,1 log A | −0,5 | `[1, −0,60] · [10, −0,50]` |
| positivos, todo `h_c/h_e` | 0,9 | 0,9 − 0,25 log A | 0,65 | `[1, 0,90] · [10, 0,65]` |

### Tabla C 5.9-3 — superficies, `h > 20 m` (Fig. 5.9-2A, pág. Cap. 5-191)

| Fila | A ≤ 1 | 1 < A ≤ 10 | 10 < A ≤ 100 | Poligonal |
|---|---|---|---|---|
| negativos, superficie superior | −1,9 | −1,9 + 0,2 log A | −2,4 + 0,7 log A | `[1, −1,90] · [10, −1,70] · [100, −1,00]` |
| negativos, superficie inferior | −1,0 | −1,0 + 0,2 log A | −1,1 + 0,3 log A | `[1, −1,00] · [10, −0,80] · [100, −0,50]` |
| positivos, ambas superficies | 0,8 | 0,8 − 0,2 log A | 0,6 *(A > 10)* | `[1, 0,80] · [10, 0,60]` |

### Tabla C 5.9-4 — presión neta, `h > 20 m` (Fig. 5.9-2B, pág. Cap. 5-192)

| Fila | A ≤ 1 | 1 < A ≤ 10 | 10 < A ≤ 100 | Poligonal |
|---|---|---|---|---|
| negativos, `0,9 ≤ h_c/h_e ≤ 1` | −2,3 | −2,3 + 0,2 log A | −3,0 + 0,9 log A | `[1, −2,30] · [10, −2,10] · [100, −1,20]` |
| negativos, `0,1 < h_c/h_e < 0,9` | −1,3 | −1,3 + 0,55 log A | −0,75 *(A > 10)* | `[1, −1,30] · [10, −0,75]` |
| positivos, todo `h_c/h_e` | 0,9 | 0,9 − 0,25 log A | 0,65 *(A > 10)* | `[1, 0,90] · [10, 0,65]` |

**Los quiebres intermedios en A = 10 m² de las Tablas C 5.9-3 y C 5.9-4 no están impresos**:
son el empalme de las dos rectas, y las dos dan el mismo valor exacto ahí. Se controlaron los
cuatro: −1,70 · −0,80 · −2,10 · y el de la banda media de la C 5.9-4, −0,75, que además
coincide con su meseta.

---

## Qué mirar, en orden de riesgo

### 1 · Las tres alturas, que es el único error de uso real del artículo

`h` es la **altura media de cubierta del EDIFICIO**: elige la figura (5.9-1 con `h ≤ 20 m`,
5.9-2 con `h > 20 m`) y es la altura a la que se evalúa `q_h`. `h_c` y `h_e` sólo forman la
relación que elige la banda de las figuras netas.

Un alero a 3 m colgado de un edificio de 25 m se verifica con las figuras de `h > 20 m` y con
`q_h` de los 25 m. Es contraintuitivo y es lo que el artículo escribe. **Control rápido:** la
pantalla informa `h` con su figura al lado y el croquis dibuja las tres alturas en el mismo
alzado; si `q_h` se pareciera al de la altura del alero, está mal.

### 2 · Los bordes de las bandas, tal como los escribe la tabla

`0,9 ≤ h_c/h_e ≤ 1` y `0,5 < h_c/h_e < 0,9`: el **0,9 pertenece a la banda alta**. Un `<=`
por un `<` ahí manda el caso a la banda media y el coeficiente pasa de −1,4 a −0,9, un 36 %
menos de succión. Hay test sobre los dos bordes y otro que exige que las bandas de la
Tabla C 5.9-2 cubran `(0, 1]` sin huecos ni solapes.

### 3 · Las DOS verificaciones, que no son dos caminos

Con dos superficies físicas, C 5.9 pide **las dos figuras**: la «A» para las fijaciones de la
cara superior y de la inferior, la «B» para la estructura del alero. La pantalla muestra las
dos tablas y **no** una envolvente: son dos elementos distintos del mismo alero.

Con **una sola superficie**, «solo se aplica la Figura 5.9-1B». Si la pantalla ofreciera la
figura A ahí, estaría verificando una cara que no existe.

### 4 · Que la presión no lleve `(GC_pi)`

La (5.9-1) es `p = q_h (GC_p)` y su lista de símbolos tiene tres entradas. **Control rápido:**
dividir una presión de la tabla por `q_h` tiene que dar exactamente el `(GC_p)` de la fila. Si
sobra o falta el `(GC_pi)` del proyecto, alguien copió la (5.3-1).

### 5 · Los dos lugares donde el reglamento no cierra

Los dos **avisan** en pantalla y en la memoria; ninguno se resuelve en silencio.

- **La Tabla C 5.9-4 no cubre `h_c/h_e ≤ 0,1`.** No hay tercera fila —la C 5.9-2, su par de
  `h ≤ 20 m`, sí la tiene—. Se extiende la banda contigua hacia abajo, que es coherente con
  la tendencia de las dos tablas: cuanto más bajo el alero respecto del alero de la cubierta,
  menos succión. Tomar la banda alta sería conservador pero diría lo contrario de lo que el
  reglamento muestra.
- **La nota 5 de las Figs. 5.9-1B y 5.9-2B pide interpolar «para valores intermedios de
  h_c/h_e»**, pero las tablas dan curvas por RANGO y los rangos cubren el dominio sin huecos:
  no queda ningún valor intermedio entre ellos. Se adopta la tabla y el coeficiente salta en
  `h_c/h_e = 0,5` y `0,9`.

### 6 · Dos propiedades de las tablas que parecen errores y no lo son

- ⚠ **La cara inferior se cruza en A ≈ 31,6 m².** En general la figura de `h > 20 m` succiona
  más que la de `h ≤ 20 m` —es lo que hace que la altura del edificio sea el dato que elige
  la figura—, pero la cara inferior es la excepción: la C 5.9-1 la congela en −0,65 desde
  A = 10 m² y el último tramo de la C 5.9-3, `−1,1 + 0,3 log A`, la cruza en 10^1,5 = 31,6 m²
  y llega a −0,50 en A = 100 m². Está fijado con test para que nadie lo «arregle» sin volver
  al papel.
- ⚠ **Los negativos de las C 5.9-3 y C 5.9-4 terminan en A = 100 m², sin meseta.** La norma
  no escribe nada para A > 100 m². La poligonal congela ahí el valor de A = 100, que es la
  lectura conservadora —esos tramos crecen con el área, así que prolongar la recta daría
  menos succión que la que el reglamento llega a escribir— y el motor lo avisa.

### 7 · La interpolación de las excepciones 1 y 2

Con `20 m < h ≤ 30 m` se puede interpolar linealmente entre el valor de la figura de 20 m y el
de la de 30 m, «para cada relación h_c/h_e». Es una **alternativa** y da coeficientes
menores, así que el defecto es no usarla.

**Control rápido:** en `h = 25 m`, que es la mitad exacta del intervalo, el coeficiente
interpolado tiene que ser el **promedio** de los dos. Hay test que lo verifica así justamente
porque es el único valor que se puede comprobar a mano sin repetir la fórmula del motor.

Y ojo con un detalle: las dos figuras netas tienen bandas distintas —la de `h ≤ 20 m` corta en
0,5 y la de `h > 20 m` en 0,1—, así que un alero con `h_c/h_e = 0,3` está en la banda «baja»
de una y en la «media» de la otra. Interpolar entre esas dos curvas es exactamente lo que el
artículo pide: el mismo alero, sus dos lecturas.

### 8 · La pendiente

`≤ 2 %`, y **está en el comentario, no en el artículo**: C 5.9 explica que los datos
experimentales son limitados «y por ello se restringe la aplicabilidad de esta sección a
aleros planos». Es una restricción de alcance: el motor la informa como error y no cambia
nada. Por encima del 2 %, los coeficientes salen igual pero quedan fuera de lo que el
artículo respalda.
