# Acción del viento sobre las construcciones — CIRSOC 102-2025

App React + Vite para calcular la acción del viento sobre edificios según el
**método direccional** del CIRSOC 102-2025, para el **sistema principal resistente a la
fuerza del viento (SRFV)**.

---

## 📋 EL PLAN VIVO ESTÁ EN `docs/PLAN.md`

Qué falta, qué está hecho y **qué está frenado esperando un dato del proyectista** vive
ahí, no acá y no en el `git log`. Se lee al empezar y **se actualiza al cerrar cada
tanda, en el mismo commit que el código**. Este archivo guarda las DECISIONES —lo que no
hay que revertir sin conversarlo—; `PLAN.md` guarda el ESTADO.

## ⚠ LO PRIMERO: LAS TABLAS DE LA NORMA NO ESTÁN EN LA MEMORIA DEL MODELO

El CIRSOC 102-**2005** es conocido. El **2025 no**: ni sus valores de tabla, ni su
numeración de artículos, ni qué cambió respecto de la edición anterior.

**Por lo tanto: no se transcribe ni un solo coeficiente sin tener el documento a la vista.**
No es una formalidad. Un `Kz` inventado da una presión plausible y un cálculo entero
equivocado, y ningún control de ingeniería lo detecta —el número "parece bien"—. Es
exactamente el modo de falla contra el que se escribió el test de los 228 espesores del
catálogo de caños en `soporte-elevado-v4`.

Reglas que siguen de ahí:

- Cada tabla transcrita lleva **test de verificación** contra los valores de la norma.
- Cada tabla declara **de qué tabla y qué página** del reglamento salió.
- Donde la norma no define un valor, el código pone `null` y la app lo dice. **No se
  interpola ni se extrapola en silencio.**
- Si un valor se leyó de un escaneo por OCR, se verifica a mano contra la imagen antes de
  entrar al repositorio.

**Indicio ya detectado sobre la filiación de la edición 2025:** el usuario menciona la
clasificación de cerramiento **«parcialmente abierto»**, que el 102-2005 no tiene y que
ASCE 7-16 sí introdujo. Eso sugiere que el 2025 sigue a ASCE 7-16 o posterior, y no al
7-98 del que venía el 2005. **Hay que verificarlo en el documento**, junto con:
si aparece el factor `Ke` de elevación, si los mapas de velocidad pasaron a ser por
categoría de riesgo, y qué cambió en las categorías de exposición.

## Entorno de trabajo — leer antes de proponer comandos

- **No hay Node ni npm en la máquina del autor.** No proponer `npm install`, `npm run dev`
  ni levantar un server local: nada de eso es ejecutable ahí.
- **El flujo es: editar código → commit → push a `main` → Vercel deploya solo.**
- **Los tests corren en GitHub Actions**, en cada push a `main` y en cada PR
  (`.github/workflows/test.yml`). Es la única forma de que se ejecuten.
- Al no poder verificar en runtime desde la máquina de desarrollo, conviene **leer bien
  imports, firmas y usos existentes antes de editar**, y avisar explícitamente qué quedó
  sin verificar.

## Alcance

### Dentro de la versión 1

| | |
|---|---|
| Norma | CIRSOC 102-2025 |
| Procedimiento | **Direccional** |
| Sistema | **SRFV** — sistema principal resistente a la fuerza del viento |
| Tipología | **Edificios**, en las cuatro clasificaciones de cerramiento: cerrado, parcialmente cerrado, parcialmente abierto y abierto |
| Salida | **Presiones por zona y por superficie** (`p` en cada pared y cada zona de cubierta, con su `Cp` y su `GCpi`) |

### Anexo I — secciones de forma uniforme (implementado)

Tablas I.1 a I.6: formas redondeadas, aristas vivas, prismas rectangulares, perfiles
estructurales, cables y tuberías, y la corrección por esbeltez. `F = G·C_f·K_e·A_f·q_z`.

⚠ **EL `K_e` DEL ANEXO NO ES EL `K_e` DEL ART. 1.12.** En el cuerpo del reglamento es el
factor de ALTITUD; en el Anexo es el de CORRECCIÓN POR ESBELTEZ de la Tabla I.6. Dos cosas
distintas con el mismo símbolo, las dos multiplicando la misma fuerza. En el código el de
esbeltez se llama SIEMPRE `keEsbeltez`, nunca `Ke` a secas, y la pantalla lo advierte arriba
de todo.

### Capítulo 4 — accesorios y otras estructuras (implementado)

| | |
|---|---|
| Art. 4.4 | Paredes libres llenas y carteles llenos · Figura 4.4-1 casos A, B y C |
| Art. 4.5 | Chimeneas y tanques (4.5-1) · carteles abiertos y entramados (4.5-2) · torres reticuladas (4.5-3) |
| Art. 4.5.1 | Estructuras y equipamiento sobre cubiertas · `(GCr)` |
| Art. 4.5.2 | Silos, tanques y recipientes cilíndricos, aislados y agrupados · Figuras 4.5-4 a 4.5-6 |
| **Art. 4.5.3 a 4.5.5** | **Paneles solares — NO implementados.** Ver abajo. |

