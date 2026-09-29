// COLORES QUE SON DATO, NO TEMA.
//
// ── POR QUÉ ESTÁN ACÁ Y NO EN `components/tokens.js` ────────────────────────────
// Los tokens del tema son variables CSS: cambian con el tema y están elegidos para que la
// aplicación se lea bien. Estos colores no son eso. Son ESCALAS: codifican un valor —qué
// curva, qué región, cuánta sombra— y tienen que seguir significando lo mismo aunque
// mañana cambie el gris de las tarjetas. Es el mismo criterio con el que
// `lib/escalaPresion.js` vive aparte desde el principio.
//
// Consecuencia práctica: hay un test que recorre los croquis y falla si aparece un color
// literal. Ese test es para la TINTA del dibujo, que sí debe salir del tema. Las escalas
// de datos se importan de acá, con nombre, y así queda a la vista cuál es cuál.

/**
 * Paleta CATEGÓRICA de tres entradas, para curvas que hay que distinguir entre sí.
 *
 * Orden fijo: la primera curva siempre es la azul. Si el orden cambiara según el caso, el
 * color dejaría de ser una etiqueta y habría que leer la leyenda en cada gráfico.
 *
 * Los tres tonos están separados en luminancia además de en matiz, así que se distinguen
 * también en una impresión en blanco y negro y con daltonismo rojo-verde.
 */
export const CATEGORICA = {
  claro: ["#2a78d6", "#eb6834", "#1baf7a"],
  oscuro: ["#3987e5", "#d95926", "#199e70"],
};

/** El color de la curva `i`, dando la vuelta si hay más curvas que colores. */
export const categorico = (i, tema = "claro") => {
  const p = CATEGORICA[tema] ?? CATEGORICA.claro;
  return p[i % p.length];
};

/**
 * Rampa de intensidad de una región del caso C de accesorios: el mismo tono, con más
 * opacidad cuanto mayor es el coeficiente. Es una escala SECUENCIAL, no categórica: acá
 * el color sí ordena.
 */
export const rampaRegion = (t) => `rgba(176, 58, 46, ${(0.12 + 0.55 * t).toFixed(3)})`;

/**
 * El velo con que se oscurece una cara de la vista 3D según su orientación. Es sombreado
 * geométrico —cuánta luz recibe la cara—, no una decisión de tema: una cara que mira para
 * abajo está en sombra en los dos temas.
 */
export const SOMBRA = "#000000";
