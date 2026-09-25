// FACTOR DE RÁFAGA, VERIFICADO CONTRA EL EJEMPLO DEL PROPIO REGLAMENTO.
//
// La Tabla C 1.9-1 del comentario resuelve un caso completo —edificio de 183 m, 30 × 30,
// exposición B, V = 51 m/s, n₁ = 0,2 Hz, β = 0,01— y publica TODOS los intermedios. Igual
// que la Tabla 2.5-2 para las presiones, es una verificación cruzada del capítulo entero
// calculada por los autores de la norma: si el motor reproduce sus once valores, la cadena
// z̄ → I_z̄ → L_z̄ → Q → G y la de N₁ → R_n → R → g_R → G_f son correctas.
import { describe, it, expect } from 'vitest';
import { parametrosRafaga, gRigido, gFlexible, factorRafaga, alturaEquivalente,
  naDe, FRECUENCIA_APROX, G_POR_DEFECTO } from '../src/engine/factorRafaga.js';
import { TERRENO } from '../src/constants/exposicion.js';

// El caso de la Tabla C 1.9-1.
const EJ = { h: 183, B: 30, L: 30, exposicion: "B", V: 51, n1: 0.2, beta: 0.01 };

describe('Tabla C 1.9-1 — el ejemplo resuelto del comentario', () => {
  const p = parametrosRafaga(EJ);

  it.each([
    ["z̄ (altura equivalente)", () => p.zb, 110, 0],
    ["c (Tabla 1.9-1)",         () => p.c, 0.3, 3],
    ["I_z̄ (1.9-7)",            () => p.Iz, 0.201, 3],
    ["ℓ (Tabla 1.9-1)",         () => p.l, 98, 0],
    ["ε̄ (Tabla 1.9-1)",        () => p.epsM, 1 / 3, 4],
    ["L_z̄ (1.9-9)",            () => p.Lz, 217.8, 1],
    ["Q² (1.9-8)",              () => p.Q2, 0.616, 2],
    ["g_Q",                     () => p.gQ, 3.4, 9],
    ["g_v",                     () => p.gv, 3.4, 9],
  ])('%s = %s', (nom, f, esperado, dec) => expect(f()).toBeCloseTo(esperado, dec));

  it('G calculado para edificio rígido = 0,818 (expresión 1.9-6)', () => {
    expect(gRigido(EJ).G).toBeCloseTo(0.818, 3);
  });

  // La cadena flexible. Los valores publicados tienen tres cifras y arrastran redondeos
  // —el V̄z̄ del comentario difiere del calculado en 0,8 %, seguramente porque redondearon
  // z̄ antes de elevarlo a la potencia—, así que se compara con tolerancia RELATIVA en vez
  // de con decimales absolutos. Se deja dicho para que nadie lo tome por un desajuste del
  // motor cuando vuelva a leer el test.
  const f = gFlexible(EJ);
  it.each([
    ["ᾱ", () => f.alfaM, 1 / 4.5, 0.001],
    ["b̄", () => f.bM, 0.47, 0.001],
    ["V̄z̄ (1.9-16)", () => f.Vz, 41.15, 0.012],
    ["N₁ (1.9-14)", () => f.N1, 1.053, 0.015],
    ["R_n (1.9-13)", () => f.Rn, 0.128, 0.02],
    ["η_h", () => f.etah, 4.094, 0.015],
    ["η_B", () => f.etaB, 0.682, 0.015],
    ["η_L", () => f.etaL, 2.285, 0.015],
    ["R_h (1.9-15a)", () => f.Rh, 0.214, 0.02],
    ["R_B (1.9-15a)", () => f.RB, 0.666, 0.02],
    ["R_L (1.9-15a)", () => f.RL, 0.343, 0.02],
    ["R² (1.9-12)", () => f.R2, 1.261, 0.03],
    ["g_R (1.9-11)", () => f.gR, 3.787, 0.01],
    ["G_f (1.9-10)", () => f.Gf, 1.162, 0.01],
  ])('%s coincide con el valor publicado', (nom, fn, esperado, tol) => {
    expect(Math.abs(fn() / esperado - 1)).toBeLessThan(tol);
  });

  // ⚠ EL RESULTADO QUE IMPORTA. En este edificio Gf = 1,162 y el valor por defecto es
  // 0,85: usar el 0,85 subestimaría la carga un 27 %. El 0,85 NO es conservador cuando el
  // edificio es flexible, y por eso la app tiene que decirlo en vez de ofrecerlo callada.
  it('en un edificio flexible el 0,85 subestima: Gf lo supera en más del 25 %', () => {
    expect(f.Gf).toBeGreaterThan(G_POR_DEFECTO * 1.25);
  });
});

