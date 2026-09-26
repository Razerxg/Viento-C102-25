# Acción del viento sobre las construcciones — CIRSOC 102-2025

App React + Vite para calcular la acción del viento sobre edificios según el
**método direccional** del CIRSOC 102-2025, para el **sistema principal resistente a la
fuerza del viento (SRFV)**.

---

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
- **`Kzt = 1,0` fijo, CON AVISO.** Cubre el terreno llano, que es la mayoría de los casos.
  Lo que no puede pasar es que el 1,0 se asuma callado: la app tiene que **decir cuándo NO
  corresponde** —loma, escarpa, colina— para que la omisión sea una decisión y no un
  descuido. Un `Kzt` que debía ser 1,3 y quedó en 1,0 subestima la presión un 30 %.
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
| Sitio → aviso de `K_zt` | 1.8-1 | La decisión se toma FUERA de la app, con el terreno a la vista. Hacen falta los dibujos de loma y escarpa y las tres condiciones |
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
- **`Kzt` está fijo en 1,0.** El motor completo está en `engine/presionDinamica.js` y en
  `constants/topografia.js`, con sus tres condiciones de aplicación; falta la interfaz.
- **Los casos de carga de la Figura 2.4-8 no se aplican todavía a la salida.** Están
  declarados en `engine/edificio.js` con sus factores y su momento torsor.
- Cubiertas en **cúpula** (Figura 2.4-2) y **abovedadas** (2.4-3): las constantes están
  leídas pero no implementadas. La 2.4-2 es un gráfico y hay que digitalizarlo.
- **El croquis de `q(z)` desperdicia el ancho de su tarjeta.** `mkView` ajusta la escala al
  MENOR de los dos factores, y con un edificio bajo y ancho eso deja dos tercios del lienzo
  vacíos. Arreglarlo bien toca el encuadre de los cuatro croquis.
- **`K_zt` sigue fijo en 1,0 en la interfaz** aunque el motor lo calcula. Es el aviso más
  importante de la app: es un multiplicador que puede llegar a 1,9.
