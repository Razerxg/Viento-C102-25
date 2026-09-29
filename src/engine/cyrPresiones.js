// CAPÍTULO 5 — PRESIONES SOBRE COMPONENTES Y REVESTIMIENTOS.
//
//     p = q_h · [(GC_p) − (GC_pi)]        expresión (5.3-1)
//
// ── POR QUÉ ESTE ARCHIVO Y NO `cyr.js` ─────────────────────────────────────────
// El capítulo se arma en tres capas y el orden importa para que no haya ciclos de
// importación: `cyr.js` evalúa una curva, `cyrFiguras.js` elige la figura y lee el (GC_p),
// y acá se arma la presión y se verifica el elemento. Cada capa usa sólo la de abajo.
//
// ── q_h RIGE TAMBIÉN EN LAS PAREDES ────────────────────────────────────────────
// Es la diferencia con el capítulo 2, y la que más fácil se pasa por alto: en el SPRFV la
// pared a barlovento se evalúa con q_z variable en altura, y acá NO. La Parte 1 del
// capítulo 5 usa q_h —la presión dinámica a la altura de la figura— en toda la envolvente.
// Usar q_z daría presiones menores abajo, que es el lado inseguro.
//
// ── LOS DOS SIGNOS DE (GC_pi), SIEMPRE ─────────────────────────────────────────
// Nota 3 de la Tabla 1.11-1. No se elige el signo: se combinan los dos en el sentido
// desfavorable, que es sumar la magnitud de (GC_pi) al (GC_p) positivo y restarla del
// negativo. Elegir «el peor de los dos» sobre la presión ya calculada da lo mismo acá y
// deja de darlo en cuanto aparece el mínimo del art. 5.2.2, que es por elemento y por
// sentido.
import { FIGURAS, UBICACION } from "../constants/cyrCurvas.js";
import { figuraPared, reduccionPared, gcpDeFuente, zonasDe } from "./cyrFiguras.js";
import { areaEfectiva, avisoSPRFV } from "./cyrElementos.js";

/** Art. 5.2.2 — presión neta mínima de diseño, en N/m². */
export const P_MINIMA = 800;

/** Nota 5 de la Fig. 5.3-2A — altura de parapeto que dispara la sustitución, en m. */
export const PARAPETO_MINIMO = 1;

/**
 * Las figuras que traen la nota de parapeto. Se leyó nota por nota: entre las figuras
 * implementadas, la trae SÓLO la 5.3-2A. La Fig. 5.4-1 tiene una equivalente —su nota 7,
 * «la Zona 3 se tratará como Zona 2»— pero es de edificios con h > 20 m, que es otra etapa.
 * Aplicarla a las Figs. 5.3-2B a 2G porque «es lo mismo» sería inventar una nota.
 */
export const FIGURAS_CON_NOTA_PARAPETO = ["5.3-2A"];

/**
 * @typedef {object} Contexto
 * @property {number} qh          presión dinámica a la altura de la figura, en N/m²
 * @property {number} gcpi        MAGNITUD de (GC_pi); los dos signos se usan siempre
 * @property {import('./cyrFiguras.js').Fuente} fuente  la figura de cubierta, de `figuraCubierta`
 * @property {number} theta       pendiente de la cubierta, en grados
 * @property {boolean} [parapeto] parapeto de 1 m o más en todo el perímetro
 */

// ═══════════════════════════════════════════════════════════════════════════════
// (GC_p) DE UNA ZONA, CON LAS DOS NOTAS QUE LO MODIFICAN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * (GC_p) positivo y negativo de una zona, ya con la nota 5 de la Fig. 5.3-1 —reducción del
 * 10 % en paredes— o la nota 5 de la Fig. 5.3-2A —parapeto— aplicadas según corresponda.
 *
 * @param {Contexto} ctx
 * @param {{superficie: "pared"|"cubierta", zona: string, A: number, ubicacion?: string}} p
 */
