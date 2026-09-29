// CAPÍTULO 5 — LAS ZONAS, Y LOS ESCENARIOS DE LA FIG. C 5-1 QUE TIENEN QUE APARECER SOLOS.
//
// El criterio de este archivo: NO se verifica que el clasificador reproduzca cinco casos
// escritos a mano, porque no hay cinco casos escritos a mano. Se verifica que los cinco
// escenarios que dibuja el reglamento SALGAN de la regla de distancias al borde aplicada a
// cinco plantas distintas. Si un día alguien reemplaza la regla por una tabla de casos,
// estos tests siguen pasando y los de abajo —geometría punto por punto— no.
import { describe, it, expect } from 'vitest';
import {
  LAYOUT, LAYOUT_DE_FIGURA, dimensionA, zonaEn, zonasPresentes,
} from '../src/engine/cyrZonas.js';
import { FIGURAS_LISTA } from '../src/constants/cyrCurvas.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LA DIMENSIÓN a
// ═══════════════════════════════════════════════════════════════════════════════

describe('dimensionA — notación de la Fig. 5.3-1', () => {
  it('toma el menor entre el 10 % de la menor dimensión y 0,4h', () => {
    // Nave de 20 × 40 m, h = 6 m: 10 % de 20 = 2,0 contra 0,4 × 6 = 2,4. Gobierna el 10 %.
    expect(dimensionA({ menor: 20, h: 6, theta: 15 })).toMatchObject(
      { a: 2, gobierna: "10 % de la menor dimensión" });
    // La misma nave con h = 4 m: 0,4 × 4 = 1,6 < 2,0. Gobierna 0,4h.
    expect(dimensionA({ menor: 20, h: 4, theta: 15 })).toMatchObject(
      { a: 1.6, gobierna: "0,4h" });
  });

  it('el piso del 4 % gobierna en edificios altos y angostos', () => {
    // Menor dimensión 25 m, h = 20 m: 10 % = 2,5 y 0,4h = 8 → el menor es 2,5. El 4 % es
    // 1,0, que no llega a mandar. Con h = 20 y menor 60: 10 % = 6, 0,4h = 8 → 6; 4 % = 2,4.
    // Para que el 4 % gobierne hace falta que 0,4h caiga por debajo: h = 4 y menor = 60 da
    // 0,4h = 1,6 contra un 4 % de 2,4.
    expect(dimensionA({ menor: 60, h: 4, theta: 15 })).toMatchObject(
      { a: 2.4, gobierna: "4 % de la menor dimensión" });
  });

  it('el piso de 1 m gobierna en construcciones chicas', () => {
    // Caseta de 4 × 6 m con h = 3 m: 10 % = 0,4 · 0,4h = 1,2 → 0,4; el 4 % es 0,16. Los
    // dos quedan por debajo del metro.
    expect(dimensionA({ menor: 4, h: 3, theta: 20 })).toMatchObject(
      { a: 1, gobierna: "1 m" });
  });

  it('la excepción de θ ≤ 7° y menor dimensión > 90 m limita a 0,8h', () => {
    // Nave de 100 × 200 m, h = 8 m, cubierta plana: 10 % = 10 contra 0,4h = 3,2 → 3,2, pero
    // el piso del 4 % lo levanta a 4,0. La excepción limita a 0,8 × 8 = 6,4, que NO muerde.
    expect(dimensionA({ menor: 100, h: 8, theta: 2 })).toMatchObject(
      { a: 4, limitada: false, gobierna: "4 % de la menor dimensión" });
    // Para que muerda, 0,8h tiene que quedar por debajo del valor ya adoptado, y el que lo
    // sostiene arriba es justamente ese piso: con h = 4 m el 4 % sigue dando 4,0 y
    // 0,8h = 3,2. La excepción es un TECHO y se aplica al final, después de los pisos.
    const r = dimensionA({ menor: 100, h: 4, theta: 5 });
    expect(r).toMatchObject({ a: 3.2, limitada: true });
    expect(r.gobierna).toMatch(/excepción/);
  });

  it('la excepción NO se aplica con θ > 7° ni con menor dimensión ≤ 90 m', () => {
    expect(dimensionA({ menor: 100, h: 4, theta: 8 })).toMatchObject({ a: 4, limitada: false });
    expect(dimensionA({ menor: 90, h: 4, theta: 5 })).toMatchObject({ a: 3.6, limitada: false });
  });

  it('rechaza una geometría imposible en vez de devolver un número', () => {
    expect(() => dimensionA({ menor: 0, h: 5, theta: 0 })).toThrow(/tienen que ser positivas/);
    expect(() => dimensionA({ menor: 10, h: 0, theta: 0 })).toThrow(/tienen que ser positivas/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOS CINCO ESCENARIOS DE LA FIG. C 5-1, QUE TIENEN QUE APARECER SOLOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fig. C 5-1 — los escenarios salen de la geometría, no de una tabla de casos', () => {
  const h = 10;                                     // 0,2h = 2 · 0,6h = 6 · 1,2h = 12 · 2,4h = 24
  const plana = (bx, by) => ({ layout: LAYOUT.PLANA_H, bx, by, h });

  it('a) menor dimensión > 2,4h → aparecen las cuatro zonas, con la 1′ interior', () => {
    expect(zonasPresentes(plana(30, 40))).toEqual(["1'", "1", "2", "3"]);
  });

  it('b) 1,2h < menor < 2,4h → desaparece la 1′ y el interior queda en zona 1', () => {
    expect(zonasPresentes(plana(18, 40))).toEqual(["1", "2", "3"]);
    // Y el centro, que en el caso anterior era 1', ahora es 1.
    expect(zonaEn(9, 20, plana(18, 40))).toBe("1");
  });

  it('c) menor < 1,2h < mayor → desaparece también la zona 1', () => {
    expect(zonasPresentes(plana(8, 40))).toEqual(["2", "3"]);
    expect(zonaEn(4, 20, plana(8, 40))).toBe("2");
  });

  it('d) mayor dimensión < 1,2h → franja de 0,2h de zona 3 en todo el perímetro', () => {
    const geo = plana(8, 10);
    expect(zonasPresentes(geo)).toEqual(["2", "3"]);
    // Todo el perímetro, no sólo las esquinas: el centro de cada lado también es zona 3.
    expect(zonaEn(4, 1, geo)).toBe("3");      // centro del lado corto, a 1 m del borde
    expect(zonaEn(1, 5, geo)).toBe("3");      // centro del lado largo, a 1 m del borde
    expect(zonaEn(4, 3, geo)).toBe("2");      // pasados los 0,2h, interior
    expect(zonaEn(4, 5, geo)).toBe("2");      // el centro
  });

  it('e) mayor dimensión < 0,4h → toda la cubierta es zona 3 (comentario C 5.1)', () => {
    // Este escenario NO está dibujado en la Fig. C 5-1. Que salga solo es la prueba de que
    // el clasificador es la regla y no la figura copiada: nadie lo programó.
    const geo = plana(3, 3.5);
    expect(zonasPresentes(geo)).toEqual(["3"]);
    expect(zonaEn(1.5, 1.75, geo)).toBe("3");   // el centro
  });

  it('los cinco escenarios son la MISMA regla: sólo cambia la planta', () => {
    // Barrido continuo de la menor dimensión con h fijo: las zonas van apareciendo en el
    // orden de la figura y en los umbrales de la figura, sin saltos.
    const zonasDe = m => zonasPresentes(plana(m, 200)).join("·");
    expect(zonasDe(3.9)).toBe("2·3");     // mayor = 200 > 1,2h, así que hay zona 2
    expect(zonasDe(11.9)).toBe("2·3");    // por debajo de 1,2h no hay zona 1
    expect(zonasDe(12.1)).toBe("1·2·3");  // pasado 1,2h aparece la zona 1
    expect(zonasDe(23.9)).toBe("1·2·3");  // por debajo de 2,4h todavía no hay 1'
    expect(zonasDe(24.1)).toBe("1'·1·2·3");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA GEOMETRÍA DE CADA ZONIFICACIÓN, PUNTO POR PUNTO
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fig. 5.3-2A — la L de esquina de 0,6h × 0,2h', () => {
  const geo = { layout: LAYOUT.PLANA_H, bx: 60, by: 80, h: 10 };

  it('la zona 3 es una L, no un cuadrado', () => {
    // Brazo largo: a 1 m del borde inferior y 5 m del lateral → dentro (dy ≤ 2 y dx ≤ 6).
    expect(zonaEn(5, 1, geo)).toBe("3");
    // Brazo corto: a 1 m del lateral y 5 m del borde inferior.
    expect(zonaEn(1, 5, geo)).toBe("3");
    // La diagonal del cuadrado de 0,6h: a 5 m de los DOS bordes, que un cuadrado incluiría
    // y la L no.
    expect(zonaEn(5, 5, geo)).toBe("2");
    // El brazo tiene LARGO 0,6h: a 1 m del lateral la zona 3 llega hasta los 6 m de
    // distancia al borde inferior y no más. A 7 m ya es zona 2, aunque siga pegado al
    // lateral. Es lo que distingue la L de una franja perimetral de 0,2h.
    expect(zonaEn(1, 5.9, geo)).toBe("3");
    expect(zonaEn(1, 6.1, geo)).toBe("2");
  });

  it('los anillos se miden al borde MÁS CERCANO', () => {
    expect(zonaEn(3, 40, geo)).toBe("2");    // 3 m del lateral
    expect(zonaEn(8, 40, geo)).toBe("1");    // 8 m: entre 0,6h y 1,2h
    expect(zonaEn(20, 40, geo)).toBe("1'");  // 20 m de todos los bordes
    // Cerca del borde largo pero lejos del corto: manda el más cercano.
    expect(zonaEn(20, 3, geo)).toBe("2");
  });

  it('las cuatro esquinas dan lo mismo', () => {
    for (const [x, y] of [[1, 5], [59, 5], [1, 75], [59, 75]]) {
      expect(zonaEn(x, y, geo), `(${x}, ${y})`).toBe("3");
    }
  });
});

describe('Figs. 5.3-2B y 2C — hastiales y cumbrera', () => {
  const geo = { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" };

  it('la zona 3 está en los EXTREMOS DE LA CUMBRERA', () => {
    expect(zonaEn(1, 10, geo)).toBe("3");     // sobre la cumbrera, a 1 m del hastial
    expect(zonaEn(39, 10, geo)).toBe("3");    // el otro extremo
  });

  it('la esquina del edificio NO es zona 3 en esta figura', () => {
    // Es la diferencia con la Fig. 5.3-2D, y es justo lo que se deduciría mal: hasta 27°
    // el pico está en la cumbrera, no en la esquina.
    expect(zonaEn(1, 1, geo)).toBe("2");
  });

  it('el alero no está zonificado: la zona 1 llega hasta el borde', () => {
    expect(zonaEn(20, 0, geo)).toBe("1");
    expect(zonaEn(20, 20, geo)).toBe("1");
  });

  it('la franja de cumbrera y la de hastial son zona 2 fuera de su cruce', () => {
    expect(zonaEn(20, 10, geo)).toBe("2");    // cumbrera, lejos de los hastiales
    expect(zonaEn(1, 5, geo)).toBe("2");      // hastial, lejos de la cumbrera
    expect(zonaEn(20, 5, geo)).toBe("1");     // ni una cosa ni la otra
  });

  it('la cumbrera según Y da la figura espejada, no otra cosa', () => {
    const giro = { ...geo, bx: 20, by: 40, ejeCumbrera: "Y" };
    expect(zonaEn(10, 1, giro)).toBe("3");
    expect(zonaEn(1, 1, giro)).toBe("2");
    expect(zonaEn(0, 20, giro)).toBe("1");
  });
});

describe('Fig. 5.3-2D — esquinas, y sin franja de cumbrera', () => {
  const geo = { layout: LAYOUT.DOS_AGUAS_ESQUINAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" };

  it('la zona 3 está en las cuatro ESQUINAS del edificio', () => {
    for (const [x, y] of [[1, 1], [1, 19], [39, 1], [39, 19]]) {
      expect(zonaEn(x, y, geo), `(${x}, ${y})`).toBe("3");
    }
  });

  it('el extremo de la cumbrera NO es zona 3 acá', () => {
    expect(zonaEn(1, 10, geo)).toBe("2");
  });

  it('no hay franja de cumbrera: el centro del techo es zona 1', () => {
    expect(zonaEn(20, 10, geo)).toBe("1");
    expect(zonaEn(20, 1, geo)).toBe("1");     // ni siquiera el alero, fuera del hastial
  });
});

describe('Figs. 5.3-2E, 2F y 2G — cuatro aguas', () => {
  const geo = { layout: LAYOUT.CUATRO_AGUAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" };

  it('la zona 3 es TODO EL PERÍMETRO, al revés que en dos aguas', () => {
    for (const [x, y] of [[20, 1], [20, 19], [1, 10], [39, 10], [1, 1]]) {
      expect(zonaEn(x, y, geo), `(${x}, ${y})`).toBe("3");
    }
  });

  it('la zona 2 sigue la cumbrera y las limatesas', () => {
    expect(zonaEn(20, 10, geo)).toBe("2");    // sobre la cumbrera
    expect(zonaEn(5, 5, geo)).toBe("2");      // sobre la limatesa que sale de (0, 0)
    expect(zonaEn(35, 15, geo)).toBe("2");    // la limatesa opuesta
  });

  it('la zona 1 es el interior de cada faldón', () => {
    expect(zonaEn(20, 5, geo)).toBe("1");
    expect(zonaEn(20, 15, geo)).toBe("1");
  });

  it('una pirámide —planta cuadrada— no tiene cumbrera y sigue funcionando', () => {
    const p = { ...geo, bx: 20, by: 20 };
    expect(zonaEn(10, 10, p)).toBe("2");      // la cúspide, donde se juntan las limatesas
    expect(zonaEn(10, 1, p)).toBe("3");
    expect(zonasPresentes(p)).toContain("1");
  });

  it('rechaza la cumbrera declarada sobre el lado corto', () => {
    // Con las limatesas dibujadas para afuera el resultado sería plausible y equivocado.
    const malo = { ...geo, ejeCumbrera: "Y" };
    expect(() => zonaEn(20, 10, malo)).toThrow(/cumbrera va sobre el lado largo/);
  });
});

describe('Fig. 5.3-1 — paredes', () => {
  const geo = { layout: LAYOUT.PARED, bx: 40, by: 20, h: 6, a: 2 };

  it('la zona 5 es la franja `a` de cada esquina', () => {
    expect(zonaEn(1, 10, geo)).toBe("5");
    expect(zonaEn(39, 10, geo)).toBe("5");
    expect(zonaEn(20, 10, geo)).toBe("4");
  });

  it('sólo tiene las zonas 4 y 5, en ese orden', () => {
    expect(zonasPresentes(geo)).toEqual(["4", "5"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COHERENCIA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Coherencia del clasificador', () => {
  it('cada figura transcripta tiene su zonificación', () => {
    for (const fig of FIGURAS_LISTA) {
      expect(LAYOUT_DE_FIGURA[fig], fig).toBeTruthy();
      expect(Object.values(LAYOUT), fig).toContain(LAYOUT_DE_FIGURA[fig]);
    }
    expect(Object.keys(LAYOUT_DE_FIGURA).sort()).toEqual([...FIGURAS_LISTA].sort());
  });

  it('las zonas presentes coinciden con un barrido denso de la planta', () => {
    // `zonasPresentes` usa puntos testigo, que para las zonificaciones rectangulares son
    // exactos y para cuatro aguas son una grilla. Este test lo compara contra un barrido
    // mucho más fino, sobre geometrías de todas las formas y tamaños.
    const casos = [
      { layout: LAYOUT.PLANA_H, bx: 30, by: 40, h: 10 },
      { layout: LAYOUT.PLANA_H, bx: 8, by: 40, h: 10 },
      { layout: LAYOUT.PLANA_H, bx: 8, by: 10, h: 10 },
      { layout: LAYOUT.PLANA_H, bx: 3, by: 3.5, h: 10 },
      { layout: LAYOUT.PLANA_H, bx: 60, by: 80, h: 5 },
      { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
      { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 6, by: 30, h: 6, a: 4, ejeCumbrera: "Y" },
      { layout: LAYOUT.DOS_AGUAS_ESQUINAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
      { layout: LAYOUT.DOS_AGUAS_ESQUINAS, bx: 10, by: 30, h: 6, a: 6, ejeCumbrera: "Y" },
      { layout: LAYOUT.CUATRO_AGUAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
      { layout: LAYOUT.CUATRO_AGUAS, bx: 20, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
      { layout: LAYOUT.CUATRO_AGUAS, bx: 30, by: 12, h: 6, a: 3, ejeCumbrera: "X" },
      { layout: LAYOUT.PARED, bx: 40, by: 20, h: 6, a: 2 },
      { layout: LAYOUT.PARED, bx: 3, by: 3, h: 6, a: 2 },
    ];
    for (const geo of casos) {
      const vistas = new Set();
      const n = 300;
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
        vistas.add(zonaEn(geo.bx * i / n, geo.by * j / n, geo));
      }
      const orden = geo.layout === LAYOUT.PARED ? ["4", "5"] : ["1'", "1", "2", "3"];
      const etiqueta = `${geo.layout} ${geo.bx}×${geo.by}`;
      expect(zonasPresentes(geo), etiqueta).toEqual(orden.filter(z => vistas.has(z)));
    }
  });

  it('todo punto de la planta cae en exactamente una zona de su figura', () => {
    const casos = [
      { layout: LAYOUT.PLANA_H, bx: 27, by: 43, h: 7 },
      { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 37, by: 19, h: 6, a: 1.9, ejeCumbrera: "X" },
      { layout: LAYOUT.DOS_AGUAS_ESQUINAS, bx: 37, by: 19, h: 6, a: 1.9, ejeCumbrera: "X" },
      { layout: LAYOUT.CUATRO_AGUAS, bx: 37, by: 19, h: 6, a: 1.9, ejeCumbrera: "X" },
      { layout: LAYOUT.PARED, bx: 37, by: 19, h: 6, a: 1.9 },
    ];
    for (const geo of casos) {
      const validas = geo.layout === LAYOUT.PARED ? ["4", "5"] : ["1'", "1", "2", "3"];
      for (let i = 0; i <= 120; i++) for (let j = 0; j <= 120; j++) {
        const z = zonaEn(geo.bx * i / 120, geo.by * j / 120, geo);
        expect(validas, `${geo.layout} en (${i}, ${j})`).toContain(z);
      }
    }
  });

  it('rechaza una zonificación que no existe', () => {
    expect(() => zonaEn(1, 1, { layout: "inventada", bx: 10, by: 10, h: 5, a: 1 }))
      .toThrow(/zonificación desconocida/);
  });
});
