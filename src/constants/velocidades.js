// VELOCIDAD BÁSICA DEL VIENTO — Figura 1.5-1D del CIRSOC 102-2025.
//
// La norma da TRES mapas, uno por categoría de riesgo, y además esta tabla de ciudades que
// los resume. Es la tabla la que alimenta el selector por localidad: leer una isolínea de
// un mapa a ojo es justamente lo que la app viene a evitar.
//
//   Categoría II      → Figura 1.5-1A, período de retorno    700 años
//   Categorías III-IV → Figura 1.5-1B, período de retorno  1.700 años
//   Categoría I       → Figura 1.5-1C, período de retorno    300 años
//
// `V` es velocidad de RÁFAGA DE 3 SEGUNDOS a 10 m sobre el terreno, en exposición C, en m/s.
// No es una velocidad media: usarla como tal subestimaría la presión a la mitad.
//
// ── POR QUÉ SE GUARDA TAMBIÉN v50 ────────────────────────────────────────────────
//
// Las tres columnas NO son independientes. El comentario C 1.5 da la expresión (C 1.5-6.1)
// con que se construyeron:
//
//     V_T = √(1,5 · V50² · I)        I = 0,87 (cat. I) · 1,00 (cat. II) · 1,15 (cat. III-IV)
//
// donde `V50` es la velocidad del CIRSOC 102-2005 para 50 años de recurrencia. O sea que
// cada fila sale de UN solo número por tres factores fijos: √1,305 · √1,5 · √1,725.
//
// Guardar ese `v50` y exigir que las tres columnas se reconstruyan a partir de él es lo que
// convierte a la tabla en verificable. Una cifra transpuesta —73,5 por 75,3— no admite
// NINGÚN `v50` que satisfaga las tres columnas a la vez, así que el test la caza. Es el
// mismo mecanismo del test de los 228 espesores del catálogo de caños: una grilla que el
// error de tipeo no puede satisfacer por casualidad.
//
// Los `v50` se despejaron de la columna II y resultaron todos enteros, salvo Comodoro
// Rivadavia con 67,5. Esa regularidad no es casual —son los valores del mapa del 2005— y
// el test también la exige: un `v50` que saliera con tres decimales sería señal de que
// alguna de las tres columnas está mal leída.

// Factores de importancia de la expresión (C 1.5-6.1), por categoría de riesgo.
export const I_RIESGO = { I: 0.87, II: 1.00, III: 1.15, IV: 1.15 };

// V = v50 · √(1,5 · I). Se deja explícito porque es la regla que el test verifica.
export const factorV = (cat) => Math.sqrt(1.5 * I_RIESGO[cat]);

// [ciudad, v50, V_I, V_II, V_III-IV] — v50 en m/s, las tres V en m/s.
// Escrita POR FILAS ALINEADAS, como la figura: así se controla una columna de arriba abajo
// contra la norma, sin saltar por la pantalla.
export const CIUDADES = [
  ["Bahía Blanca",           55,   62.8, 67.4, 72.2],
  ["Bariloche",              46,   52.5, 56.3, 60.4],
  ["Buenos Aires",           45,   51.4, 55.1, 59.1],
  ["Catamarca",              43,   49.1, 52.7, 56.5],
  ["Comodoro Rivadavia",     67.5, 77.1, 82.7, 88.7],
  ["Córdoba",                45,   51.4, 55.1, 59.1],
  ["Corrientes",             46,   52.5, 56.3, 60.4],
  ["Formosa",                45,   51.4, 55.1, 59.1],
  ["La Plata",               46,   52.5, 56.3, 60.4],
  ["La Rioja",               44,   50.3, 53.9, 57.8],
  ["Mar del Plata",          51,   58.3, 62.5, 67.0],
  ["Mendoza",                39,   44.6, 47.8, 51.2],
  ["Neuquén",                48,   54.8, 58.8, 63.0],
  ["Paraná",                 52,   59.4, 63.7, 68.3],
  ["Posadas",                45,   51.4, 55.1, 59.1],
  ["Rawson",                 60,   68.5, 73.5, 78.8],
  ["Resistencia",            45,   51.4, 55.1, 59.1],
  ["Río Gallegos",           60,   68.5, 73.5, 78.8],
  ["Rosario",                50,   57.1, 61.2, 65.7],
  ["Salta",                  35,   40.0, 42.9, 46.0],
  ["San Juan",               40,   45.7, 49.0, 52.5],
  ["San Luis",               45,   51.4, 55.1, 59.1],
  ["San Miguel de Tucumán",  40,   45.7, 49.0, 52.5],
  ["San Salvador de Jujuy",  34,   38.8, 41.6, 44.7],
  ["Santa Fe",               51,   58.3, 62.5, 67.0],
  ["Santa Rosa",             50,   57.1, 61.2, 65.7],
  ["Santiago del Estero",    43,   49.1, 52.7, 56.5],
  ["Ushuaia",                60,   68.5, 73.5, 78.8],
  ["Viedma",                 60,   68.5, 73.5, 78.8],
];

// ⚠ EL ORDEN DEL DESPLEGABLE SALE DE ESTA LISTA, NO DE UN `Object.keys`.
// Está alfabético como en la figura. Convertirla a objeto dejaría que JavaScript reordene
// las claves, y además ninguna clave de acá es numérica pero la lección ya se aprendió en
// `soporte-elevado-v4` con los diámetros de caño: el orden es un dato, no un accidente.
export const NOMBRES_CIUDAD = CIUDADES.map(([n]) => n);

// `V` de una ciudad para una categoría de riesgo. Devuelve `null` si la ciudad no está:
// inventar una velocidad interpolando entre dos ciudades cualesquiera sería inventar el
// dato de entrada de todo el cálculo.
export function velocidadDe(ciudad, cat = "II") {
  const f = CIUDADES.find(([n]) => n === ciudad);
  if (!f) return null;
  const col = { I: 2, II: 3, III: 4, IV: 4 }[cat];
  return col === undefined ? null : f[col];
}