### Fuera de la versión 1, previsto para después

- **Componentes y revestimientos (C&R)**: es otro sistema, con otras áreas tributarias y
  otros coeficientes. No confundir con el SRFV.
- **Fuerzas por nivel, cortante y momento en la base, reparto por pórtico.** No se
  implementan, pero el modelo de datos se diseña para que entren sin rehacerlo.
- **Exportación a `soporte-elevado-v4` y `bases-v-0.1`** con las hipótesis
  `Wx+ / Wx- / Wy+ / Wy-`. Ídem: el modelo de datos lo contempla, la función no se escribe
  todavía.

## Decisiones tomadas — no revertir sin conversarlo

- **`G = 0,85` por defecto, editable a mano.** No se implementa el factor de ráfaga `Gf`
  con respuesta resonante de edificios flexibles: exige frecuencia natural `n1`,
  amortiguamiento y escalas de turbulencia, datos que rara vez están a mano. Quien los
  tenga calcula `G` aparte y lo carga.
- ~~`Kzt = 1,0` fijo, CON AVISO.~~ **SUPERADO**: el art. 1.8 está implementado entero, ver
  «K_zt — decisiones que no conviene revertir» más abajo. Lo que sí sobrevive de aquella
  decisión, y sigue gobernando la pantalla, es que **el 1,0 nunca se asume callado**:
  cuando K_zt da 1,0 la app dice el MOTIVO —sin accidente declarado, valle, o cuál de las
  tres condiciones del art. 1.8.1 falla—, para que la omisión sea una decisión y no un
  descuido.
- **Velocidad básica por MAPA INTERACTIVO de localidades.** Es la decisión que más empuja
  hacia lo gráfico, que es el pedido explícito del autor. Depende de que el reglamento
  traiga la tabla de localidades; si no, se digitaliza el mapa.
- **La memoria de cálculo es un entregable, no un extra.** Mismo criterio que la de
  `bases-v-0.1`: estructura de capítulos, tablas `Concepto · Símbolo · Valor · Unidad`,
  figuras numeradas y las fórmulas en LaTeX.

## Anexo I — decisiones que no conviene revertir

- ⚠ **`V_z` DEL ANEXO NO LLEVA EL FACTOR `b̂`.** El perfil de ráfaga del art. 1.9 se escribe
  `V_z = b̂·(z/10)^α̂·V`, pero la expresión del art. I.2 está SIN `b̂`, y acá se transcribe lo
  que dice el reglamento y no lo que uno supondría por analogía. Agregarlo cambiaría `V_z`
  entre un 16 % en exposición B y un 9 % en D, y con ella la columna de la que sale el `C_f`.
- ⚠ **LAS RELACIONES DE LA TABLA I.1 SON `b/d`, NO `d/b`.** El extractor de texto del PDF da
  vuelta las fracciones apiladas y las convirtió todas en `d/b`. Leerlas al revés intercambia
  filas: la elipse achatada da 0,7 y la parada 1,7, más del doble. Verificado contra la
  imagen renderizada; hay test.
- **EL MÁXIMO DE `C_fx` NO ESTÁ EN EL CUADRADO** sino en `d/b ≈ 0,65`, donde llega a 3,0
  —un 36 % más que el 2,2 de la sección cuadrada—. Un motor que interpolara suponiendo la
  curva monótona se saltearía justo la condición de diseño. La app avisa cuando la sección
  cae cerca de ese pico.
- **LA TABLA I.5 TIENE OTRO UMBRAL Y NO INTERPOLA.** Es `V_z·b = 0,6 m²/s`, no el 4 y 10 de
  la I.1, y da dos regímenes sin nada en el medio.
- **POR DEBAJO DE `ℓ/b = 8` LA TABLA I.6 NO DA VALORES.** Se adopta el 0,7 de su primera fila
  y SE DICE, en vez de extrapolar: la tendencia es decreciente, así que estirarla daría una
  fuerza menor —el lado inseguro— justo donde el reglamento se calló.
- **LAS CELDAS CON `±` DE LA TABLA I.4 SE MARCAN.** La figura escribe «±2,1» y «±0,5»: el
  signo es indeterminado y son dos casos. Transcribirlas como un número a secas deja algo que
  parece definido y no lo está.
- **NO SE INTERPOLA ENTRE LOS ÁNGULOS DE LA TABLA I.4.** El Anexo da 0, 45, 90, 135 y 180 y
  no autoriza valores intermedios; la app muestra la fila completa y el peor ángulo, que es
  lo que se dimensiona.
- **Las referencias cruzadas del Anexo apuntan a los artículos «5.6.3.2» y «5.8»**, que no
  corresponden a la numeración del cuerpo del 102-2025 —exposición es el art. 1.7 y ráfaga el
  1.9—. El Anexo conserva la numeración de la edición anterior. La app usa los vigentes y lo
  declara en la traza, porque quien controle contra el papel va a encontrar la discrepancia.

