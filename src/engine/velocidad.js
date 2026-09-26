// VELOCIDAD BÁSICA — DE DÓNDE SALE V (art. 1.5).
//
// ── POR QUÉ EL ORIGEN ES UN DATO ────────────────────────────────────────────────
// V es el dato de entrada de TODO el cálculo: la presión va con V². Antes la app sólo
// ofrecía la tabla de ciudades, y un proyectista con una especificación del comitente, un
// sitio fuera de la tabla o un estudio regional no tenía dónde ponerlo —así que lo ponía
// en otro lado, o lo forzaba eligiendo la ciudad «más parecida»—.
//
// Las cuatro vías que el reglamento admite, y que acá son explícitas:
//
//   a) `tabla` ........ Figura 1.5-1D, las 29 ciudades
//   b) `interpolado` .. entre isotacas de las Figuras 1.5-1 A-C, nota 2
//   c) `manual` ....... valor adoptado por el proyectista, con FUNDAMENTO obligatorio
//   d) `v50` .......... convertido desde el V50 del CIRSOC 102-2005
//
// ── LO QUE LA APP TIENE QUE IMPEDIR ─────────────────────────────────────────────
// Que V quede POR DEBAJO de la del mapa sin que nadie lo note. El art. 1.5.1 permite
// adoptar una V mayor siempre; menor, sólo por el art. 1.5.3 y con un análisis estadístico
// que lo sostenga. Por eso la V de referencia del mapa se muestra SIEMPRE, junto a la
// diferencia porcentual, y una V menor sin el fundamento del 1.5.3 es un aviso de ERROR.
import { velocidadDe, factorV, I_RIESGO } from '../constants/velocidades.js';
import { num } from '../lib/parseo.js';

/** Rango en el que una velocidad básica es plausible para este reglamento, en m/s. */
export const RANGO_V = { min: 30, max: 100 };

export const ORIGENES_V = [
  { id: "tabla", label: "Tabla de ciudades — Figura 1.5-1D",
    detalle: "Las 29 localidades que la figura tabula, por categoría de riesgo." },
  { id: "interpolado", label: "Interpolado entre isotacas — Figuras 1.5-1 A-C",
    detalle: "Nota 2 de las figuras: entre dos isotacas se interpola linealmente con la "
      + "distancia del sitio a cada una." },
  { id: "manual", label: "Valor adoptado por el proyectista",
    detalle: "V cargada a mano. Exige declarar en qué se funda." },
  { id: "v50", label: "Convertido desde V50 del CIRSOC 102-2005",
    detalle: "Para especificaciones escritas con la edición anterior. Es la expresión "
      + "(C 1.5-6.1) con la que se construyó la Figura 1.5-1D." },
];

/**
 * Los fundamentos admisibles para una V adoptada a mano.
 *
 * `permiteMenor` marca el único que habilita una V POR DEBAJO de la del mapa. No es una
 * sutileza: es la diferencia entre un aviso informativo y un error.
 */
export const FUNDAMENTOS_V = [
  { id: "comitente", label: "Especificación del comitente o bases de diseño",
    ref: "Documento contractual", permiteMenor: false, pideDocumento: true,
    detalle: "El valor viene de un documento del proyecto. Hay que decir cuál y en qué "
      + "revisión: una V es trazable sólo si se sabe de dónde salió." },
  { id: "art1_5_1", label: "Art. 1.5.1 — registros o experiencia indican velocidades mayores",
    ref: "Art. 1.5.1", permiteMenor: false,
    detalle: "El artículo admite adoptar una velocidad MAYOR que la del mapa cuando los "
      + "registros o la experiencia en la zona lo indican." },
  { id: "art1_5_2", label: "Art. 1.5.2 — región especial (terreno montañoso, garganta, quebrada)",
    ref: "Art. 1.5.2", permiteMenor: false,
    detalle: "En terreno montañoso, gargantas y quebradas el viento se acelera de forma "
      + "que el mapa no recoge, y el artículo pide ajustar la velocidad." },
  { id: "art1_5_3", label: "Art. 1.5.3 — datos climáticos regionales con análisis de valores extremos",
    ref: "Art. 1.5.3", permiteMenor: true,
    detalle: "Es el ÚNICO que habilita una V menor que la del mapa, y con condiciones." },
];

/**
 * Las condiciones que el art. 1.5.3 impone para apartarse hacia abajo. Se listan enteras
 * cuando el caso ocurre: son exactamente lo que hay que poder mostrar en una revisión.
 */
export const CONDICIONES_1_5_3 = [
  "Los datos se analizan con procedimientos de valores extremos APROBADOS.",
  "Se tienen en cuenta la longitud del registro, el error de muestreo, el tiempo de "
    + "promediación, la altura del anemómetro y su exposición.",
  "Los valores se ajustan a ráfaga de 3 segundos a 10 m de altura en exposición C.",
  "La velocidad resultante NO es menor que la correspondiente al intervalo medio de "
    + "recurrencia de la categoría de riesgo.",
  "El C 1.5.3 además exige demostrar, con el error de muestreo, que la diferencia contra "
    + "el mapa NO es casual.",
];

