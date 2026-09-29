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
import {
  FORMA, figuraCubierta, figuraPared, reduccionPared, gcpDeFuente, zonasDe, alturaDe,
} from "./cyrFiguras.js";
import { areaEfectiva, avisoSPRFV } from "./cyrElementos.js";
import {
  LAYOUT, LAYOUT_DE_FIGURA, dimensionA, zonasPresentes, cotasDeZona,
} from "./cyrZonas.js";
import { q } from "./presionDinamica.js";

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
  // ⚠ EL DESEMPATE MIRA LA PRESIÓN CALCULADA. Cuando el mínimo del art. 5.2.2 gobierna
  // varias zonas, todas quedan en 800 N/m² y cualquiera «gobierna» por igual; informar la
  // primera haría decir que manda la zona interior cuando la que empuja el diseño es la de
  // esquina. Con el desempate, la zona informada es la que de verdad está más exigida.
  const peor = (clave, calc, cmp) => zonas.reduce((a, b) =>
    (cmp(b[clave], a[clave]) || (b[clave] === a[clave] && cmp(b[calc], a[calc])) ? b : a));
  const gobierna = {
    pos: peor("pPos", "pPosCalculada", (x, y) => x > y).zona,
    neg: peor("pNeg", "pNegCalculada", (x, y) => x < y).zona,
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

// ═══════════════════════════════════════════════════════════════════════════════
// EL EDIFICIO ENTERO — arma el contexto y verifica la lista de elementos
// ═══════════════════════════════════════════════════════════════════════════════

/** Límite de la Parte 1 (art. 5.3): h ≤ 20 m, o edificio de baja altura (art. 1.2). */
export const H_PARTE_1 = 20;

/**
 * Análisis de componentes y revestimientos de un edificio.
 *
 * ── POR QUÉ NO HAY DIRECCIÓN ───────────────────────────────────────────────────
 * El SPRFV del capítulo 2 reparte presiones por dirección de viento; C&R no. Los (GC_p) de
 * las figuras del capítulo 5 YA son la envolvente de todas las direcciones —por eso el
 * mismo elemento tiene un valor positivo y uno negativo, y hay que diseñarlo para los
 * dos—. De ahí que la exposición sea «la que dé las mayores cargas para cualquier
 * dirección» (art. 1.7.4.4) y que `K_zt` entre como el MÁXIMO sobre las direcciones: tomar
 * el de una sola dejaría afuera la que agrava.
 *
 * @param {object} e
 * @param {{a:number,b:number,h:number,hAlero:number,theta:number,tipo:string,cumbrera:string,
 *           pendienteHacia?:string}} e.geo
 *                                 geometría normalizada (`normalizarGeo`). `pendienteHacia`
 *                                 —«+X», «−X», «+Y», «−Y»— lo usan sólo las figuras de
 *                                 vertiente única, para saber cuál de los dos aleros es el
 *                                 alto.
 * @param {number} e.V                 velocidad básica, en m/s
 * @param {string} e.exposicion        B, C o D
 * @param {number} e.altitud           en m
 * @param {number} e.kd                de la fila «edificio_cyr» de la Tabla 1.6-1
 * @param {(z: number) => number[]} [e.kztDe]  K_zt a una altura, una entrada por
 *                                 dirección. Se evalúa a la altura que pide la figura, que
 *                                 recién se conoce acá adentro: por eso entra como función
 *                                 y no como número ya calculado.
 * @param {number} e.gcpi              magnitud de (GC_pi), con el R_i ya aplicado
 * @param {boolean} [e.parapeto]
 * @param {{tipo: string, superficie: "pared"|"cubierta", L?: number, s?: number,
 *           area?: number, ubicacion?: string, nombre?: string}[]} [e.elementos]
 */
export function analizarCyR({ geo, V, exposicion, altitud = 0, kd, kztDe = () => [1],
  gcpi, parapeto = false, elementos = [] }) {
  const avisos = [];
  const forma = FORMA_DE_TIPO[geo.tipo] ?? FORMA.OTRA;
  const fuente = figuraCubierta({ forma, theta: geo.theta });
  const figura = fuente.tipo === "interpolacion" ? fuente.desde : fuente.figura;

  // ── QUÉ ALTURA, Y POR LO TANTO CUÁL q_h ──────────────────────────────────────
  // La figura decide si es la altura media o la del alero, y esa misma altura es la que
  // entra en `q_h`, en la dimensión `a` y —en la Fig. 5.3-2A— en las propias zonas.
  const alt = figura ? alturaDe(figura, geo.theta) : { cual: "media", porque: "sin figura aplicable" };
  const hFigura = alt.cual === "alero" ? geo.hAlero : geo.h;

  if (geo.h > H_PARTE_1) {
    avisos.push({ nivel: "error", ref: "art. 5.3",
      texto: `La altura media de cubierta es ${geo.h.toFixed(2)} m y la Parte 1 del `
        + `capítulo 5 cubre h ≤ ${H_PARTE_1} m. Para edificios más altos corresponde la `
        + "Fig. 5.4-1, que todavía no está implementada." });
  }

  const menor = Math.min(geo.a, geo.b);
  const dimA = dimensionA({ menor, h: hFigura, theta: geo.theta });
  const Kzt = Math.max(...kztDe(hFigura));
  const qh = q({ z: hFigura, V, exposicion, kd, Kzt, altitud });

  const geoZonas = {
    layout: figura ? LAYOUT_DE_FIGURA[figura] : null,
    bx: geo.a, by: geo.b, h: hFigura, a: dimA.a,
    ejeCumbrera: /** @type {"X"|"Y"} */ (geo.cumbrera === "Y" ? "Y" : "X"),
    // En vertiente única los dos aleros NO son intercambiables: el ALTO lleva las zonas
    // más succionadas. `pendienteHacia` dice hacia dónde DESCIENDE la cubierta, y es el
    // mismo dato que el capítulo 2 ya usa para orientar el faldón.
    pendienteHacia: geo.pendienteHacia,
  };

  const ctx = { qh: qh ?? 0, gcpi, fuente, theta: geo.theta, parapeto };
  if (parapeto && !FIGURAS_CON_NOTA_PARAPETO.includes(figura)) {
    // Declarar un parapeto y que no cambie nada es justo el silencio que hay que evitar.
    avisos.push({ nivel: "info", ref: "Fig. 5.3-2A, nota 5",
      texto: "El parapeto declarado no modifica los (GC_p): la nota que iguala la zona 3 a "
        + `la 2 está en la Fig. 5.3-2A y acá corresponde la Fig. ${figura ?? "—"}.` });
  }

  return {
    fuente, figura, avisos: [...avisos, ...fuente.avisos],
    altura: { ...alt, valor: hFigura, media: geo.h, alero: geo.hAlero },
    a: dimA, Kzt, qh,
    geoZonas,
    zonasCubierta: geoZonas.layout ? zonasPresentes(geoZonas) : [],
    zonasPared: zonasPresentes({ ...geoZonas, layout: LAYOUT.PARED }),
    // Los anchos acotables, para el croquis, la memoria y la exportación. Salen de una
    // sola función para que las tres salidas no puedan discrepar entre sí.
    cotas: [
      ...(geoZonas.layout ? cotasDeZona(geoZonas) : []),
      ...cotasDeZona({ ...geoZonas, layout: LAYOUT.PARED })
        .map(k => ({ ...k, que: `pared — ${k.que}` })),
    ],
    elementos: elementos.map(el => verificarElemento(ctx, el)),
    ctx,
  };
}

/** Los tipos de cubierta del modelo de la app, a las formas del capítulo 5. */
export const FORMA_DE_TIPO = {
  plana: FORMA.PLANA,
  dos_aguas: FORMA.DOS_AGUAS,
  cuatro_aguas: FORMA.CUATRO_AGUAS,
  vertiente_unica: FORMA.VERTIENTE_UNICA,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAS CURVAS QUE EL CÁLCULO ESTÁ USANDO
// ═══════════════════════════════════════════════════════════════════════════════
//
// ── POR QUÉ ESTO VIVE EN EL MOTOR Y NO EN EL GRÁFICO ───────────────────────────
// El gráfico de la pantalla tiene que dibujar LA CURVA QUE SE USÓ, no la de la figura: con
// θ ≤ 10° las de pared van reducidas un 10 % y con parapeto la zona 3 toma la curva de la
// zona 2. Un gráfico que se arme por su cuenta a partir de `cyrCurvas.js` dibujaría la
// curva del reglamento y el número de la tabla saldría de otra, que es exactamente el tipo
// de discrepancia que nadie mira hasta que alguien la cruza a mano.
//
// Devuelve las dos: `puntos` es la que se usa y `original` la de la figura, cuando una
// nota las separó. El gráfico dibuja la usada con trazo lleno y la original en trazos.

const escalar = (curva, k) => curva.map(([A, g]) => [A, g * k]);

/**
 * Las curvas de una superficie, tal como entran al cálculo.
 *
 * @param {Contexto} ctx
 * @param {"cubierta"|"pared"} superficie
 * @returns {{zona: string, signo: "pos"|"neg", puntos: [number,number][],
 *            original?: [number,number][], nota?: string, ref?: string}[]}
 */
export function curvasUsadas(ctx, superficie) {
  const fuente = superficie === "pared" ? figuraPared() : ctx.fuente;
  if (fuente.tipo === "noImplementada") return [];
  const figura = fuente.tipo === "interpolacion" ? fuente.desde : fuente.figura;
  const ubic = superficie === "pared" ? UBICACION.PARED : UBICACION.CUBIERTA;
  const zonas = FIGURAS[figura].zonas;
  const crudo = (fig, z, s) => FIGURAS[fig].curvas[
    fig === "5.3-1" ? UBICACION.PARED : ubic][z][s];

  const salida = [];
  for (const zona of zonas) {
    for (const signo of ["pos", "neg"]) {
      const base = crudo(figura, zona, signo);

      if (superficie === "pared") {
        const red = reduccionPared(ctx.theta);
        salida.push(red.aplica
          ? { zona, signo, puntos: escalar(base, red.factor), original: base,
              nota: "reducidos un 10 % por θ ≤ 10°", ref: red.ref }
          : { zona, signo, puntos: base });
        continue;
      }

      // Cubierta con parapeto: la nota 5 de la Fig. 5.3-2A sustituye dos curvas.
      const conNota = ctx.parapeto && FIGURAS_CON_NOTA_PARAPETO.includes(figura);
      if (conNota && signo === "neg" && zona === "3") {
        salida.push({ zona, signo, puntos: crudo(figura, "2", "neg"), original: base,
          nota: "igualada a la zona 2 por el parapeto", ref: "Fig. 5.3-2A, nota 5" });
      } else if (conNota && signo === "pos" && (zona === "2" || zona === "3")) {
        salida.push({ zona, signo, puntos: crudo("5.3-1", zona === "2" ? "4" : "5", "pos"),
          original: base,
          nota: `igualada a la zona de pared ${zona === "2" ? "4" : "5"} por el parapeto`,
          ref: "Fig. 5.3-2A, nota 5" });
      } else {
        salida.push({ zona, signo, puntos: base });
      }
    }
  }
  return salida;
}