## Capítulo 4 — decisiones que no conviene revertir

- **ES OTRO CAMINO DE CÁLCULO, NO «EL CAPÍTULO 2 CON OTROS COEFICIENTES».** El capítulo 2
  reparte PRESIONES sobre las superficies de un edificio y la presión interna entra en cada
  una. El capítulo 4 da una FUERZA resultante sobre un objeto que no tiene interior —una
  pared libre, una torre, un cartel—, así que no hay `GCpi` que aplicar. Por eso vive en su
  propio grupo de la barra lateral y no entre los resultados del edificio: mezclarlos haría
  creer que el cartel se calcula «con los datos del edificio», y lo único que comparten es
  el sitio.
- **LA PARTICIÓN EN DOS PANTALLAS ES LA DEL PROPIO REGLAMENTO.** La Tabla 4.1-1 da los pasos
  de accesorios y otras estructuras; la Tabla 4.1-2, los de recipientes cilíndricos. Son dos
  procedimientos distintos —el silo está techado y vuelve a tener presión interna— y la
  norma los separa antes que nosotros.
- ⚠ **A QUÉ ALTURA SE EVALÚA `q` NO ES LO MISMO EN LAS TRES EXPRESIONES**, y el resultado no
  lo delata: usar el centroide en un cartel da una fuerza apenas menor y perfectamente
  plausible.
  · `(4.4-1)` carteles y paredes libres → `q_h`, con `h` el **borde superior**.
  · `(4.5-1)` otras estructuras → `q_z`, al **centroide del área proyectada**.
  · `(4.5-2)` y `(4.5-3)` equipos de azotea → `q_h` **del edificio** que los soporta.
  · Silo **aislado** → `q_z` al centroide del cilindro; **agrupado** → `q_h`. Hay test de
  cada uno.
- ⚠ **EL `(GCr)` NO SE MULTIPLICA POR `G`.** Es un producto tabulado y el art. 1.9.7 prohíbe
  separarlo; volver a multiplicar por 0,85 baja un 15 % la carga sobre un equipo de azotea.
  El motor pone `G = 1` en esa familia, y hay test.
- ⚠ **EL `Kd` DEL CAPÍTULO 4 NO ES 0,85.** La Tabla 1.6-1 lo da por tipo de estructura: 0,90
  en chimeneas cuadradas, 0,95 en hexagonales, **1,00 en redondas y octogonales**. Cada
  pantalla del capítulo 4 tiene **su propio selector**, y el silo tiene uno separado del de
  accesorios —antes heredaba el de allá y un tanque quedaba calculado con 0,85—.
- **`D·√qz` ESTÁ EN UNIDADES SI, umbral 5,3** (D en m, qz en N/m²). Separa el régimen
  subcrítico del supercrítico del cilindro y entre las dos filas el coeficiente cambia casi
  al doble. La app AVISA cuando la fila elegida contradice al valor calculado.
- **EL ÁREA NO ES LA MISMA EN CADA FAMILIA.** Cartel lleno → área total. Cartel abierto y
  torre → **área SÓLIDA proyectada** (nota 3 de la Figura 4.5-2 y nota 1 de la 4.5-3). Usar
  la envolvente en un reticulado con ε = 0,25 **cuadruplica** la fuerza. Hay test.
- **EL CASO C NO SE INTERPOLA ENTRE `B/s = 10` Y `13`.** El número de regiones es un dato de
  la columna —cuatro y siete— y mezclarlas no significa nada. El motor se niega y lo dice.
- **NO SE INTERPOLA ENTRE LAS BANDAS DE ε DE LA FIGURA 4.5-2.** A diferencia de la 4.5-1,
  que autoriza interpolar en su nota 2, ésta no lo dice: dentro de cada banda el valor es
  constante, y por encima de `ε = 0,7` el motor devuelve `null` con el motivo.

## Figuras del reglamento en la interfaz — dónde sí y dónde no

Hay dos clases de «?» en la app. El **gris** abre una ayuda de TEXTO: dice qué es el campo.
El **azul relleno** abre una FIGURA DEL REGLAMENTO: muestra cómo la define la norma. Los dos
conviven en varios campos y eso es deliberado. A 15 px, dos círculos huecos que sólo se
diferencian por el tono se leen como el mismo ícono repetido y el segundo no se abre nunca:
por eso el de figura va relleno.

El registro está en `constants/figuras.js` y las imágenes en `public/figuras/`, recortadas
de los PDF a 200 dpi y reducidas a 980 px. **No se importan como módulos**: se descargan
sólo cuando alguien abre el tooltip. Hay test que exige que cada figura declarada tenga su
archivo, que ninguna imagen quede huérfana y que todas digan de qué página salieron.

**UNA FIGURA ENTRA CUANDO DECIDE ALGO QUE EL TEXTO NO PUEDE DECIR:**

