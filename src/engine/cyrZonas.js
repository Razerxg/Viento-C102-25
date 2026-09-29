// CAPÍTULO 5 — ZONAS DE COMPONENTES Y REVESTIMIENTOS.
//
// ── UN CLASIFICADOR POR PUNTO, NO UNA TABLA DE ESCENARIOS ──────────────────────
// La Figura C 5-1 dibuja cuatro escenarios de zonas de cubierta para la Fig. 5.3-2A, y el
// comentario C 5.1 menciona un quinto. Codificarlos como cinco casos sería copiar el
// SÍNTOMA: los cinco son consecuencia de una sola regla —a qué distancia del borde está
// cada punto, medida en h— aplicada a plantas de distinto tamaño. Codificados como casos,
// cada geometría que no encaje exacto en uno de los cinco hay que decidirla a mano, y una
// planta de 1,19·h contra otra de 1,21·h caen en ramas distintas escritas por separado.
//
// Acá hay una sola función: `zonaEn(x, y, geo)` devuelve la zona de un punto de la planta.
// Los escenarios de la Fig. C 5-1 APARECEN SOLOS, y hay un test que lo exige para los
// cinco. El croquis dibuja lo que devuelve esta función y el motor la usa para saber qué
// zonas existen; el dibujo no calcula nada.
//
// ── LAS CUATRO ZONIFICACIONES DEL CAPÍTULO ─────────────────────────────────────
// Se leyeron de los diagramas de cada figura, uno por uno. NO son la misma con otro
// nombre, y la diferencia entre la 2C y la 2D es justo la que se deduciría mal:
//
//   · `planaH`  — Fig. 5.3-2A (plana y dos aguas θ ≤ 7°). LA ÚNICA QUE ZONIFICA POR h.
//                 Franja de 0,6h desde el borde, L de esquina de 0,6h × 0,2h, anillo
//                 intermedio hasta 1,2h y zona interior más adentro. Cuatro zonas.
//   · `dosAguasCumbrera` — Figs. 5.3-2B y 2C (7° < θ ≤ 27°). Franja `a` en los dos
//                 hastiales MÁS franja `a` a cada lado de la cumbrera; zona 3 donde se
//                 cruzan. Los aleros NO están zonificados.
//   · `dosAguasEsquinas` — Fig. 5.3-2D (27° < θ ≤ 45°). Franja `a` en los dos hastiales,
//                 zona 3 en las cuatro ESQUINAS y NINGUNA franja de cumbrera. Es otra
//                 zonificación, no la anterior con otros números: pasados los 27° el pico
//                 se va de la cumbrera a las esquinas.
//   · `cuatroAguas` — Figs. 5.3-2E, 2F y 2G. Zona 3 en TODO EL PERÍMETRO —acá la más
//                 succionada es el alero, no la cumbrera— y zona 2 en una franja `a` a lo
//                 largo de la cumbrera y de las cuatro limatesas.
//   · `pared`   — Fig. 5.3-1. Franja vertical `a` en cada esquina del edificio (zona 5);
//                 el resto, zona 4.
//
// ── CUIDADO CON EL NOMBRE `a` ──────────────────────────────────────────────────
// En el resto del repositorio `planta.a` y `planta.b` son las dimensiones en planta. Acá
// `a` es la DIMENSIÓN DE BORDE de la Fig. 5.3-1, que es otra cosa. Para que no se crucen,
// en este módulo las dimensiones de la planta se llaman `bx` y `by`, y `a` es siempre la
// del reglamento.

export const LAYOUT = {
  PARED: "pared",
  PLANA_H: "planaH",
  DOS_AGUAS_CUMBRERA: "dosAguasCumbrera",
  DOS_AGUAS_ESQUINAS: "dosAguasEsquinas",
  CUATRO_AGUAS: "cuatroAguas",
};

