// CAPÍTULO 5 — COMPONENTES Y REVESTIMIENTOS. CURVAS DE (GC_p).
//
// Las curvas de las Figuras 5.3-1 y 5.3-2A a 5.3-2G son gráficos sobre eje logarítmico de
// área, pero el comentario da las MISMAS curvas en forma de ecuación, en las Tablas
// C 5.3-1 a C 5.3-8 (págs. Cap. 5-142 a 5-144). Este archivo transcribe esas ecuaciones;
// no se leyó ningún valor del gráfico.
//
// ── POR QUÉ PUNTOS DE QUIEBRE Y NO LAS ECUACIONES ──────────────────────────────
// Cada curva de la norma son dos o tres tramos: una meseta, una o dos rectas en log A y
// otra meseta. Escritas como ecuaciones hay que decidir en cada evaluación en qué tramo
// cae A, y ese `if` es el lugar donde aparecen los saltos: basta un `<` donde iba `<=`, o
// un coeficiente con un dígito de menos, para que la curva quede discontinua en el punto
// de empalme y nadie lo note, porque el valor sigue siendo plausible.
//
// Con puntos de quiebre no hay tramos que empalmar: la curva ES la poligonal, la
// continuidad queda por construcción y hay UN evaluador para las nueve figuras
// (`engine/cyr.js → gcpDeCurva`, que reusa `interpolar` con los extremos congelados).
//
// La conversión es exacta porque los tramos son rectas en log A: el punto de quiebre es el
// extremo del tramo. Se verificó una por una que la meseta que imprime la norma coincida
// con el extremo de su recta —la peor discrepancia sobre los 36 empalmes es 8·10⁻⁵, muy
// por debajo del 0,005 con que redondea el propio reglamento—, así que los puntos llevan
// el valor REDONDEADO de la norma y no el de la ecuación: es lo que dice el papel.
//
// `tests/cyrCurvas.test.js` transcribe las ecuaciones de las ocho tablas por separado y
// las evalúa en 0,5 · 1 · 1,5 · 2 · 5 · 10 · 20 · 30 · 50 · 100 m² contra estos puntos.
// Son dos transcripciones independientes del mismo dato: una cifra mal copiada acá no
// cierra contra la ecuación de allá.
//
// ── EL ORDEN DE LAS ZONAS NO SALE DE `Object.keys` ─────────────────────────────
// Las zonas se llaman «1», «2», «3», «4», «5» y «1'». JavaScript reordena las claves que
// parecen enteros y las pone primero en orden numérico, así que `Object.keys` de una
// cubierta devolvería 1, 2, 3, 1' —con la zona interior al final— sin importar en qué
// orden se escribieron. Por eso cada figura declara su `zonas` como arreglo, y las
// pantallas, la memoria y la exportación recorren ESE arreglo. Es la misma trampa que ya
// mordió al catálogo de caños de soporte-elevado-v4.

/**
 * Una curva: puntos de quiebre `[A (m²), (GC_p)]` en área creciente.
 *
 * Fuera de los extremos la curva es CONSTANTE, no se extrapola: es lo que dicen las
 * ecuaciones del comentario, cuyo primer y último tramo son «A ≤ …» y «A > …».
 * @typedef {[number, number][]} Curva
 */

/**
 * @typedef {object} Figura
 * @property {string} tabla       tabla del comentario de la que salen las ecuaciones
 * @property {string} titulo      como la titula el reglamento
 * @property {string} pagina      página del reglamento donde está la figura
 * @property {"pared"|"cubierta"} superficie
 * @property {string[]} zonas     en el orden de la figura — ver la advertencia de arriba
 * @property {string[]} ubicaciones  dónde está el elemento; ver UBICACION
 * @property {"h"|"a"} zonificaPor
 * @property {string} alturaH     cuál de las dos alturas evalúa esta figura
 * @property {Object<string, Object<string, {pos: Curva, neg: Curva}>>} curvas  por ubicación y zona
 */

