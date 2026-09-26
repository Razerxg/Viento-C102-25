// UNIDADES — LA CONVERSIÓN VIVE ACÁ Y EN NINGÚN OTRO LADO.
//
// ── LA REGLA ────────────────────────────────────────────────────────────────────
// El MOTOR trabaja siempre en **N, m, N/m²**. Son las unidades en las que el reglamento
// escribe sus expresiones —`q = 0,613·K_z·K_zt·K_d·K_e·V²` da N/m² con V en m/s— así que
// no hay ninguna conversión adentro del cálculo y no puede haber un factor 1000 perdido
// entre dos pasos.
//
// La conversión ocurre **en el borde**: cuando un número sale a una pantalla, a una
// memoria, a un CSV o a un JSON. Este módulo es el único lugar donde ocurre.
//
// ── POR QUÉ ES OBLIGATORIO Y NO UNA COMODIDAD ───────────────────────────────────
// Antes cada pantalla dividía por 1000 a mano: `f(res.cortante / 1000, 1)` repetido
// treinta y dos veces. Dos problemas, los dos silenciosos:
//
//   · el día que una de las treinta y dos se olvida, la pantalla muestra newtons donde
//     dice kN y el número es mil veces más grande, que en una tabla de resultados no
//     llama la atención tanto como debería;
//   · la unidad queda escrita como texto suelto al lado del número, así que cambiarla
//     obliga a tocar los dos lugares y nada verifica que coincidan.
//
// Acá el valor y su unidad salen juntos del mismo lugar. Hay un test que recorre los
// componentes y falla si vuelve a aparecer una conversión a mano.
//
// ── LA UNIDAD DE LONGITUD ES CONFIGURABLE ───────────────────────────────────────
// La memoria de cálculo va en **mm**, que es lo que se acota en un plano; el CSV y el
// JSON para Cype3D y Dynamo van en **m**, que es lo que espera un modelo de barras. La
// pantalla va en m. Por eso hay perfiles y no una constante.

/**
 * @typedef {"fuerza"|"presion"|"momento"|"longitud"|"area"|"velocidad"} Magnitud
 */

/**
 * Factores DESDE la unidad interna. Se escriben como potencias exactas de diez: `1e-3` y
 * no `0.001`, para que no haya que mirar dos veces cuántos ceros hay.
 *
 * `kPa` y `kN/m²` son la misma unidad con dos nombres, y las dos se usan: el reglamento
 * habla de kN/m² y un informe geotécnico de kPa. Tenerlas separadas evita que alguien
 * «convierta» entre ellas.
 */
export const UNIDADES = {
  fuerza:    { interna: "N",    factores: { "N": 1, "kN": 1e-3, "MN": 1e-6 } },
  presion:   { interna: "N/m²", factores: { "N/m²": 1, "kN/m²": 1e-3, "kPa": 1e-3, "MPa": 1e-6 } },
  momento:   { interna: "N·m",  factores: { "N·m": 1, "kN·m": 1e-3, "MN·m": 1e-6 } },
  longitud:  { interna: "m",    factores: { "m": 1, "cm": 1e2, "mm": 1e3 } },
  area:      { interna: "m²",   factores: { "m²": 1, "cm²": 1e4, "mm²": 1e6 } },
  velocidad: { interna: "m/s",  factores: { "m/s": 1, "km/h": 3.6 } },
};

/** Decimales razonables por unidad. Se pueden pisar en cada llamada. */
const DECIMALES = {
  "N": 0, "kN": 1, "MN": 3,
  "N/m²": 0, "kN/m²": 3, "kPa": 3, "MPa": 4,
  "N·m": 0, "kN·m": 1, "MN·m": 3,
  "m": 2, "cm": 1, "mm": 0,
  "m²": 1, "cm²": 0, "mm²": 0,
  "m/s": 1, "km/h": 1,
};

/**
 * Los tres destinos, con la unidad de salida de cada magnitud.
 *
 * ⚠ LA LONGITUD ES LO ÚNICO QUE CAMBIA ENTRE PERFILES, y cambia por una razón concreta:
 * una memoria acota en milímetros como un plano, y un modelo de barras espera metros.
 * Las demás magnitudes van en las unidades del reglamento en los tres.
 */
