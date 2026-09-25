# Lectura del CIRSOC 102-2025 — qué hay y qué falta

Los PDF recibidos son **escaneo sin capa de texto** (97 páginas, ninguna con texto
extraíble: verificado con `pdftotext` y con `pypdf`). Todo lo que sigue se leyó de la
imagen. Por eso cada tabla transcrita al código lleva su test de verificación: ver la
advertencia del encabezado de `CLAUDE.md`.

## Filiación de la edición — confirmada

El comentario C 1.1 lo dice explícitamente: el **102-2005 se basó en ASCE 7-98**, y esta
revisión **se basa en ASCE 7-10, incorporando los cambios de ASCE 7-16 y 7-22**. De ahí
salen `Ke`, los mapas por categoría de riesgo y la clase «parcialmente abierto».

## Organización del reglamento

| Cap. | Contenido |
|---|---|
| 1 | Requisitos generales: todos los parámetros (`V`, `Kd`, exposición, `Kzt`, `G`, cerramiento, `GCpi`, `Ke`, `Kz`, categoría de riesgo) |
| 2 | **Procedimiento direccional, SPRFV.** Parte 1: todas las alturas. Parte 2: simplificado, `h ≤ 10 m` |
| 3 | **Intencionalmente en blanco** — el procedimiento envolvente pasó al Apéndice C |
| 4 | Accesorios y otras estructuras — coeficiente de fuerza `Cf` |
| 5 | Componentes y revestimientos |
| 6 | Túnel de viento |

## RECIBIDO Y LEÍDO

### Capítulo 1, parte 1 (págs. 1-35) — llega hasta el art. 1.7.4
- **1.2 Definiciones.** Las cuatro clasificaciones de cerramiento, con sus expresiones:
  cerrado `A_o ≤ 0,01 A_g` ó `0,4 m²` (el menor) · abierto `A_o ≥ 0,8 A_g` ·
  parcialmente cerrado `A_o > 1,10 A_oi` y `A_o > 0,4 m²` ó `0,01 A_g` con `A_oi/A_gi ≤ 0,20` ·
  **parcialmente abierto**: el que no cumple ninguna de las otras tres.
  Rígido `n1 ≥ 1 Hz` · flexible `n1 < 1 Hz` · `h` media de cubierta, con `h = h_e` si `θ ≤ 10°`.
- **1.3 Simbología** completa.
- **1.4.1 Convención de signos:** positiva hacia la superficie, negativa alejándose.
- **1.5 Velocidad básica.** Tres mapas por categoría de riesgo: **II → Fig. 1.5-1A (700 años)**,
  **III y IV → 1.5-1B (1700 años)**, **I → 1.5-1C (300 años)**.
  **Figura 1.5-1D: tabla de 29 ciudades** con `V` para cada categoría — es la fuente del
  selector por localidad.
- **Tabla 1.6-1: `Kd`** completa.
- **1.7 Exposición:** rugosidades **B, C y D** (la categoría A se eliminó). Criterios de
  distancia a barlovento: B → 450 m si `h ≤ 10 m`, 800 m ó `20h` si `h > 10 m`;
  D → 1500 m ó `20h`.

### Capítulo 2 completo (págs. 1-26)
- **Expresión (2.4-1):** `p = q·G·Cp − qi·(GCpi)`, con la asignación de `q` por superficie
  (`qz` en barlovento, `qh` en sotavento, laterales y cubierta).
- **Expresión (2.4-3):** `p = qh·G·CN` para edificios abiertos.
- **Tabla 2.2-1:** los **siete pasos** del procedimiento. Sirve como guion de la interfaz.
- **2.1.5 Cargas mínimas:** `0,75 kN/m²` sobre pared y `0,4 kN/m²` sobre cubierta,
  simultáneas; `0,75 kN/m²` sobre `A_f` en edificios abiertos.
- **Figura 2.4-1:** `Cp` de paredes y cubiertas. **Completa y transcribible.**
- **Figura 2.4-3:** cubiertas abovedadas, con las expresiones `−1,65 + 4,5r` y `0,105 + 1,39r`.
- **Figuras 2.4-4 a 2.4-7:** `CN` de edificios abiertos y cubiertas aisladas, con y sin
  bloqueo, casos A y B.
- **Figura 2.4-8:** los **cuatro casos de carga**, con `M_T` y `e = ±0,15 B`.
  ⚠ **Ahora aplican a edificios de TODAS las alturas**; en el 102-2005 estaban limitados a
  `h > 20 m`.
- **Tabla 2.4-1:** coeficientes de empuje por fricción (0,01 / 0,02 / 0,04).
- **2.4.5 Parapetos:** `GCpn = +1,5` barlovento, `−1,0` sotavento.
- **Tabla 2.5-2:** método simplificado, 16 velocidades × 3 columnas.