describe('altura equivalente', () => {
  it('es 0,6·h', () => expect(alturaEquivalente(100, "C")).toBeCloseTo(60, 9));

  // El tope por z_min no es cosmético: sin él, un galpón de 4 m daría z̄ = 2,4 m y una
  // intensidad de turbulencia disparatada, porque el perfil deja de valer cerca del suelo.
  it.each(["B", "C", "D"])('exposición %s: nunca baja de z_min', (e) => {
    expect(alturaEquivalente(1, e)).toBe(TERRENO[e].zmin);
    expect(alturaEquivalente(4, "B")).toBe(TERRENO.B.zmin);      // 0,6·4 = 2,4 < 9,2
  });
});

describe('G calculado contra el valor por defecto', () => {
  // ⚠ EL CALCULADO NO SIEMPRE QUEDA POR DEBAJO DE 0,85, y eso contradice la afirmación
  // general del comentario C 1.9 —«el factor obtenido con el cálculo alternativo es 5-10 %
  // más bajo»—. Con la expresión (1.9-6) y las constantes de la Tabla 1.9-1:
  //
  //      exposición B   →  0,826 a 0,836   (POR DEBAJO de 0,85)
  //      exposición C   →  0,852 a 0,864   (por encima)
  //      exposición D   →  0,867 a 0,879   (por encima)
  //
  // La razón es estructural y se ve en la fórmula: G = 0,925·(1 + 1,7·g_Q·I_z̄·Q)/(1 +
  // 1,7·g_v·I_z̄), y como Q < 1, el cociente crece hacia 1 cuando I_z̄ baja. En el límite de
  // turbulencia nula G → 0,925. Los terrenos lisos —C y sobre todo D— tienen poca
  // turbulencia, así que ahí el calculado SUPERA al 0,85.
  //
  // La consecuencia práctica es que en exposición C o D adoptar 0,85 no es más
  // conservador: es MENOS. El reglamento lo permite igual —el art. 1.9.4 ofrece las dos
  // vías—, pero la app tiene que decirlo y no dejar que se suponga lo contrario.
  it.each([[20, 30, "B"], [80, 40, "B"]])(
    'exposición B, h=%s B=%s: el calculado queda por debajo del 0,85', (h, B, exp) => {
      const G = gRigido({ h, B, L: B, exposicion: exp, V: 50 }).G;
      expect(G).toBeLessThan(G_POR_DEFECTO);
      expect(G).toBeGreaterThan(0.75);
    });

  it.each([[20, 30, "C"], [40, 25, "C"], [20, 30, "D"], [80, 40, "D"]])(
    'exposición lisa, h=%s B=%s exp %s: el calculado SUPERA al 0,85', (h, B, exp) => {
      expect(gRigido({ h, B, L: B, exposicion: exp, V: 50 }).G).toBeGreaterThan(G_POR_DEFECTO);
    });

  it('nunca supera 0,925, que es el límite de turbulencia nula', () => {
    for (const e of ["B", "C", "D"]) {
      for (const h of [5, 20, 60, 150]) {
        expect(gRigido({ h, B: 20, L: 20, exposicion: e, V: 50 }).G).toBeLessThan(0.9251);
      }
    }
  });

  // Un edificio más grande promedia más ráfagas sobre su superficie, así que su factor
  // BAJA. Si la fórmula tuviera el cociente invertido, esto se rompe.
  it('G baja al crecer el edificio', () => {
    const chico = gRigido({ h: 10, B: 10, L: 10, exposicion: "C", V: 50 }).G;
    const grande = gRigido({ h: 80, B: 80, L: 80, exposicion: "C", V: 50 }).G;
    expect(grande).toBeLessThan(chico);
  });

  // Terreno más rugoso ⇒ más turbulencia ⇒ menos correlación ⇒ G menor.
  it('G baja al crecer la rugosidad del terreno', () => {
    const g = (e) => gRigido({ h: 30, B: 30, L: 30, exposicion: e, V: 50 }).G;
    expect(g("B")).toBeLessThan(g("C"));
    expect(g("C")).toBeLessThan(g("D"));
  });

  it('avisa cuando el calculado supera al 0,85, en vez de dejarlo pasar', () => {
    const liso = factorRafaga({ h: 20, B: 30, L: 30, exposicion: "D", V: 50 });
    const rugoso = factorRafaga({ h: 20, B: 30, L: 30, exposicion: "B", V: 50 });
    expect(liso.calculadoSupera).toBe(true);
    expect(liso.opciones.find(o => o.id === "calculado").nota).toMatch(/SUPERA|no es más conservador/i);
    expect(rugoso.calculadoSupera).toBe(false);
  });
});

