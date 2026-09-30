// ART. 5.9 — ALEROS ADOSADOS A PAREDES DE EDIFICIOS.
//
//     p = q_h (GC_p)                    expresión (5.9-1)
//
// donde q_h es «la presión dinámica del artículo 1.13 evaluada a la altura media de
// cubierta, h, usando la exposición definida en el artículo 1.7.3».
//
// ⚠ h ES LA ALTURA MEDIA DE CUBIERTA DEL EDIFICIO, NO LA DEL ALERO. Es la trampa de este
// artículo: el alero puede estar a 3 m del piso y colgado de una torre de 40, y la presión
// dinámica que lo carga es la de los 40 m. El texto no deja lugar a duda —«evaluada a la
// altura media de cubierta, h»— y la notación de las cuatro figuras distingue las tres
// alturas por separado: `h` (del edificio), `h_c` (media del alero adosado) y `h_e` (media
// del alero de la cubierta del edificio). Usar h_c daría una presión mucho menor, y es el
// error que más caro sale porque el resultado sigue pareciendo razonable.
//
// `h_c/h_e` no entra en q_h: entra sólo en elegir la banda de las figuras netas.
//
// ── QUÉ SE DEVUELVE, Y POR QUÉ SON DOS VERIFICACIONES Y NO UNA ─────────────────
// C 5.9: con dos superficies físicas «se necesita aplicar ambas Figuras» —la A para las
// fijaciones de cada cara, la B para la estructura del alero—; con una sola superficie,
// «solo se aplica la Figura 5.9-1B». No son dos caminos entre los que elegir el peor: son
// dos elementos distintos del mismo alero. Por eso `analizarAleroAdosado` devuelve las dos
// en paralelo y no una envolvente.
import { gcpDeCurva } from "./cyr.js";
import { areaEfectiva, avisoSPRFV } from "./cyrElementos.js";
import { P_MINIMA } from "./cyrPresiones.js";
import { q } from "./presionDinamica.js";
import {
  FIGURAS_ALERO, CARA, DESTINO, H_CORTE, H_EXCEPCION, LIMITE_A, LIMITE_PENDIENTE,
  PENDIENTE_MAXIMA, figuraAlero,
} from "../constants/aleroAdosado.js";

const f2 = (x) => Number(x).toFixed(2).replace(".", ",");
const f3 = (x) => Number(x).toFixed(3).replace(".", ",");

/** Las cuatro paredes donde puede colgarse el alero, por el sentido de su normal exterior. */
export const PAREDES = /** @type {const} */ (["+X", "-X", "+Y", "-Y"]);

export const ETIQUETA_PARED = {
  "+X": "Pared +X", "-X": "Pared −X", "+Y": "Pared +Y", "-Y": "Pared −Y",
};

// ═══════════════════════════════════════════════════════════════════════════════
// LA BANDA DE h_c/h_e
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * La banda de h_c/h_e de una figura neta, con lo que haya que avisar.
 *
 * ── LOS BORDES SE COMPARAN COMO LOS ESCRIBE LA TABLA ──────────────────────────
 * `0,9 ≤ r ≤ 1` y `0,5 < r < 0,9` no son el mismo intervalo con otra notación: r = 0,9 cae
 * en la banda ALTA, que succiona un 55 % más. Redondear los bordes a «≥/≤» en las dos daría
 * un solapamiento y el orden del arreglo decidiría el coeficiente.
 *
 * ⚠ LA TABLA C 5.9-4 DEJA UN HUECO EN h_c/h_e ≤ 0,1. Sus dos bandas son `0,9 ≤ r ≤ 1` y
 * `0,1 < r < 0,9`, y no hay tercera fila; su par de h ≤ 20 m, la C 5.9-2, sí cubre el fondo
 * con `r ≤ 0,5`. Se extiende la banda contigua —la media— hacia abajo y se avisa. Es la
 * lectura coherente con la tendencia que muestran las dos tablas: cuanto más bajo está el
 * alero respecto del alero de la cubierta, menos succión. Tomar la banda alta sería
 * conservador pero diría lo contrario de lo que el reglamento muestra, y con un aviso el
 * proyectista puede decidir.
 *
 * @param {import('../constants/aleroAdosado.js').FiguraAlero} fig
 * @param {number} r  h_c/h_e
 */