| Dónde | Figura | Por qué |
|---|---|---|
| Edificio → tipo de cubierta y dirección de cumbrera | 2.4-1 | Entre «vertiente única», «dos aguas» y «mansarda» no se elige leyendo: se elige mirando la planta y la elevación |
| Sitio → formulario de `K_zt` | 1.8-1 | La decisión de si el terreno es llano se toma FUERA de la app, con el sitio a la vista: hacen falta los dibujos de loma y escarpa y las tres condiciones. La figura convive con el croquis del accidente declarado, que dibuja LOS DATOS CARGADOS y no el caso genérico |
| Accesorios → geometría de cada familia | 4.4-1 · 4.5-1 · 4.5-2 · 4.5-3 | La figura DEFINE los símbolos: «declare B, s, h y t» no significa nada sin ella |
| Accesorios → caso C | 4.4-1 cont. | El reparto en regiones y la esquina de retorno |
| Silos → geometría | 4.5-4 | Es la que distingue `H` (cilindro sólido) de `h` (altura media) y define `C` |
| Silos → presiones del techo | 4.5-5 o 4.5-6 | Cambia según sea aislado o agrupado |
| Anexo I → cada tabla | I.1 a I.5 | **La forma ES la tabla**: «elipse b/d = 1/2» no se identifica por su nombre |

**Y NO ENTRA CUANDO SERÍA RUIDO:**

- **La app ya imprime esa misma tabla.** `K_z` y sus parámetros de terreno están desplegados
  en Sitio; los criterios de cerramiento, en su acordeón; los `C_p` de cada superficie, en
  Presiones con su referencia. Un escaneo de lo mismo no agrega nada.
- **La app dibuja algo MEJOR.** Los croquis de zonas, el perfil de `q(z)` y la vista 3D son
  del caso concreto y con sus números; la figura genérica sería un paso atrás.
- **El dato es un número sin forma:** altitud, `n₁`, `β`, cantidad de puntos de cálculo.
- **Ya hay un visor dedicado y mejor:** los mapas de velocidad básica tienen el suyo, con
  selección por categoría de riesgo.

## Croquis — los cuatro pedidos

El costado gráfico es prioridad declarada del autor, no un adorno. Los cuatro:

1. **Perfil de `q(z)` en altura** — la presión dinámica escalonada según `Kz`, con las
   cotas de cada tramo. Es el que delata de un vistazo una exposición o una altura mal
   cargadas.
2. **Planta con zonas y presiones** — barlovento, sotavento y laterales, cada una con su
   presión y su signo, y la dirección de análisis.
3. **Elevación con las zonas de cubierta** — las franjas con sus `Cp`. Es donde más se
   equivoca uno leyendo las tablas.
