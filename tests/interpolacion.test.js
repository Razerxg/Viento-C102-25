// INTERPOLACIÓN EN TABLAS DEL REGLAMENTO.
//
// Es la operación más repetida del motor: por acá pasan los Cp de L/B y de θ, el factor
// de área, los C_f del capítulo 4, las tablas del Anexo I y los tres multiplicadores de
// K_zt. Un error acá no rompe nada: devuelve un coeficiente plausible.
import { describe, it, expect } from 'vitest';
import { interpolar, valorEn, interpolarPares, valorEnPares } from '../src/engine/interpolacion.js';
import { interp as interpPresiones, cpSotavento } from '../src/engine/presiones.js';
import { interp as interpAnexo } from '../src/engine/anexo1.js';
import { interpGrilla } from '../src/engine/otrasEstructuras.js';
import { interpolarTabla } from '../src/engine/topografia.js';
import { KE_TABLA, TOLERANCIA_KE, ke } from '../src/constants/altitud.js';
import { CP_PARED, FACTOR_AREA } from '../src/constants/presionesExternas.js';

// Tabla de juguete con pasos DESIGUALES a propósito: con pasos iguales, confundir el
// denominador de la interpolación con el paso de la tabla no se nota.
const XS = [0, 1, 3, 7, 10];
const YS = [2, 5, 6, -2, -4];

describe('en los puntos de tabla', () => {
  it('devuelve el valor exacto y no lo marca como interpolado', () => {
    for (let i = 0; i < XS.length; i++) {
      const r = interpolar(XS[i], XS, YS);
      expect(r.valor, `x = ${XS[i]}`).toBe(YS[i]);
      expect(r.interpolado, `x = ${XS[i]}`).toBe(false);
      expect(r.puntos).toEqual([{ x: XS[i], y: YS[i] }]);
      expect(r.fuera).toBe(null);
      expect(r.nota).toBeUndefined();
    }
  });
});

describe('entre dos puntos', () => {
  it('interpola linealmente y devuelve los dos puntos usados', () => {
    // x = 5 está justo en el medio de [3, 7]: y = (6 + (−2))/2 = 2.
    const r = interpolar(5, XS, YS);
    expect(r.valor).toBeCloseTo(2, 12);
    expect(r.interpolado).toBe(true);
    expect(r.puntos).toEqual([{ x: 3, y: 6 }, { x: 7, y: -2 }]);
    expect(r.fuera).toBe(null);
  });

  it('el valor cae siempre entre los dos puntos que lo encierran', () => {
    for (let x = 0; x <= 10; x += 0.13) {
      const r = interpolar(x, XS, YS);
      const ys = r.puntos.map(p => p.y);
      expect(r.valor, `x = ${x}`).toBeGreaterThanOrEqual(Math.min(...ys) - 1e-12);
      expect(r.valor, `x = ${x}`).toBeLessThanOrEqual(Math.max(...ys) + 1e-12);
    }
  });

  it('es exactamente lineal en cada intervalo', () => {
    // Tres puntos del mismo intervalo: el del medio tiene que ser el promedio de los
    // otros dos. Si el interpolador usara el intervalo equivocado, no lo sería.
    for (const [a, b] of [[0, 1], [1, 3], [3, 7], [7, 10]]) {
      const m = (a + b) / 2;
      const [ya, ym, yb] = [a, m, b].map(x => valorEn(x, XS, YS));
      expect((ya + yb) / 2, `[${a}, ${b}]`).toBeCloseTo(ym, 12);
    }
  });
});

describe('en los bordes', () => {
  it('en el primer y el último punto exactos no marca «fuera de tabla»', () => {
    for (const x of [XS[0], XS.at(-1)]) {
      const r = interpolar(x, XS, YS);
      expect(r.fuera, `x = ${x}`).toBe(null);
      expect(r.nota, `x = ${x}`).toBeUndefined();
    }
  });

  // CONGELAR Y NO EXTRAPOLAR. Las filas extremas de estas tablas son «≤ 0,05», «≥ 45» o
  // «40 o más»: el reglamento dice que más allá vale el mismo número. Extrapolar la
  // pendiente daría un coeficiente que la norma no da.
  it('por fuera congela el extremo, lo declara y lo explica', () => {
    const abajo = interpolar(-50, XS, YS);
    expect(abajo.valor).toBe(YS[0]);
    expect(abajo.interpolado).toBe(false);
    expect(abajo.fuera).toBe("debajo");
    expect(abajo.nota).toMatch(/por debajo/);
    expect(abajo.puntos).toEqual([{ x: 0, y: 2 }]);

    const arriba = interpolar(1e6, XS, YS);
    expect(arriba.valor).toBe(YS.at(-1));
    expect(arriba.fuera).toBe("encima");
    expect(arriba.nota).toMatch(/por encima/);
  });

  it('una tabla de un solo punto devuelve ese punto para cualquier x', () => {
    for (const x of [-1, 0, 1]) expect(valorEn(x, [0], [7])).toBe(7);
  });
});

describe('tablas mal formadas', () => {
  // ⚠ LA VERSIÓN DE `presiones.js` ORDENABA LOS PARES. Con eso, una tabla cargada al revés
  // —que es exactamente lo que pasa con la Figura 4.4-1, cuyas filas van en s/h
  // DECRECIENTE— daba un número plausible en vez de fallar.
  it('rechaza abscisas decrecientes en vez de ordenarlas por su cuenta', () => {
    expect(() => interpolar(2, [10, 3, 1], [1, 2, 3])).toThrow(/crecientes/);
  });

  it('rechaza abscisas repetidas, que dejarían el intervalo sin ancho', () => {
    expect(() => interpolar(2, [0, 1, 1, 3], [0, 1, 2, 3])).toThrow(/crecientes/);
  });

  it('rechaza una tabla con distinta cantidad de abscisas y ordenadas', () => {
    expect(() => interpolar(2, [0, 1, 2], [0, 1])).toThrow(/inconsistente/);
    expect(() => interpolar(2, [], [])).toThrow(/inconsistente/);
  });
});

