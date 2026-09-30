// CÓMO SE ESCRIBE UN NÚMERO EN UN CROQUIS.
//
// Un solo lugar, igual que `lib/unidades.js` es el único lugar donde se convierte. Acá no
// se convierte nada: se decide la PRESENTACIÓN, que es una decisión distinta y que estaba
// tomada nueve veces —una por croquis— y de tres maneras.
//
// Lo que había, medido sobre el proyecto de referencia:
//   · «a = 7,50 m» y «b = 11,00 m» en la planta del capítulo 2, con dos ceros que no
//     dicen nada y con las letras `a` y `b`, que en el capítulo 5 significan otra cosa;
//   · «11.000» y «a = 1.000» en el croquis de C&R, en milímetros y con punto de miles,
//     que en una pantalla con coma decimal se leen como once y como uno;
//   · «0.50h», «1.00h», «Cp -0.90» y «L/B = 0.68» con PUNTO decimal, escritos con
//     `toFixed` a mano en cuatro archivos distintos.
//
// ── LAS DIMENSIONES DE PLANTA SE LLAMAN X E Y ───────────────────────────────────
// ⚠ NUNCA `a` NI `b`. En el capítulo 5 `a` es el ANCHO DE ZONA —el 10 % de la menor
// dimensión, acotado en el mismo dibujo— y llamar `a` también al lado de la planta pone
// dos magnitudes distintas bajo la misma letra en la misma figura. La Fig. 2.4-8 del
// reglamento las llama `B_X` y `B_Y`; acá se usa eso.
import { unidades, PERFILES } from '../../lib/unidades.js';
import { corto } from '../../lib/formato.js';

const U = unidades(PERFILES.croquis);

/** Una longitud, en metros y sin ceros sobrantes: «7,5» · «11» · «3,59». */
export const m = (v, dec = 2) => corto(U.val.longitud(v), dec);

/** Una longitud con su unidad, para cuando el croquis no declara «Cotas en m». */
export const mU = (v, dec = 2) => `${m(v, dec)} m`;

/** Una presión, en kN/m² con dos decimales: «1,79». La unidad va en la leyenda. */
export const q = (v, dec = 2) => corto(U.val.presion(v), dec);

/** Una presión con su unidad: «−1,69 kN/m²». */
export const qU = (v, dec = 2) => `${q(v, dec)} kN/m²`;

/** Un coeficiente adimensional, con coma: «−0,9» · «0,68». */
export const coef = (v, dec = 2) => corto(v, dec);

// ── SIMBOLOGÍA O MEDIDA: LA MISMA COTA, DOS LECTURAS ───────────────────────────
//
// Una cota de croquis responde a dos preguntas distintas y no puede responder a las dos con
// el mismo texto:
//
//   · «¿qué dice el reglamento acá?» → el SÍMBOLO: `2a`, `0,6h`, `h/2`, `B_X`. Es la figura
//     de la norma, y es lo que se compara contra el papel;
//   · «¿cuánto mido en la obra?» → la MEDIDA: `1,50`. Es lo que se transcribe al plano de
//     correas.
//
// ⚠ ESTO CONMUTA UNA DECISIÓN ANTERIOR, Y POR ESO ES UN CONMUTADOR Y NO UN REEMPLAZO. La
// regla 6 pedía rotular las franjas con nombre Y largo en metros —«0 a h/2 = 1,5», no
// «0.50h»— justamente para que el croquis sirviera para pasar medidas al plano. Con el
// dibujo lleno de números, la figura dejó de leerse como la de la norma: son dos usos
// legítimos del mismo croquis, así que se elige. El defecto es `simbolo`, que es la lectura
// que el proyectista pidió, y las medidas completas siguen estando —siempre, en los dos
// modos— en la tabla de anchos de zona y en la memoria, que es de donde se transcriben.
export const ROTULOS = /** @type {const} */ (["simbolo", "medida", "ambos"]);

