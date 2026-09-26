// PRESIÓN DINÁMICA — artículos 1.8, 1.12 y 1.13 del CIRSOC 102-2025.
//
//     q_z = 0,613 · K_z · K_zt · K_d · K_e · V²        (1.13-1)   [N/m², V en m/s]
//
// El 0,613 es ½·ρ con ρ = 1,225 kg/m³, la densidad del aire a 15 °C y 101,325 kPa. No es
// una constante de ajuste: `Ke` es justamente lo que corrige esa densidad con la altitud.
import { TERRENO, KZ_MAX } from '../constants/exposicion.js';
import { ke } from '../constants/altitud.js';

export const RHO_MEDIO = 0.613;

// ── COEFICIENTE DE EXPOSICIÓN Kz ────────────────────────────────────────────────
//
// Se calcula con la expresión de la nota 1 de la Tabla 1.13-1 y NO interpolando la tabla:
// la fórmula es continua, no obliga a elegir entre filas y da el mismo resultado dentro de
// 0,01 (hay test que lo verifica contra las 60 celdas).
//
// Los tres tramos no son un refinamiento: por debajo de 5 m el perfil se CONGELA —si no,
// Kz tendería a cero al nivel del suelo y la presión sobre el zócalo daría casi nada— y
// por encima de la altura gradiente zg deja de crecer, topeado en 2,41.
export function kz(z, exposicion) {
  const t = TERRENO[exposicion];
  if (!t) return null;
  const alt = Number(z);
  if (!Number.isFinite(alt) || alt < 0) return null;
  if (alt > 1000) return null;              // fuera del alcance del reglamento
  if (alt > t.zg) return KZ_MAX;
  const zEf = Math.max(alt, 5);             // tramo congelado por debajo de 5 m
  return KZ_MAX * Math.pow(zEf / t.zg, 2 / t.alfa);
}

// El FACTOR TOPOGRÁFICO Kzt vive en `engine/topografia.js`, no acá.
//
// Se mudó al reescribirlo con los dos métodos del art. 1.8.2, las tres condiciones del
// art. 1.8.1 reportadas una por una y la trazabilidad de la interpolación: son 250 líneas
// con sus propias tablas, y mezclarlas con la presión dinámica hacía que este archivo
// tratara dos temas distintos. `q()` lo recibe ya calculado, como un número.

// ── PRESIÓN DINÁMICA ────────────────────────────────────────────────────────────
//
// `qh` es esta misma expresión evaluada con Kz a la altura media de cubierta: no hay una
// fórmula aparte, es el mismo cálculo con otra z. Por eso hay UNA sola función.
export function q({ z, V, exposicion, kd, Kzt = 1.0, altitud = 0, usarKe = true }) {
  const Kz = kz(z, exposicion);
  if (Kz === null) return null;
  const v = Number(V);
  if (!(v > 0)) return null;
  const Ke = usarKe ? ke(altitud) : 1.0;
  return RHO_MEDIO * Kz * Kzt * Number(kd) * Ke * v * v;
}
