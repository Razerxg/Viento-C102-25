// FACTOR DE EFECTO DE RÁFAGA — artículo 1.9 del CIRSOC 102-2025.
//
// La app usaba `G = 0,85`, que es el valor por defecto del art. 1.9.1 para edificio
// rígido. Es válido y conservador, pero esconde dos cosas que el reglamento sí ofrece y
// que una planilla de cálculo muestra:
//
//   · **G CALCULADO** (art. 1.9.4, expresión 1.9-6). Tiene en cuenta el tamaño del
//     edificio y la turbulencia del terreno, y da entre 5 y 10 % MENOS que el 0,85. Sobre
//     un galpón grande eso es dinero.
//   · **Gf DE EDIFICIO FLEXIBLE** (art. 1.9.5, expresión 1.9-10). Es OBLIGATORIO cuando
//     n₁ < 1 Hz: ahí el 0,85 no es conservador sino directamente incorrecto, porque no
//     contiene la respuesta resonante. En el ejemplo del propio reglamento Gf = 1,162.
//
// Se calculan los tres y se informa cuál corresponde, con todos los intermedios a la
// vista. Elegir queda en manos del proyectista; ocultarle que existen, no.
import { TERRENO } from '../constants/exposicion.js';

export const G_POR_DEFECTO = 0.85;
const G_PICO = 3.4;                    // gQ y gv, art. 1.9.4

// Altura equivalente: 0,6·h, pero nunca menor que z_min de la Tabla 1.9-1. El tope existe
// porque cerca del suelo el perfil de turbulencia deja de tener sentido, y sin él un
// galpón bajo daría una intensidad de turbulencia disparatada.
export const alturaEquivalente = (h, exposicion) =>
  Math.max(0.6 * Number(h), TERRENO[exposicion].zmin);

// ── CADENA COMÚN A LAS DOS RAMAS ────────────────────────────────────────────────
export function parametrosRafaga({ h, B, L, exposicion, V }) {
  const t = TERRENO[exposicion];
  const zb = alturaEquivalente(h, exposicion);
  const Iz = t.c * Math.pow(10 / zb, 1 / 6);                       // (1.9-7)
  const Lz = t.l * Math.pow(zb / 10, t.epsM);                      // (1.9-9)
  const Q2 = 1 / (1 + 0.63 * Math.pow((Number(B) + Number(h)) / Lz, 0.63));  // (1.9-8)
  const Vz = t.bM * Math.pow(zb / 10, t.alfaM) * Number(V);        // (1.9-16)
  return { zb, Iz, Lz, Q2, Q: Math.sqrt(Q2), Vz, gQ: G_PICO, gv: G_PICO,
    c: t.c, l: t.l, epsM: t.epsM, alfaM: t.alfaM, bM: t.bM, zmin: t.zmin };
}

// ── G PARA EDIFICIO RÍGIDO — expresión (1.9-6) ──────────────────────────────────
export function gRigido(entrada) {
  const p = parametrosRafaga(entrada);
  const G = 0.925 * (1 + 1.7 * p.gQ * p.Iz * p.Q) / (1 + 1.7 * p.gv * p.Iz);
  return { ...p, G };
}

// ── FRECUENCIA NATURAL APROXIMADA — artículo 1.9.3 ──────────────────────────────
//
// Son límites INFERIORES aproximados, no la frecuencia real. La nota del art. 1.9.2.1 los
// acota: valen para edificios de menos de 90 m y de menos de cuatro veces su longitud
// efectiva. Fuera de eso hay que hacer el análisis.
export const FRECUENCIA_APROX = [
  { id: "porticos_acero", label: "Pórticos de acero resistentes a momento",
    f: (h) => 8.58 / Math.pow(h, 0.8), ref: "(1.9-2)" },
  { id: "porticos_hormigon", label: "Pórticos de hormigón resistentes a momento",
    f: (h) => 14.93 / Math.pow(h, 0.9), ref: "(1.9-3)" },
  { id: "otros", label: "Hormigón y acero con otros sistemas resistentes",
    f: (h) => 22.86 / h, ref: "(1.9-4)" },
];

export const naDe = (id, h) => FRECUENCIA_APROX.find(f => f.id === id)?.f(Number(h)) ?? null;