export const PERFILES = {
  pantalla: { fuerza: "kN", presion: "N/m²", momento: "kN·m", longitud: "m",
    area: "m²", velocidad: "m/s" },
  memoria:  { fuerza: "kN", presion: "kN/m²", momento: "kN·m", longitud: "mm",
    area: "m²", velocidad: "m/s" },
  datos:    { fuerza: "kN", presion: "kN/m²", momento: "kN·m", longitud: "m",
    area: "m²", velocidad: "m/s" },
};

/** El nombre del perfil, tal como va en el campo `unidades` de un CSV o un JSON. */
export const esquemaDe = (perfil) => ({ ...perfil });

/**
 * Convierte un valor de la unidad INTERNA a `unidad`. Sin formatear: es lo que va a un
 * CSV o a un JSON, donde el separador decimal lo pone el consumidor.
 *
 * @param {Magnitud} magnitud
 * @param {number} valor  en la unidad interna
 * @param {string} unidad
 */
export function convertir(magnitud, valor, unidad) {
  const def = UNIDADES[magnitud];
  if (!def) throw new Error(`unidades: magnitud desconocida «${magnitud}»`);
  const factor = def.factores[unidad];
  if (factor === undefined) {
    throw new Error(`unidades: «${unidad}» no es una unidad de ${magnitud}. `
      + `Las que hay: ${Object.keys(def.factores).join(", ")}.`);
  }
  return Number(valor) * factor;
}

/** Coma decimal para mostrar, punto para el dato. */
const coma = (n, d) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "—");

/**
 * Un formateador atado a un perfil de unidades.
 *
 * Cada método toma el valor EN UNIDADES INTERNAS y devuelve el texto con su unidad. El
 * llamador no divide por mil ni escribe la unidad a mano: las dos cosas salen de acá, así
 * que no pueden discrepar entre sí.
 *
 * @param {Record<string,string>} [perfil]
 */
export function unidades(perfil = PERFILES.pantalla) {
  /** @param {Magnitud} m @param {number} v @param {number} [dec] */
  const texto = (m, v, dec) => {
    const u = perfil[m] ?? UNIDADES[m].interna;
    return `${coma(convertir(m, v, u), dec ?? DECIMALES[u] ?? 2)} ${u}`;
  };
  /** @param {Magnitud} m @param {number} v @param {number} [dec] */
  const soloNumero = (m, v, dec) => {
    const u = perfil[m] ?? UNIDADES[m].interna;
    return coma(convertir(m, v, u), dec ?? DECIMALES[u] ?? 2);
  };

  return {
    perfil,
    /** Con unidad: «356,8 kN». */
    fuerza: (v, d) => texto("fuerza", v, d),
    presion: (v, d) => texto("presion", v, d),
    momento: (v, d) => texto("momento", v, d),
    longitud: (v, d) => texto("longitud", v, d),
    area: (v, d) => texto("area", v, d),
    velocidad: (v, d) => texto("velocidad", v, d),
    /** Sin unidad, para cuando la unidad está en el encabezado de una columna. */
    n: { fuerza: (v, d) => soloNumero("fuerza", v, d),
      presion: (v, d) => soloNumero("presion", v, d),
      momento: (v, d) => soloNumero("momento", v, d),
      longitud: (v, d) => soloNumero("longitud", v, d),
      area: (v, d) => soloNumero("area", v, d),
      velocidad: (v, d) => soloNumero("velocidad", v, d) },
    /** El número convertido, sin formatear: para CSV y JSON. */
    val: { fuerza: (v) => convertir("fuerza", v, perfil.fuerza),
      presion: (v) => convertir("presion", v, perfil.presion),
      momento: (v) => convertir("momento", v, perfil.momento),
      longitud: (v) => convertir("longitud", v, perfil.longitud),
      area: (v) => convertir("area", v, perfil.area),
      velocidad: (v) => convertir("velocidad", v, perfil.velocidad) },
    /** La unidad de cada magnitud, para encabezados y para el campo `unidades`. */
    u: { ...perfil },
  };
}

/** El formateador de pantalla, que es el que usan los componentes. */
export const U = unidades(PERFILES.pantalla);