export function gcpDeZona(ctx, { superficie, zona, A, ubicacion }) {
  const notas = [];

  if (superficie === "pared") {
    const red = reduccionPared(ctx.theta);
    const leer = (signo) => gcpDeFuente(figuraPared(),
      { zona, signo, A, ubicacion: UBICACION.PARED }).valor * red.factor;
    if (red.aplica) {
      notas.push({
        nivel: "info", ref: red.ref,
        texto: `Con θ = ${ctx.theta}° ≤ 10°, los (GC_p) de pared se reducen un 10 %.`,
      });
    }
    return { pos: leer("pos"), neg: leer("neg"), notas, reduccionPared: red.factor };
  }

  const ubic = ubicacion ?? UBICACION.CUBIERTA;
  const crudo = (z, signo) => gcpDeFuente(ctx.fuente, { zona: z, signo, A, ubicacion: ubic }).valor;
  let pos = crudo(zona, "pos"), neg = crudo(zona, "neg");

  const figura = ctx.fuente.tipo === "interpolacion" ? ctx.fuente.desde : ctx.fuente.figura;
  if (ctx.parapeto && FIGURAS_CON_NOTA_PARAPETO.includes(figura)) {
    // «Los valores negativos de (GC_p) en la Zona 3 deben igualar a los de la Zona 2, y los
    // valores positivos en las Zonas 2 y 3 se deben igualar a los de las Zonas de pared 4
    // y 5, respectivamente, en la Figura 5.3-1.»
    if (zona === "3") {
      neg = crudo("2", "neg");
      notas.push({ nivel: "info", ref: "Fig. 5.3-2A, nota 5",
        texto: "Con parapeto de 1 m o más en todo el perímetro, el (GC_p) negativo de la "
          + "zona 3 se iguala al de la zona 2." });
    }
    if (zona === "2" || zona === "3") {
      const zonaPared = zona === "2" ? "4" : "5";
      // El valor se toma de la Fig. 5.3-1 TAL CUAL, sin la reducción del 10 % de su nota 5:
      // esa nota habla de «los valores de (GC_p) para paredes», y acá el elemento es de
      // cubierta. Es además la lectura conservadora de las dos —la reducción bajaría el
      // coeficiente— y como la nota de parapeto sólo vive en la 5.3-2A, que es θ ≤ 7°, la
      // otra lectura se aplicaría siempre y la diferencia no sería marginal.
      pos = gcpDeFuente(figuraPared(),
        { zona: zonaPared, signo: "pos", A, ubicacion: UBICACION.PARED }).valor;
      notas.push({ nivel: "info", ref: "Fig. 5.3-2A, nota 5",
        texto: `Con parapeto, el (GC_p) positivo de la zona ${zona} se iguala al de la zona `
          + `de pared ${zonaPared} de la Fig. 5.3-1, sin la reducción del 10 % de su nota 5, `
          + "que es para elementos de pared." });
    }
  }

  return { pos, neg, notas, reduccionPared: 1 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LA PRESIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Presión de diseño de una zona, en los dos sentidos, con el mínimo del art. 5.2.2.
 *
 * Convención: `p` POSITIVA empuja HACIA la superficie. Es la del reglamento —nota 3 de las
 * figuras: «los signos más y menos significan presiones que actúan acercándose o
 * alejándose de las superficies»— y la que ya usa el resto de la app.
 *
 * @param {Contexto} ctx
 * @param {{pos: number, neg: number}} gcp
 */
export function presionDeZona(ctx, gcp) {
  const { qh, gcpi } = ctx;
  const g = Math.abs(gcpi);

  // El sentido desfavorable de cada signo: el (GC_pi) que suma. Con (GC_p) positivo, la
  // presión interna que agrava es la de succión interna, y al revés.
  const pPos = qh * (gcp.pos + g);
  const pNeg = qh * (gcp.neg - g);

  // ART. 5.2.2 — «no debe ser menor que una presión neta de 0,80 kN/m² actuando EN
  // CUALQUIER DIRECCIÓN NORMAL A LA SUPERFICIE». Los dos sentidos tienen su propio piso,
  // por separado: un elemento con succión de 1.200 N/m² y presión hacia adentro de
  // 300 N/m² no queda exento del mínimo en el sentido positivo porque el otro lo supere.
  //
  // No es el 0,75 kN/m² del art. 2.1.5, que es del SPRFV y se aplica sobre el área
  // proyectada del edificio entero.
  const minPos = Math.abs(pPos) < P_MINIMA;
  const minNeg = Math.abs(pNeg) < P_MINIMA;

  return {
    gcpPos: gcp.pos, gcpNeg: gcp.neg,
    pPos: minPos ? P_MINIMA : pPos,
    pNeg: minNeg ? -P_MINIMA : pNeg,
    pPosCalculada: pPos, pNegCalculada: pNeg,
    gobiernaMinimo: { pos: minPos, neg: minNeg },
    gcpiUsado: { pos: -g, neg: +g },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UN ELEMENTO, EN TODAS LAS ZONAS DE SU FIGURA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica un elemento. Devuelve SIEMPRE todas las zonas de la figura aplicable: la zona
 * que elige el usuario filtra la vista, no el cálculo. Un elemento que se repite en toda
 * la cubierta —una correa tipo, una chapa— se verifica con la zona más desfavorable, y
 * saber cuál es exige haberlas calculado todas.
 *
 * @param {Contexto} ctx
 * @param {{tipo: string, superficie: "pared"|"cubierta", L?: number, s?: number,
 *          area?: number, ubicacion?: string, nombre?: string}} elemento
 */
export function verificarElemento(ctx, elemento) {
  const area = areaEfectiva(elemento);
  const superficie = elemento.superficie ?? "cubierta";
  const fuente = superficie === "pared" ? figuraPared() : ctx.fuente;

  if (fuente.tipo === "noImplementada") {
    // Sin figura no hay números, y el elemento se informa igual: desaparecer de la tabla
    // sería peor que aparecer sin resultado.
    return {
      elemento, area, superficie, zonas: [], gobierna: null,
      avisos: [...area.avisos, ...avisoSPRFV(area.tributaria), ...fuente.avisos],
      sinFigura: true,
    };
  }

  const etiquetas = superficie === "pared" ? FIGURAS["5.3-1"].zonas : zonasDe(fuente);
  const zonas = etiquetas.map((zona) => {
    const g = gcpDeZona(ctx, { superficie, zona, A: area.A, ubicacion: elemento.ubicacion });
    return { zona, ...presionDeZona(ctx, g), notas: g.notas };
  });

  // La zona gobernante se decide POR SENTIDO. La de mayor succión no tiene por qué ser la
  // de mayor presión positiva: en la Fig. 5.3-2A el positivo es el mismo en todas las
  // zonas, y ahí gobierna la primera con el mínimo del art. 5.2.2 ya aplicado.
  const peor = (clave, cmp) => zonas.reduce((a, b) => (cmp(b[clave], a[clave]) ? b : a));
  const gobierna = {
    pos: peor("pPos", (x, y) => x > y).zona,
    neg: peor("pNeg", (x, y) => x < y).zona,
  };

  return {
    elemento, area, superficie, fuente, zonas, gobierna,
    avisos: [
      ...area.avisos,
      ...avisoSPRFV(area.tributaria),
      ...fuente.avisos,
      ...zonas.flatMap(z => z.notas),
    ],
    minimoGobiernaAlgo: zonas.some(z => z.gobiernaMinimo.pos || z.gobiernaMinimo.neg),
    sinFigura: false,
  };
}