describe('frecuencia natural aproximada', () => {
  it('son las tres expresiones del art. 1.9.3', () => {
    expect(FRECUENCIA_APROX).toHaveLength(3);
    expect(naDe("porticos_acero", 20)).toBeCloseTo(8.58 / Math.pow(20, 0.8), 9);
    expect(naDe("porticos_hormigon", 20)).toBeCloseTo(14.93 / Math.pow(20, 0.9), 9);
    expect(naDe("otros", 20)).toBeCloseTo(22.86 / 20, 9);
  });

  it('la frecuencia baja al crecer la altura, en las tres', () => {
    for (const f of FRECUENCIA_APROX) expect(f.f(60)).toBeLessThan(f.f(10));
  });

  // Un edificio de 23 m con otros sistemas queda justo en el límite de 1 Hz: es el orden
  // de altura a partir del cual hay que empezar a mirar la flexibilidad.
  it('el límite de 1 Hz cae alrededor de los 23 m con la expresión general', () => {
    expect(naDe("otros", 22)).toBeGreaterThan(1);
    expect(naDe("otros", 24)).toBeLessThan(1);
  });
});

describe('qué factor rige', () => {
  it('sin frecuencia declarada rige el 0,85, y lo dice', () => {
    const r = factorRafaga({ h: 8, B: 20, L: 30, exposicion: "B", V: 50 });
    expect(r.rige).toBe("defecto");
    expect(r.motivo).toMatch(/r[íi]gido/i);
  });

  it('con n₁ < 1 Hz rige el flexible, y avisa que el 0,85 no es conservador', () => {
    const r = factorRafaga(EJ);
    expect(r.flexible).toBe(true);
    expect(r.rige).toBe("flexible");
    expect(r.motivo).toMatch(/no es conservador/);
  });

  it('con n₁ ≥ 1 Hz vuelve a ser rígido', () => {
    const r = factorRafaga({ ...EJ, n1: 1.5 });
    expect(r.flexible).toBe(false);
    expect(r.rige).toBe("defecto");
  });

  it('ofrece siempre el valor por defecto y el calculado, en ese orden', () => {
    const r = factorRafaga({ h: 20, B: 20, L: 30, exposicion: "C", V: 50 });
    expect(r.opciones.map(o => o.id)).toEqual(["defecto", "calculado"]);
    expect(r.opciones[0].G).toBe(G_POR_DEFECTO);
  });
});