// ── QUÉ ALTURA USA CADA FIGURA ─────────────────────────────────────────────────
// No es un detalle de rotulado: `h` fija las zonas de la Fig. 5.3-2A, entra en la
// dimensión `a` de todas las demás y es la altura a la que se evalúa `q_h`. Confundir la
// altura media con la del alero en una cubierta de 20° cambia las tres cosas a la vez.
//
// Se leyó de la NOTACIÓN de cada figura, una por una:
//   · 5.3-2A dice directamente «h = la altura del alero», sin condición de θ;
//   · 5.3-2B, 2E, 2F y 5.3-5A dicen «altura media de la cubierta; para θ ≤ 10° se
//     utilizará la altura del alero»;
//   · 5.3-2C, 2D, 2G y 5.3-5B dicen sólo «altura media de la cubierta». Coherente: ahí
//     θ > 20° y la salvedad no podría aplicarse nunca.
//   · 5.3-1 (paredes) sigue el mismo criterio que la cubierta a la que acompaña.
export const ALTURA_H = {
  ALERO: "alero",
  MEDIA: "media",
  ALERO_SI_THETA_10: "alero-si-theta-10",
};

export const ETIQUETA_ALTURA_H = {
  [ALTURA_H.ALERO]: "altura del alero",
  [ALTURA_H.MEDIA]: "altura media de la cubierta",
  [ALTURA_H.ALERO_SI_THETA_10]: "altura media de la cubierta; altura del alero si θ ≤ 10°",
};

// ── DÓNDE ESTÁ EL ELEMENTO ─────────────────────────────────────────────────────
// No es una variante del edificio: es la ubicación del elemento que se está verificando.
// `voladizo` existe sólo en la Fig. 5.3-2A, que es la única que trae su propio gráfico de
// alero; en las Figs. 5.3-2B a 2G el voladizo se arma por suma, según el art. 5.7 y la
// nota 5 de esas figuras.
export const UBICACION = { PARED: "pared", CUBIERTA: "cubierta", VOLADIZO: "voladizo" };

