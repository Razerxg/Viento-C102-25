// COEFICIENTES DE PRESIÓN EXTERNA Cp — Figura 2.4-1 del CIRSOC 102-2025.
// Edificios cerrados, parcialmente cerrados o parcialmente abiertos. Para todo h.
//
// ── LA TABLA SE ESCRIBE POR FILAS ALINEADAS ──────────────────────────────────────
// Cada columna es un ángulo de cubierta y se lee de arriba abajo, igual que en la figura y
// igual que se la controla contra la norma. En objetos anidados, comparar una columna
// obliga a saltar por toda la pantalla, que es como se cuelan los errores.
//
// ── DOS VALORES EN UNA CELDA NO SON UNA ALTERNATIVA ──────────────────────────────
// Donde la figura lista DOS Cp (p. ej. `−0,7` y `−0,18`), la nota 3 es explícita: la
// pendiente a barlovento está sujeta a presiones positivas Y negativas, y **la estructura
// se debe calcular para ambas condiciones**. No es «elegir la peor»: son dos casos de
// carga, y uno puede gobernar el levantamiento mientras el otro gobierna la compresión.
// Por eso cada celda es un ARRAY y no un número.

// ── PAREDES ──────────────────────────────────────────────────────────────────────
// `usar` dice con qué presión dinámica va cada superficie, y no es un detalle: barlovento
// usa `qz` —varía con la altura— mientras el resto usa `qh`, constante. Confundirlos
// aplana el diagrama de presiones del edificio entero.
export const CP_PARED = {
  barlovento: { cp: 0.8, usar: "qz", nota: "Todos los valores de L/B" },
  // interpolación lineal en L/B entre los puntos tabulados (nota 2)
  sotavento: { puntos: [[0, -0.5], [1, -0.5], [2, -0.3], [4, -0.2]], usar: "qh" },
  lateral:   { cp: -0.7, usar: "qh", nota: "Todos los valores de L/B" },
};

// ── CUBIERTAS, VIENTO NORMAL A LA CUMBRERA CON θ ≥ 10° ───────────────────────────
// Se usan con `qh`. Columnas: θ = 10 · 15 · 20 · 25 · 30 · 35 · 45 · ≥60 grados.
// `0.01θ` en la última columna se evalúa; `MENOS_18` marca el −0,18 del segundo caso.
export const ANG_BARLOVENTO = [10, 15, 20, 25, 30, 35, 45, 60];

export const CP_CUBIERTA_BARLOVENTO = {
  // h/L ≤ 0,25
  0.25: [[-0.7, -0.18], [-0.5, 0.0], [-0.3, 0.2], [-0.2, 0.3], [-0.2, 0.3], [0.0, 0.4], [0.4], ["0.01t"]],
  // h/L = 0,5
  0.5:  [[-0.9, -0.18], [-0.7, -0.18], [-0.4, 0.0], [-0.3, 0.2], [-0.2, 0.2], [-0.2, 0.3], [0.0, 0.4], ["0.01t"]],
  // h/L ≥ 1,0 — el −1,3 lleva reducción por área (ver FACTOR_AREA)
  1.0:  [[-1.3, -0.18], [-1.0, -0.18], [-0.7, -0.18], [-0.5, 0.0], [-0.3, 0.2], [-0.2, 0.2], [0.0, 0.3], ["0.01t"]],
};

// Los `0,0` marcados con * en la figura existen SÓLO para interpolar. La nota 2 lo dice:
// donde no hay dos valores del mismo signo, se toma 0,0 a los fines de la interpolación.
// Tomarlos como un coeficiente real daría presión nula donde la norma no la promete.
export const CERO_INTERPOLACION = new Set(["0.25:15:1", "0.25:35:0", "0.5:20:1", "0.5:45:0", "1.0:25:1", "1.0:45:0"]);

// ── CUBIERTAS, SOTAVENTO ─────────────────────────────────────────────────────────
// Columnas: θ = 10 · 15 · ≥20 grados.
export const ANG_SOTAVENTO = [10, 15, 20];
export const CP_CUBIERTA_SOTAVENTO = {
  0.25: [-0.3, -0.5, -0.6],
  0.5:  [-0.5, -0.5, -0.6],
  1.0:  [-0.7, -0.6, -0.6],
};

// ── CUBIERTAS, θ < 10° Y VIENTO PARALELO A LA CUMBRERA PARA TODO θ ───────────────
// Acá la cubierta se divide en FRANJAS por distancia al borde de barlovento, medidas en
// múltiplos de h. `hasta` es el extremo de la franja en unidades de h; `Infinity` es el resto.
export const CP_CUBIERTA_PARALELO = {
  0.5: [
    { hasta: 0.5,      cp: [-0.9, -0.18] },
    { hasta: 1.0,      cp: [-0.9, -0.18] },
    { hasta: 2.0,      cp: [-0.5, -0.18] },
    { hasta: Infinity, cp: [-0.3, -0.18] },
  ],
  1.0: [
    { hasta: 0.5,      cp: [-1.3, -0.18] },   // lleva reducción por área
    { hasta: Infinity, cp: [-0.7, -0.18] },
  ],
};

// Reducción del −1,3 según el área sobre la que se aplica (nota ** de la figura).
// Interpolación lineal entre los puntos; fuera del rango, los extremos.
export const FACTOR_AREA = [[10, 1.0], [25, 0.9], [100, 0.8]];

// Nota # de la figura: por encima de 80° de pendiente la cubierta se comporta como pared.
export const CP_PENDIENTE_EXTREMA = { desde: 80, cp: 0.8 };

// Voladizos de cubierta (art. 2.4.4): la cara INFERIOR a barlovento recibe presión positiva
// y se combina con la de la cara superior sacada de esta figura.
export const CP_VOLADIZO_INFERIOR = 0.8;

// Parapetos (art. 2.4.5): presión NETA combinada de las dos caras, no se separan.
export const GCPN_PARAPETO = { barlovento: 1.5, sotavento: -1.0 };