describe('las cuatro firmas históricas dan el mismo número', () => {
  // Antes había cuatro implementaciones con firmas distintas. Ahora son envoltorios de
  // una sola, y esto lo fija: si alguna se desviara —por ejemplo volviendo a ordenar, o
  // extrapolando en el borde— dejarían de coincidir.
  const pares = XS.map((x, i) => [x, YS[i]]);
  it('interpolar, valorEn, pares, presiones, anexo, grilla y tabla', () => {
    for (let x = -2; x <= 12; x += 0.37) {
      const esperado = interpolar(x, XS, YS).valor;
      expect(valorEn(x, XS, YS), `x = ${x}`).toBe(esperado);
      expect(valorEnPares(x, pares), `x = ${x}`).toBe(esperado);
      expect(interpolarPares(x, pares).valor, `x = ${x}`).toBe(esperado);
      expect(interpPresiones(pares, x), `x = ${x}`).toBe(esperado);
      expect(interpAnexo(x, pares), `x = ${x}`).toBe(esperado);
      expect(interpGrilla(x, XS, YS), `x = ${x}`).toBe(esperado);
      expect(interpolarTabla(x, XS, YS).valor, `x = ${x}`).toBe(esperado);
    }
  });
});

describe('las tablas reales que pasan por acá están en orden', () => {
  // Si alguna estuviera al revés, el guardia de `interpolar` la rechazaría en runtime y
  // la pantalla que la usa explotaría. Mejor enterarse acá.
  const tablas = [
    ["Cp sotavento, L/B", CP_PARED.sotavento.puntos],
    ["factor de área", FACTOR_AREA],
    ["K_e, Tabla 1.12-1", KE_TABLA],
  ];
  for (const [nombre, pares] of tablas) {
    it(nombre, () => {
      expect(() => interpolarPares(pares[0][0], pares)).not.toThrow();
      for (let i = 1; i < pares.length; i++) expect(pares[i][0]).toBeGreaterThan(pares[i - 1][0]);
    });
  }

  it('Cp de sotavento reproduce los cuatro valores de la Figura 2.4-1', () => {
    // L/B = 0-1 → −0,5 · 2 → −0,3 · ≥4 → −0,2, y el 0,5 de la nota 6 no aparece: entre
    // 0 y 1 la tabla es constante.
    expect(cpSotavento(0.5, 1)).toBeCloseTo(-0.5, 12);
    expect(cpSotavento(1, 1)).toBeCloseTo(-0.5, 12);
    expect(cpSotavento(2, 1)).toBeCloseTo(-0.3, 12);
    expect(cpSotavento(4, 1)).toBeCloseTo(-0.2, 12);
    expect(cpSotavento(20, 1)).toBeCloseTo(-0.2, 12);       // congelado, no extrapolado
    expect(cpSotavento(3, 1)).toBeCloseTo(-0.25, 12);        // interpolado
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// K_e — LA TABLA CONTRA SU FÓRMULA
// ═══════════════════════════════════════════════════════════════════════════════
//
// El art. 1.12 admite las dos vías: «se calculará interpolando valores de la Tabla 1.12-1
// o de la siguiente fórmula». No hay una correcta y otra equivocada, hay dos caminos
// permitidos que no coinciden. El motor usa la FÓRMULA, que es continua y no obliga a
// interpolar; la tabla se guarda como control de transcripción.
describe('K_e: Tabla 1.12-1 contra la expresión de su nota 2', () => {
  it('las siete filas concuerdan con la fórmula dentro de la tolerancia declarada', () => {
    for (const [z, valorTabla] of KE_TABLA) {
      expect(Math.abs(ke(z) - valorTabla), `z = ${z} m`).toBeLessThanOrEqual(TOLERANCIA_KE);
    }
  });

  // ⚠ Y QUE LA TOLERANCIA HAGA FALTA. Una tolerancia holgada de más convierte al test en
  // un sello: pasaría aunque una celda estuviera mal transcripta. Esto fija que el desvío
  // real existe —la tabla está redondeada hacia abajo en las altitudes grandes— y que
  // 0,008 es el mínimo que lo cubre, no un número cómodo.
  it('la tolerancia es la mínima que alcanza: con la mitad, el test caería', () => {
    const desvios = KE_TABLA.map(([z, v]) => Math.abs(ke(z) - v));
    const peor = Math.max(...desvios);
    expect(peor).toBeGreaterThan(TOLERANCIA_KE / 2);
    expect(peor).toBeLessThanOrEqual(TOLERANCIA_KE);
  });

  it('la fórmula vale 1 al nivel del mar y decrece con la altitud', () => {
    expect(ke(0)).toBe(1);
    let previo = Infinity;
    for (let z = 0; z <= 4000; z += 100) {
      const v = ke(z);
      expect(v).toBeLessThan(previo);
      previo = v;
    }
  });

  // La nota 2 dice que la fórmula vale para TODAS las altitudes, también fuera del rango
  // tabulado. La tabla llega a 1.800 m; Argentina tiene obra bastante más arriba.
  it('la fórmula sigue definida por encima del último punto de la tabla', () => {
    expect(ke(3500)).toBeGreaterThan(0.6);
    expect(ke(3500)).toBeLessThan(ke(1800));
  });
});