/** Aviso fijo de la opción manual: qué ES V, y el error que se comete si se confunde. */
export const AVISO_QUE_ES_V = {
  ref: "Art. 1.5 · Figuras 1.5-1",
  texto: "V es la RÁFAGA DE 3 SEGUNDOS a 10 m sobre el terreno, en exposición C, del mapa "
    + "de la categoría de riesgo, a NIVEL DE RESISTENCIA: se combina con factor de carga "
    + "1,0. Un V50 de una especificación escrita con el CIRSOC 102-2005 NO es esto y va "
    + "por la opción de conversión. Ejemplo: en Neuquén categoría II, cargar 48 m/s como "
    + "si fuera V da una presión 33 % menor que la que corresponde, que es con 58,8 m/s.",
};

/**
 * Interpolación entre dos isotacas, nota 2 de las Figuras 1.5-1 A-C.
 *
 *     V = V1 + (V2 − V1)·d1/(d1 + d2)
 *
 * `d1` y `d2` son las distancias del sitio a cada isotaca. Sólo importa su PROPORCIÓN, así
 * que pueden ir en kilómetros o en milímetros medidos sobre el papel: es lo que hace que
 * el dato sea cargable sin georreferenciar el mapa.
 */
export function interpolarIsotacas({ V1, V2, d1, d2 } = /** @type {any} */ ({})) {
  const v1 = num(V1), v2 = num(V2), a = num(d1), b = num(d2);
  const suma = a + b;
  if (!(v1 > 0) || !(v2 > 0)) {
    return { V: null, error: "Faltan las velocidades de las dos isotacas." };
  }
  if (!(a >= 0) || !(b >= 0) || !(suma > 0)) {
    return { V: null, error: "Las distancias a las isotacas tienen que ser positivas y "
      + "no pueden ser las dos cero." };
  }
  const V = v1 + (v2 - v1) * a / suma;
  return { V, V1: v1, V2: v2, d1: a, d2: b,
    // La cuenta se muestra: es una interpolación hecha sobre un mapa leído a ojo, y lo
    // único que la hace revisable es ver de qué dos números salió.
    cuenta: `V = ${fc(v1)} + (${fc(v2)} − ${fc(v1)})·${fc(a)}/(${fc(a)} + ${fc(b)})` };
}

const fc = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "—");

/**
 * Conversión desde el V50 del CIRSOC 102-2005, expresión (C 1.5-6.1).
 *
 *     V = V50·√(1,5·I)      I = 0,87 (cat. I) · 1,00 (cat. II) · 1,15 (cat. III-IV)
 *
 * Es la misma expresión con la que se construyó la Figura 1.5-1D, así que convertir el
 * V50 de una ciudad tabulada devuelve exactamente su fila.
 */
export function desdeV50({ V50, riesgo }) {
  const v = num(V50);
  if (!(v > 0)) return { V: null, error: "Falta el V50 de la especificación." };
  const I = I_RIESGO[riesgo];
  if (I === undefined) return { V: null, error: `Categoría de riesgo desconocida: ${riesgo}.` };
  return { V: v * factorV(riesgo), V50: v, I,
    cuenta: `V = ${fc(v)} · √(1,5 · ${fc(I, 2)}) = ${fc(v)} · ${fc(factorV(riesgo), 4)}` };
}

/**
 * Resuelve V y devuelve TODO lo que hace falta para justificarla: el valor, la referencia
 * del mapa, la diferencia, los avisos y la traza.
 *
 * @param {object} e
 * @param {"tabla"|"interpolado"|"manual"|"v50"} e.origen
 * @param {string} e.ciudad   `""` = el sitio no está en la tabla
 * @param {string} e.riesgo
 * @param {{V1?:any,V2?:any,d1?:any,d2?:any}} [e.interp]
 * @param {{V?:any,fundamento?:string,documento?:string}} [e.manual]
 * @param {{V50?:any}} [e.v50]
 */