export function bandaDe(fig, r) {
  const avisos = [];
  const dentro = (b) => (b.incluyeDesde ? r >= b.desde : r > b.desde)
    && (b.incluyeHasta ? r <= b.hasta : r < b.hasta);

  let banda = fig.bandas.find(dentro);
  if (!banda) {
    // Sólo dos caminos llegan acá: r por encima de 1 —que la notación de la figura no
    // admite, h_c no puede superar h_e— y el hueco de la Tabla C 5.9-4.
    if (r > 1) {
      banda = fig.bandas.find(b => b.hasta === 1);
      avisos.push({ nivel: "aviso", ref: `Fig. ${fig.destino === DESTINO.ESTRUCTURA ? "" : ""}`.trim() || fig.tabla,
        texto: `h_c/h_e = ${f3(r)} es mayor que 1: el alero adosado quedaría por encima del `
          + "alero de la cubierta, y la notación de la figura no contempla ese caso. Se usa "
          + `la banda ${banda.rango}. Revisá h_c y h_e.` });
    } else {
      const masBaja = fig.bandas.reduce((a, b) => (b.desde < a.desde ? b : a));
      banda = masBaja;
      avisos.push({ nivel: "aviso", ref: fig.tabla,
        texto: `h_c/h_e = ${f3(r)} queda por debajo de todas las bandas que escribe la `
          + `Tabla ${fig.tabla} —la más baja es «${masBaja.rango}»— y el reglamento no da `
          + "valores para ese rango. Se extiende la banda más baja hacia abajo. Es la "
          + "lectura coherente con la tendencia de las tablas (cuanto más bajo el alero, "
          + "menos succión), pero no está escrita: verificala." });
    }
  }
  return { banda, avisos };
}

// ═══════════════════════════════════════════════════════════════════════════════
// (GC_p) DE UN ALERO, CON LA INTERPOLACIÓN DE LAS EXCEPCIONES 1 Y 2
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interpolación lineal en h entre la figura de 20 m y la de 30 m.
 *
 * ── ES UNA ALTERNATIVA QUE EL REGLAMENTO PERMITE, NO UN CAMINO OBLIGADO ────────
 * Las excepciones 1 y 2 del art. 5.9 empiezan las dos con «Como alternativa al uso de
 * (GC_p) de la Figura 5.9-2A/B para edificios con altura media de cubierta entre 20 m y
 * 30 m, el valor […] puede ser interpolado linealmente para la altura media de cubierta de
 * 20 m de la Figura 5.9-1A/B y el valor para altura media de cubierta de 30 m de la Figura
 * 5.9-2A/B para cada relación h_c/h_e».
 *
 * O sea: las curvas de la figura «1» se leen como el valor EN h = 20 m y las de la «2» como
 * el valor EN h = 30 m, y entre esas dos alturas se interpola. Da coeficientes menores que
 * la figura 5.9-2 sola, así que el defecto es NO usarla: quien la quiera, la declara. Con
 * h > 30 m no hay nada que interpolar y rige la figura 5.9-2 directamente.
 *
 * ⚠ «PARA CADA RELACIÓN h_c/h_e» SIGNIFICA QUE LA BANDA SE ELIGE EN CADA FIGURA, no que se
 * interpola entre bandas. Las dos figuras netas tienen bandas distintas —la de h ≤ 20 m
 * corta en 0,5 y la de h > 20 m en 0,1—, así que un alero con h_c/h_e = 0,3 está en la
 * banda «baja» de una y en la «media» de la otra. Interpolar entre esas dos curvas es
 * exactamente lo que el artículo pide: el mismo alero, sus dos lecturas.
 */
const interpolarEnH = (h, v20, v30) =>
  v20 + (v30 - v20) * (h - H_CORTE) / (H_EXCEPCION - H_CORTE);

/**
 * @typedef {object} Contexto
 * @property {number} qh     presión dinámica a la altura media de cubierta del edificio
 * @property {number} h      altura media de cubierta del EDIFICIO, en m
 * @property {number} hc     altura media del alero adosado, en m
 * @property {number} he     altura media del alero de la cubierta del edificio, en m
 * @property {boolean} [dosSuperficies]  si el alero tiene dos caras físicas
 * @property {boolean} [interpolarH]     usar la excepción 1/2 con 20 < h ≤ 30 m
 */

/**
 * Los coeficientes de un destino para un área efectiva.
 *
 * Devuelve `{pos, neg}` cuando el destino es la ESTRUCTURA —un solo coeficiente neto— y
 * `{superior: {pos, neg}, inferior: {pos, neg}}` cuando son las SUPERFICIES, porque ahí el
 * positivo es común a las dos caras y el negativo no.
 *
 * @param {Contexto} ctx
 * @param {{destino: string, A: number}} p
 */