4. **3D del edificio coloreado por presión** — el mejor para detectar un signo invertido
   de un golpe de vista.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/engine/` | cálculo puro, sin React. Es donde vive la ingeniería. |
| `src/constants/` | **las tablas de la norma**, cada una con su referencia y su test |
| `src/components/tokens.js` | **la única fuente de color, medida y tipografía** |
| `src/components/styles.js` · `ui.jsx` · `EstilosGlobales.jsx` | estilos derivados, primitivas y la hoja global |
| `src/components/shell/` | barra superior, navegación lateral, ficha del caso, selector de dirección |
| `src/components/tabs/` | una pantalla por área (Guía, Sitio, Edificio, Ráfaga, Presiones, Croquis, Resultantes, Resumen) |
| `src/components/svg/` | croquis. `kit.jsx` tiene las primitivas (Dim, Flecha, Rotulo, Lienzo, LeyendaPresion) |
| `src/context/` | `ProyectoContext` (datos + cálculo + autoguardado) · `UiContext` (tema y navegación) |
| `src/lib/` | formato de números, registro de avisos, cámara 3D, escala de color |
| `tests/` | vitest |
| `docs/` | memoria de cálculo |

## La interfaz — decisiones que no conviene revertir

El sistema de diseño está **portado de la aplicación de bases**, y no por parecido: son
dos herramientas del mismo autor que se abren una al lado de la otra y los números de una
terminan en la memoria de la otra. Que cada una tenga su propia escala tipográfica y su
propio azul las hace parecer de proveedores distintos.

- **UNA SOLA FUENTE DE COLOR Y DE MEDIDA: `components/tokens.js`.** Los colores son
  VARIABLES CSS, no literales, así que cambiar de tema es cambiar un atributo en la raíz y
  no re-renderizar nada. Consecuencia a tener presente: **no se puede concatenar opacidad**
  (`c.verde + "40"` no es nada con variables), por eso cada tinte tiene su propio token.
  Hay test que exige que los dos temas declaren las mismas claves: si falta una, la
  variable queda sin valor y en ese tema el elemento sale transparente.
- **Los alias `--fondo`, `--sup`, `--borde`, `--txt`, `--txt2`, `--acento` siguen vivos**
  y apuntan a los tokens nuevos. Los cinco croquis y el mapa se escribieron contra ellos;
  reescribirlos todos de una vez es el cambio que rompe un dibujo sin que ningún test lo
  note. Hay test que los exige presentes.
- **TRES TAMAÑOS DE LETRA Y TRES NIVELES DE TEXTO.** Lo que antes se resolvía achicando la
  letra —unidades, encabezados de tabla, notas— se resuelve con peso y color sobre el mismo
  cuerpo de 13. Los encabezados de tabla **no** van en versalitas espaciadas: a 13 px las
  mayúsculas más el `letter-spacing` ensanchaban cada columna lo suficiente como para
  empujar la última fuera de la tarjeta, que es lo que le pasaba a la tabla de cargas.
- **UNA PANTALLA POR ÁREA, con barra lateral vertical.** Antes era una sola columna con
  nueve recuadros apilados. Toda esa información hace falta; el problema era que estaba
  toda al mismo tiempo y sin forma de volver a nada: mirar un croquis y su tabla de cargas
  obligaba a scrollear tres pantallas.
- **EL ESTADO VIVE EN `ProyectoContext`, NO EN `App`.** No es sólo prolijidad: con una
  docena de `useState` en el componente raíz, sacar un bloque a otra pantalla obligaba a
  pasarle ocho props y sus ocho setters, y por eso la app *tenía* que ser una columna
  infinita. De paso trajo **autoguardado en `localStorage` y export/import JSON**: antes,
  recargar la página tiraba el edificio entero.
- **`lib/avisos.js` es un registro, no texto suelto en las pantallas.** Una presión de
  viento es un número plausible SIEMPRE: si la exposición está mal elegida o el edificio es
  flexible y se usó `G = 0,85`, el resultado no se rompe, sale más chico. Ese es el modo de
  falla real y no lo detecta ningún test. Cada aviso declara la PANTALLA donde se resuelve,
  y de ahí salen a la vez el punto de la barra lateral y el contador de la barra superior.
  **Hay test que exige que cada `tab` nombre una pantalla que existe**: un nombre mal
  escrito no rompe nada visible —el botón cae en la Guía y el punto no aparece— y el aviso
  deja de ser alcanzable.
- **Los tres niveles de aviso no son intercambiables.** `error` = el motor no cubre lo que
  se le pidió, o la hipótesis contradice al reglamento. `aviso` = el número sirve pero
  descansa en algo a confirmar. `info` = una decisión que el reglamento ya tomó. **Los
  informativos NO encienden el indicador de la barra**: si contaran, estaría siempre en
  ámbar y dejaría de significar algo.
- **Las cuatro direcciones se eligen en el shell** (`SelectorDireccion`), no dentro de una
  pantalla: la pregunta «cuál estoy mirando» se hace en todas las de resultado a la vez.

## K_zt — decisiones que no conviene revertir

- **K_zt NO ES UN NÚMERO, ES UN PERFIL EN ALTURA.** K3 = e^(−γ·z/Lh) crece hacia el
  terreno mientras K_z queda congelado por debajo de z_mín, así que evaluarlo a una sola
  cota —la altura media de cubierta, que es lo que hacía el campo «z de evaluación»— NO es
  conservador: en la franja baja de la pared a barlovento la presión real supera a la
  calculada. Los datos del accidente viajan en `sitio.topo` sin altura y cada superficie
  evalúa la suya.
- **La z de K3 va SIN el piso de 5 m.** Ese piso es del perfil de exposición, no del
  art. 1.8. Aplicárselo borraría justo la franja donde el efecto topográfico es máximo.
- **Cada tramo se resuelve con el mayor producto K_z·K_zt de sus dos extremos**, y la
  tabla de cargas dice cuál gobierna.
- **El perfil corta también en los MÁXIMOS LOCALES de K_z·K_zt.** La regla de los dos
  extremos sólo es exacta si el producto es monótono adentro, y no lo es: K_z sube, K_zt
  baja, y el producto tiene joroba. Medido sobre 2.700 combinaciones, el máximo interior
  superaba al mayor de los dos extremos hasta en **0,82 %** —por encima del 0,5 % con el
  que se validan los casos, y del lado inseguro—. Cortando en los máximos, la
  subestimación medida es 0.
- ⚠ **SE BUSCAN TODOS LOS MÁXIMOS LOCALES, NO EL GLOBAL.** El producto es BIMODAL: una
  joroba cerca del terreno, donde manda K_zt, y otra subida arriba, donde K_zt ya se
  extinguió y manda K_z. En un edificio alto el máximo global está en el tope, que ya es
  extremo del perfil, y quedarse con él se saltea justo la joroba de abajo.
- **`q_h` usa K_z(h)·K_zt(h) con la h del edificio analizado.** Hay test: un K_zt que
  viniera de una cota ajena daría una presión plausible y nadie lo vería.
- **K_zt se aplica POR DIRECCIÓN**, con «aplicar a todas» tildado por defecto porque los
  multiplicadores suponen viento en la dirección de máxima pendiente (nota 3) y usarlos en
  las cuatro es mayorar.
- **El capítulo 4 y el Anexo I evalúan K_zt a la altura de ESA estructura**, no a la del
  edificio. Un venteo de 18 m y un cartel de 3 m sobre la misma loma no tienen el mismo
  factor.

## Estática — decisiones que no conviene revertir

- **SIGNO DE LA COMPONENTE HORIZONTAL DE CUBIERTA.** Con `p` positiva hacia la superficie:
  faldón a barlovento `H = +p·tanθ·A_planta`, faldón a sotavento `H = −p·tanθ·A_planta`.
  Sale de que el normal exterior de un faldón que asciende con el viento tiene componente
  horizontal CONTRA el viento, y la fuerza va según −n. Estuvo invertido, y en un
  caballete simétrico los dos faldones se cancelan y no se ve: aparece apenas los Cp
  difieren.
- **`H` se calcula SÓLO con presiones externas.** La presión interna actúa sobre las dos
  caras de la envolvente y su resultante horizontal se cancela; si entra, el corte pasa a
  depender del signo de `GC_pi`, que es un dato de la clasificación de cerramiento y no
  del empuje. En el levantamiento no se cancela y ahí sí entra.
- **Los DOS casos del faldón a barlovento (nota 3) se evalúan siempre**, y se adopta el de
  mayor corte. El levantamiento es la envolvente de ambos.
- **LAS PAREDES TIENEN FORMA, NO SON RECTÁNGULOS.** Rectángulo hasta el alero, hastial con
  viento paralelo a la cumbrera, trapecio en vertiente única, y pared alta a `alero +
  remonte`. Las tres formas son la misma con tres números —`W`, `z1`, `z2`— y por eso el
  área y el momento estático salen en forma cerrada. El perfil de `q_z` cierra en la cota
  real de la pared y no en `h`.
- **A cuatro aguas NO tiene hastial en ninguna pared.** Los cuatro faldones arrancan en el
  alero. Es la diferencia con dos aguas que más se pasa por alto, porque el remonte y la
  altura media son los mismos.
- **EL VUELCO INCLUYE LA RESULTANTE VERTICAL**, con su brazo en planta. En un edificio bajo
  y largo es el término que más pesa. Se informa respecto del centro de la base y de cada
  borde; el término horizontal es el mismo en los tres, porque el brazo de una fuerza
  horizontal es su altura.
- **LA CARGA MÍNIMA DEL ART. 2.1.5 ES UN CASO DE CARGA APARTE, no un piso por cara.**
  0,75 kN/m² sobre la pared y 0,40 sobre la cubierta, proyectadas en un plano vertical
  normal al viento y SIMULTÁNEAS. La partición de la silueta no se solapa: la parte de
  pared es el área de la pared a barlovento y la de cubierta es lo que la silueta agrega
  por encima. Había un `aplicarMinimoPared` que subía cada presión a 0,75 —no es lo que
  dice el artículo y además no lo llamaba nadie—; se eliminó.
- **EL NODO DE 60° DE LA FIGURA 2.4-1 VALE 0,6 FIJO.** El «0,01θ» de la última columna es
  el valor de ESA columna, no una fórmula para el ángulo que uno esté calculando. Evaluado
  al θ actual, la interpolación entre 45° y 60° usaba un extremo superior que subía con θ
  y el resultado salía CHICO. Entre 45° y 60° el caso de succión vale 0.
- **El piso de la nota 7 se aplica POR DEFECTO**, y la excepción del C 2.1.5 —SPRFV de
  cubierta con pórticos resistentes a momento— es una declaración del proyectista, no algo
  deducible de la geometría.
- **LOS DOS CASOS DE LA NOTA 3 SON ESTADOS DE CARGA COMPLETOS.** Cada uno trae su terna
  `H`, `V`, `x_V` y sus tres momentos. La envolvente toma máximos SOBRE CASOS, no por
  componente, y dice cuál gobierna cada magnitud. Antes se mezclaba el corte de uno con el
  levantamiento del otro y el vuelco que salía no correspondía a ningún estado de carga:
  en el galpón de control parcialmente cerrado, Wy+, el momento en el borde de sotavento
  daba 6.649 kNm cuando el caso de succión daba 6.081 y el de presión 4.988.
- **EL MOMENTO RESPECTO DEL CENTRO DE LA BASE NO DEPENDE DE `GC_pi`**, en ninguna
  geometría. La presión interna es uniforme sobre toda la planta de cubierta, así que su
  resultante vertical cae en el baricentro de la planta y su brazo respecto del centro es
  cero. Respecto de un borde no se cancela. Hay test: sirve de control cruzado del signo
  de `V` y del brazo en planta, y es la razón por la que ese test no se puede escribir
  sobre `vuelco`.
- **PISO SOLIDARIO A LA ESTRUCTURA, declarable y DESACTIVADO por defecto.** La presión
  interna actúa sobre toda la envolvente interior, piso incluido. Si el piso es parte de
  la estructura —contenedor, shelter sobre skid, módulo—, el empuje sobre la cubierta
  tiene su reacción sobre el piso y el par se autoequilibra: no llega al levantamiento
  global ni al vuelco. ⚠ NO cambia la presión NETA sobre la cubierta: chapas, correas y
  fijaciones siguen viendo externa ± interna.
- **La excepción de la nota 7 está en la PROPIA nota 7** de la Figura 2.4-1 —«excepto para
  SPRFVs en el techo consistentes en entramados resistentes a momento»—, no en el C 2.1.5,
  que trata cargas mínimas.
- **La carga mínima del art. 2.1.5 es un caso de carga COMPLETO**: fuerza, punto de
  aplicación y momento en la base. El baricentro conjunto se pesa por FUERZA y no por
  área, porque la pared paga 0,75 kN/m² y la cubierta 0,40.
- **Cerramiento ABIERTO ⇒ resultantes no válidas**, con aviso de nivel error. Se resuelve
  con los `C_N` de las Figuras 2.4-4 a 2.4-7, que no están implementados; mostrar los Cp
  de la 2.4-1 es mostrar los de otro edificio.

## Interpolación — una sola implementación

- **Vive en `engine/interpolacion.js`** y devuelve siempre los puntos de tabla usados: un
  C_f de 1,27 no se puede controlar contra el papel sin saber entre qué dos filas salió.
  Había cuatro copias de la misma regla con firmas distintas.
- ⚠ **EXIGE ABSCISAS CRECIENTES Y LANZA SI NO LO SON. No las ordena.** La versión vieja de
  `presiones.js` las ordenaba, y eso hace que una tabla cargada al revés dé un número
  plausible en vez de fallar. Es un riesgo concreto acá: las filas de la Figura 4.4-1 van
  en s/h DECRECIENTE y `cfCartelLleno` tiene que invertirlas a mano.
- **Los extremos se congelan, no se extrapolan.** Las filas extremas de estas tablas son
  «≤ 0,05», «≥ 45», «40 o más»: el reglamento dice que más allá vale el mismo número.

## La UI está fuera del typecheck, y por eso tiene otras dos redes

`tsc --noEmit` corre con `checkJs` sobre `engine`, `constants` y `lib`. Los componentes
quedan afuera a propósito (`docs/tipado.md`). El agujero ya se materializó: en `SitioTab`
se usaron `Divisor` y `t` sin importarlos, el build pasó limpio, los 685 tests pasaron y
la pantalla explotaba recién al abrirla.

- **ESLint con TRES reglas, no los conjuntos `recommended`.** `no-undef`,
  `react/jsx-no-undef` y `react-hooks/rules-of-hooks`. Un linter que tira doscientas
  advertencias de estilo se termina ignorando, y con él se ignoran las tres que importan.
- **El smoke test renderiza las once pantallas y falla ante cualquier `console.error`.**
  React no tira excepción por una key repetida ni por una prop inválida: lo escribe en la
  consola y sigue, que es como esos defectos llegan a producción.
- ⚠ **El smoke test navega con `fireEvent`, no con `.click()`.** Sin `act()` React no
  reconcilia y los once casos pasaban verificando la Guía once veces. `abrir()` exige
  `aria-current="page"` y hay un caso que comprueba que las once pantallas muestran
  contenidos distintos entre sí.

## Estilo

- **Español**, tanto en el código como en los textos de la app.
- Los comentarios explican **por qué**, no qué hace la línea.
- Mensajes de commit descriptivos: qué cambió, qué decisión se tomó y qué se rompería si se
  revierte. Es lo que permite reconstruir el contexto en una sesión nueva.
- **Los campos de formulario son STRINGS**, no números: vienen de `<input type="number">`.
  Hay que pasarlos por `num()` antes de formatearlos o de operar.
- **`""` en un campo numérico significa «automático»** y el motor cae a un valor derivado.
  Es distinto de un cero declarado, y el resto del programa tiene que saber leer la
  diferencia.

## Escala de color de la presión

La presión tiene **polaridad**, no sólo magnitud: empuja contra la superficie o tira de
ella. Eso pide una escala **divergente** —azul succión · gris cero · rojo presión—, nunca
una rampa de un solo tono, que borraría justamente la distinción que importa, y nunca un
arcoíris ni un tono saturado en el punto medio.

Los dos brazos están **verificados con el validador de paletas**: separación CVD del peor
par adyacente ΔE 18,6 (protan) y 18,0 (tritan), contra un piso de 8 y un objetivo de 15.
El extremo neutro queda por debajo de 3:1 contra el fondo —lo correcto en una escala
continua, donde «cerca de cero» debe fundirse con la superficie— y eso obliga a un alivio:
**cada cara lleva su valor escrito, hay leyenda y existe la tabla de superficies**. El
color nunca es el único portador del dato.

## Hallazgo: el G calculado no siempre es menor que 0,85

El comentario C 1.9 dice que «el factor obtenido con el cálculo alternativo es 5-10 % más
bajo que el valor de 0,85». **Con la expresión (1.9-6) y las constantes de la Tabla 1.9-1
eso sólo se cumple en exposición B.** Medido:

| Exposición | `G` calculado |
|---|---|
| B | 0,826 – 0,836 — por debajo de 0,85 |
| C | 0,852 – 0,864 — por encima |
| D | 0,867 – 0,879 — por encima |

La razón está en la propia fórmula: como `Q < 1`, el cociente
`(1 + 1,7·g_Q·I_z̄·Q)/(1 + 1,7·g_v·I_z̄)` crece hacia 1 cuando la turbulencia baja, y en el
límite `G → 0,925`. Los terrenos lisos tienen poca turbulencia.

**Consecuencia práctica:** en exposición C o D adoptar 0,85 no es más conservador sino
menos. El art. 1.9.4 permite las dos vías igual, pero suponer que el 0,85 siempre protege
es un error. La app lo avisa cuando pasa. Conviene contrastarlo con la lectura del autor.

## Tres defectos que encontró el rediseño

Ninguno de los tres rompía un número, y por eso podían quedarse indefinidamente. Los tres
salieron de MIRAR LA PANTALLA RENDERIZADA, no de un test.

- **La nota de la tabla de presiones nombraba mal el cerramiento.** Buscaba la
  clasificación por su `GC_pi`, y «cerrado» y «parcialmente abierto» comparten el 0,18: un
  edificio CERRADO leía «parcialmente abierto» al pie de su tabla. El 0,18 era el correcto,
  así que ningún resultado estaba mal; simplemente la nota contradecía al campo del
  formulario que está tres pantallas antes. Ahora se busca por `id`, en
  `constants/presionInterna.js → nombreCerramiento`. Hay test.
- **El croquis de `q(z)` no mostraba la exposición.** Su rótulo decía «q(z) — exposición
  Viento según +X»: imprimía la dirección del viento donde iba la categoría. Este croquis
  existe justamente para delatar una exposición mal cargada —el escalonado es su firma— y
  era el único dato que no mostraba.
- **La cota de `b` en la planta tapaba el rótulo de la cara izquierda.** Su etiqueta lleva
  fondo opaco y se dibuja después de los rótulos, así que se leía «arlovento».

## Pendientes conocidos

> El estado al día de hoy está en **`docs/PLAN.md`**. Lo que sigue es el detalle de POR QUÉ
> cada uno está pendiente, que es lo que no conviene volver a deducir.

- ⛔ **PANELES SOLARES, ART. 4.5.3 A 4.5.5 — NO IMPLEMENTADOS, Y NO POR FALTA DE TIEMPO.**
  Sus coeficientes no están tabulados: las Figuras 4.5-7, 4.5-10 y 4.5-11 son **once
  gráficos de curvas** sobre ejes logarítmicos, con unos pocos valores rotulados de arranque
  y de cola. Sacar un valor intermedio exige digitalizar la curva de un escaneo, y un
  coeficiente leído a ojo da una presión plausible y un cálculo equivocado que ningún
  control detecta. El art. 4.5.4 además necesita el `(GCp)` del Capítulo 5, que no está en el
  repositorio. **Sí están en `constants/cap4.js → SOLAR`** los factores que el reglamento da
  como expresión cerrada (`γp`, `γc`, `γE`, `An`, `Ns`) y **`γa` de la Figura 4.5-8**, que es
  la única curva de la serie transcribible exacto porque sus quiebres caen sobre líneas de
  grilla. Digitalizar las once curvas es el trabajo que falta.

- **La presión interna positiva usa `q_h` y no `q_z`.** El art. 2.4.1 permite evaluarla a
  la altura de la abertura más alta en edificios parcialmente cerrados o abiertos, lo que
  en un edificio alto baja la presión interna de forma significativa. Falta declarar esa
  abertura en la interfaz; mientras tanto se usa `q_h`, que es el criterio conservador que
  el propio reglamento admite.
- **Falta el factor `Ri`** de reducción por gran volumen: está implementado en
  `constants/presionInterna.js` pero no cableado a la interfaz.

- **Los casos de carga de la Figura 2.4-8 no se aplican todavía a la salida.** Están
  declarados en `engine/edificio.js` con sus factores y su momento torsor.
- Cubiertas en **cúpula** (Figura 2.4-2) y **abovedadas** (2.4-3): las constantes están
  leídas pero no implementadas. La 2.4-2 es un gráfico y hay que digitalizarlo.
- **El croquis de `q(z)` desperdicia el ancho de su tarjeta.** `mkView` ajusta la escala al
  MENOR de los dos factores, y con un edificio bajo y ancho eso deja dos tercios del lienzo
  vacíos. Arreglarlo bien toca el encuadre de los cuatro croquis.

