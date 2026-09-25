// FACTOR DE DIRECCIONALIDAD DEL VIENTO, Kd — Tabla 1.6-1 del CIRSOC 102-2025.
//
// ⚠ Kd SÓLO SE APLICA CON LAS COMBINACIONES DE CARGA DEL APÉNDICE B. La nota al pie de la
// tabla es explícita: el factor se calibró junto con esas combinaciones. Usarlo con otro
// juego de combinaciones baja la carga un 15 % sin ninguna justificación, y como el
// resultado sigue siendo un número plausible, no hay forma de notarlo mirando la salida.
// La app tiene que decirlo donde se elige Kd.
//
// El factor recoge dos probabilidades que no son ciertas a la vez: que el viento máximo
// venga justo de la dirección más desfavorable, y que el coeficiente de presión máximo
// ocurra justo para esa dirección.
export const KD = [
  // [clave, rótulo, Kd, nota]
  ["edificio_sprfv",  "Edificios — sistema principal resistente a la fuerza del viento", 0.85, null],
  ["edificio_cyr",    "Edificios — componentes y revestimientos",                        0.85, null],
  ["cubierta_abov",   "Cubiertas abovedadas",                                            0.85, null],
  ["chim_cuadrada",   "Chimeneas, tanques y similares — cuadradas",                      0.90, null],
  ["chim_hexagonal",  "Chimeneas, tanques y similares — hexagonales",                    0.95, null],
  ["chim_redonda",    "Chimeneas, tanques y similares — redondas",                       1.00, "alfa"],
  ["chim_octogonal",  "Chimeneas, tanques y similares — octogonales",                    1.00, "alfa"],
  ["cartel_lleno",    "Carteles llenos",                                                 0.85, null],
  ["cartel_abierto",  "Carteles abiertos y estructura reticulada",                       0.85, null],
  ["torre_tri_cua",   "Torres reticuladas — triangular, cuadrada, rectangular",          0.85, null],
  ["torre_otra",      "Torres reticuladas — toda otra sección transversal",              0.95, null],
];

// Nota α de la tabla: en redondos y octogonales se ADMITE 0,95 en lugar de 1,00, pero sólo
// en estructuras con sistemas estructurales no asimétricos. Es una opción del proyectista,
// no un valor alternativo cualquiera, así que se ofrece marcada y no como otra fila más.
export const NOTA_ALFA = "Se permite Kd = 0,95 en estructuras redondas u octogonales con "
  + "sistemas estructurales no asimétricos.";

export const kdDe = (clave) => KD.find(([k]) => k === clave)?.[2] ?? null;
