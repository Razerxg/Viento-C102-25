// CAPÍTULO 5 — ÁREA EFECTIVA DE VIENTO DE UN ELEMENTO.
//
// Definición del art. 1.2 y su comentario. Es el área con la que se ENTRA a la curva de
// (GC_p), y no es lo mismo que el área sobre la que después se aplica la presión.
//
// ── LA REGLA DEL TERCIO NO ES UN REDONDEO ──────────────────────────────────────
// «El área efectiva de viento es el producto de la longitud del elemento por un ancho
// efectivo que no necesita ser menor que un tercio de esa longitud.» El ancho efectivo
// nace como la separación entre elementos, y el tercio lo levanta cuando esa separación
// es chica: una correa de 6 m cada 1,50 m no toma 9 m², toma 6 × 2 = 12 m².
//
// El efecto es siempre el mismo y siempre va en el mismo sentido: agranda el área, y
// agrandar el área ACHICA el (GC_p) —las curvas del capítulo pierden magnitud con A—.
// Olvidarse del tercio da, entonces, un coeficiente MÁS desfavorable: el error queda del
// lado seguro y por eso no se nota nunca. La app lo muestra escrito.
//
// ── EL (GC_p) SE LEE CON A, PERO LA CARGA VA SOBRE EL ÁREA TRIBUTARIA ──────────
// C 1.2. Son dos áreas distintas y la confusión sobredimensiona: la correa del ejemplo
// se verifica con el (GC_p) de 12 m² y la presión resultante se aplica sobre sus 9 m²
// reales. La pantalla lo dice; acá se devuelven las dos.

export const TIPO_ELEMENTO = {
  CHAPA: "chapa",
  CORREA: "correa",
  LARGUERO: "larguero",
  MONTANTE: "montante",
  FIJACION: "fijacion",
  ABERTURA: "abertura",
  OTRO: "otro",
};

/** El orden en que los ofrece la pantalla, que no es el de `Object.keys`. */
export const TIPOS_LISTA = [
  TIPO_ELEMENTO.CHAPA, TIPO_ELEMENTO.CORREA, TIPO_ELEMENTO.LARGUERO,
  TIPO_ELEMENTO.MONTANTE, TIPO_ELEMENTO.FIJACION, TIPO_ELEMENTO.ABERTURA,
  TIPO_ELEMENTO.OTRO,
];

export const ETIQUETA_TIPO = {
  [TIPO_ELEMENTO.CHAPA]: "Chapa de cubierta o de pared",
  [TIPO_ELEMENTO.CORREA]: "Correa",
  [TIPO_ELEMENTO.LARGUERO]: "Larguero",
  [TIPO_ELEMENTO.MONTANTE]: "Montante (LSF)",
  [TIPO_ELEMENTO.FIJACION]: "Fijación de revestimiento",
  [TIPO_ELEMENTO.ABERTURA]: "Puerta o ventana apoyada en tres o más lados",
  [TIPO_ELEMENTO.OTRO]: "Otro (área a mano)",
};

/** Los tipos que se rigen por `A = L · máx(s; L/3)`. */
const CON_REGLA_DEL_TERCIO = new Set([
  TIPO_ELEMENTO.CHAPA, TIPO_ELEMENTO.CORREA, TIPO_ELEMENTO.LARGUERO, TIPO_ELEMENTO.MONTANTE,
]);

const f2 = (x) => x.toFixed(2).replace(".", ",");

/**
 * @typedef {object} AreaEfectiva
 * @property {number} A           área efectiva de viento, en m², con la que se lee (GC_p)
 * @property {number} tributaria  área sobre la que se aplica la presión, en m²
 * @property {string} cuenta      la cuenta escrita, para la pantalla y la memoria
 * @property {string} regla       el artículo que la define
 * @property {boolean} mandaTercio  si el tercio levantó el ancho efectivo
 * @property {{nivel: string, texto: string, ref: string}[]} avisos
 */

/**
 * Área efectiva de viento de un elemento.
 *
 * @param {{tipo: string, L?: number, s?: number, area?: number}} el
 * @returns {AreaEfectiva}
 */