/** @type {Object<string, Figura>} */
export const FIGURAS = {
  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.3-1 — PAREDES, h ≤ 20 m (pág. Cap. 5-166) · Tabla C 5.3-1
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // Zona 5 = franja de ancho `a` en las esquinas verticales; zona 4 = el resto de la
  // pared. El positivo es el mismo para las dos zonas; sólo difiere el negativo.
  //
  // NOTA 5 DE LA FIGURA: con θ ≤ 10° los (GC_p) de pared se reducen un 10 %. No está acá
  // sino en el motor, porque depende de la cubierta y no de la curva.
  "5.3-1": {
    tabla: "C 5.3-1",
    titulo: "Paredes de edificios con h ≤ 20 m",
    pagina: "Cap. 5-166",
    superficie: "pared",
    zonas: ["4", "5"],
    ubicaciones: [UBICACION.PARED],
    zonificaPor: "a",
    alturaH: ALTURA_H.ALERO_SI_THETA_10,
    curvas: {
      pared: {
        //        pos: 1,0 · 1,0 − 0,1766 log A (1 < A ≤ 50) · 0,7
        "4": { pos: [[1, 1.0], [50, 0.7]],
        //        neg: −1,1 · −1,1 + 0,1766 log A (1 < A ≤ 50) · −0,8
               neg: [[1, -1.1], [50, -0.8]] },
        "5": { pos: [[1, 1.0], [50, 0.7]],
        //        neg: −1,4 · −1,4 + 0,3532 log A (1 < A ≤ 50) · −0,8
               neg: [[1, -1.4], [50, -0.8]] },
      },
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.3-2A — CUBIERTAS A DOS AGUAS Y PLANAS, θ ≤ 7° (pág. Cap. 5-168)
  // Tabla C 5.3-2
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // ES LA ÚNICA FIGURA QUE ZONIFICA POR `h` Y NO POR `a`, y la única con cuatro zonas: la
  // 1' interior existe sólo si la planta es lo bastante grande frente a `h`. El
  // clasificador por punto de `engine/cyrZonas.js` hace que aparezca sola.
  //
  // ⚠ LOS DOS GRÁFICOS DE LA FIGURA NO SON DOS EDIFICIOS: SON DOS UBICACIONES DEL
  // ELEMENTO. El gráfico CUBIERTAS da el (GC_p) de un elemento de cubierta sobre el
  // recinto cerrado, y el gráfico ALERO el de un elemento ubicado EN EL VOLADIZO, cuyos
  // valores ya incluyen las dos caras, superior e inferior (nota 6 de la figura).
  //
  // Un edificio con voladizo NO pasa a calcular toda su cubierta con la curva del alero:
  // sigue usando la de cubierta sobre el recinto, y la del alero sólo para los elementos
  // que están en el vuelo. Por eso la clave es la UBICACIÓN y no una variante del
  // edificio: con «sinVoladizo / conVoladizo» el modelo invita al error, porque la
  // pregunta «¿tiene voladizo?» es del edificio y la respuesta correcta es del elemento.
  //
  // La presión del elemento de alero además no se arma igual —`GC_pi` según el art. 5.7,
  // que es cero si las dos caras no encierran un volumen interno—, así que la curva
  // ALERO recién se usa en la etapa de voladizos.
  "5.3-2A": {
    tabla: "C 5.3-2",
    titulo: "Cubiertas a dos aguas, θ ≤ 7°",
    pagina: "Cap. 5-168",
    superficie: "cubierta",
    zonas: ["1'", "1", "2", "3"],
    ubicaciones: [UBICACION.CUBIERTA, UBICACION.VOLADIZO],
    zonificaPor: "h",
    alturaH: ALTURA_H.ALERO,
    curvas: {
      // Positivo, IGUAL en cubierta y en alero: 0,3 · 0,3 − 0,1 log A (1 < A ≤ 10) · 0,2
      cubierta: {
        //         1': −0,9 (A ≤ 10) · −1,4 + 0,5000 log A (10 < A ≤ 100) · −0,4
        "1'": { pos: [[1, 0.3], [10, 0.2]], neg: [[10, -0.9], [100, -0.4]] },
        //         1:  −1,7 · −1,7 + 0,4120 log A (1 < A ≤ 50) · −1,0
        "1":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -1.7], [50, -1.0]] },
        //         2:  −2,3 · −2,3 + 0,5297 log A (1 < A ≤ 50) · −1,4
        "2":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -2.3], [50, -1.4]] },
        //         3:  −3,2 · −3,2 + 1,0595 log A (1 < A ≤ 50) · −1,4
        "3":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -3.2], [50, -1.4]] },
      },
      voladizo: {
        // Zonas 1 y 1' comparten curva, y es la única de todo el capítulo con DOS rectas:
        // −1,7 · −1,7 + 0,1000 log A (1 < A ≤ 10) · −2,4584 + 0,8584 log A (10 < A ≤ 50) · −1,0
        // El quiebre intermedio en A = 10 vale −1,6 y no está impreso en la norma: es el
        // empalme de las dos rectas, y las dos dan −1,60000 exacto.
        "1'": { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -1.7], [10, -1.6], [50, -1.0]] },
        "1":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -1.7], [10, -1.6], [50, -1.0]] },
        //         2:  −2,3 · −2,3 + 0,7063 log A (1 < A ≤ 50) · −1,1   ← ERRATA, ver abajo
        "2":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -2.3], [50, -1.1]] },
        //         3:  −3,2 · −3,2 + 1,2360 log A (1 < A ≤ 50) · −1,1
        "3":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -3.2], [50, -1.1]] },
      },
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.3-2B — DOS AGUAS, 7° < θ ≤ 20° (pág. Cap. 5-169) · Tabla C 5.3-3
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // La zona 1 arranca su meseta en A = 2 m² y no en 1, que es lo habitual: la recta es
  // −2,3839 + 1,2754 log A y vale −2,0 justo en A = 2.
  "5.3-2B": {
    tabla: "C 5.3-3",
    titulo: "Cubiertas a dos aguas, 7° < θ ≤ 20°",
    pagina: "Cap. 5-169",
    superficie: "cubierta",
    zonas: ["1", "2", "3"],
    ubicaciones: [UBICACION.CUBIERTA],
    zonificaPor: "a",
    alturaH: ALTURA_H.ALERO_SI_THETA_10,
    curvas: {
      cubierta: {
        // pos todas: 0,6 · 0,6 − 0,2306 log A (1 < A ≤ 20) · 0,3
        "1": { pos: [[1, 0.6], [20, 0.3]], neg: [[2, -2.0], [30, -0.5]] },
        "2": { pos: [[1, 0.6], [20, 0.3]], neg: [[1, -2.7], [20, -1.0]] },
        "3": { pos: [[1, 0.6], [20, 0.3]], neg: [[1, -3.6], [10, -1.8]] },
      },
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.3-2C — DOS AGUAS, 20° < θ ≤ 27° (pág. Cap. 5-170) · Tabla C 5.3-4
  // ═════════════════════════════════════════════════════════════════════════════
  "5.3-2C": {
    tabla: "C 5.3-4",
    titulo: "Cubiertas a dos aguas, 20° < θ ≤ 27°",
    pagina: "Cap. 5-170",
    superficie: "cubierta",
    zonas: ["1", "2", "3"],
    ubicaciones: [UBICACION.CUBIERTA],
    zonificaPor: "a",
    alturaH: ALTURA_H.MEDIA,
    curvas: {
      cubierta: {
        "1": { pos: [[1, 0.6], [20, 0.3]], neg: [[1, -1.5], [20, -0.8]] },
        "2": { pos: [[1, 0.6], [20, 0.3]], neg: [[1, -2.5], [10, -1.2]] },
        //        3: la meseta figura como «−1.4», con punto decimal — ver ERRATAS
        "3": { pos: [[1, 0.6], [20, 0.3]], neg: [[1, -3.0], [10, -1.4]] },
      },
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.3-2D — DOS AGUAS, 27° < θ ≤ 45° (pág. Cap. 5-171) · Tabla C 5.3-5
  // ═════════════════════════════════════════════════════════════════════════════
  "5.3-2D": {
    tabla: "C 5.3-5",
    titulo: "Cubiertas a dos aguas, 27° < θ ≤ 45°",
    pagina: "Cap. 5-171",
    superficie: "cubierta",
    zonas: ["1", "2", "3"],
    ubicaciones: [UBICACION.CUBIERTA],
    zonificaPor: "a",
    alturaH: ALTURA_H.MEDIA,
    curvas: {
      cubierta: {
        // pos todas: 0,9 · 0,9 − 0,3074 log A (1 < A ≤ 20) · 0,5 — la única figura cuyo
        // positivo llega a 0,9: con θ > 27° el faldón a barlovento empuja de verdad.
        "1": { pos: [[1, 0.9], [20, 0.5]], neg: [[1, -1.8], [10, -0.8]] },
        "2": { pos: [[1, 0.9], [20, 0.5]], neg: [[1, -2.0], [20, -1.0]] },
        "3": { pos: [[1, 0.9], [20, 0.5]], neg: [[1, -2.5], [20, -1.0]] },
      },
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.3-2E — CUATRO AGUAS, 7° < θ ≤ 20° (pág. Cap. 5-172) · Tabla C 5.3-6
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // Como en la 2B, la zona 1 mesetea hasta A = 2 m²: −2,1010 + 1,0000 log A vale −1,8 en
  // A = 2.
  "5.3-2E": {
    tabla: "C 5.3-6",
    titulo: "Cubiertas a cuatro aguas, 7° < θ ≤ 20°",
    pagina: "Cap. 5-172",
    superficie: "cubierta",
    zonas: ["1", "2", "3"],
    ubicaciones: [UBICACION.CUBIERTA],
    zonificaPor: "a",
    alturaH: ALTURA_H.ALERO_SI_THETA_10,
    curvas: {
      cubierta: {
        // pos todas: 0,7 · 0,7 − 0,400 log A (1 < A ≤ 10) · 0,3
        "1": { pos: [[1, 0.7], [10, 0.3]], neg: [[2, -1.8], [20, -0.8]] },
        "2": { pos: [[1, 0.7], [10, 0.3]], neg: [[1, -2.4], [20, -1.3]] },
        "3": { pos: [[1, 0.7], [10, 0.3]], neg: [[1, -2.6], [20, -1.4]] },
      },
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.3-2F — CUATRO AGUAS, 20° < θ ≤ 27° (pág. Cap. 5-173) · Tabla C 5.3-7
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // ⚠ LAS ZONAS 2 Y 3 COMPARTEN CURVA. La tabla del comentario las escribe en un solo
  // renglón, «Zonas 2 y 3». No es un descuido de transcripción: con cuatro aguas y esa
  // pendiente, la esquina deja de ser más desfavorable que el borde. Se escriben las dos
  // entradas con los mismos números en vez de una sola, para que el resto del código no
  // tenga que saber de esta excepción, y hay un test que exige que sigan siendo iguales.
  "5.3-2F": {
    tabla: "C 5.3-7",
    titulo: "Cubiertas a cuatro aguas, 20° < θ ≤ 27°",
    pagina: "Cap. 5-173",
    superficie: "cubierta",
    zonas: ["1", "2", "3"],
    ubicaciones: [UBICACION.CUBIERTA],
    zonificaPor: "a",
    alturaH: ALTURA_H.ALERO_SI_THETA_10,
    curvas: {
      cubierta: {
        "1": { pos: [[1, 0.7], [10, 0.3]], neg: [[1, -1.4], [20, -0.8]] },
        "2": { pos: [[1, 0.7], [10, 0.3]], neg: [[1, -2.0], [20, -1.0]] },
        "3": { pos: [[1, 0.7], [10, 0.3]], neg: [[1, -2.0], [20, -1.0]] },
      },
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURA 5.3-2G — CUATRO AGUAS, θ = 45° (pág. Cap. 5-174) · Tabla C 5.3-8
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // Es la figura de UN SOLO ÁNGULO, no de un rango. Entre 27° y 45° el comentario C 5.3.2
  // manda interpolar linealmente en θ entre la 2F evaluada en 27° y ésta, zona por zona.
  // Esa interpolación va en `engine/cyrFiguras.js`, no acá: es selección, no transcripción.
  "5.3-2G": {
    tabla: "C 5.3-8",
    titulo: "Cubiertas a cuatro aguas, θ = 45°",
    pagina: "Cap. 5-174",
    superficie: "cubierta",
    zonas: ["1", "2", "3"],
    ubicaciones: [UBICACION.CUBIERTA],
    zonificaPor: "a",
    alturaH: ALTURA_H.MEDIA,
    curvas: {
      cubierta: {
        "1": { pos: [[1, 0.7], [10, 0.3]], neg: [[1, -1.5], [20, -0.7]] },
        "2": { pos: [[1, 0.7], [10, 0.3]], neg: [[1, -1.8], [20, -0.8]] },
        "3": { pos: [[1, 0.7], [10, 0.3]], neg: [[1, -2.4], [20, -1.0]] },
      },
    },
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // FIGURAS 5.3-5A y 5B — VERTIENTE ÚNICA (págs. Cap. 5-177 y 5-178)
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // ⚠ SON LAS ÚNICAS DEL ALCANCE SIN ECUACIÓN EN EL COMENTARIO. Las Tablas C 5.3-1 a 8 no
  // las incluyen: la única fuente es el gráfico. Se transcribieron MIDIENDO la imagen
  // —rasterizada a 300 y a 600 dpi, calibrando los ejes con las líneas de grilla— y no a
  // ojo, y el proyectista las verificó contra el PDF con una lectura independiente.
  //
  // Las dos lecturas coinciden dentro de 0,003, el residuo de la calibración del eje
  // vertical es 0,005, y la poligonal de dos puntos reproduce el trazo medido en 29 áreas
  // con un desvío máximo de 0,02 —el ancho de la propia línea del gráfico—. Los quiebres
  // caen en A = 1 y A = 10 m², sobre líneas de grilla rotuladas, y los valores son
  // múltiplos de 0,1. El procedimiento y las tablas están en `docs/verificar-cyr.md`, y la
  // herramienta en `docs/lectura-figuras/leer-grafico.py`.
  "5.3-5A": {
    tabla: "— (sin ecuación: transcripción del gráfico)",
    titulo: "Cubiertas de vertiente única, 3° < θ ≤ 10°",
    pagina: "Cap. 5-177",
    superficie: "cubierta",
    // ⚠ LAS PRIMADAS SON LAS DEL ALERO ALTO. Es lo que distingue esta figura de la 5B, y
    // ponerlas del lado equivocado daría las succiones más grandes en el borde que no
    // corresponde, con el croquis espejado y ningún número fuera de rango.
    zonas: ["1", "2", "2'", "3", "3'"],
    ubicaciones: [UBICACION.CUBIERTA],
    zonificaPor: "a",
    // La notación dice «La altura del alero se utilizará para θ ≤ 10°», y la figura entera
    // es θ ≤ 10°: siempre altura de alero.
    alturaH: ALTURA_H.ALERO,
    curvas: {
      cubierta: {
        // ⚠ LAS CURVAS 3 Y 2′ SE CRUZAN en A = 10^0,4 ≈ 2,5 m²: la 3 arranca más
        // succionada (−1,8 contra −1,6) y termina menos (−1,2 contra −1,5). Es lo que
        // dibuja la figura, y es donde un trazado a ojo se equivoca de curva. Hay test.
        "1":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -1.1], [10, -1.1]] },
        "2":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -1.3], [10, -1.2]] },
        "2'": { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -1.6], [10, -1.5]] },
        "3":  { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -1.8], [10, -1.2]] },
        "3'": { pos: [[1, 0.3], [10, 0.2]], neg: [[1, -2.6], [10, -1.6]] },
      },
    },
  },
  "5.3-5B": {
    tabla: "— (sin ecuación: transcripción del gráfico)",
    titulo: "Cubiertas de vertiente única, 10° < θ ≤ 30°",
    pagina: "Cap. 5-178",
    superficie: "cubierta",
    zonas: ["1", "2", "3"],
    ubicaciones: [UBICACION.CUBIERTA],
    zonificaPor: "a",
    alturaH: ALTURA_H.MEDIA,
    curvas: {
      cubierta: {
        "1": { pos: [[1, 0.4], [10, 0.3]], neg: [[1, -1.3], [10, -1.1]] },
        "2": { pos: [[1, 0.4], [10, 0.3]], neg: [[1, -1.6], [10, -1.2]] },
        "3": { pos: [[1, 0.4], [10, 0.3]], neg: [[1, -2.9], [10, -2.0]] },
      },
    },
  },
};

