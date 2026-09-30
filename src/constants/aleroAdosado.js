// ART. 5.9 — ALEROS ADOSADOS A PAREDES DE EDIFICIOS. CURVAS DE (GC_p) Y (GC_pn).
//
// ── UN ALERO ADOSADO NO ES UN VOLADIZO DE CUBIERTA ─────────────────────────────
// El comentario C 5.9 lo separa con todas las letras: «Los aleros adosados son diferentes
// de los voladizos de cubierta, que son simplemente extensiones de las cubiertas, de igual
// pendiente». Un voladizo sigue el faldón y se resuelve con el art. 5.7 componiendo dos
// caras leídas de figuras de cubierta y de pared; un alero adosado es una losa o una
// estructura plana colgada de la pared, con su propio artículo, sus propias figuras y una
// expresión que NO lleva presión interna:
//
//     p = q_h (GC_p)                    expresión (5.9-1)
//
// ⚠ NO HAY (GC_pi) EN LA 5.9-1. No es una omisión del transcriptor: el artículo escribe la
// expresión con un solo término y la lista de símbolos que le sigue tiene tres entradas
// —p, q_h, (GC_p)—. Un alero adosado no encierra un recinto, así que no hay presión interna
// que sumarle. Restarle un (GC_pi) «por analogía con la 5.3-1» sería inventar una carga.
//
// ── CUATRO FIGURAS, DOS PREGUNTAS DISTINTAS ────────────────────────────────────
// C 5.9 explica para qué sirve cada una, y son dos verificaciones distintas del mismo
// alero, no dos caminos alternativos:
//
//   · las figuras «A» (5.9-1A para h ≤ 20 m, 5.9-2A para h > 20 m) dan los coeficientes
//     SOBRE CADA SUPERFICIE por separado, superior e inferior, «se usa para dimensionar
//     las fijaciones de los elementos de la superficie superior e inferior»;
//   · las figuras «B» (5.9-1B, 5.9-2B) dan el coeficiente NETO, «para dimensionar la
//     estructura del alero (por ejemplo, vigas, columnas y fijaciones al edificio)».
//
// «Para edificios de hasta 20 m de alto con aleros con dos superficies físicas, se necesita
// aplicar ambas Figuras». Y —esto es lo que se pasa por alto— «si el alero consta de una
// única superficie, solo se aplica la Figura 5.9-1B»: una losa, una chapa sola, un
// entablonado sin cielorraso no tiene dos superficies que fijar por separado, y pedirle los
// coeficientes de la figura A sería verificar una cara que no existe.
//
// ── LOS VALORES SALEN DE LAS TABLAS DEL COMENTARIO, NO DEL GRÁFICO ─────────────
// «Los valores de (GC_p) de las figuras se dan en formato de ecuación en las Tablas C 5.9-1
// a C 5.9-4.» Se transcribieron esas cuatro tablas. No se leyó ningún valor de los
// gráficos —que en el PDF son imágenes sin capa de texto—.
//
// Se usa la MISMA representación que las curvas de la 5.3: puntos de quiebre `[A, (GC_p)]`
// sobre el eje logarítmico, evaluados con el único `gcpDeCurva` del capítulo. El motivo
// está escrito en `cyrCurvas.js` y vale igual acá: con tramos escritos como ecuaciones, un
// `<` donde iba `<=` o un coeficiente con un dígito de menos deja la curva discontinua en
// el empalme y el valor sigue siendo plausible. `tests/aleroAdosado.test.js` transcribe las
// cuatro tablas OTRA VEZ, como ecuaciones, y las cruza contra estos puntos.
//
// ⚠ DOS TABLAS TERMINAN EN A = 100 m² Y NO EN UNA MESETA. En las Tablas C 5.9-3 y C 5.9-4
// el último tramo de los valores negativos es «10,0 < A ≤ 100 m²» y la norma no escribe
// nada para A > 100 m². La convención de este archivo —fuera de los extremos la curva es
// constante— congela ahí el valor de A = 100 m², que es la lectura CONSERVADORA: esos
// tramos crecen con el área (se vuelven menos negativos), así que prolongar la recta daría
// menos succión que la que el reglamento llega a escribir. Queda anotado en `LIMITE_A`
// para que el motor lo avise en vez de decidirlo en silencio.

/** @typedef {[number, number][]} Curva  puntos [A (m²), coeficiente] en área creciente */

/** Las dos superficies físicas de un alero de dos caras, como las nombra la Tabla C 5.9-1. */
export const CARA = { SUPERIOR: "superior", INFERIOR: "inferior" };

