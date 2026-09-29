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

/** Los nombres de las dimensiones de planta. Ver el comentario de arriba. */
export const EJE = { X: "B_X", Y: "B_Y" };

/** «B_X = 7,5», que es como se acota un lado de la planta. */
export const cotaEje = (eje, v) => `${EJE[eje]} = ${m(v)}`;

/**
 * El nombre de una pared por la cara que mira, como en la Fig. 2.4-8: «Pared +X».
 * Decir «la pared larga» no alcanza cuando hay que llevar el croquis a un plano.
 */
export const pared = (eje, signo) => `Pared ${signo > 0 ? "+" : "−"}${eje}`;
