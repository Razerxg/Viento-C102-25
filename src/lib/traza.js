// MODELO DE TRAZA — un solo formato para el panel, la memoria y el Word.
//
// ── POR QUÉ HACE FALTA ─────────────────────────────────────────────────────────
// Las trazas estaban repartidas y cada una con su forma: `edificio.js` devuelve una lista
// de `{ paso, simbolo, valor, unidad, ref, detalle }`, `topografia.js` un objeto
// `{ trazas: { K1, K2, K3 } }`, `velocidad.js` una `cuenta` de texto, `cerramiento.js` una
// tabla de filas por pared y `factorRafaga.js` los intermedios sueltos. Cada pantalla las
// dibujaba a su manera.
//
// El panel, la memoria en Markdown y el Word **muestran lo mismo**. Con tres lectores y
// cinco formatos, lo que pasa es que el panel se corrige y la memoria queda atrás —o al
// revés— y dos salidas de la misma corrida dicen cosas distintas. Este archivo define UNA
// estructura y los tres la renderizan.
//
// ── QUÉ LLEVA UN PASO ──────────────────────────────────────────────────────────
// Lo que hace falta para poder rehacer la cuenta con el reglamento al lado:
//
//   título · artículo · fórmula · «donde:» con TODOS los símbolos · valor · unidad
//   · y los puntos de tabla usados, si hubo interpolación
//
// El bloque «donde:» no es decorativo: una fórmula con seis símbolos y tres explicados es
// una fórmula que hay que ir a buscar a otro lado, que es exactamente lo que la traza
// existe para evitar.

/**
 * @typedef {object} Simbolo
 * @property {string} sim        el símbolo tal como lo escribe el reglamento
 * @property {string} desc       qué es
 * @property {number|string} [valor]
 * @property {string} [unidad]
 * @property {string} [ref]      de dónde sale ESE símbolo, si no es obvio
 */

/**
 * @typedef {object} Paso
 * @property {string} id
 * @property {string} titulo
 * @property {string} art          artículo, figura o tabla. Va en el título del ítem.
 * @property {string} [formula]    en línea propia, seguida del «donde:»
 * @property {Simbolo[]} [donde]
 * @property {number|null} [valor]
 * @property {string} [texto]      cuando el resultado no es un número
 * @property {string} [unidad]
 * @property {number} [dec]
 * @property {{x:number,y:number}[]} [puntos]   los puntos de tabla usados al interpolar
 * @property {string} [nota]
 * @property {"info"|"aviso"|"error"} [tono]
 */

/** @typedef {{ id:string, titulo:string, art?:string, desc?:string, pasos:Paso[] }} Bloque */

const fc = (n, d = 2) => Number(n).toFixed(d).replace(".", ",");

/**
 * Un paso, con los huecos rellenos y sin campos fantasma.
 *
 * Normalizar acá y no en cada productor es lo que hace que el panel pueda confiar en que
 * `donde` es un arreglo y `art` una cadena: si cada origen decidiera por su cuenta, el
 * renderizador se llenaría de `?? []` y un origen que devolviera `null` rompería una sola
 * de las tres salidas.
 *
 * @param {Partial<Paso> & {id:string, titulo:string}} p
 * @returns {Paso}
 */
export const paso = (p) => ({
  id: p.id, titulo: p.titulo, art: p.art ?? "",
  formula: p.formula ?? null, donde: p.donde ?? [],
  valor: p.valor ?? null, texto: p.texto ?? null,
  unidad: p.unidad ?? "", dec: p.dec ?? 2,
  puntos: p.puntos ?? null, nota: p.nota ?? null, tono: p.tono ?? "info",
});

/** @param {{id:string, titulo:string, art?:string, desc?:string, pasos:Paso[]}} b */
export const bloque = (b) => ({ ...b, pasos: b.pasos.filter(Boolean) });