export const ETIQUETA_ROTULOS = {
  simbolo: "Símbolos",
  medida: "Medidas",
  ambos: "Símbolo y medida",
};

export const AYUDA_ROTULOS = "Cómo se rotulan las cotas de los croquis. «Símbolos» deja el "
  + "dibujo como la figura del reglamento —2a, 0,6h, B_X— y es con lo que se controla contra "
  + "el papel; «Medidas» pone el número en metros, que es lo que se transcribe al plano. Las "
  + "medidas completas están siempre en la tabla de anchos de zona y en la memoria, en los "
  + "tres modos.";

/**
 * Una cota, según el modo de rotulación.
 *
 * @param {string} simbolo  la expresión del reglamento: «2a», «0,6h», «B_X», «h_c»
 * @param {number|null} valor  la medida, en unidades internas (m); `null` = no hay medida
 * @param {"simbolo"|"medida"|"ambos"} modo
 */
export function cota(simbolo, valor, modo = "simbolo") {
  // Sin símbolo no hay nada que elegir: se escribe la medida, o el modo «símbolos» dejaría
  // la cota muda. Pasa en las cotas que la norma no nombra —el largo de un tramo de q(z)—.
  if (!simbolo) return valor == null ? "—" : m(valor);
  // Y sin medida tampoco: es el caso de `«—»` de `cotasDeZona`, las zonas que son «el resto».
  if (valor == null || !Number.isFinite(valor)) return simbolo;
  if (modo === "simbolo") return simbolo;
  if (modo === "medida") return m(valor);
  return `${simbolo} = ${m(valor)}`;
}

/** Los nombres de las dimensiones de planta. Ver el comentario de arriba. */
export const EJE = { X: "B_X", Y: "B_Y" };

/** «B_X = 7,5» o «B_X», según el modo. */
export const cotaEje = (eje, v, modo = "simbolo") => cota(EJE[eje], v, modo);

/**
 * El nombre de una pared por la cara que mira, como en la Fig. 2.4-8: «Pared +X».
 * Decir «la pared larga» no alcanza cuando hay que llevar el croquis a un plano.
 */
export const pared = (eje, signo) => `Pared ${signo > 0 ? "+" : "−"}${eje}`;

// ── LOS NOMBRES DE LAS FRANJAS DE LA FIG. 2.4-1 ─────────────────────────────────
//
// Las franjas de cubierta se miden en múltiplos de `h` desde el borde de barlovento, y el
// reglamento las escribe así: «0 a h/2», «h/2 a h», «h a 2h», «más de 2h».
//
// ⚠ VIVE ACÁ Y NO EN CADA CROQUIS. El motor las nombra «franja 0.5h a 1h» —con PUNTO
// decimal, porque es una referencia interna y no un rótulo— y ese texto se estaba usando tal
// cual en el 3D: el croquis mostraba «0.5h» al lado de cotas con coma. La elevación tenía su
// propia versión, correcta; con dos implementaciones, un día una dice «h/2» y la otra «0,5h»
// para la misma franja.

/** Un múltiplo de `h`, como lo escribe la figura: «0» · «h/2» · «h» · «2h». */
export const enH = (v) => {
  if (Math.abs(v) < 1e-9) return "0";
  if (Math.abs(v - 0.5) < 1e-9) return "h/2";
  if (Math.abs(v - 1) < 1e-9) return "h";
  return `${coef(v, 2)}h`;
};

/**
 * El nombre de una franja: «h/2 a h», o «más de 2h» si llega al final de la cubierta.
 * @param {number} desde @param {number} hasta  en múltiplos de h
 * @param {number} tope   dónde termina la cubierta, en múltiplos de h
 */
export const nombreFranja = (desde, hasta, tope) =>
  (hasta >= tope - 1e-9 ? `más de ${enH(desde)}` : `${enH(desde)} a ${enH(hasta)}`);