export function areaEfectiva(el) {
  const { tipo } = el;
  const avisos = [];

  if (CON_REGLA_DEL_TERCIO.has(tipo)) {
    const L = Number(el.L), s = Number(el.s);
    if (!(L > 0) || !(s > 0)) {
      throw new Error(`areaEfectiva: ${tipo} necesita luz y separación positivas; llegó L = ${el.L}, s = ${el.s}`);
    }
    const tercio = L / 3;
    const mandaTercio = tercio > s;
    const ancho = Math.max(s, tercio);
    const A = L * ancho;
    return {
      A,
      tributaria: L * s,
      cuenta: `A = L · máx(s; L/3) = ${f2(L)} · máx(${f2(s)}; ${f2(tercio)}) = ${f2(L)} · ${f2(ancho)} = ${f2(A)} m²`,
      regla: "art. 1.2 — área efectiva de viento",
      mandaTercio,
      avisos: mandaTercio
        ? [{
            nivel: "info",
            texto: `El ancho efectivo lo fija L/3 = ${f2(tercio)} m y no la separación de `
              + `${f2(s)} m. La carga se aplica igual sobre el área tributaria real de `
              + `${f2(L * s)} m².`,
            ref: "C 1.2",
          }]
        : [],
    };
  }

  if (tipo === TIPO_ELEMENTO.FIJACION) {
    // Sin regla del tercio: el comentario del art. 1.2 la excluye explícitamente para las
    // fijaciones, porque el área de una fijación es la que tributa a ESE punto y no tiene
    // una «longitud» sobre la que promediar la succión.
    const area = Number(el.area);
    if (!(area > 0)) throw new Error(`areaEfectiva: la fijación necesita su área tributaria; llegó ${el.area}`);
    return {
      A: area, tributaria: area,
      cuenta: `A = área tributaria de una fijación = ${f2(area)} m² (sin la regla de L/3)`,
      regla: "art. 1.2 — fijaciones de revestimiento",
      mandaTercio: false,
      avisos,
    };
  }

  if (tipo === TIPO_ELEMENTO.ABERTURA) {
    const area = Number(el.area);
    if (!(area > 0)) throw new Error(`areaEfectiva: la abertura necesita su área; llegó ${el.area}`);
    return {
      A: area, tributaria: area,
      cuenta: `A = área del elemento = ${f2(area)} m²`,
      regla: "art. 1.2 — elemento apoyado en tres o más lados",
      mandaTercio: false,
      avisos,
    };
  }

  if (tipo === TIPO_ELEMENTO.OTRO) {
    const area = Number(el.area);
    if (!(area > 0)) throw new Error(`areaEfectiva: el área cargada a mano tiene que ser positiva; llegó ${el.area}`);
    return {
      A: area, tributaria: area,
      cuenta: `A = ${f2(area)} m² (cargada a mano)`,
      regla: "art. 1.2 — área declarada por el proyectista",
      mandaTercio: false,
      avisos: [{
        nivel: "info",
        texto: "El área efectiva la declaró el proyectista: la app no la deriva de la geometría.",
        ref: "art. 1.2",
      }],
    };
  }

  throw new Error(`areaEfectiva: tipo de elemento desconocido «${tipo}»`);
}

/** Umbral del art. 5.2.3: con más de 65 m² tributarios se puede diseñar como SPRFV. */
export const AREA_SPRFV = 65;

/**
 * El aviso del art. 5.2.3. Es `info` y no `aviso`: el artículo PERMITE, no exige, y un
 * elemento grande verificado como C&R queda del lado seguro.
 * @param {number} tributaria
 */
export const avisoSPRFV = (tributaria) => (tributaria > AREA_SPRFV
  ? [{
      nivel: "info",
      texto: `El área tributaria de ${f2(tributaria)} m² supera los ${AREA_SPRFV} m²: el `
        + "art. 5.2.3 permite diseñar este elemento con las disposiciones del SPRFV.",
      ref: "art. 5.2.3",
    }]
  : []);