export function gcpAlero(ctx, { destino, A }) {
  const r = ctx.he > 0 ? ctx.hc / ctx.he : 0;
  const avisos = [];
  const interpola = ctx.interpolarH === true
    && ctx.h > H_CORTE && ctx.h <= H_EXCEPCION;

  // Las figuras que se van a leer: una sola, o las dos que la excepción interpola.
  const nombres = interpola
    ? [figuraAlero(0, destino), figuraAlero(H_EXCEPCION + 1, destino)]
    : [figuraAlero(ctx.h, destino)];

  /** Lee una figura y devuelve los coeficientes crudos, más las bandas que usó. */
  const leer = (nombre) => {
    const fig = FIGURAS_ALERO[nombre];
    const pos = gcpDeCurva(fig.pos, A).valor;

    if (destino === DESTINO.SUPERFICIES) {
      const caras = {};
      for (const cara of [CARA.SUPERIOR, CARA.INFERIOR]) {
        const curva = fig.negPorCara[cara];
        // ⚠ EL AVISO DEL TOPE DE ÁREA VA ACÁ Y NO EN LA CURVA. Las Tablas C 5.9-3 y C 5.9-4
        // escriben su último tramo hasta A = 100 m² y no dicen nada más arriba; la curva
        // congela el valor de 100, que es lo conservador, pero el proyectista tiene que
        // saber que ese número ya no está en el papel.
        if (fig.hMayor && A > LIMITE_A) {
          avisos.push({ nivel: "info", ref: fig.tabla,
            texto: `A = ${f2(A)} m² supera los ${LIMITE_A} m² hasta donde la Tabla `
              + `${fig.tabla} escribe sus valores negativos. Se congela el valor de `
              + `A = ${LIMITE_A} m², que es el conservador: ese tramo crece con el área.` });
        }
        caras[cara] = { pos, neg: gcpDeCurva(curva, A).valor };
      }
      return { caras, bandas: [] };
    }

    const { banda, avisos: av } = bandaDe(fig, r);
    avisos.push(...av);
    if (fig.hMayor && A > LIMITE_A && banda.neg.at(-1)[0] === LIMITE_A) {
      avisos.push({ nivel: "info", ref: fig.tabla,
        texto: `A = ${f2(A)} m² supera los ${LIMITE_A} m² hasta donde la Tabla ${fig.tabla} `
          + `escribe la banda ${banda.rango}. Se congela el valor de A = ${LIMITE_A} m², `
          + "que es el conservador: ese tramo crece con el área." });
    }
    return { neto: { pos, neg: gcpDeCurva(banda.neg, A).valor },
      bandas: [{ figura: nombre, rango: banda.rango, id: banda.id }] };
  };

  const lecturas = nombres.map(n => ({ figura: n, ...leer(n) }));

  if (interpola) {
    avisos.push({ nivel: "info",
      ref: `art. 5.9, excepción ${destino === DESTINO.SUPERFICIES ? 1 : 2}`,
      texto: `Con h = ${f2(ctx.h)} m entre ${H_CORTE} y ${H_EXCEPCION} m, el coeficiente se `
        + `interpola linealmente entre la Fig. ${nombres[0]} (valor en h = ${H_CORTE} m) y `
        + `la Fig. ${nombres[1]} (valor en h = ${H_EXCEPCION} m). Es la alternativa que `
        + "permite la excepción; sin ella regiría la figura de h > 20 m sola, que da valores "
        + "mayores." });
  }

  const mezclar = (sel) => (interpola
    ? { pos: interpolarEnH(ctx.h, sel(lecturas[0]).pos, sel(lecturas[1]).pos),
        neg: interpolarEnH(ctx.h, sel(lecturas[0]).neg, sel(lecturas[1]).neg) }
    : sel(lecturas[0]));

  const base = {
    relacion: r, interpolada: interpola, avisos,
    figuras: nombres, lecturas,
    bandas: lecturas.flatMap(l => l.bandas),
  };

  if (destino === DESTINO.SUPERFICIES) {
    return {
      ...base,
      superior: mezclar(l => l.caras[CARA.SUPERIOR]),
      inferior: mezclar(l => l.caras[CARA.INFERIOR]),
    };
  }
  return { ...base, ...mezclar(l => l.neto) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LA PRESIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `p = q_h (GC_p)`, con el mínimo del art. 5.2.2 por sentido.
 *
 * ⚠ ACÁ NO HAY (GC_pi), Y NO ES UNA SIMPLIFICACIÓN. La expresión (5.9-1) es `p = q_h (GC_p)`
 * y su lista de símbolos tiene tres entradas. Un alero adosado no encierra un recinto: no
 * hay presión interna que sumar. La 5.3-1 —la de la envolvente— sí la lleva, y copiar de
 * ahí es el error fácil.
 *
 * El mínimo de 0,80 kN/m² del art. 5.2.2 SÍ aplica: está en «REQUISITOS GENERALES» del
 * capítulo, antes de las partes, y habla de «componentes y revestimientos de edificios y
 * otras estructuras», sin restringirlo a una parte.
 *
 * @param {number} qh
 * @param {{pos: number, neg: number}} gcp
 */
export function presionAlero(qh, gcp) {
  const pPos = qh * gcp.pos;
  const pNeg = qh * gcp.neg;
  const minPos = Math.abs(pPos) < P_MINIMA;
  const minNeg = Math.abs(pNeg) < P_MINIMA;
  return {
    gcpPos: gcp.pos, gcpNeg: gcp.neg,
    pPos: minPos ? P_MINIMA : pPos,
    pNeg: minNeg ? -P_MINIMA : pNeg,
    pPosCalculada: pPos, pNegCalculada: pNeg,
    gobiernaMinimo: { pos: minPos, neg: minNeg },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UN ELEMENTO DEL ALERO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica un elemento del alero en los destinos que le corresponden.
 *
 * @param {Contexto} ctx
 * @param {{tipo: string, L?: number, s?: number, area?: number, nombre?: string}} elemento
 */
export function verificarElementoAlero(ctx, elemento) {
  const area = areaEfectiva(elemento);
  // Con una sola superficie física sólo se aplica la figura B: no hay dos caras que fijar
  // por separado. C 5.9: «Si el alero consta de una única superficie, solo se aplica la
  // Figura 5.9-1B».
  const destinos = ctx.dosSuperficies === false
    ? [DESTINO.ESTRUCTURA]
    : [DESTINO.SUPERFICIES, DESTINO.ESTRUCTURA];

  const resultados = destinos.map((destino) => {
    const g = gcpAlero(ctx, { destino, A: area.A });
    if (destino === DESTINO.SUPERFICIES) {
      return {
        destino, figuras: g.figuras, interpolada: g.interpolada, bandas: g.bandas,
        caras: {
          [CARA.SUPERIOR]: { cara: CARA.SUPERIOR, ...presionAlero(ctx.qh, g.superior) },
          [CARA.INFERIOR]: { cara: CARA.INFERIOR, ...presionAlero(ctx.qh, g.inferior) },
        },
        avisos: g.avisos,
      };
    }
    return {
      destino, figuras: g.figuras, interpolada: g.interpolada, bandas: g.bandas,
      neto: presionAlero(ctx.qh, g), avisos: g.avisos,
    };
  });

  return {
    elemento, area, destinos: resultados,
    unaSuperficie: ctx.dosSuperficies === false,
    avisos: [
      ...area.avisos,
      ...avisoSPRFV(area.tributaria),
      ...resultados.flatMap(r => r.avisos),
      ...(ctx.dosSuperficies === false
        ? [{ nivel: "info", ref: "C 5.9",
            texto: "Alero de una sola superficie: se aplica sólo la figura de presión neta "
              + "(5.9-1B o 5.9-2B). No hay dos caras físicas cuyas fijaciones verificar por "
              + "separado." }]
        : []),
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EL ALERO ENTERO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Análisis completo de un alero adosado.
 *
 * ── POR QUÉ h_e ES UN DATO Y NO SE DERIVA DE LA GEOMETRÍA ─────────────────────
 * Las cuatro figuras definen `h_e` como «altura media del alero de la cubierta». En un dos
 * aguas simétrico eso es `h_alero`, y el motor lo propone; pero en una cubierta con aleros a
 * distinta altura —una vertiente única, un edificio escalonado, una pared que no llega al
 * alero— el proyectista es el que sabe cuál es el alero que gobierna sobre ESA pared. Se
 * ofrece el derivado como defecto y se deja editar.
 *
 * @param {object} e
 * @param {{pared: string, ancho: number, vuelo: number, hc: number, he: number,
 *          pendiente: number, dosSuperficies: boolean, interpolarH: boolean}} e.alero
 * @param {{h: number, hAlero: number}} e.geo   geometría normalizada del edificio
 * @param {number} e.V
 * @param {string} e.exposicion
 * @param {number} e.altitud
 * @param {number} e.kd
 * @param {(z: number) => number[]} [e.kztDe]
 * @param {{tipo: string, L?: number, s?: number, area?: number, nombre?: string}[]} [e.elementos]
 */
export function analizarAleroAdosado({ alero, geo, V, exposicion, altitud = 0, kd,
  kztDe = () => [1], elementos = [] }) {
  const avisos = [];
  const h = Number(geo.h);
  const hc = Number(alero.hc) || 0;
  // El defecto de h_e es la altura del alero de la cubierta, que es lo que dice la notación.
  const he = Number(alero.he) > 0 ? Number(alero.he) : Number(geo.hAlero);
  const pendiente = Number(alero.pendiente) || 0;

  // ── q_h A LA ALTURA MEDIA DE CUBIERTA DEL EDIFICIO ───────────────────────────
  // K_zt entra como el MÁXIMO sobre las direcciones, por el mismo motivo que en el resto
  // del capítulo 5: los (GC_p) ya son la envolvente de todas las direcciones, así que
  // tomar el K_zt de una sola dejaría afuera la que agrava.
  const Kzt = Math.max(...kztDe(h));
  const qh = q({ z: h, V, exposicion, kd, Kzt, altitud });

  if (pendiente > PENDIENTE_MAXIMA) {
    avisos.push({ nivel: "error", ref: LIMITE_PENDIENTE.ref,
      texto: `La pendiente del alero es ${f2(pendiente * 100)} % y el art. 5.9 se aplica a `
        + `aleros planos con pendiente ≤ ${PENDIENTE_MAXIMA * 100} %. ${LIMITE_PENDIENTE.texto} `
        + "Fuera de ese límite el artículo no tiene ensayos detrás: los coeficientes que "
        + "siguen quedan fuera del alcance declarado." });
  }
  if (!(hc > 0)) {
    avisos.push({ nivel: "aviso", ref: "art. 5.9",
      texto: "Falta la altura media del alero adosado, h_c. Sin ella la relación h_c/h_e "
        + "no se puede formar y las figuras netas no tienen banda." });
  }
  if (!(he > 0)) {
    avisos.push({ nivel: "aviso", ref: "art. 5.9",
      texto: "Falta la altura media del alero de la cubierta, h_e." });
  }
  if (hc > 0 && he > 0 && hc > he) {
    avisos.push({ nivel: "aviso", ref: "art. 5.9",
      texto: `h_c = ${f2(hc)} m es mayor que h_e = ${f2(he)} m: el alero adosado quedaría `
        + "por encima del alero de la cubierta. Las figuras no contemplan ese caso." });
  }
  // ⚠ LA ALTURA QUE ELIGE LA FIGURA ES LA DEL EDIFICIO, Y CONVIENE DECIRLO. Un alero a 3 m
  // colgado de un edificio de 25 se verifica con las figuras de h > 20 m y con q_h de los
  // 25 m: es contraintuitivo y es lo que el artículo escribe.
  avisos.push({ nivel: "info", ref: "art. 5.9",
    texto: `q_h y la figura se toman con la altura media de cubierta del EDIFICIO, `
      + `h = ${f2(h)} m (${h > H_CORTE ? "> " : "≤ "}${H_CORTE} m), no con la altura del `
      + `alero, h_c = ${f2(hc)} m.` });

  if (alero.interpolarH && !(h > H_CORTE && h <= H_EXCEPCION)) {
    avisos.push({ nivel: "info", ref: "art. 5.9, excepciones 1 y 2",
      texto: `La interpolación en altura está pedida pero no se aplica: sólo vale con `
        + `${H_CORTE} m < h ≤ ${H_EXCEPCION} m y acá h = ${f2(h)} m.` });
  }

  const ctx = {
    qh: qh ?? 0, h, hc, he,
    dosSuperficies: alero.dosSuperficies !== false,
    interpolarH: alero.interpolarH === true,
  };

  // Las dos superficies del alero, en planta: es el área que se carga, no la efectiva de
  // viento de un elemento.
  const areaAlero = (Number(alero.ancho) || 0) * (Number(alero.vuelo) || 0);

  const verificados = elementos.map(el => verificarElementoAlero(ctx, el));

  return {
    ctx, qh, Kzt, h, hc, he, relacion: he > 0 ? hc / he : null,
    pendiente, areaAlero,
    pared: alero.pared, ancho: Number(alero.ancho) || 0, vuelo: Number(alero.vuelo) || 0,
    dosSuperficies: ctx.dosSuperficies,
    figuras: {
      [DESTINO.SUPERFICIES]: ctx.dosSuperficies ? figuraAlero(h, DESTINO.SUPERFICIES) : null,
      [DESTINO.ESTRUCTURA]: figuraAlero(h, DESTINO.ESTRUCTURA),
    },
    elementos: verificados,
    avisos: [...avisos, ...verificados.flatMap(v => v.avisos)],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAS CURVAS QUE EL CÁLCULO ESTÁ USANDO
// ═══════════════════════════════════════════════════════════════════════════════
//
// Mismo criterio que `cyrPresiones.js → curvasUsadas`: el gráfico dibuja LA CURVA QUE SE
// USÓ y no la de la figura, porque con la interpolación de las excepciones la curva que
// gobierna no está impresa en ninguna de las dos figuras. `original` trae las dos de las
// que salió, para dibujarlas en trazos.

/**
 * @param {Contexto} ctx
 * @param {string} destino
 * @returns {{etiqueta: string, signo: "pos"|"neg", puntos: [number,number][],
 *            original?: [number,number][][], nota?: string}[]}
 */
export function curvasAleroUsadas(ctx, destino) {
  const interpola = ctx.interpolarH === true && ctx.h > H_CORTE && ctx.h <= H_EXCEPCION;
  const nombres = interpola
    ? [figuraAlero(0, destino), figuraAlero(H_EXCEPCION + 1, destino)]
    : [figuraAlero(ctx.h, destino)];
  const r = ctx.he > 0 ? ctx.hc / ctx.he : 0;

  /**
   * Las curvas crudas de una figura, por etiqueta y signo.
   * @returns {{etiqueta: string, signo: "pos"|"neg", puntos: [number,number][]}[]}
   */
  const deFigura = (nombre) => {
    const fig = FIGURAS_ALERO[nombre];
    if (destino === DESTINO.SUPERFICIES) {
      return [
        { etiqueta: "superior", signo: /** @type {"neg"} */ ("neg"), puntos: fig.negPorCara[CARA.SUPERIOR] },
        { etiqueta: "inferior", signo: /** @type {"neg"} */ ("neg"), puntos: fig.negPorCara[CARA.INFERIOR] },
        { etiqueta: "ambas caras", signo: /** @type {"pos"} */ ("pos"), puntos: fig.pos },
      ];
    }
    const { banda } = bandaDe(fig, r);
    return [
      { etiqueta: banda.rango, signo: /** @type {"neg"} */ ("neg"), puntos: banda.neg },
      { etiqueta: "todo h_c/h_e", signo: /** @type {"pos"} */ ("pos"), puntos: fig.pos },
    ];
  };

  if (!interpola) return deFigura(nombres[0]);

  // ⚠ LA POLIGONAL INTERPOLADA SE ARMA SOBRE LA UNIÓN DE LAS DOS ABSCISAS. Las curvas de
  // h ≤ 20 m quiebran en 1 y 10 y las de h > 20 m en 1, 10 y 100: interpolando punto a
  // punto por índice se casaría el quiebre de 10 de una con el de 100 de la otra y la
  // curva resultante sería otra cosa. Se evalúan las dos en cada abscisa de la unión.
  const a = deFigura(nombres[0]), b = deFigura(nombres[1]);
  return a.map((ca, i) => {
    const cb = b[i];
    const xs = [...new Set([...ca.puntos, ...cb.puntos].map(([A]) => A))].sort((p, q2) => p - q2);
    return {
      etiqueta: ca.etiqueta === cb.etiqueta ? ca.etiqueta : `${ca.etiqueta} / ${cb.etiqueta}`,
      signo: ca.signo,
      puntos: /** @type {[number,number][]} */ (xs.map(A => [A,
        interpolarEnH(ctx.h, gcpDeCurva(ca.puntos, A).valor, gcpDeCurva(cb.puntos, A).valor)])),
      original: [ca.puntos, cb.puntos],
      nota: `interpolada entre la Fig. ${nombres[0]} (h = ${H_CORTE} m) y la `
        + `Fig. ${nombres[1]} (h = ${H_EXCEPCION} m) para h = ${f2(ctx.h)} m`,
    };
  });
}