// ── Gf PARA EDIFICIO FLEXIBLE — expresión (1.9-10) ──────────────────────────────
//
// Obligatorio cuando n₁ < 1 Hz (art. 1.2, definición de edificio flexible).
export function gFlexible({ h, B, L, exposicion, V, n1, beta }) {
  const p = parametrosRafaga({ h, B, L, exposicion, V });
  const n = Number(n1), b = Number(beta);
  if (!(n > 0) || !(b > 0)) return { ...p, Gf: null, motivo: "Faltan n₁ y β." };

  const N1 = n * p.Lz / p.Vz;                                       // (1.9-14)
  const Rn = 7.47 * N1 / Math.pow(1 + 10.3 * N1, 5 / 3);            // (1.9-13)

  // (1.9-15a): el caso η = 0 vale 1 y no es una singularidad removible cualquiera —es el
  // límite—, así que se devuelve explícito en vez de dejar que salga 0/0.
  const Rl = (eta) => eta <= 1e-12 ? 1
    : 1 / eta - (1 - Math.exp(-2 * eta)) / (2 * eta * eta);
  const etah = 4.6 * n * Number(h) / p.Vz;
  const etaB = 4.6 * n * Number(B) / p.Vz;
  const etaL = 15.4 * n * Number(L) / p.Vz;
  const Rh = Rl(etah), RB = Rl(etaB), RL = Rl(etaL);

  const R2 = (1 / b) * Rn * Rh * RB * (0.53 + 0.47 * RL);           // (1.9-12)
  const R = Math.sqrt(R2);
  const ln = Math.log(3600 * n);
  const gR = Math.sqrt(2 * ln) + 0.577 / Math.sqrt(2 * ln);         // (1.9-11)

  const Gf = 0.925 * (1 + 1.7 * p.Iz * Math.sqrt(p.gQ ** 2 * p.Q2 + gR ** 2 * R2))
    / (1 + 1.7 * p.gv * p.Iz);
  return { ...p, N1, Rn, etah, etaB, etaL, Rh, RB, RL, R2, R, gR, Gf, n1: n, beta: b };
}

// ── QUÉ FACTOR CORRESPONDE ──────────────────────────────────────────────────────
//
// Devuelve las tres opciones y CUÁL rige, con el motivo escrito. El art. 1.9.7 advierte
// aparte algo que conviene repetir acá: donde la norma da productos (GCp), (GCpi) o
// (GCpf), el factor de ráfaga NO se puede separar ni reemplazar por éste.
export function factorRafaga({ h, B, L, exposicion, V, n1, beta = 0.02 }) {
  const rig = gRigido({ h, B, L, exposicion, V });
  const flexible = Number(n1) > 0 && Number(n1) < 1;
  const flex = Number(n1) > 0 ? gFlexible({ h, B, L, exposicion, V, n1, beta }) : null;

  // ⚠ EL CALCULADO NO SIEMPRE ES MENOR QUE 0,85, aunque el comentario C 1.9 lo enuncie
  // como si lo fuera. Se ve en la propia expresión: como Q < 1, el cociente
  // (1 + 1,7·g_Q·I_z̄·Q)/(1 + 1,7·g_v·I_z̄) crece hacia 1 cuando la turbulencia baja, y en
  // el límite G → 0,925. Los terrenos lisos tienen poca turbulencia, así que en exposición
  // C y D el calculado SUPERA al 0,85 —del orden de 0,85 a 0,88—, mientras que en B queda
  // por debajo, entre 0,826 y 0,836.
  //
  // La consecuencia práctica: en terreno liso adoptar 0,85 no es más conservador sino
  // MENOS. El art. 1.9.4 permite las dos vías igual, pero suponer que el 0,85 siempre
  // protege es un error, y la app lo dice en vez de dejar que se asuma.
  const calculadoSupera = rig.G > G_POR_DEFECTO;

  const opciones = [
    { id: "defecto", label: "Por defecto, art. 1.9.1", G: G_POR_DEFECTO,
      nota: calculadoSupera
        ? "⚠ En este terreno el calculado lo SUPERA: adoptar 0,85 acá no es más "
          + "conservador. El art. 1.9.4 lo permite igual."
        : "Valor conservador para edificio rígido; no requiere ningún cálculo." },
    { id: "calculado", label: "Calculado, expresión (1.9-6)", G: rig.G,
      nota: calculadoSupera
        ? "SUPERA al valor por defecto. Con poca turbulencia —exposición C y D— el "
          + "cociente de (1.9-6) tiende a 1 y G tiende a 0,925."
        : "Tiene en cuenta el tamaño del edificio y la turbulencia del terreno. En "
          + "exposición B da entre 2 y 3 % menos que el valor por defecto." },
  ];
  if (flex?.Gf != null) {
    opciones.push({ id: "flexible", label: "Flexible, expresión (1.9-10)", G: flex.Gf,
      nota: "Incluye la respuesta resonante. Obligatorio si n₁ < 1 Hz." });
  }

  return {
    rig, flex, flexible, opciones, calculadoSupera,
    rige: flexible ? "flexible" : "defecto",
    motivo: flexible
      ? `n₁ = ${Number(n1).toFixed(2)} Hz < 1 Hz: el edificio es FLEXIBLE (art. 1.2) y `
        + "corresponde G_f de la expresión (1.9-10). El 0,85 no es conservador acá, porque "
        + "no contiene la respuesta resonante."
      : Number(n1) > 0
        ? `n₁ = ${Number(n1).toFixed(2)} Hz ≥ 1 Hz: el edificio es rígido. Se admite `
          + "G = 0,85 sin cálculo, o el calculado de (1.9-6), que da menos."
        : "Sin frecuencia declarada se supone rígido y se adopta G = 0,85 (art. 1.9.1). "
          + "Los edificios de baja altura del art. 1.2 se pueden considerar rígidos.",
  };
}
