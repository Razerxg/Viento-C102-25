// FACTOR DE ALTITUD DEL TERRENO, Ke — Tabla 1.12-1 y su fórmula.
//
// Ajusta la densidad del aire con la altura sobre el nivel del mar. A 1800 m vale 0,80: es
// un 20 % de la presión, así que en la cordillera no es un refinamiento.
//
// **Ke = 1,0 SIEMPRE ESTÁ PERMITIDO** (nota 1), y es conservador en todo el país salvo bajo
// el nivel del mar. La app lo ofrece como opción explícita, no como un silencio.
export const KE_TABLA = [
  [0, 1.00], [300, 0.96], [600, 0.93], [900, 0.90], [1200, 0.86], [1500, 0.83], [1800, 0.80],
];

// Nota 2: fórmula válida para TODAS las altitudes, también fuera del rango tabulado.
export const ke = (altitud) => Math.exp(-0.000119 * (Number(altitud) || 0));

// ⚠ LA TABLA Y LA FÓRMULA NO COINCIDEN EXACTAMENTE. A 1200 m la fórmula da 0,8669 y la
// tabla dice 0,86; a 1500 da 0,8365 contra 0,83. La norma admite las dos vías —«se
// calculará interpolando valores de la Tabla 1.12-1 o de la siguiente fórmula»—, así que
// no hay una correcta y otra equivocada: hay dos caminos permitidos que difieren hasta
// 0,007. El motor usa la FÓRMULA, que es continua y no obliga a interpolar, y el test
// verifica la concordancia con esa tolerancia en vez de exigir igualdad.
export const TOLERANCIA_KE = 0.008;