// ── ORDEN DE LAS FIGURAS ───────────────────────────────────────────────────────
// Por el mismo motivo que el orden de las zonas: «5.3-1» y «5.3-2A» no parecen enteros y
// hoy `Object.keys` los devolvería en orden de inserción, pero eso es una casualidad del
// nombre y no una garantía del lenguaje. Las pantallas recorren esta lista.
export const FIGURAS_LISTA = ["5.3-1", "5.3-2A", "5.3-2B", "5.3-2C", "5.3-2D", "5.3-2E",
  "5.3-2F", "5.3-2G", "5.3-5A", "5.3-5B"];

/**
 * Las figuras cuyas curvas salieron de MEDIR EL GRÁFICO y no de una ecuación.
 *
 * No es una lista de pendientes: las dos están activas y el proyectista las verificó
 * contra el PDF. Se declaran aparte porque la app tiene que poder decirlo —en la memoria y
 * en el tooltip— y porque el día que aparezca una discrepancia, es el primer lugar donde
 * mirar. Las demás figuras se verifican solas contra las ecuaciones del comentario; éstas
 * no tienen contra qué.
 */
export const FIGURAS_DE_GRAFICO = ["5.3-5A", "5.3-5B"];

// ── NO QUEDA NINGUNA FIGURA PENDIENTE EN EL ALCANCE ───────────────────────────
// Las Figs. 5.3-5A y 5B estuvieron transcriptas y desactivadas hasta que el proyectista
// las controló contra el PDF con una lectura independiente. Ya están arriba, en `FIGURAS`.
//
// El registro se deja VACÍO y no borrado: es donde entra la próxima figura que se
// transcriba —escalonadas, diente de sierra, cúpula—, y `engine/cyrFiguras.js` ya sabe
// distinguir «no está en el reglamento» de «no está transcripta todavía», que para el
// proyectista son dos situaciones distintas.
/** @type {Object<string, {titulo: string, pagina: string, motivo: string}>} */
export const FIGURAS_PENDIENTES = {};