/**
 * Cómo se escribe el resultado de un paso: el número con su unidad, o el texto.
 *
 * Vive acá y no en cada renderizador por la misma razón que `lib/unidades.js`: con tres
 * consumidores escribiendo el formato a mano, un día el panel dice «1.224,5 kN·m» y la
 * memoria «1224.45».
 */
export const valorDe = (p) => p.texto != null ? p.texto
  : p.valor == null ? "—"
    : `${fc(p.valor, p.dec)}${p.unidad ? ` ${p.unidad}` : ""}`;

/** Los puntos de tabla usados, escritos como los lee alguien con la norma al lado. */
export const puntosDe = (p) => !p.puntos?.length ? null
  : p.puntos.length === 1
    ? `Punto de tabla: (${fc(p.puntos[0].x)} · ${fc(p.puntos[0].y, 3)})`
    : `Interpolado entre (${fc(p.puntos[0].x)} · ${fc(p.puntos[0].y, 3)}) y `
      + `(${fc(p.puntos.at(-1).x)} · ${fc(p.puntos.at(-1).y, 3)})`;

// ── ADAPTADOR DE LA TRAZA VIEJA ─────────────────────────────────────────────────
//
// `edificio.js` y los módulos del capítulo 4 producen `{ paso, simbolo, valor, unidad,
// ref, detalle, texto, dec }`. Se convierten acá en vez de reescribir los cinco motores:
// la forma vieja ya está probada contra el reglamento y tocarla sería arriesgar una
// regresión en código validado para ganar prolijidad.
//
// ⚠ EL `detalle` VIEJO NO ES UN «donde:». Es prosa que explica de dónde sale el número, y
// se conserva como `nota`. Los símbolos hay que declararlos donde se escribe la fórmula,
// y eso se hace paso por paso en `consolidar`.

/** @param {any} t @param {string} prefijo */
export const desdeTrazaVieja = (t, prefijo = "") => paso({
  id: `${prefijo}${t.simbolo || t.paso}`.replace(/\s+/g, "_"),
  titulo: t.paso, art: t.ref ?? "",
  valor: typeof t.valor === "number" ? t.valor : null,
  texto: t.texto ?? null, unidad: t.unidad ?? "", dec: t.dec ?? 2,
  donde: t.simbolo ? [{ sim: t.simbolo, desc: t.paso }] : [],
  nota: t.detalle ?? null,
});