/** Qué se está dimensionando, que es lo que elige entre la figura A y la B. */
export const DESTINO = {
  /** Fijaciones de los elementos de cada superficie — Figs. 5.9-1A / 5.9-2A. */
  SUPERFICIES: "superficies",
  /** Estructura del alero: vigas, columnas, fijaciones al edificio — Figs. 5.9-1B / 5.9-2B. */
  ESTRUCTURA: "estructura",
};

export const ETIQUETA_DESTINO = {
  [DESTINO.SUPERFICIES]: "Fijaciones de las superficies superior e inferior",
  [DESTINO.ESTRUCTURA]: "Estructura del alero (vigas, columnas, fijación al edificio)",
};

/** Altura media de cubierta que separa las figuras 5.9-1 de las 5.9-2, en m. */
export const H_CORTE = 20;

/** Tope de la excepción: entre `H_CORTE` y esta altura se puede interpolar linealmente. */
export const H_EXCEPCION = 30;

/** Pendiente máxima del alero, en tanto por uno. Ver `LIMITE_PENDIENTE`. */
export const PENDIENTE_MAXIMA = 0.02;

// ⚠ LA PENDIENTE MÁXIMA ESTÁ EN EL COMENTARIO, NO EN EL ARTÍCULO. El cuerpo del art. 5.9 no
// escribe ningún límite de pendiente; es C 5.9 el que explica por qué lo hay: «Los datos
// experimentales que se disponen para esta tipología son limitados y por ello se restringe
// la aplicabilidad de esta sección a aleros planos con pendiente menor o igual a 2 %». Es
// una restricción de ALCANCE —fuera de ella el artículo no tiene datos detrás—, así que el
// motor la informa como error de aplicabilidad y no la corrige.
export const LIMITE_PENDIENTE = {
  ref: "C 5.9",
  texto: "Los datos experimentales que se disponen para esta tipología son limitados y por "
    + "ello se restringe la aplicabilidad de esta sección a aleros planos con pendiente "
    + "menor o igual a 2 %.",
};

/** Hasta dónde escriben las tablas C 5.9-3 y C 5.9-4 sus valores negativos, en m². */
export const LIMITE_A = 100;

// ⚠ LA CARA INFERIOR SE CRUZA EN A ≈ 31,6 m², Y ES LO QUE DICEN LAS TABLAS. En general la
// figura de h > 20 m succiona más que la de h ≤ 20 m —es lo que hace que la altura del
// EDIFICIO sea el dato que elige la figura—, pero la cara INFERIOR es la excepción: la
// Tabla C 5.9-1 la congela en −0,65 desde A = 10 m², y el último tramo de la C 5.9-3
// —«−1,1 + 0,3 log A», 10 < A ≤ 100— la cruza en 10^1,5 = 31,6 m² y llega a −0,50 en
// A = 100 m². O sea: por encima de los ~32 m², un alero sobre un edificio alto tiene MENOS
// succión en su cara inferior que el mismo alero sobre uno bajo.
//
// No es un error de transcripción: se controló contra las dos tablas impresas. Queda fijado
// con test para que nadie lo «arregle» sin volver al papel, y anotado acá para que salte si
// algún día aparece una fe de erratas.

/** El área donde se cruzan las curvas de cara inferior de las Figs. 5.9-1A y 5.9-2A, en m². */
export const CRUCE_CARA_INFERIOR = 10 ** 1.5;

// ═══════════════════════════════════════════════════════════════════════════════
// LAS BANDAS DE h_c/h_e — SÓLO LAS FIGURAS NETAS LAS TIENEN
// ═══════════════════════════════════════════════════════════════════════════════
//
// h_c = altura media del alero adosado · h_e = altura media del alero de la CUBIERTA del
// edificio (notación de las cuatro figuras). La relación dice qué tan arriba de la pared
// está colgado el alero, y es lo que más cambia el coeficiente neto: un alero justo bajo el
// alero de la cubierta (h_c/h_e ≈ 1) queda dentro del torbellino de borde y succiona el
// doble que uno bajo, cerca del piso.
//
// ⚠ LAS FIGURAS «A» NO DEPENDEN DE h_c/h_e, y no porque no se haya transcripto: su nota 1
// dice «Las presiones se basan en los valores más críticos para todas las relaciones de
// h_c/h_e». Ya son la envolvente. Por eso las Tablas C 5.9-1 y C 5.9-3 traen una sola
// terna de curvas y las C 5.9-2 y C 5.9-4 traen una por banda.
//
// ⚠ LAS BANDAS SON BANDAS, NO VALORES DISCRETOS, y la nota 5 de las Figs. 5.9-1B y 5.9-2B
// —«Utilice interpolación lineal para valores intermedios de h_c/h_e»— pide interpolar
// entre curvas que la tabla no da como curvas de un h_c/h_e puntual sino como curvas
// válidas en todo un rango. Los rangos cubren el dominio sin dejar huecos, así que no queda
// ningún «valor intermedio» entre ellos: la nota y la tabla no dicen lo mismo. Se adopta la
// tabla, que es la que trae números —la nota sin curvas puntuales no es aplicable— y el
// motor lo avisa. Con las bandas el coeficiente salta en h_c/h_e = 0,5 y 0,9; interpolar
// entre los centros de banda sería suavizarlo con una regla que nadie escribió.