## RECIBIDO — capítulo 1, parte 2 (págs. 36-70)

Llegó completo. Contenía:

| Art. | Qué |
|---|---|
| 1.8 | `Kzt` y Figura 1.8-1 |
| 1.9 | `G` / `Gf` y **Tabla 1.9-1**, constantes de exposición (`α`, `zg`, `ẑ`, `b̄`, `c`, `ℓ`, `ε̄`, `z_min`) |
| 1.10 | Clasificación de cerramiento (articulado) |
| 1.11 | **Tabla 1.11-1: `GCpi`** y el factor de reducción `Ri` |
| 1.12 | `Ke`, factor de altitud |
| **1.13** | **`Kz`/`Kh` — Tabla 1.13-1 — y la expresión (1.13-1) de `q`** |
| 1.14 | **Tabla 1.14-1**, categoría de riesgo |

**Con esto el reglamento está completo para la versión 1.** La expresión que faltaba es

$$ q_z = 0{,}613 \cdot K_z \cdot K_{zt} \cdot K_d \cdot K_e \cdot V^2 \qquad (1.13\text{-}1) $$

en N/m² con `V` en m/s, y `q_h` es la misma evaluada con `K_z` a la altura media de
cubierta —no hay una fórmula aparte—. El 0,613 es ½·ρ con ρ = 1,225 kg/m³.

### Dos hallazgos del capítulo 1 parte 2

**La Tabla 1.13-1 entera se reconstruye desde seis números.** La nota 1 da la expresión de
`K_z` en función de α y `zg`, que salen de la Tabla 1.9-1. Sus **60 celdas** se reproducen
con una diferencia máxima de **0,0050**, dentro del 0,01 que el propio comentario C 1.13.1
anuncia: donde el recálculo quedaba a menos de 0,01 del CIRSOC 102-2005, la comisión
conservó los valores viejos. Por eso el motor usa la fórmula y la tabla queda como control,
con tolerancia justificada y no arbitraria.

**En exposición B el tramo constante de `K_z` es vacío.** La nota 1 lo define para
`zg < z ≤ 1000 m`, y en B resulta `zg = 1000 m`: el perfil llega a 2,41 justo en el extremo
del alcance del reglamento y no hay ninguna altura por encima. En C (`zg = 750`) y D
(`zg = 590`) sí existe. Es una sutileza fácil de pasar por alto al escribir el código.

**La tabla de `K1` de la Figura 1.8-1 corresponde a exposición C**, aunque su encabezado no
lo diga: se verificó que sus siete filas son exactamente `(K1/(H/Lh))_C × (H/Lh)` para las
tres formas. La nota 4 —«los multiplicadores deben ser usados para cualquier exposición»—
se refiere a `K2` y `K3`, que no dependen de la exposición. Leerla como que `K1` tampoco
depende daría un error del 20 % en exposición D.

**La Tabla 1.12-1 de `Ke` y su fórmula no coinciden exactamente**: a 1200 m la fórmula da
0,8669 y la tabla dice 0,86. La norma admite las dos vías, así que no hay una correcta y
otra equivocada; el motor usa la fórmula, que es continua, y el test verifica concordancia
dentro de 0,008 en vez de exigir igualdad.

## Lo que contenía (referencia)

## LA TABLA 2.5-2 ES UN BANCO DE PRUEBA DEL MOTOR ENTERO

El comentario C 2.5 declara los parámetros con que se construyó la tabla del método
simplificado: `h = 10 m`, exposición B, `Kz = 0,71`, `Kd = 0,85`, `G = 0,85`,
`Kzt = Ke = 1,0`, `GCpi = ±0,18` (cerrado y parcialmente abierto) y `±0,55` (parcialmente
cerrado), con `Cp` de la Figura 2.4-1.

Eso convierte a sus **48 valores en una verificación cruzada del procedimiento direccional
completo**, calculada por los propios autores de la norma. Si el motor reproduce la tabla,
la cadena `q → Cp → GCpi → p` es correcta. Es un test que cruza dos partes independientes
del documento, no uno que repite la suposición de una sola.

**Ya se comprobó que la tabla cierra**, reconstruyéndola a mano:

- Paredes (presión neta, la interna se cancela en diafragma simple):
  `p = q·G·(0,8 − (−0,5)) = 1,105 q`
- Cubierta: usa `Cp = −1,3` (el valor de `h/L ≥ 1,0`, zona `0` a `h/2`), de modo que
  `p = q(0,85·(−1,3) ∓ GCpi)`

Con `V = 73,5 m/s` resulta `q = 1987` N/m², y de ahí `−2553` N/m² para cerrado y `−3288`
para parcialmente cerrado: **exactamente los dos valores de la tabla.** Con `V = 40,0` la
pared da 650 N/m² pero la tabla dice 750: **gobierna la carga mínima del art. 2.1.5**, lo
que confirma de paso esa lectura.

