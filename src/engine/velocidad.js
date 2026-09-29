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
// adoptar una V mayor siempre; menor, sólo por el art. 1.5.3. Por eso la V de referencia
// del mapa se muestra SIEMPRE, junto a la diferencia porcentual.
//
// ⚠ LA APP NO PIDE FUNDAMENTAR. Antes había un selector de fundamentos y una V menor sin
// el del art. 1.5.3 era un ERROR. Ahora la app informa la diferencia y cita el artículo
// que fija las condiciones; el fundamento lo agrega el proyectista a la memoria, a mano.
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
    detalle: "V cargada a mano. Se compara igual contra el mapa de la ciudad de "
      + "referencia, si se elige una." },
  { id: "v50", label: "Convertido desde V50 del CIRSOC 102-2005",
    detalle: "Para especificaciones escritas con la edición anterior. Es la expresión "
      + "(C 1.5-6.1) con la que se construyó la Figura 1.5-1D." },
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

// ── CONVERSIÓN ENTRE LOS MAPAS DE VELOCIDAD — C 1.5-6.1 ─────────────────────────
//
// Los cuatro mapas de la Figura 1.5-1 son el MISMO campo de velocidades con distinto
// período de retorno, y la relación entre ellos es `V ∝ √I` con el factor de importancia
// de la Tabla 1.5-2. Es la misma proporción que ya usa `desdeV50`: `V = v50·√(1,5·I)`.
//
// ⚠ PARA QUÉ HACE FALTA. La condición de región con detritus del art. 1.10.3.1 se evalúa
// SIEMPRE contra la Figura 1.5-1A —o la 1.5-1B en salud de categoría III y en categoría
// IV—, no contra el mapa de la categoría del edificio. Con el sitio en la tabla de
// ciudades eso se resuelve leyendo la otra columna; fuera de la tabla, la única V que hay
// es la del sitio, y hay que llevarla al mapa que corresponde.
//
// Se comprueba contra la propia tabla: Buenos Aires da V_III/V_II = 59,1/55,1 = 1,0726,
// y √(1,15/1,00) = 1,07238.

/**
 * Lleva una V de la categoría `riesgo` al mapa de categoría II, que es la Figura 1.5-1A.
 * @param {number} V @param {string} riesgo
 */
export const aFiguraA = (V, riesgo) => {
  const I = I_RIESGO[riesgo];
  return I === undefined ? null : Number(V) * Math.sqrt(I_RIESGO.II / I);
};

/** De la Figura 1.5-1A a la 1.5-1B, que es el mapa de las categorías III y IV. */
export const aFiguraB = (Va) => Number(Va) * Math.sqrt(I_RIESGO.III / I_RIESGO.II);

/**
 * La V de la figura que decide la región con detritus, a partir de la V del sitio.
 *
 * Devuelve también la cuenta escrita: una V convertida sin la conversión a la vista no se
 * puede revisar, y es justamente la que decide si los vidriados se cuentan como abiertos.
 *
 * @param {object} o
 * @param {"A"|"B"} o.figura
 * @param {string} o.origen  de dónde salió la V del sitio
 * @param {number|null} [o.V]     la V adoptada, de la categoría del edificio
 * @param {string} [o.riesgo]
 * @param {any} [o.v50]           el v50 del 102-2005, cuando el origen es ése
 */