// ── SÍMBOLOS DEL REGLAMENTO ────────────────────────────────────────────────────
//
// Un diccionario, no una cadena escrita en cada paso: el mismo `K_zt` aparece en la
// presión dinámica, en el perfil de la pared a barlovento y en la memoria, y con tres
// descripciones distintas el lector no sabe si son tres cosas.
export const SIM = {
  V: { sim: "V", desc: "velocidad básica del viento, ráfaga de 3 s a 10 m en exposición C",
    unidad: "m/s", ref: "Art. 1.5" },
  Kz: { sim: "K_z", desc: "coeficiente de exposición para la presión dinámica",
    ref: "Tabla 1.13-1" },
  Kh: { sim: "K_h", desc: "coeficiente de exposición evaluado a la altura media de cubierta",
    ref: "Tabla 1.13-1" },
  Kzt: { sim: "K_zt", desc: "factor topográfico", ref: "Art. 1.8" },
  K1: { sim: "K₁", desc: "factor de forma del accidente topográfico", ref: "Figura 1.8-1" },
  K2: { sim: "K₂", desc: "factor de distancia a la cresta", ref: "Figura 1.8-1" },
  K3: { sim: "K₃", desc: "factor de decaimiento con la altura", ref: "Figura 1.8-1" },
  Kd: { sim: "K_d", desc: "factor de direccionalidad", ref: "Tabla 1.6-1" },
  Ke: { sim: "K_e", desc: "factor de altitud", ref: "Tabla 1.13-1" },
  qz: { sim: "q_z", desc: "presión dinámica a la altura z", unidad: "N/m²", ref: "Art. 1.13" },
  qh: { sim: "q_h", desc: "presión dinámica a la altura media de cubierta", unidad: "N/m²",
    ref: "Art. 1.13" },
  qi: { sim: "q_i", desc: "presión dinámica para la presión interna", unidad: "N/m²",
    ref: "Art. 2.4.1" },
  G: { sim: "G", desc: "factor de efecto de ráfaga", ref: "Art. 1.9" },
  Cp: { sim: "C_p", desc: "coeficiente de presión externa", ref: "Figura 2.4-1" },
  GCpi: { sim: "(GC_pi)", desc: "coeficiente de presión interna", ref: "Tabla 1.11-1" },
  Ri: { sim: "R_i", desc: "factor de reducción por gran volumen interior",
    ref: "Expresión (1.11-1)" },
  Vi: { sim: "V_i", desc: "volumen interno no dividido", unidad: "m³", ref: "Art. 1.11" },
  Aog: { sim: "A_og", desc: "área total de aberturas de la envolvente", unidad: "m²",
    ref: "Art. 1.11" },
  p: { sim: "p", desc: "presión de diseño sobre la superficie", unidad: "N/m²",
    ref: "Expresión (2.4-1)" },
  h: { sim: "h", desc: "altura media de cubierta", unidad: "m", ref: "Art. 1.2" },
  L: { sim: "L", desc: "dimensión en planta PARALELA a la dirección del viento", unidad: "m" },
  B: { sim: "B", desc: "dimensión en planta NORMAL a la dirección del viento", unidad: "m" },
  theta: { sim: "θ", desc: "ángulo de la cubierta con la horizontal", unidad: "°" },
  Iz: { sim: "I_z̄", desc: "intensidad de turbulencia a la altura equivalente",
    ref: "Expresión (1.9-7)" },
  Lz: { sim: "L_z̄", desc: "escala de longitud integral de la turbulencia", unidad: "m",
    ref: "Expresión (1.9-9)" },
  Q: { sim: "Q", desc: "factor de respuesta de fondo", ref: "Expresión (1.9-8)" },
  n1: { sim: "n₁", desc: "frecuencia natural fundamental", unidad: "Hz", ref: "Art. 1.9.2" },
  e: { sim: "e", desc: "excentricidad de la carga respecto del centro de rigidez",
    unidad: "m", ref: "Figura 2.4-8" },
  MT: { sim: "M_T", desc: "momento torsor", unidad: "N·m", ref: "Figura 2.4-8" },

  // ── CAPÍTULO 5 — COMPONENTES Y REVESTIMIENTOS ──────────────────────────────
  GCp: { sim: "(GC_p)", desc: "coeficiente de presión externa de componentes y "
    + "revestimientos; YA incluye el factor de ráfaga y no se separa", ref: "Art. 5.2.4" },
  A: { sim: "A", desc: "área efectiva de viento del elemento; con ella se LEE el (GC_p)",
    unidad: "m²", ref: "Art. 1.2" },
  Atrib: { sim: "A_trib", desc: "área tributaria real, sobre la que se APLICA la presión",
    unidad: "m²", ref: "Art. 1.2 · comentario C 1.2" },
  Lel: { sim: "L", desc: "luz del elemento entre apoyos", unidad: "m", ref: "Art. 1.2" },
  sep: { sim: "s", desc: "separación entre elementos", unidad: "m", ref: "Art. 1.2" },
  aCyR: { sim: "a", desc: "dimensión de borde que define las zonas", unidad: "m",
    ref: "Figura 5.3-1 y siguientes, Notación" },
  pCyR: { sim: "p", desc: "presión de diseño sobre el componente", unidad: "N/m²",
    ref: "Expresión (5.3-1)" },
  pmin: { sim: "p_mín", desc: "presión neta mínima de diseño, en cualquier dirección "
    + "normal a la superficie", unidad: "N/m²", ref: "Art. 5.2.2" },
};

/** Un símbolo del diccionario con su valor de este caso. */
export const con = (k, valor, extra = {}) => ({ ...SIM[k], valor, ...extra });