export function resolverV({ origen, ciudad, riesgo, interp, manual, v50 }) {
  const avisos = [];
  const push = (tono, ref, texto, extra) => avisos.push({ tono, ref, texto, ...extra });

  // La V que el mapa da para esta ciudad y esta categoría. `null` si el sitio no está en
  // la tabla: ahí no hay contra qué comparar, y eso también hay que decirlo.
  const referencia = ciudad ? velocidadDe(ciudad, riesgo) : null;

  let V = null, cuenta = null, error = null, detalleOrigen = null;
  if (origen === "interpolado") {
    const r = interpolarIsotacas(interp ?? {});
    V = r.V; cuenta = r.cuenta; error = r.error;
    detalleOrigen = r.V == null ? null
      : `Isotacas de ${fc(r.V1)} y ${fc(r.V2)} m/s, a ${fc(r.d1)} y ${fc(r.d2)} del sitio.`;
  } else if (origen === "manual") {
    V = num(manual?.V, NaN);
    if (!Number.isFinite(V)) { V = null; error = "Falta la velocidad adoptada."; }
    detalleOrigen = "Valor adoptado por el proyectista.";
  } else if (origen === "v50") {
    const r = desdeV50({ V50: v50?.V50, riesgo });
    V = r.V; cuenta = r.cuenta; error = r.error;
    detalleOrigen = r.V == null ? null
      : `V50 = ${fc(r.V50)} m/s del CIRSOC 102-2005, categoría ${riesgo} (I = ${fc(r.I, 2)}).`;
  } else {
    V = referencia;
    detalleOrigen = ciudad ? `Figura 1.5-1D, ${ciudad}, categoría ${riesgo}.` : null;
    if (V == null) error = "El sitio no está en la tabla de ciudades. Hay que interpolar "
      + "entre isotacas o adoptar un valor con fundamento.";
  }

  if (error) push("error", "Art. 1.5", error);

  // ── RANGO ─────────────────────────────────────────────────────────────────────
  // Fuera de 30–100 m/s no hay velocidad básica plausible para este reglamento: es un
  // error de entrada, no un caso extremo. El mapa argentino va de 34 a 83 m/s.
  const fueraDeRango = V != null && (V < RANGO_V.min || V > RANGO_V.max);
  if (fueraDeRango) {
    push("error", "Art. 1.5", `V = ${fc(V, 1)} m/s queda fuera del rango plausible `
      + `(${RANGO_V.min} a ${RANGO_V.max} m/s). Revisar el dato: el mapa del reglamento va `
      + "de 34 a 83 m/s.");
  }

  const fundamento = FUNDAMENTOS_V.find(f => f.id === manual?.fundamento);
  const esAdoptado = origen === "manual";

  if (esAdoptado) push("info", AVISO_QUE_ES_V.ref, AVISO_QUE_ES_V.texto);
  if (esAdoptado && !fundamento) {
    push("error", "Art. 1.5.1", "Falta declarar en qué se funda la velocidad adoptada.");
  }
  if (esAdoptado && fundamento?.pideDocumento && !String(manual?.documento ?? "").trim()) {
    push("aviso", "Trazabilidad", "Falta indicar el documento y la revisión de donde sale "
      + "la velocidad.");
  }

  // ── LA COMPARACIÓN CONTRA EL MAPA ─────────────────────────────────────────────
  let dif = null;
  if (V != null && referencia != null) {
    dif = 100 * (V - Number(referencia)) / Number(referencia);
    if (V >= Number(referencia) - 1e-9) {
      // Adoptar una V MAYOR está permitido siempre (art. 1.5.1).
      if (Math.abs(dif) > 1e-6) {
        push("info", "Art. 1.5.1", `La V adoptada supera en ${fc(dif, 1)} % a la del mapa `
          + `(${fc(referencia, 1)} m/s). El art. 1.5.1 lo permite: adoptar una velocidad `
          + "mayor que la del mapa es siempre admisible.");
      }
    } else if (fundamento?.permiteMenor) {
      push("aviso", "Art. 1.5.3", `La V adoptada es ${fc(Math.abs(dif), 1)} % MENOR que la `
        + `del mapa (${fc(referencia, 1)} m/s). El art. 1.5.3 lo admite sólo si el estudio `
        + "cumple TODAS estas condiciones:", { lista: CONDICIONES_1_5_3 });
    } else {
      push("error", "Art. 1.5.1", `La V adoptada es ${fc(Math.abs(dif), 1)} % MENOR que la `
        + `del mapa (${fc(referencia, 1)} m/s). El único artículo que habilita apartarse `
        + "hacia abajo es el 1.5.3, con datos climáticos regionales y análisis estadístico "
        + `de valores extremos. Con ${fundamento ? "este fundamento" : "el fundamento "
        + "declarado"} no corresponde.`);
    }
  } else if (V != null && origen !== "interpolado") {
    push("aviso", "Art. 1.5.1", "Sin V de referencia del mapa —el sitio no está en la "
      + "tabla— no se puede verificar que la velocidad adoptada no sea menor que la que "
      + "corresponde. Conviene dejar asentada la lectura del mapa de la categoría.");
  }

  return {
    V, referencia, dif, origen, cuenta, fundamento: fundamento ?? null,
    documento: String(manual?.documento ?? "").trim() || null,
    detalleOrigen, avisos, fueraDeRango,
    ok: V != null && !fueraDeRango && !avisos.some(a => a.tono === "error"),
  };
}