export function vDeFigura({ figura, origen, V, riesgo, v50 }) {
  // ── DESDE v50 ES EXACTO, NO UNA CONVERSIÓN ──────────────────────────────────
  // La Figura 1.5-1A es el mapa de categoría II, y para categoría II vale I = 1,00: la
  // misma expresión `V = v50·√(1,5·I)` da `V_A = v50·√1,5` sin ningún factor intermedio.
  if (origen === "v50") {
    const v = num(v50);
    if (!(v > 0)) return null;
    const Va = v * Math.sqrt(1.5 * I_RIESGO.II);
    const Vf = figura === "B" ? aFiguraB(Va) : Va;
    return { V: Vf, exacta: true, ref: "Art. 1.5 · expresión V = v₅₀·√(1,5·I)",
      cuenta: `V_A = ${fc(v)} · √1,5 = ${fc(Va)} m/s`
        + (figura === "B" ? ` · V_B = V_A · √1,15 = ${fc(Vf)} m/s` : "") };
  }
  if (origen === "interpolado") {
    const v = Number(V);
    // ⚠ `Number(null)` ES 0 Y 0 ES FINITO. Sin el `> 0`, una V ausente salía convertida
    // como 0,00 m/s —un número perfectamente plausible para «no es región con
    // detritus»— en vez de caer a la declaración del proyectista.
    if (!(v > 0)) return null;
    const Va = aFiguraA(v, riesgo);
    if (Va == null) return null;
    const Vf = figura === "B" ? aFiguraB(Va) : Va;
    return { V: Vf, exacta: false, ref: "C 1.5-6.1 · proporción entre mapas",
      cuenta: `V_A = ${fc(v)} · √(1,00/${fc(I_RIESGO[riesgo], 2)}) = ${fc(Va)} m/s`
        + (figura === "B" ? ` · V_B = V_A · √1,15 = ${fc(Vf)} m/s` : "") };
  }
  return null;
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
 * @param {{V?:any}} [e.manual]
 * @param {{V50?:any}} [e.v50]
 */
export function resolverV({ origen, ciudad, riesgo, interp, manual, v50 }) {
  const avisos = [];
  const push = (tono, ref, texto, extra) => avisos.push({ tono, ref, texto, ...extra });

  // ── LA CIUDAD NO SIEMPRE ES REFERENCIA ────────────────────────────────────────
  // ⚠ ANTES SE USABA `ciudad` CUALQUIERA FUERA EL ORIGEN. Interpolando entre isotacas
  // para un sitio que NO está en la tabla, si en el desplegable había quedado «Neuquén»,
  // la comparación contra el mapa y la región con detritus salían de Neuquén. El sitio
  // interpolado está fuera de la tabla POR DEFINICIÓN: la V interpolada ES la lectura del
  // mapa, y no hay ninguna ciudad contra la cual contrastarla.
  const usaCiudad = origen !== "interpolado";
  const referencia = usaCiudad && ciudad ? velocidadDe(ciudad, riesgo) : null;

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

  // Lo que SÍ conviene decir de la opción manual: qué ES V, y el error que se comete si
  // se la confunde con un V50 del 102-2005. No es un pedido de fundamento: es la
  // definición del dato que se está cargando.
  if (origen === "manual") push("info", AVISO_QUE_ES_V.ref, AVISO_QUE_ES_V.texto);

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
    } else {
      // ⚠ ES UN «aviso», NO UN «error». Apartarse hacia abajo está contemplado por el
      // art. 1.5.3; la app no sabe si el estudio que lo sostiene existe y no lo pregunta.
      // Lo que sí hace es no dejar pasar la diferencia en silencio.
      push("aviso", "Art. 1.5.3", `La V adoptada es ${fc(Math.abs(dif), 1)} % menor que la `
        + `del mapa (${fc(referencia, 1)} m/s). El art. 1.5.3 fija las condiciones para `
        + "adoptar valores menores.");
    }
  } else if (V != null && origen !== "interpolado") {
    push("aviso", "Art. 1.5.1", "Sin V de referencia del mapa —el sitio no está en la "
      + "tabla— no se puede verificar que la velocidad adoptada no sea menor que la que "
      + "corresponde. Conviene dejar asentada la lectura del mapa de la categoría.");
  }

  return {
    V, referencia, dif, origen, cuenta,
    // Qué ciudad se está usando de referencia, si alguna. Es lo que la región con detritus
    // necesita para saber si puede leer la tabla o tiene que convertir.
    ciudadRef: usaCiudad && ciudad ? ciudad : null, usaCiudad,
    v50: origen === "v50" ? num(v50?.V50) : null,
    detalleOrigen, avisos, fueraDeRango,
    ok: V != null && !fueraDeRango && !avisos.some(a => a.tono === "error"),
  };
}
