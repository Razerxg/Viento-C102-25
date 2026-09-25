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

### Fuera de la versión 1, previsto para después

- **Elementos aislados por coeficiente de fuerza** (`Cf`): carteles, superficies exentas,
  estructuras reticuladas, recipientes cilíndricos.
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

## Estructura prevista

| Ruta | Contenido |
|---|---|
| `src/engine/` | cálculo puro, sin React. Es donde vive la ingeniería. |
| `src/constants/` | **las tablas de la norma**, cada una con su referencia y su test |
| `src/components/` | pestañas y croquis SVG |
| `src/context/` | estado global, autoguardado en `localStorage`, export/import JSON |
| `tests/` | vitest |
| `docs/` | memoria de cálculo |

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

## Pendientes conocidos

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