// ── LAS DOS ERRATAS DEL COMENTARIO ─────────────────────────────────────────────
// Se registran acá, y no sólo en un comentario suelto, porque son el tipo de cosa que en
// la sesión siguiente alguien «corrige» de vuelta al papel. Las dos se verificaron
// numéricamente: la recta llega exactamente al valor de la meseta en el área corregida, y
// no en la que imprime la tabla.
export const ERRATAS = [
  {
    tabla: "C 5.3-2", figura: "5.3-2A", ubicacion: UBICACION.VOLADIZO, zona: "2",
    dice: "(GC_p) = −1,1 para A > 5,0 m²",
    corresponde: "A > 50,0 m²",
    verificacion: "−2,3 + 0,7063·log 50 = −1,10002. En A = 5 la recta vale −1,80631, "
      + "así que leído al pie de la letra el «5,0» abriría un salto de 0,706 en el empalme.",
  },
  {
    tabla: "C 5.3-4", figura: "5.3-2C", ubicacion: UBICACION.CUBIERTA, zona: "3",
    dice: "(GC_p) = −1.4 (con punto decimal)",
    corresponde: "−1,4",
    verificacion: "−3,0 + 1,600·log 10 = −1,40000 exacto. Es un error de tipografía, no de valor.",
  },
];