### Un subproducto: `Kz` real a 10 m en exposición B

Despejando `Kz` de tres filas independientes de la tabla (`V` = 45,7 · 61,2 · 73,5) se
obtiene **0,7060 · 0,7058 · 0,7057**. El comentario dice «`Kz = 0,71`», que es el valor
redondeado para mostrar. **El motor tiene que usar la Tabla 1.13-1, no el 0,71 del
comentario**: propagaría un error del 0,6 % en todas las presiones.

## VERIFICACIÓN ESTRUCTURAL DE LA TABLA DE CIUDADES

La expresión C 1.5-6.1 del comentario da `V_T = √(1,5 · V50² · I)`, con factores de
importancia `0,87 / 1,00 / 1,15` para las categorías I / II / III-IV. Entonces, para cada
ciudad existe un `V50` —el valor del 102-2005— tal que las tres columnas son

```
V_I = round(V50 · √1,305 , 1)     V_II = round(V50 · √1,5 , 1)     V_III = round(V50 · √1,725 , 1)
```

Comprobado en Buenos Aires (`V50 = 45`), Salta (35), Mendoza (39), Jujuy (34) y Comodoro
Rivadavia (67,5). **Esto da un test sobre las 87 celdas**: una cifra transpuesta no admite
ningún `V50` que satisfaga las tres columnas a la vez. Es el mismo mecanismo que el test de
los 228 espesores del catálogo de caños —una grilla que el error de tipeo no puede
satisfacer—.

---

# CAPÍTULO 4 — RECIBIDO Y LEÍDO COMPLETO

36 páginas, **escaneo sin capa de texto** igual que el resto (verificado con pypdf: las 36
devuelven 0 caracteres). Se leyó de la imagen, rasterizando a 150 dpi.

## Organización

| Art. | Contenido | Estado |
|---|---|---|
| 4.1 | Alcance · **Tabla 4.1-1** (pasos de accesorios) y **Tabla 4.1-2** (pasos de recipientes cilíndricos) · condiciones, limitaciones y protección | implementado |
| 4.2 · 4.3 | Parámetros del capítulo 1 y presión dinámica: remiten al art. 1.13 | implementado |
| 4.4 | Paredes libres llenas y carteles llenos · **Figura 4.4-1** · expresión (4.4-1) | implementado |
| 4.5 | Otras estructuras · **Figuras 4.5-1, 4.5-2, 4.5-3** · expresión (4.5-1) | implementado |
| 4.5.1 | Equipos sobre cubierta · expresiones (4.5-2) y (4.5-3) | implementado |
| 4.5.2 | Silos, tanques y recipientes cilíndricos · **Figuras 4.5-4, 4.5-5, 4.5-6** · expresión (4.5-4) | implementado |
| 4.5.3 · 4.5.4 · 4.5.5 | Paneles solares · **Figuras 4.5-7 a 4.5-11** | **no implementado — ver abajo** |
| 4.6 | Parapetos: remite al art. 2.4.5 | ya estaba |

## LA FIGURA 4.4-1 TRAE SU PROPIO BANCO DE PRUEBA

El comentario **C 4.4.1 (pág. 4-102)** da el ajuste de superficie de Fox and Levitan (2005)
a los datos de túnel de viento:

```
Cf = {1,563 + 0,008542·ln(x) − 0,06148·y + 0,009011·[ln(x)]²
      − 0,2603·y² − 0,08393·y·ln(x)} / 0,85        con x = B/s , y = s/h
```

y dice textualmente que «los coeficientes de fuerza para los casos A y B se generaron a
partir de la expresión precedente y luego se redondearon a los **0,05** más próximos».

**Comprobado: las 84 celdas cierran EXACTO, con cero discrepancias.** O sea que la tabla y
la fórmula son dos transcripciones independientes del mismo dato, hechas por los autores de
la norma, y una cifra mal leída del escaneo no puede pasar. Es el mismo mecanismo que la
Tabla 1.13-1 contra la fórmula de `Kz`, y el más fuerte de todo el repositorio: no hay
tolerancia que ajustar.

El `0,85` del denominador tampoco es decorativo: el comentario explica que lleva los
coeficientes medidos en túnel a un formato en el que se los puede usar junto al factor de
efecto de ráfaga del art. 1.9, que es por qué la expresión (4.4-1) tiene `G` y `Cf`
separados.

## Verificación estructural del CASO C

El comentario dice que «para carteles con relación B/s diferentes, el **número de regiones
es igual al número de entradas del coeficiente de fuerza** ubicadas debajo de cada
encabezamiento de columna B/s». Eso convierte a las celdas vacías de la figura en un DATO:

