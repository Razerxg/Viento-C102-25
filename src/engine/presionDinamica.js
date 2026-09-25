// PRESIÓN DINÁMICA — artículos 1.8, 1.12 y 1.13 del CIRSOC 102-2025.
//
//     q_z = 0,613 · K_z · K_zt · K_d · K_e · V²        (1.13-1)   [N/m², V en m/s]
//
// El 0,613 es ½·ρ con ρ = 1,225 kg/m³, la densidad del aire a 15 °C y 101,325 kPa. No es
// una constante de ajuste: `Ke` es justamente lo que corrige esa densidad con la altitud.
import { TERRENO, KZ_MAX } from '../constants/exposicion.js';
import { ke } from '../constants/altitud.js';
import { FORMAS_TOPO, CONDICIONES_KZT, HLH_TOPE } from '../constants/topografia.js';

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

// ── FACTOR TOPOGRÁFICO Kzt ──────────────────────────────────────────────────────
//
// Kzt = (1 + K1·K2·K3)², con
//     K1 = (K1/(H/Lh)) · (H/Lh)    del cociente tabulado, que depende de la exposición
//     K2 = 1 − |x|/(μ·Lh)          atenuación horizontal desde la cresta
//     K3 = e^(−γ·z/Lh)             atenuación con la altura sobre el terreno local
//
// `x` se mide desde la cresta y su SIGNO importa sólo para elegir μ: la escarpa atenúa
// mucho más lento a sotavento (μ = 4) que a barlovento (μ = 1,5), porque la estela de
// aceleración se extiende hacia atrás. Tomar μ de barlovento en los dos lados subestimaría
// el efecto justo donde suele estar el edificio.
//
// Devuelve `{ kzt, aplica, motivo }`. Cuando no se cumplen las tres condiciones del
// art. 1.8.1 el resultado es 1,0 y el MOTIVO queda explícito: un 1,0 silencioso es
// indistinguible de un 1,0 por descuido.
export function kzt({ forma, H, Lh, x, z, exposicion, aSotavento = false }) {
  const f = FORMAS_TOPO.find(o => o.id === forma);
  const uno = (motivo) => ({ kzt: 1.0, aplica: false, motivo, K1: 0, K2: 0, K3: 0 });
  if (!f) return uno("No se declaró una forma topográfica: se adopta terreno llano.");
  const h = Number(H), lh = Number(Lh);
  if (!(h > 0) || !(lh > 0)) return uno("Faltan H o Lh de la loma, escarpa o colina.");

  const rel = h / lh;
  if (rel < CONDICIONES_KZT.hLhMin) {
    return uno(`H/Lh = ${rel.toFixed(2)} < 0,20: la pendiente es demasiado suave para `
      + "acelerar el viento de forma significativa (art. 1.8.1).");
  }
  const hMin = CONDICIONES_KZT.hMin[exposicion];
  if (h < hMin) {
    return uno(`H = ${h} m < ${hMin} m, el mínimo para exposición ${exposicion} `
      + "(art. 1.8.1).");
  }

  // Nota 2: por encima de H/Lh = 0,5 el efecto se independiza de la pendiente, y Lh se
  // reemplaza por 2H en K2 y K3. Sin esto, una loma muy escarpada daría un Kzt creciente
  // sin límite, que no es lo que muestran los ensayos.
  const relEf = Math.min(rel, HLH_TOPE);
  const lhEf = rel > HLH_TOPE ? 2 * h : lh;

  const K1 = f.k1[exposicion] * relEf;
  const mu = aSotavento ? f.muSot : f.muBar;
  const K2 = Math.max(0, 1 - Math.abs(Number(x) || 0) / (mu * lhEf));
  const K3 = Math.exp(-f.gamma * (Number(z) || 0) / lhEf);

  return { kzt: Math.pow(1 + K1 * K2 * K3, 2), aplica: true, motivo: null, K1, K2, K3 };
}

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
