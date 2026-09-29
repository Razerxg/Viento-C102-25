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
    // Fig. 5.3-1: franja `a` en cada esquina vertical del edificio. Sobre una pared, la
    // distancia que importa es la horizontal al borde de esa pared.
    return Math.min(dx, dy) <= a ? "5" : "4";
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
  const vistas = new Set();
  for (const [x, y] of puntosTestigo(geo)) vistas.add(zonaEn(x, y, geo));
  // El orden de la figura, no el de aparición ni el del `Set`.
  const orden = geo.layout === LAYOUT.PARED ? ["4", "5"] : ["1'", "1", "2", "3"];
  return orden.filter(z => vistas.has(z));
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