- `B/s = 2` → 2 regiones · `3` → 3 · `4` a `10` → 4 · `13` y `≥45` → 7.
- Las regiones **teselan el ancho B**: no se superponen ni dejan huecos, y la última llega
  hasta `B`. Hay test.

**Consecuencia que el código tiene que respetar:** entre `B/s = 10` (cuatro regiones) y
`B/s = 13` (siete) **no se puede interpolar**, aunque la nota 4 autorice interpolar en
`B/s`. El motor se niega y lo dice, en vez de devolver un reparto inventado.

## Hallazgos del capítulo

- **`D·√qz` está en unidades SI**, con el umbral en **5,3** (D en m, qz en N/m²). Separa el
  régimen subcrítico del supercrítico del cilindro en las Figuras 4.5-1 y 4.5-2, y entre las
  dos filas el coeficiente cambia **casi al doble**. Es el equivalente del `2,5` de las
  ediciones en libras por pie cuadrado.
- **La Figura 4.5-3 es la única de las tres que cambió** respecto del CIRSOC 102-2005. El
  comentario lo dice: las Figuras 4.5-1 y 4.5-2 vienen sin cambios de ANSI A58.1-1972,
  mientras que la de torres reticuladas se refinó y quedó consistente con **CIRSOC 306-2018**
  y ANSI/TIA-222-G-2009. Además no es una tabla: son dos polinomios cerrados.
- **El art. 4.5.1 no existía en el 102-2005.** Viene de ASCE 7-16, y allí se levantó el
  límite de 18,3 m de altura de edificio que traía el 7-10: ahora aplica a **todas las
  alturas**.
- **El `(GCr)` es un producto y no se separa** (art. 1.9.7). Las expresiones (4.5-2) y
  (4.5-3) no llevan `G` aparte, a diferencia de (4.4-1) y (4.5-1).
- **A qué altura se evalúa `q` no es lo mismo en las dos expresiones.** (4.4-1) usa `q_h` con
  `h` el **borde superior** del cartel; (4.5-1) usa `q_z` al **centroide** del área
  proyectada; (4.5-2) y (4.5-3) usan `q_h` del **edificio** que soporta al equipo. Hay test.
- **El silo aislado y el agrupado tampoco la evalúan igual:** el aislado usa `q_z` al
  centroide del cilindro y el agrupado `q_h`. El comentario mide un arrastre **65 % mayor**
  sobre el cilindro del medio de una fila de tres separados `1,25 D`.
- **El `Kd` del capítulo 4 no es 0,85.** La Tabla 1.6-1 ya lo daba por tipo de estructura, y
  recién acá hace falta: 0,90 en chimeneas cuadradas, 0,95 en hexagonales, **1,00 en redondas
  y octogonales**. Arrastrar el del edificio a un tanque cilíndrico baja la carga un 15 %.

## LO QUE NO SE IMPLEMENTÓ, Y POR QUÉ

**Artículos 4.5.3, 4.5.4 y 4.5.5 — paneles solares.**

Sus coeficientes **no están tabulados**. Las Figuras 4.5-7, 4.5-10 y 4.5-11 son **once
gráficos de curvas** sobre ejes logarítmicos —`(GCrn)nom` contra el área normalizada `An`,
`(GCgn)` y `(GCgm)` estáticos contra el área efectiva, y sus versiones dinámicas contra la
frecuencia reducida `Ns`— y el reglamento sólo rotula unos pocos valores de arranque y de
cola (0,50 / 0,45 / 0,35 · 0,15 / 0,10 · 0,80 / 0,65 / 0,56 · 2,5 · 1,5 · 0,8…).

Sacar un valor intermedio exige **digitalizar la curva de un escaneo**. Un coeficiente leído
a ojo de un gráfico da una presión plausible y un cálculo equivocado que ningún control de
ingeniería detecta: es exactamente contra lo que se escribió el encabezado de `CLAUDE.md`.
El art. 4.5.4 además necesita el `(GCp)` de componentes y revestimientos del **Capítulo 5**,
que no está en el repositorio.

**Sí está en el motor** lo que el reglamento da como expresión cerrada, para no tener que
volver sobre el documento el día que se digitalicen las curvas:
`γp = mín(1,2 ; 0,9 + hpt/h)` · `γc = máx(0,6 + 0,06·Lp ; 0,8)` · `γE = 1,5 / 1,0` ·
`An = A·(1000/[máx(Lb ; 4,5)]²)` con `Lb = mín(0,4·√(h·WL) ; h ; WS)` ·
`Ns = n·Lc/V` (4.5-12) · y **`γa` de la Figura 4.5-8**, que es la única curva de la serie
transcribible exacto porque sus dos quiebres caen sobre líneas de grilla, en `A = 1 m²`
(γa = 0,8) y `A = 10 m²` (γa = 0,4), con el tramo intermedio lineal **en log A**.
