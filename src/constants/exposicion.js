// CONSTANTES DE EXPOSICIÓN DEL TERRENO — Tabla 1.9-1, y coeficiente Kz — Tabla 1.13-1.
//
// La categoría A del CIRSOC 102-2005 YA NO EXISTE: el comité de ASCE concluyó que los
// centros urbanos densos producen canalización y estelas con una variabilidad demasiado
// grande para caracterizarlos con una categoría, y remite al túnel de viento. Ofrecerla
// sería ofrecer algo que el reglamento retiró.
export const EXPOSICIONES = ["B", "C", "D"];

// [α, zg, α̂, b̂, ᾱ, b̄, c, ℓ, ε̄, zmin] — Tabla 1.9-1. zg, ℓ y zmin en m.
// α y zg definen el perfil de ráfaga y son los únicos que intervienen en Kz. El resto
// alimenta el factor de ráfaga calculado y el Gf de edificios flexibles, que no se
// implementan en esta versión pero se transcriben ahora para no volver sobre la tabla.
export const TERRENO = {
  B: { alfa: 7.5,  zg: 1000, alfaG: 1 / 7.5,  bG: 0.84, alfaM: 1 / 4.5, bM: 0.47, c: 0.30, l: 98,  epsM: 1 / 3.0, zmin: 9.2 },
  C: { alfa: 9.8,  zg: 750,  alfaG: 1 / 9.8,  bG: 1.00, alfaM: 1 / 6.4, bM: 0.66, c: 0.20, l: 152, epsM: 1 / 5.0, zmin: 4.6 },
  D: { alfa: 11.5, zg: 590,  alfaG: 1 / 11.5, bG: 1.09, alfaM: 1 / 8.0, bM: 0.78, c: 0.15, l: 198, epsM: 1 / 8.0, zmin: 2.1 },
};

// ── Kz TABULADO — Tabla 1.13-1 ───────────────────────────────────────────────────
//
// SE GUARDA LA TABLA AUNQUE EL MOTOR USE LA FÓRMULA, y no es redundancia: es el control.
// La nota 1 da la expresión, así que las 60 celdas se pueden reconstruir desde α y zg, que
// son seis números. Un test lo exige. Si una celda estuviera mal leída, la fórmula no la
// reproduce y salta; si se guardara sólo la tabla, no habría con qué compararla.
//
// ⚠ TOLERANCIA 0,01, NO IGUALDAD. El comentario C 1.13.1 lo explica: donde los valores
// recalculados quedaban dentro de 0,01 de los del 102-2005, la comisión CONSERVÓ los
// viejos. O sea que la tabla no es la fórmula redondeada, y exigir igualdad exacta daría
// un test rojo por una decisión deliberada de la norma, no por un error de transcripción.
export const ALTURAS_KZ = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];

export const KZ_TABLA = {
  //     5     10    15    20    25    30    35    40    45    50    60    70    80    90   100   110   120   130   140   150
  B: [0.59, 0.71, 0.79, 0.85, 0.90, 0.95, 0.99, 1.02, 1.05, 1.08, 1.14, 1.19, 1.23, 1.27, 1.30, 1.34, 1.37, 1.40, 1.43, 1.45],
  C: [0.87, 1.00, 1.08, 1.15, 1.20, 1.25, 1.29, 1.33, 1.36, 1.39, 1.44, 1.49, 1.53, 1.56, 1.60, 1.63, 1.66, 1.69, 1.71, 1.74],
  D: [1.05, 1.19, 1.27, 1.34, 1.39, 1.44, 1.47, 1.51, 1.54, 1.57, 1.62, 1.66, 1.70, 1.74, 1.77, 1.80, 1.83, 1.85, 1.88, 1.90],
};

// El tope de 2,41 es la altura gradiente: por encima de zg el perfil deja de crecer.
export const KZ_MAX = 2.41;
