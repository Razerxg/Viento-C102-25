// INTERPOLACIÓN LINEAL EN TABLAS DEL REGLAMENTO — una sola implementación.
//
// ── POR QUÉ ESTÁ ACÁ Y NO REPETIDA ──────────────────────────────────────────────
// Había cuatro: `interp` en `presiones.js`, `interp` en `anexo1.js`, `interpGrilla` en
// `otrasEstructuras.js` e `interpolarTabla` en `topografia.js`. Hacían lo mismo con
// firmas distintas —dos con pares [x, y], dos con arreglos paralelos, una con los
// argumentos al revés— y sólo una devolvía los puntos usados. Cuatro copias de una regla
// de la norma es la forma más cómoda de que un día tres se arreglen y la cuarta no.
//
// ── LOS EXTREMOS SE CONGELAN, NO SE EXTRAPOLAN ──────────────────────────────────
// No es una comodidad: las filas extremas de estas tablas son «≤ 0,05», «≥ 45», «40 o
// más». El propio reglamento dice que más allá vale el mismo número. Extrapolar la
// pendiente daría un coeficiente que la norma no da y que nadie puede verificar.
//
// ── SIEMPRE SE DEVUELVEN LOS PUNTOS USADOS ──────────────────────────────────────
// Un K_zt de 1,53 o un C_f de 1,27 no se pueden controlar contra el papel si no se sabe
// entre qué dos filas salieron. Los puntos son parte de la justificación del número, no
// un adorno de la traza. Para los llamadores que sólo quieren la cifra está `valorEn()`.

/**
 * @typedef {object} Interpolado
 * @property {number} valor
 * @property {boolean} interpolado   false si `x` cayó justo en un punto de tabla
 * @property {{x:number,y:number}[]} puntos  el punto exacto, o los dos entre los que se interpoló
 * @property {"debajo"|"encima"|null} fuera  si `x` quedó fuera del rango tabulado
 * @property {string} [nota]
 */

/**
 * Interpolación lineal sobre abscisas CRECIENTES, con los extremos congelados.
 *
 * @param {number} x
 * @param {number[]} xs  estrictamente crecientes
 * @param {number[]} ys
 * @returns {Interpolado}
 */
export function interpolar(x, xs, ys) {
  // ⚠ EL ORDEN SE EXIGE, NO SE ARREGLA. La versión de `presiones.js` ordenaba los pares
  // antes de interpolar, y eso hace que una tabla cargada al revés —que es lo que pasa
  // con la Figura 4.4-1, cuyas filas van en s/h DECRECIENTE— dé un número plausible en
  // vez de fallar. Es justo el error que ningún control de ingeniería detecta.
  const n = xs.length;
  if (n === 0 || n !== ys.length) {
    throw new Error(`interpolar: tabla inconsistente (${n} abscisas, ${ys.length} ordenadas)`);
  }
  for (let i = 1; i < n; i++) {
    if (!(xs[i] > xs[i - 1])) {
      throw new Error("interpolar: las abscisas tienen que ser estrictamente crecientes; "
        + `llegó ${xs[i - 1]} seguido de ${xs[i]}. Si la tabla se lee al revés, invertirla `
        + "en el llamador, que es donde se sabe por qué está así.");
    }
  }

  const punto = (i, fuera, nota) => ({
    valor: ys[i], interpolado: false, puntos: [{ x: xs[i], y: ys[i] }], fuera, nota });

  if (x <= xs[0]) {
    return punto(0, x < xs[0] ? "debajo" : null,
      x < xs[0] ? "por debajo del primer punto de la tabla: se adopta ese valor" : undefined);
  }
  if (x >= xs[n - 1]) {
    return punto(n - 1, x > xs[n - 1] ? "encima" : null,
      x > xs[n - 1] ? "por encima del último punto de la tabla: se adopta ese valor" : undefined);
  }
  for (let i = 0; i < n - 1; i++) {
    if (x === xs[i]) return punto(i, null, undefined);
    if (x < xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return {
        valor: ys[i] + t * (ys[i + 1] - ys[i]),
        interpolado: true,
        puntos: [{ x: xs[i], y: ys[i] }, { x: xs[i + 1], y: ys[i + 1] }],
        fuera: null,
      };
    }
  }
  /* c8 ignore next */
  return punto(n - 1, null, undefined);
}

/** Sólo el número, para los llamadores que no informan la traza. */
export const valorEn = (x, xs, ys) => interpolar(x, xs, ys).valor;

/** La misma tabla escrita como lista de pares `[x, y]`. */
export const interpolarPares = (x, pares) =>
  interpolar(x, pares.map(p => p[0]), pares.map(p => p[1]));

/** Sólo el número, sobre una lista de pares. */
export const valorEnPares = (x, pares) => interpolarPares(x, pares).valor;
