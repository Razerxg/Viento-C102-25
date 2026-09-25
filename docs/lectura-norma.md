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