/** Qué zonificación usa cada figura. Leído del diagrama de cada una. */
export const LAYOUT_DE_FIGURA = {
  "5.3-1": LAYOUT.PARED,
  "5.3-2A": LAYOUT.PLANA_H,
  "5.3-2B": LAYOUT.DOS_AGUAS_CUMBRERA,
  "5.3-2C": LAYOUT.DOS_AGUAS_CUMBRERA,
  "5.3-2D": LAYOUT.DOS_AGUAS_ESQUINAS,
  "5.3-2E": LAYOUT.CUATRO_AGUAS,
  "5.3-2F": LAYOUT.CUATRO_AGUAS,
  "5.3-2G": LAYOUT.CUATRO_AGUAS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LA DIMENSIÓN a — notación de la Fig. 5.3-1 y de todas las demás
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `a` = 10 % de la menor dimensión horizontal o 0,4h, la que sea menor, pero no menos que
 * el 4 % de la menor dimensión horizontal ni menos de 1 m.
 *
 * Excepción: con θ de 0° a 7° y menor dimensión horizontal superior a 90 m, `a` se limita
 * a 0,8h.
 *
 * Nota 7 de la Fig. 5.3-2A: si hay voladizo, la menor dimensión NO lo incluye, pero la
 * distancia al borde se mide desde el borde exterior del voladizo. Lo primero se resuelve
 * pasando acá la dimensión sin voladizo; lo segundo, en las coordenadas del punto.
 *
 * @param {{menor: number, h: number, theta: number}} p  menor y h en m, theta en grados
 * @returns {{a: number, gobierna: string, limitada: boolean}}
 */
export function dimensionA({ menor, h, theta }) {
  if (!(menor > 0) || !(h > 0)) {
    throw new Error(`dimensionA: menor dimensión y h tienen que ser positivas; llegó ${menor} y ${h}`);
  }
  const diez = 0.1 * menor;
  const cuatroDecimos = 0.4 * h;
  const base = Math.min(diez, cuatroDecimos);
  const pisoPorcentual = 0.04 * menor;

  let a = base, gobierna = diez <= cuatroDecimos ? "10 % de la menor dimensión" : "0,4h";
  // Los dos pisos, en el orden en que los escribe la notación. No es lo mismo que un
  // `Math.max` de los tres: hay que saber CUÁL gobernó para decirlo en la traza, y con un
  // edificio bajo y chico —h = 3 m, planta de 4 × 6 m— el que gobierna es el 1 m absoluto.
  if (pisoPorcentual > a) { a = pisoPorcentual; gobierna = "4 % de la menor dimensión"; }
  if (1 > a) { a = 1; gobierna = "1 m"; }

  // La excepción es un TECHO y va al final: limita el valor ya adoptado, incluidos los
  // pisos. Sólo puede activarse en naves muy anchas y de cubierta casi plana, que es donde
  // el 10 % de la menor dimensión se vuelve una franja absurdamente ancha.
  const aplicaExcepcion = theta >= 0 && theta <= 7 && menor > 90;
  const limitada = aplicaExcepcion && a > 0.8 * h;
  if (limitada) { a = 0.8 * h; gobierna = "excepción: 0,8h (θ ≤ 7° y menor dimensión > 90 m)"; }

  return { a, gobierna, limitada };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EL CLASIFICADOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {object} GeoZonas
 * @property {string} layout  uno de LAYOUT
 * @property {number} bx  dimensión en planta según X, en m
 * @property {number} by  dimensión en planta según Y, en m
 * @property {number} h   la altura de la figura (media o de alero, según la figura), en m
 * @property {number} [a] la dimensión de borde; obligatoria salvo en `planaH`
 * @property {"X"|"Y"} [ejeCumbrera]  eje según el que corre la cumbrera
 */

const distBorde = (t, L) => Math.min(t, L - t);

/** Distancia de un punto a un segmento, en planta. */
function distSegmento(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / largo2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Pasa a coordenadas (u, v): `u` corre según la cumbrera, `v` es la transversal.
 * @param {GeoZonas} geo
 * @param {number} x
 * @param {number} y
 */
function ejes({ bx, by, ejeCumbrera }, x, y) {
  return ejeCumbrera === "Y"
    ? { u: y, v: x, Lu: by, Lv: bx }
    : { u: x, v: y, Lu: bx, Lv: by };
}

/**
 * La zona de un punto de la planta. Devuelve la etiqueta tal como la nombra la figura:
 * "1'", "1", "2", "3" en cubiertas, "4" o "5" en paredes.
 *
 * @param {number} x  0 ≤ x ≤ bx
 * @param {number} y  0 ≤ y ≤ by
 * @param {GeoZonas} geo
 * @returns {string}
 */
export function zonaEn(x, y, geo) {
  const { layout, bx, by, h, a } = geo;
  const dx = distBorde(x, bx), dy = distBorde(y, by);

  if (layout === LAYOUT.PLANA_H) {
    // Fig. 5.3-2A. Las distancias son múltiplos de h, no de `a`: es la única figura así.
    // La zona 3 es una L de 0,6h de largo por 0,2h de ancho en cada esquina, que es
    // exactamente «cerca de un borde Y no lejos del borde perpendicular».
    const esZona3 = (dx <= 0.2 * h && dy <= 0.6 * h) || (dy <= 0.2 * h && dx <= 0.6 * h);
    if (esZona3) return "3";
    const d = Math.min(dx, dy);
    if (d <= 0.6 * h) return "2";
    if (d <= 1.2 * h) return "1";
    return "1'";
  }

  if (layout === LAYOUT.PARED) {
    // ⚠ UNA PARED NO ES UN PUNTO DE LA PLANTA. Sus zonas viven sobre una superficie
    // VERTICAL, y lo que las define es la distancia a las esquinas DE ESA PARED, medida a
    // lo largo de ella. Clasificar un punto (x, y) de la planta con `min(dx, dy) ≤ a`
    // parece razonable y está mal: todo punto que esté SOBRE una pared tiene distancia
    // cero al borde de la planta, así que el punto medio de una nave de 40 m —que es zona
    // 4 sin ninguna duda— salía zona 5.
    //
    // El error pasó dos tandas de tests porque los dos controles que había miraban lo
    // mismo: `zonasPresentes` y el barrido denso usaban ESTA función, así que coincidían
    // entre sí estando los dos equivocados. Lo que lo destapó fue dibujarlo.
    throw new Error("zonaEn: las zonas de pared no se clasifican con un punto de la "
      + "planta; usar `zonaEnPared(s, largo, a)` con la distancia a lo largo de la pared");
  }

  const { u, v, Lu, Lv } = ejes(geo, x, y);
  const du = distBorde(u, Lu);          // al hastial más cercano
  const dv = distBorde(v, Lv);          // al alero más cercano
  const dCumbrera = Math.abs(v - Lv / 2);

  if (layout === LAYOUT.DOS_AGUAS_CUMBRERA) {
    // Figs. 5.3-2B y 2C: franja `a` en los hastiales y franja `a` a cada lado de la
    // cumbrera. La zona 3 son los cuatro rectángulos a × a donde ambas se cruzan, o sea
    // los EXTREMOS DE LA CUMBRERA. Los aleros no están zonificados: en el diagrama la
    // zona 1 llega hasta el borde.
    const enHastial = du <= a, enCumbrera = dCumbrera <= a;
    if (enHastial && enCumbrera) return "3";
    if (enHastial || enCumbrera) return "2";
    return "1";
  }

  if (layout === LAYOUT.DOS_AGUAS_ESQUINAS) {
    // Fig. 5.3-2D: franja `a` en los hastiales, zona 3 en las cuatro esquinas y NINGUNA
    // franja de cumbrera. Confundirla con la 2B es el error que este layout separado
    // existe para impedir.
    if (du > a) return "1";
    return dv <= a ? "3" : "2";
  }

  if (layout === LAYOUT.CUATRO_AGUAS) {
    // Figs. 5.3-2E, 2F y 2G: zona 3 en todo el perímetro y zona 2 sobre cumbrera y
    // limatesas. Acá la zona 3 es el ALERO, al revés que en la cubierta a dos aguas.
    if (Math.min(du, dv) <= a) return "3";
    // Limatesas a 45° en planta desde cada esquina hasta los extremos de la cumbrera, que
    // es la misma hipótesis con la que el capítulo 2 arma la cubierta a cuatro aguas de
    // este repositorio: cumbrera sobre el lado largo, de longitud |Lu − Lv|.
    if (Lu < Lv) {
      // Con la cumbrera declarada sobre el lado CORTO, los extremos de cumbrera quedarían
      // cruzados y las limatesas se dibujarían para afuera del edificio, dando zonas
      // plausibles y equivocadas. El capítulo 2 ya reorienta el proyecto al abrirlo; si
      // igual llega así, es un error de programación y tiene que verse.
      throw new Error("zonaEn: en cuatro aguas la cumbrera va sobre el lado largo; "
        + `llegó Lu = ${Lu} m contra Lv = ${Lv} m`);
    }
    const m = Lv / 2;
    const d = Math.min(
      distSegmento(u, v, m, m, Lu - m, m),
      distSegmento(u, v, 0, 0, m, m),
      distSegmento(u, v, 0, Lv, m, m),
      distSegmento(u, v, Lu, 0, Lu - m, m),
      distSegmento(u, v, Lu, Lv, Lu - m, m),
    );
    return d <= a ? "2" : "1";
  }

  throw new Error(`zonaEn: zonificación desconocida «${layout}»`);
}

/**
 * La zona de un punto de una PARED — Fig. 5.3-1.
 *
 * Zona 5 = franja de ancho `a` contra cada esquina vertical; zona 4 = el resto. No depende
 * de la altura: las franjas de la figura son verticales y llegan de la base al alero.
 *
 * @param {number} s      distancia a lo largo de la pared, desde una de sus esquinas, en m
 * @param {number} largo  largo de esa pared, en m
 * @param {number} a      dimensión de borde
 */
export function zonaEnPared(s, largo, a) {
  if (!(largo > 0)) throw new Error(`zonaEnPared: largo de pared inválido: ${largo}`);
  return Math.min(s, largo - s) <= a ? "5" : "4";
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUÉ ZONAS EXISTEN EN ESTE EDIFICIO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Las zonas que efectivamente aparecen en la planta.
 *
 * ── POR QUÉ SE MUESTREA Y NO SE RESUELVE CON DESIGUALDADES ─────────────────────
 * Para las zonificaciones rectangulares el muestreo de abajo es EXACTO, no aproximado: la
 * zona de un punto depende sólo de su distancia a los bordes, las fronteras están en un
 * puñado de distancias conocidas, y alcanza con un punto testigo dentro de cada intervalo
 * entre fronteras. Eso es lo que arma `testigos`.
 *
 * La de cuatro aguas tiene limatesas a 45°, así que sus regiones no son rectángulos y el
 * conjunto de testigos se completa con una grilla. Ahí sí es un muestreo: una zona que
 * exista sólo en una astilla más fina que el paso puede no aparecer.
 *
 * Eso es aceptable porque ESTE RESULTADO NO GOBIERNA EL CÁLCULO. La app da los (GC_p) de
 * TODAS las zonas de la figura aplicable, según el art. 5.2 y el criterio del proyectista;
 * esta lista sirve para el croquis y para la memoria. Una zona de área despreciable que no
 * se dibuje no cambia ninguna presión.
 *
 * @param {GeoZonas} geo
 * @returns {string[]} en el orden de la figura
 */
export function zonasPresentes(geo) {
  if (geo.layout === LAYOUT.PARED) {
    // Las dos paredes distintas de un rectángulo: la de largo `bx` y la de largo `by`. La
    // zona 5 existe siempre —toda pared tiene esquinas— y la 4 sólo si alguna pared es más
    // larga que sus dos franjas de borde juntas.
    const hayZona4 = [geo.bx, geo.by].some(L => L > 2 * geo.a);
    return hayZona4 ? ["4", "5"] : ["5"];
  }
  const vistas = new Set();
  for (const [x, y] of puntosTestigo(geo)) vistas.add(zonaEn(x, y, geo));
  // El orden de la figura, no el de aparición ni el del `Set`.
  return ["1'", "1", "2", "3"].filter(z => vistas.has(z));
}

/**
 * Los puntos testigo. Ver el comentario de `zonasPresentes`.
 * @param {GeoZonas} geo
 * @returns {[number, number][]}
 */
function puntosTestigo(geo) {
  const { layout, bx, by, h, a } = geo;
  /** @type {[number, number][]} */
  const puntos = [];

  // Distancias al borde que separan zonas, por zonificación.
  const fronteras = layout === LAYOUT.PLANA_H ? [0.2 * h, 0.6 * h, 1.2 * h] : [a];
  // Un testigo dentro de cada intervalo entre fronteras, recortado al semiancho real.
  const testigos = (L) => {
    const semi = L / 2;
    const cortes = [0, ...fronteras.filter(f => f < semi), semi];
    const res = [];
    for (let i = 1; i < cortes.length; i++) res.push((cortes[i - 1] + cortes[i]) / 2);
    res.push(0, semi);   // el borde y el centro, que son los extremos
    return res;
  };

  const dxs = testigos(bx), dys = testigos(by);
  for (const dx of dxs) for (const dy of dys) {
    // Cada distancia al borde se materializa de los dos lados: en una planta alargada, la
    // esquina y el centro del lado largo dan zonas distintas con el mismo `dx`.
    puntos.push([dx, dy], [bx - dx, dy], [dx, by - dy], [bx - dx, by - dy]);
  }

  if (layout === LAYOUT.CUATRO_AGUAS) {
    // Las limatesas cortan en diagonal: los testigos rectangulares no alcanzan. El paso se
    // ata a `a`, que es el ancho de la franja más angosta del dibujo.
    const paso = Math.max(a / 3, Math.max(bx, by) / 400);
    for (let x = 0; x <= bx; x += paso) for (let y = 0; y <= by; y += paso) puntos.push([x, y]);
  }
  return puntos;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAS REGIONES, PARA DIBUJARLAS
// ═══════════════════════════════════════════════════════════════════════════════
//
// `zonaEn` responde «¿qué zona es este punto?» y el croquis necesita lo contrario: «¿qué
// figura ocupa cada zona?». Rasterizar el clasificador daría un dibujo de miles de
// rectángulos de un píxel, así que las regiones se arman aparte.
//
// ⚠ SON DOS REPRESENTACIONES DE LA MISMA REGLA, Y ESO ES A PROPÓSITO. Un test recorre la
// planta y exige que la zona que da `zonaEn` coincida con la región que la cubre, punto
// por punto. Escrito al revés —el dibujo derivado del clasificador— el croquis no podría
// desmentirlo nunca, y fue justamente al dibujar las paredes que apareció que el
// clasificador las trataba como puntos de la planta.
//
// Las piezas se pintan EN ORDEN: la última que cubre un punto es la que manda. Con eso, la
// cubierta a cuatro aguas se resuelve sin cortar polígonos: fondo de zona 1, encima la
// banda de cumbrera y limatesas, y encima la franja de perímetro.

/**
 * @typedef {{tipo: "rect", zona: string, x: number, y: number, w: number, h: number}} PiezaRect
 * @typedef {{tipo: "banda", zona: string, segmentos: [number,number,number,number][],
 *            ancho: number}} PiezaBanda
 */

/** Los cortes de una dimensión: 0, las fronteras desde cada borde, y el largo. */
function cortes(L, distancias) {
  const xs = new Set([0, L]);
  for (const d of distancias) {
    if (d > 0 && d < L) { xs.add(d); xs.add(L - d); }
  }
  return [...xs].sort((p, q) => p - q);
}

/**
 * Las piezas que cubren la planta, en orden de pintado.
 * @param {GeoZonas} geo
 * @returns {(PiezaRect|PiezaBanda)[]}
 */
export function regionesDe(geo) {
  const { layout, bx, by, h, a } = geo;

  if (layout === LAYOUT.PARED) {
    throw new Error("regionesDe: las paredes se dibujan en elevación, no en planta; "
      + "usar `franjasDePared(largo, a)`");
  }

  if (layout === LAYOUT.CUATRO_AGUAS) {
    const { Lu, Lv } = ejes(geo, 0, 0);
    const m = Lv / 2;
    // En coordenadas (u, v), que después se dan vuelta si la cumbrera corre según Y.
    const seg = /** @type {[number,number,number,number][]} */ ([
      [m, m, Lu - m, m],
      [0, 0, m, m], [0, Lv, m, m], [Lu, 0, Lu - m, m], [Lu, Lv, Lu - m, m],
    ]);
    /** @type {(s: [number,number,number,number]) => [number,number,number,number]} */
    const aXY = ([u1, v1, u2, v2]) => (geo.ejeCumbrera === "Y"
      ? [v1, u1, v2, u2] : [u1, v1, u2, v2]);
    return [
      { tipo: "rect", zona: "1", x: 0, y: 0, w: bx, h: by },
      // La banda de cumbrera y limatesas es el conjunto de puntos a distancia ≤ a de esos
      // segmentos: exactamente lo que dibuja un trazo de ancho 2a con puntas y uniones
      // redondeadas, que es como el croquis la pinta. La misma definición que usa
      // `zonaEn`, no una aproximación de ella.
      { tipo: "banda", zona: "2", segmentos: seg.map(aXY), ancho: 2 * a },
      { tipo: "rect", zona: "3", x: 0, y: 0, w: bx, h: a },
      { tipo: "rect", zona: "3", x: 0, y: by - a, w: bx, h: a },
      { tipo: "rect", zona: "3", x: 0, y: 0, w: a, h: by },
      { tipo: "rect", zona: "3", x: bx - a, y: 0, w: a, h: by },
    ];
  }

  // Los tres layouts rectangulares se resuelven con una grilla de celdas: dentro de cada
  // celda las distancias a los bordes no cruzan ninguna frontera, así que la celda entera
  // es de una sola zona y alcanza con clasificar su centro.
  let cortesX, cortesY;
  if (layout === LAYOUT.PLANA_H) {
    const d = [0.2 * h, 0.6 * h, 1.2 * h];
    cortesX = cortes(bx, d); cortesY = cortes(by, d);
  } else {
    const { Lu, Lv } = ejes(geo, 0, 0);
    const enU = cortes(Lu, [a]);
    // Con cumbrera, la frontera transversal está a `a` de la CUMBRERA —que corre por el
    // medio— y no de los aleros; sin cumbrera, a `a` de los aleros.
    const enV = layout === LAYOUT.DOS_AGUAS_CUMBRERA
      ? [...new Set([0, Math.max(0, Lv / 2 - a), Math.min(Lv, Lv / 2 + a), Lv])].sort((p, q) => p - q)
      : cortes(Lv, [a]);
    [cortesX, cortesY] = geo.ejeCumbrera === "Y" ? [enV, enU] : [enU, enV];
  }

  /** @type {PiezaRect[]} */
  const piezas = [];
  for (let i = 1; i < cortesX.length; i++) {
    for (let j = 1; j < cortesY.length; j++) {
      const [x0, x1] = [cortesX[i - 1], cortesX[i]];
      const [y0, y1] = [cortesY[j - 1], cortesY[j]];
      if (x1 - x0 <= 0 || y1 - y0 <= 0) continue;
      piezas.push({ tipo: "rect", zona: zonaEn((x0 + x1) / 2, (y0 + y1) / 2, geo),
        x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return piezas;
}

/**
 * Las franjas de una pared, en elevación: `[{zona, desde, hasta}]` sobre su largo.
 * @param {number} largo
 * @param {number} a
 */
export function franjasDePared(largo, a) {
  if (largo <= 2 * a) return [{ zona: "5", desde: 0, hasta: largo }];
  return [
    { zona: "5", desde: 0, hasta: a },
    { zona: "4", desde: a, hasta: largo - a },
    { zona: "5", desde: largo - a, hasta: largo },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOS ANCHOS DE CADA ZONA, PARA ACOTAR
// ═══════════════════════════════════════════════════════════════════════════════
//
// Es lo que se pasa a los planos de revestimiento y de correas: no alcanza con las
// dimensiones generales del edificio, hay que poder leer del croquis dónde empieza y dónde
// termina cada zona.
//
// Vive acá y no en el croquis porque la memoria necesita los MISMOS números como texto. Con
// el dibujo calculando los suyos, un día el croquis dice 3,60 m y la tabla del capítulo
// 3,75, y no hay forma de saber cuál está bien.
//
// Las medidas salen en metros, que es la unidad interna; el formateo —mm en la memoria, m
// en pantalla— lo hace el perfil de unidades en el borde, como en todo el repositorio.

/**
 * @typedef {object} CotaZona
 * @property {string} zona
 * @property {string} que        qué mide, en palabras
 * @property {string} simbolo    la expresión del reglamento: «0,6h», «a», «2a»…
 * @property {number} [valor]    la medida, en m
 * @property {number} [valor2]   la segunda medida cuando la zona es un rectángulo
 * @property {number} [desde]    para los anillos: distancia al borde donde empieza
 * @property {number} [hasta]    y donde termina
 */

/**
 * Los anchos acotables de cada zona.
 * @param {GeoZonas} geo
 * @returns {CotaZona[]}
 */
export function cotasDeZona(geo) {
  const { layout, h, a } = geo;

  if (layout === LAYOUT.PARED) {
    return [
      { zona: "5", que: "franja contra cada esquina vertical", simbolo: "a", valor: a },
      { zona: "4", que: "el resto de la pared", simbolo: "—" },
    ];
  }

  if (layout === LAYOUT.PLANA_H) {
    // ⚠ ACÁ LAS COTAS SON MÚLTIPLOS DE h Y NO DE `a`. Es la única figura así, y es
    // justamente lo que alguien copia mal de un croquis al siguiente.
    return [
      { zona: "3", que: "L en cada esquina", simbolo: "0,2h × 0,6h",
        valor: 0.2 * h, valor2: 0.6 * h },
      { zona: "2", que: "franja desde el borde", simbolo: "0,6h", valor: 0.6 * h },
      { zona: "1", que: "anillo, del borde", simbolo: "0,6h a 1,2h",
        desde: 0.6 * h, hasta: 1.2 * h, valor: 0.6 * h },
      { zona: "1'", que: "interior, a más de 1,2h de todo borde", simbolo: "1,2h",
        desde: 1.2 * h },
    ];
  }

  if (layout === LAYOUT.DOS_AGUAS_CUMBRERA) {
    return [
      { zona: "3", que: "en cada extremo de la cumbrera", simbolo: "a × a",
        valor: a, valor2: a },
      { zona: "2", que: "franja en cada hastial, y a cada lado de la cumbrera",
        simbolo: "a", valor: a },
      { zona: "2", que: "ancho total de la franja de cumbrera", simbolo: "2a", valor: 2 * a },
      { zona: "1", que: "el resto, aleros incluidos", simbolo: "—" },
    ];
  }

  if (layout === LAYOUT.DOS_AGUAS_ESQUINAS) {
    return [
      { zona: "3", que: "en las cuatro esquinas", simbolo: "a × a", valor: a, valor2: a },
      { zona: "2", que: "resto de la franja de hastial", simbolo: "a", valor: a },
      { zona: "1", que: "el resto — no hay franja de cumbrera", simbolo: "—" },
    ];
  }

  if (layout === LAYOUT.CUATRO_AGUAS) {
    return [
      { zona: "3", que: "franja en todo el perímetro", simbolo: "a", valor: a },
      { zona: "2", que: "a cada lado de la cumbrera y de las limatesas", simbolo: "a", valor: a },
      { zona: "2", que: "ancho total de esa franja", simbolo: "2a", valor: 2 * a },
      { zona: "1", que: "interior de cada faldón", simbolo: "—" },
    ];
  }

  return [];
}

/**
 * Dónde poner el rótulo de cada zona: el punto más «adentro» que tiene.
 *
 * ── POR QUÉ NO ES EL CENTRO DEL RECTÁNGULO MÁS GRANDE ──────────────────────────
 * Era lo que hacía el croquis, y en cuatro aguas ponía el ① y el ② EN EL MISMO PUNTO: la
 * zona 1 se dibuja como un rectángulo que cubre toda la planta —después tapado por la
 * banda y por el perímetro— y su centro es el centro de la planta, que es justo donde pasa
 * la cumbrera. El ② quedaba encima del ① y el croquis mostraba una zona menos.
 *
 * Acá se busca, sobre una grilla, el punto de la zona que queda MÁS LEJOS de cualquier
 * punto de otra zona. Es la misma idea que el «polo de inaccesibilidad» de un polígono, y
 * no depende de cómo esté partida la zona en piezas de dibujo.
 *
 * @param {GeoZonas} geo
 * @param {number} [n]  puntos por lado de la grilla
 * @returns {Object<string, {x: number, y: number}>}
 */
export function puntosDeRotulo(geo, n = 25) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = geo.bx * (i + 0.5) / n, y = geo.by * (j + 0.5) / n;
      pts.push({ x, y, z: zonaEn(x, y, geo) });
    }
  }
  const out = {};
  for (const z of new Set(pts.map(p => p.z))) {
    let mejor = null, mejorD = -1;
    for (const p of pts) {
      if (p.z !== z) continue;
      let d = Infinity;
      for (const q of pts) {
        if (q.z === z) continue;
        const dd = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
        if (dd < d) d = dd;
      }
      // Sin otra zona en la planta, cualquier punto sirve: gana el centro.
      if (d === Infinity) { mejor = { x: geo.bx / 2, y: geo.by / 2 }; break; }
      if (d > mejorD) { mejorD = d; mejor = { x: p.x, y: p.y }; }
    }
    if (mejor) out[z] = mejor;
  }
  return out;
}
