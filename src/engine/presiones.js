// PRESIÓN DE VIENTO SOBRE CADA SUPERFICIE — artículo 2.4 del CIRSOC 102-2025.
//
//     p = q·G·Cp − qi·(GCpi)      (2.4-1)   edificios cerrados, parc. cerrados y parc. abiertos
//     p = qh·G·CN                 (2.4-3)   edificios abiertos
//
// ── QUÉ PRESIÓN DINÁMICA VA EN CADA TÉRMINO ─────────────────────────────────────
// No es un detalle: es lo que hace que el diagrama de presiones tenga la forma correcta.
//
//   q  = q_z  en la pared a BARLOVENTO, evaluada a la altura z de cada punto → crece con z
//   q  = q_h  en sotavento, laterales y cubierta → CONSTANTE en toda la superficie
//   qi = q_h  para la presión interna, salvo la positiva en parcialmente cerrados o
//             parcialmente abiertos, donde se usa q_z a la altura de la abertura más alta
//
// La excepción del `qi` tiene su razón en el comentario C 2.4.1: la presión interna
// positiva la dicta la abertura por donde entra el viento, y esa abertura está a su altura,
// no a la del techo. En un edificio de 90 m con la abertura a 18 m, tomar `qh` infla la
// presión interna un 59 % sin ningún fundamento físico.
import { CP_PARED, CP_CUBIERTA_BARLOVENTO, CP_CUBIERTA_SOTAVENTO, CP_CUBIERTA_PARALELO,
  ANG_BARLOVENTO, ANG_SOTAVENTO, FACTOR_AREA } from '../constants/presionesExternas.js';

// Interpolación lineal sobre una lista de pares [x, y], con los extremos planos.
// Se usa para L/B, h/L, θ y el factor de área, que es donde la norma la autoriza (nota 2).
export function interp(puntos, x) {
  const p = [...puntos].sort((a, b) => a[0] - b[0]);
  if (x <= p[0][0]) return p[0][1];
  if (x >= p.at(-1)[0]) return p.at(-1)[1];
  const i = p.findIndex(([px]) => px >= x);
  const [x0, y0] = p[i - 1], [x1, y1] = p[i];
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}

export const cpBarlovento = () => CP_PARED.barlovento.cp;
export const cpLateral = () => CP_PARED.lateral.cp;
// L = dimensión paralela al viento, B = normal al viento.
export const cpSotavento = (L, B) => interp(CP_PARED.sotavento.puntos, (Number(L) || 0) / (Number(B) || 1));

// Reducción del Cp = −1,3 según el área sobre la que actúa (nota ** de la Figura 2.4-1).
export const factorArea = (area) => interp(FACTOR_AREA, Number(area) || 0);

// ── PRESIÓN SOBRE UNA SUPERFICIE ────────────────────────────────────────────────
//
// Devuelve SIEMPRE los dos casos de presión interna, positivo y negativo. La nota 3 de la
// Tabla 1.11-1 lo exige, y no es elegir el peor: uno gobierna el levantamiento de la
// cubierta y el otro la compresión de las paredes, en combinaciones distintas. Devolver un
// solo número obligaría a que el llamador recuerde hacer esto, y tarde o temprano no lo
// hace.
export function presion({ q, qi, G, Cp, GCpi }) {
  const externa = Number(q) * Number(G) * Number(Cp);
  const interna = Number(qi) * Math.abs(Number(GCpi));
  return {
    externa,
    conInternaPos: externa - interna,      // GCpi positivo: empuja hacia afuera desde adentro
    conInternaNeg: externa + interna,      // GCpi negativo: succiona hacia adentro
    // el valor que gobierna en magnitud, para ordenar y colorear; NO reemplaza a los dos
    gobernante: Math.abs(externa - interna) > Math.abs(externa + interna)
      ? externa - interna : externa + interna,
  };
}

// Edificios abiertos, expresión (2.4-3). CN ya incluye las dos caras de la cubierta, así
// que no hay presión interna que restar: sumarla sería contarla dos veces.
export const presionAbierto = ({ qh, G, CN }) => Number(qh) * Number(G) * Number(CN);

// ── CARGAS MÍNIMAS — artículo 2.1.5 ─────────────────────────────────────────────
//
// No son un piso cosmético: con V = 40 m/s gobiernan de verdad, y la Tabla 2.5-2 del propio
// reglamento lo muestra —su primera fila dice 750 N/m² donde el cálculo da 650—.
export const MINIMOS = { pared: 750, cubierta: 400, abierto: 750 };   // N/m²

export const aplicarMinimoPared = (p) => Math.sign(p || 1) * Math.max(Math.abs(p), MINIMOS.pared);