/**
 * Una banda de h_c/h_e: `[desde, hasta]` con sus bordes abiertos o cerrados tal como los
 * escribe la tabla, porque ahí está la diferencia entre `0,9 ≤ r ≤ 1` y `0,5 < r < 0,9`.
 * @typedef {object} Banda
 * @property {string} id
 * @property {string} rango    como lo imprime la tabla
 * @property {number} desde
 * @property {number} hasta
 * @property {boolean} incluyeDesde
 * @property {boolean} incluyeHasta
 * @property {Curva} neg
 */

/**
 * @typedef {object} FiguraAlero
 * @property {string} tabla       la tabla del comentario de la que salen las ecuaciones
 * @property {string} titulo      como la titula el reglamento
 * @property {string} pagina
 * @property {string} destino     DESTINO.SUPERFICIES o DESTINO.ESTRUCTURA
 * @property {string} coeficiente cómo nombra la figura al coeficiente
 * @property {boolean} hMayor     si es la figura de h > 20 m
 * @property {Curva} pos          positivo; en las cuatro figuras es uno solo
 * @property {Object<string, Curva>} [negPorCara]  sólo en las figuras de superficies
 * @property {Banda[]} [bandas]                    sólo en las figuras netas
 */

/** @type {Object<string, FiguraAlero>} */
export const FIGURAS_ALERO = {
  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.9-1A — SUPERFICIES, h ≤ 20 m (pág. Cap. 5-189) · Tabla C 5.9-1
  // ═════════════════════════════════════════════════════════════════════════════
  "5.9-1A": {
    tabla: "C 5.9-1",
    titulo: "Coeficientes de presión sobre superficies de aleros adosados, h ≤ 20 m",
    pagina: "Cap. 5-189",
    destino: DESTINO.SUPERFICIES,
    coeficiente: "(GC_p)",
    hMayor: false,
    // Valores positivos para AMBAS superficies: 0,8 · 0,8 − 0,2 log A (1 < A ≤ 10) · 0,6
    pos: [[1, 0.8], [10, 0.6]],
    negPorCara: {
      // superior: −1,15 · −1,15 + 0,4 log A (1 < A ≤ 10) · −0,75
      [CARA.SUPERIOR]: [[1, -1.15], [10, -0.75]],
      // inferior: −0,8 · −0,8 + 0,15 log A (1 < A ≤ 10) · −0,65
      [CARA.INFERIOR]: [[1, -0.8], [10, -0.65]],
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.9-1B — PRESIÓN NETA, h ≤ 20 m (pág. Cap. 5-190) · Tabla C 5.9-2
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // Nota 3 de la figura: «Los signos negativos y positivos significan presiones actuando
  // hacia arriba y hacia abajo, respectivamente». Es la convención de una presión NETA
  // sobre un elemento horizontal, no la de «acercándose o alejándose de la superficie» de
  // las figuras de envolvente: acá el negativo levanta el alero.
  "5.9-1B": {
    tabla: "C 5.9-2",
    titulo: "Coeficientes de presión neta sobre aleros adosados, h ≤ 20 m",
    pagina: "Cap. 5-190",
    destino: DESTINO.ESTRUCTURA,
    coeficiente: "(GC_pn)",
    hMayor: false,
    // Valores positivos para TODO h_c/h_e: 0,9 · 0,9 − 0,25 log A (1 < A ≤ 10) · 0,65
    pos: [[1, 0.9], [10, 0.65]],
    bandas: [
      { id: "alta", rango: "0,9 ≤ h_c/h_e ≤ 1",
        desde: 0.9, hasta: 1, incluyeDesde: true, incluyeHasta: true,
        // −1,4 · −1,4 + 0,3 log A (1 < A ≤ 10) · −1,1
        neg: [[1, -1.4], [10, -1.1]] },
      { id: "media", rango: "0,5 < h_c/h_e < 0,9",
        desde: 0.5, hasta: 0.9, incluyeDesde: false, incluyeHasta: false,
        // −0,9 · −0,9 + 0,25 log A (1 < A ≤ 10) · −0,65
        neg: [[1, -0.9], [10, -0.65]] },
      { id: "baja", rango: "h_c/h_e ≤ 0,5",
        desde: 0, hasta: 0.5, incluyeDesde: true, incluyeHasta: true,
        // −0,6 · −0,6 + 0,1 log A (1 < A ≤ 10) · −0,5
        neg: [[1, -0.6], [10, -0.5]] },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.9-2A — SUPERFICIES, h > 20 m (pág. Cap. 5-191) · Tabla C 5.9-3
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // Las dos curvas negativas tienen DOS rectas y el quiebre intermedio en A = 10 m² no está
  // impreso: es el empalme, y las dos ecuaciones dan el mismo valor exacto ahí.
  "5.9-2A": {
    tabla: "C 5.9-3",
    titulo: "Coeficientes de presión sobre superficies de aleros adosados, h > 20 m",
    pagina: "Cap. 5-191",
    destino: DESTINO.SUPERFICIES,
    coeficiente: "(GC_p)",
    hMayor: true,
    // positivos, iguales a los de la 5.9-1A: 0,8 · 0,8 − 0,2 log A · 0,6 (A > 10)
    pos: [[1, 0.8], [10, 0.6]],
    negPorCara: {
      // superior: −1,9 · −1,9 + 0,2 log A (1 < A ≤ 10) · −2,4 + 0,7 log A (10 < A ≤ 100)
      // empalme en A = 10: −1,70 por las dos ramas; en A = 100: −1,00.
      [CARA.SUPERIOR]: [[1, -1.9], [10, -1.7], [100, -1.0]],
      // inferior: −1,0 · −1,0 + 0,2 log A (1 < A ≤ 10) · −1,1 + 0,3 log A (10 < A ≤ 100)
      // empalme en A = 10: −0,80; en A = 100: −0,50.
      [CARA.INFERIOR]: [[1, -1.0], [10, -0.8], [100, -0.5]],
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.9-2B — PRESIÓN NETA, h > 20 m (pág. Cap. 5-192) · Tabla C 5.9-4
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // ⚠ ESTA TABLA NO CUBRE h_c/h_e ≤ 0,1. Sus bandas son «0,9 ≤ h_c/h_e ≤ 1» y
  // «0,1 < h_c/h_e < 0,9», y no hay una tercera fila para el resto —la Tabla C 5.9-2, su
  // par de h ≤ 20 m, sí la tiene: «h_c/h_e ≤ 0,5»—. Es un hueco del reglamento, no del
  // transcriptor. `engine/aleroAdosado.js` lo resuelve extendiendo la banda contigua y lo
  // AVISA; la alternativa —usar la banda alta, que es la más succionada— sería conservadora
  // pero contraria a la tendencia física que las dos tablas muestran: cuanto más bajo el
  // alero respecto del alero de la cubierta, menos succión.
  "5.9-2B": {
    tabla: "C 5.9-4",
    titulo: "Coeficientes de presión neta sobre aleros adosados, h > 20 m",
    pagina: "Cap. 5-192",
    destino: DESTINO.ESTRUCTURA,
    coeficiente: "(GC_pn)",
    hMayor: true,
    // positivos para TODO h_c/h_e, iguales a los de la 5.9-1B: 0,9 · 0,9 − 0,25 log A · 0,65
    pos: [[1, 0.9], [10, 0.65]],
    bandas: [
      { id: "alta", rango: "0,9 ≤ h_c/h_e ≤ 1",
        desde: 0.9, hasta: 1, incluyeDesde: true, incluyeHasta: true,
        // −2,3 · −2,3 + 0,2 log A (1 < A ≤ 10) · −3,0 + 0,9 log A (10 < A ≤ 100)
        // empalme en A = 10: −2,10; en A = 100: −1,20.
        neg: [[1, -2.3], [10, -2.1], [100, -1.2]] },
      { id: "media", rango: "0,1 < h_c/h_e < 0,9",
        desde: 0.1, hasta: 0.9, incluyeDesde: false, incluyeHasta: false,
        // −1,3 · −1,3 + 0,55 log A (1 < A ≤ 10) · −0,75 (A > 10)
        neg: [[1, -1.3], [10, -0.75]] },
    ],
  },
};

/** El orden en que las recorren la pantalla y la memoria — no `Object.keys`. */
export const FIGURAS_ALERO_LISTA = ["5.9-1A", "5.9-1B", "5.9-2A", "5.9-2B"];

/**
 * La figura que corresponde a una altura media de cubierta y a un destino.
 *
 * @param {number} h        altura media de cubierta del EDIFICIO, en m
 * @param {string} destino  DESTINO.SUPERFICIES o DESTINO.ESTRUCTURA
 */
export const figuraAlero = (h, destino) => {
  const sufijo = destino === DESTINO.SUPERFICIES ? "A" : "B";
  return h > H_CORTE ? `5.9-2${sufijo}` : `5.9-1${sufijo}`;
};
