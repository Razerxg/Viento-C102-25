// CAPÍTULO 5 — LAS ZONAS, Y LOS ESCENARIOS DE LA FIG. C 5-1 QUE TIENEN QUE APARECER SOLOS.
//
// El criterio de este archivo: NO se verifica que el clasificador reproduzca cinco casos
// escritos a mano, porque no hay cinco casos escritos a mano. Se verifica que los cinco
// escenarios que dibuja el reglamento SALGAN de la regla de distancias al borde aplicada a
// cinco plantas distintas. Si un día alguien reemplaza la regla por una tabla de casos,
// estos tests siguen pasando y los de abajo —geometría punto por punto— no.
import { describe, it, expect } from 'vitest';
import {
  LAYOUT, LAYOUT_DE_FIGURA, dimensionA, zonaEn, zonaEnPared, zonasPresentes,
  regionesDe, franjasDePared, cotasDeZona, puntosDeRotulo, celdasDeZona,
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

describe('Figs. 5.3-5A y 5B — vertiente única', () => {
  // Nave de 40 × 20 con la cubierta BAJANDO hacia +Y: el alero bajo está en y = 20 y el
  // alto en y = 0. Con a = 2 las fronteras caen en 2, 4 y 8 m, que son números redondos y
  // se pueden contar a mano sobre el croquis.
  const A = { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 40, by: 20, h: 6, a: 2, pendienteHacia: "+Y" };
  const B = { layout: LAYOUT.UNA_AGUA, bx: 40, by: 20, h: 6, a: 2, pendienteHacia: "+Y" };

  it('5.3-5A: la franja del alero ALTO lleva 3′ en las puntas y 2′ en el medio', () => {
    expect(zonaEn(4, 2, A)).toBe("3'");      // dentro de los 4a = 8 m de la punta
    expect(zonaEn(8, 2, A)).toBe("3'");      // el borde de los 4a pertenece a la 3′
    expect(zonaEn(8.01, 2, A)).toBe("2'");
    expect(zonaEn(20, 2, A)).toBe("2'");     // el medio de la franja
    expect(zonaEn(20, 4, A)).toBe("2'");     // la franja mide 2a = 4 m
    expect(zonaEn(20, 4.01, A)).toBe("1");
  });

  it('5.3-5A: contra el alero BAJO, cuadrados de 2a × 2a y franja de ancho a', () => {
    expect(zonaEn(2, 18, A)).toBe("3");      // el cuadrado de la punta
    expect(zonaEn(4, 16.01, A)).toBe("3");   // 2a × 2a: llega hasta x = 4 e y = 16
    expect(zonaEn(4.01, 18.5, A)).toBe("2"); // pasado el cuadrado, la franja del medio
    expect(zonaEn(4.01, 17, A)).toBe("1");   // y fuera de la franja, que sólo llega a 2 m
    // ⚠ LA FRANJA DEL ALERO BAJO MIDE a, NO 2a. Medida sobre la planta de la pág.
    // Cap. 5-177 a 240 dpi: 33 px contra los 66 px de las otras franjas. Con 2a esta línea
    // daría "2" y la zona 1 de una nave de 20 m de luz se comería 2 m de más.
    expect(zonaEn(20, 18, A)).toBe("2");
    expect(zonaEn(20, 17.99, A)).toBe("1");
  });

  it('5.3-5A: las franjas laterales son zona 2′ de ancho 2a', () => {
    expect(zonaEn(2, 10, A)).toBe("2'");
    expect(zonaEn(4, 10, A)).toBe("2'");
    expect(zonaEn(4.01, 10, A)).toBe("1");
    expect(zonaEn(38, 10, A)).toBe("2'");    // la lateral opuesta
  });

  it('5.3-5A: el interior del faldón es zona 1', () => {
    expect(zonaEn(20, 10, A)).toBe("1");
    expect(zonaEn(20, 16, A)).toBe("1");
  });

  it('5.3-5B: la misma planta, sin zonas primadas y con la 3 sólo en el alero alto', () => {
    expect(zonaEn(4, 2, B)).toBe("3");
    expect(zonaEn(8, 2, B)).toBe("3");
    expect(zonaEn(8.01, 2, B)).toBe("2");
    expect(zonaEn(20, 2, B)).toBe("2");      // franja del alero alto, 2a
    expect(zonaEn(20, 19, B)).toBe("2");     // franja del alero bajo, a
    expect(zonaEn(20, 17.99, B)).toBe("1");
    expect(zonaEn(2, 10, B)).toBe("2");      // franja lateral, de ancho a
    expect(zonaEn(2.01, 10, B)).toBe("1");
    expect(zonaEn(20, 10, B)).toBe("1");
  });

  it('`pendienteHacia` decide cuál alero es el alto: invertirla espeja el croquis', () => {
    // No es simetría decorativa: el alero alto es el que ve el viento de frente y lleva
    // las zonas más succionadas. Confundirlo pone la 3′ del lado equivocado.
    const inv = { ...A, pendienteHacia: "-Y" };
    expect(zonaEn(4, 2, inv)).toBe("3");     // ahora y = 0 es el alero BAJO
    expect(zonaEn(4, 18, inv)).toBe("3'");
    expect(zonaEn(20, 18, inv)).toBe("2'");
    expect(zonaEn(20, 1, inv)).toBe("2");
  });

  it('la pendiente sobre X da el mismo dibujo girado 90°', () => {
    const girada = { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 20, by: 40, h: 6, a: 2, pendienteHacia: "+X" };
    for (const [x, y] of [[4, 2], [20, 2], [2, 18], [20, 19], [20, 10], [2, 10]]) {
      // (x, y) del caso base ↔ (y, x) del girado: el eje de la pendiente pasa de Y a X y
      // el lateral, de X a Y. Misma cara, mismos bordes, mismas distancias.
      expect(zonaEn(y, x, girada), `(${x}, ${y})`).toBe(zonaEn(x, y, A));
    }
  });

  it('las zonas se listan en el orden de la figura, con cada primada junto a su número', () => {
    expect(zonasPresentes(A)).toEqual(["1", "2", "2'", "3", "3'"]);
    expect(zonasPresentes(B)).toEqual(["1", "2", "3"]);
    // Una cubierta chica queda cubierta entera por las zonas de borde.
    expect(zonasPresentes({ ...A, bx: 6, by: 5 })).toEqual(["3", "3'"]);
    expect(zonasPresentes({ ...B, bx: 6, by: 5 })).toEqual(["2", "3"]);
  });

  it('`zonasPresentes` no se pierde ninguna zona en ninguna planta', () => {
    // Los puntos testigo se arman con las fronteras a `a` de los bordes, pero estas dos
    // figuras también cortan a 2a y a 4a. El barrido denso es el control de que los
    // testigos igual caen en todas las regiones.
    const orden = ["1'", "1", "2", "2'", "3", "3'"];
    for (const layout of [LAYOUT.UNA_AGUA_PRIMADA, LAYOUT.UNA_AGUA]) {
      for (const pendienteHacia of ["+X", "-Y"]) {
        for (const bx of [4, 9, 14, 30]) for (const by of [4, 11, 25]) for (const a of [1, 2, 3.5]) {
          const geo = { layout, bx, by, h: 8, a, pendienteHacia };
          const vistas = new Set();
          for (let i = 0; i <= 90; i++) for (let j = 0; j <= 90; j++) {
            vistas.add(zonaEn(bx * i / 90, by * j / 90, geo));
          }
          expect(zonasPresentes(geo), `${layout} ${bx}×${by} a=${a} ${pendienteHacia}`)
            .toEqual(orden.filter(z => vistas.has(z)));
        }
      }
    }
  });
});

describe('Fig. 5.3-1 — paredes', () => {
  const geo = { layout: LAYOUT.PARED, bx: 40, by: 20, h: 6, a: 2 };

  it('una pared NO se clasifica con un punto de la planta', () => {
    // Las zonas de pared viven sobre una superficie vertical y se miden a lo largo de esa
    // pared. La versión anterior usaba `min(dx, dy) ≤ a` sobre la planta, y con eso TODO
    // punto que estuviera sobre una pared tenía distancia cero al borde de la planta: el
    // punto medio de una nave de 40 m, que es zona 4 sin ninguna duda, salía zona 5.
    //
    // El error pasó dos tandas de tests porque los dos controles miraban lo mismo:
    // `zonasPresentes` y el barrido denso usaban esa función, así que coincidían entre sí
    // estando los dos equivocados. Lo destapó dibujarlo.
    expect(() => zonaEn(20, 0, geo)).toThrow(/no se clasifican con un punto de la planta/);
  });

  it('la zona 5 es la franja `a` contra cada esquina, medida a lo largo de la pared', () => {
    expect(zonaEnPared(1, 40, 2)).toBe("5");
    expect(zonaEnPared(39, 40, 2)).toBe("5");
    expect(zonaEnPared(20, 40, 2)).toBe("4");    // el punto medio, que antes daba 5
    expect(zonaEnPared(2, 40, 2)).toBe("5");     // el borde de la franja pertenece a la 5
    expect(zonaEnPared(2.01, 40, 2)).toBe("4");
  });

  it('una pared más corta que sus dos franjas es toda zona 5', () => {
    expect(zonaEnPared(1.5, 3, 2)).toBe("5");
    expect(franjasDePared(3, 2)).toEqual([{ zona: "5", desde: 0, hasta: 3 }]);
  });

  it('las franjas de elevación coinciden con el clasificador', () => {
    const largo = 40, a = 2;
    for (const f of franjasDePared(largo, a)) {
      for (let k = 1; k < 20; k++) {
        const s = f.desde + (f.hasta - f.desde) * k / 20;
        expect(zonaEnPared(s, largo, a), `s = ${s}`).toBe(f.zona);
      }
    }
  });

  it('sólo tiene las zonas 4 y 5, y la 4 desaparece si el edificio es chico', () => {
    expect(zonasPresentes(geo)).toEqual(["4", "5"]);
    expect(zonasPresentes({ ...geo, bx: 3, by: 3 })).toEqual(["5"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAS REGIONES DEL CROQUIS CONTRA EL CLASIFICADOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('regionesDe — el dibujo y el clasificador dicen lo mismo', () => {
  // Son dos representaciones independientes de la misma regla: una responde «¿qué zona es
  // este punto?» y la otra «¿qué figura ocupa cada zona?». Que coincidan punto por punto
  // es lo que convierte al croquis en un control y no en una ilustración.
  const casos = [
    { layout: LAYOUT.PLANA_H, bx: 30, by: 40, h: 10 },
    { layout: LAYOUT.PLANA_H, bx: 8, by: 40, h: 10 },
    { layout: LAYOUT.PLANA_H, bx: 8, by: 10, h: 10 },
    { layout: LAYOUT.PLANA_H, bx: 3, by: 3.5, h: 10 },
    { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 20, by: 40, h: 6, a: 2, ejeCumbrera: "Y" },
    { layout: LAYOUT.DOS_AGUAS_ESQUINAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    { layout: LAYOUT.DOS_AGUAS_ESQUINAS, bx: 20, by: 40, h: 6, a: 2, ejeCumbrera: "Y" },
    { layout: LAYOUT.CUATRO_AGUAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    { layout: LAYOUT.CUATRO_AGUAS, bx: 20, by: 40, h: 6, a: 2, ejeCumbrera: "Y" },
    { layout: LAYOUT.CUATRO_AGUAS, bx: 20, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 40, by: 20, h: 6, a: 2, pendienteHacia: "+Y" },
    { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 20, by: 40, h: 6, a: 2, pendienteHacia: "-X" },
    { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 12, by: 10, h: 6, a: 2, pendienteHacia: "+X" },
    { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 6, by: 5, h: 8, a: 2, pendienteHacia: "+Y" },
    { layout: LAYOUT.UNA_AGUA, bx: 40, by: 20, h: 6, a: 2, pendienteHacia: "+X" },
    { layout: LAYOUT.UNA_AGUA, bx: 12, by: 10, h: 6, a: 2, pendienteHacia: "-Y" },
    { layout: LAYOUT.UNA_AGUA, bx: 6, by: 5, h: 8, a: 2, pendienteHacia: "+Y" },
  ];

  // La zona que ve el ojo: la ÚLTIMA pieza que cubre el punto, que es como pinta el SVG.
  const dist = (px, py, [x1, y1, x2, y2]) => {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };
  const zonaPintada = (piezas, x, y) => {
    let z = null;
    for (const p of piezas) {
      if (p.tipo === "rect") {
        if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) z = p.zona;
      } else if (p.segmentos.some(s => dist(x, y, s) <= p.ancho / 2)) z = p.zona;
    }
    return z;
  };

  // Un punto está EN UNA FRONTERA si el clasificador salta al moverlo un infinitésimo. Es
  // la única discrepancia admisible entre las dos representaciones: sobre la línea que
  // separa dos zonas, `zonaEn` usa ≤ y se queda con la de adentro, mientras que el dibujo
  // pinta encima el rectángulo siguiente. Es un conjunto de área cero y no se ve; lo que
  // NO se admite es una discrepancia en el interior de una región.
  const enFrontera = (x, y, geo) => {
    const d = 1e-7, z = zonaEn(x, y, geo);
    // Las cuatro diagonales además de los cuatro ejes: en la ESQUINA de un anillo —donde
    // `min(dx, dy)` vale lo mismo en las dos direcciones— mover sólo una coordenada no
    // cambia nada, y el punto igual está sobre la frontera. Con bx = 30, by = 40 y h = 10
    // eso pasa exactamente en (12, 12), que es la esquina de 1,2h con 1,2h.
    const P = [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [d, -d], [-d, d], [-d, -d]];
    return P.some(([ex, ey]) => {
      const px = Math.min(Math.max(x + ex, 0), geo.bx);
      const py = Math.min(Math.max(y + ey, 0), geo.by);
      return zonaEn(px, py, geo) !== z;
    });
  };

  it('cada punto INTERIOR recibe del dibujo la zona que dice el clasificador', () => {
    for (const geo of casos) {
      const piezas = regionesDe(geo);
      const n = 150;
      let comparados = 0;
      const fallos = [];
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
        const x = geo.bx * i / n, y = geo.by * j / n;
        comparados++;
        const esperada = zonaEn(x, y, geo);
        if (zonaPintada(piezas, x, y) === esperada) continue;
        if (enFrontera(x, y, geo)) continue;
        fallos.push([+x.toFixed(4), +y.toFixed(4), esperada, zonaPintada(piezas, x, y)]);
      }
      const etiqueta = `${geo.layout} ${geo.bx}×${geo.by}`;
      expect(comparados, etiqueta).toBe((n + 1) * (n + 1));
      expect(fallos, `${etiqueta}: ${JSON.stringify(fallos.slice(0, 6))}`).toEqual([]);
    }
  });

  it('las piezas cubren toda la planta y ninguna se sale', () => {
    for (const geo of casos) {
      for (const p of regionesDe(geo)) {
        if (p.tipo !== "rect") continue;
        expect(p.x, geo.layout).toBeGreaterThanOrEqual(-1e-9);
        expect(p.y, geo.layout).toBeGreaterThanOrEqual(-1e-9);
        expect(p.x + p.w, geo.layout).toBeLessThanOrEqual(geo.bx + 1e-9);
        expect(p.y + p.h, geo.layout).toBeLessThanOrEqual(geo.by + 1e-9);
        expect(p.w * p.h, geo.layout).toBeGreaterThan(0);
      }
    }
  });

  it('las zonas dibujadas son exactamente las que declara `zonasPresentes`', () => {
    for (const geo of casos) {
      const enDibujo = new Set(regionesDe(geo).map(p => p.zona));
      // El fondo de cuatro aguas puede quedar totalmente tapado: se compara contra lo que
      // realmente se ve, no contra la lista de piezas.
      const piezas = regionesDe(geo);
      const vistas = new Set();
      for (let i = 0; i <= 60; i++) for (let j = 0; j <= 60; j++) {
        vistas.add(zonaEn(geo.bx * i / 60, geo.by * j / 60, geo));
      }
      expect([...vistas].sort(), geo.layout).toEqual(zonasPresentes(geo).sort());
      for (const z of vistas) expect(enDibujo, `${geo.layout}: falta la zona ${z}`).toContain(z);
    }
  });

  it('las paredes no se dibujan en planta', () => {
    expect(() => regionesDe({ layout: LAYOUT.PARED, bx: 40, by: 20, h: 6, a: 2 }))
      .toThrow(/se dibujan en elevación/);
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
    ];
    for (const geo of casos) {
      const vistas = new Set();
      const n = 300;
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
        vistas.add(zonaEn(geo.bx * i / n, geo.by * j / n, geo));
      }
      const orden = ["1'", "1", "2", "3"];
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
    ];
    for (const geo of casos) {
      const validas = ["1'", "1", "2", "3"];
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

// ═══════════════════════════════════════════════════════════════════════════════
// LAS COTAS DE ZONA Y LOS PUNTOS DE RÓTULO
// ═══════════════════════════════════════════════════════════════════════════════

describe('cotasDeZona — lo que se transcribe al plano de correas', () => {
  const geos = {
    [LAYOUT.PARED]: { layout: LAYOUT.PARED, bx: 40, by: 20, h: 6, a: 2 },
    [LAYOUT.PLANA_H]: { layout: LAYOUT.PLANA_H, bx: 40, by: 20, h: 6, a: 2 },
    [LAYOUT.DOS_AGUAS_CUMBRERA]: { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    [LAYOUT.DOS_AGUAS_ESQUINAS]: { layout: LAYOUT.DOS_AGUAS_ESQUINAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    [LAYOUT.CUATRO_AGUAS]: { layout: LAYOUT.CUATRO_AGUAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    [LAYOUT.UNA_AGUA_PRIMADA]: { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 40, by: 20, h: 6, a: 2, pendienteHacia: "+Y" },
    [LAYOUT.UNA_AGUA]: { layout: LAYOUT.UNA_AGUA, bx: 40, by: 20, h: 6, a: 2, pendienteHacia: "+Y" },
  };

  it('todos los layouts tienen cotas: ninguno se queda mudo', () => {
    for (const [nombre, geo] of Object.entries(geos)) {
      expect(cotasDeZona(geo).length, nombre).toBeGreaterThan(0);
    }
  });

  it('el símbolo y el número dicen lo mismo', () => {
    // Es el control contra el error de tipeo que nadie ve: un renglón que dice «2a» y
    // lleva el valor de `a` da una franja de la mitad en el plano de revestimiento.
    const valorDe = { "a": 2, "2a": 4, "4a": 8, "0,2h": 1.2, "0,6h": 3.6, "1,2h": 7.2 };
    for (const [nombre, geo] of Object.entries(geos)) {
      for (const k of cotasDeZona(geo)) {
        for (const [sim, campo] of [[k.simbolo, k.valor], [k.simbolo, k.valor2]]) {
          if (campo == null) continue;
          const partes = sim.split(" × ");
          const esperados = partes.map(x => valorDe[x]);
          if (esperados.some(x => x === undefined)) continue;   // «—», rangos
          expect(esperados.some(x => Math.abs(x - campo) < 1e-9),
            `${nombre}: ${sim} lleva ${campo}`).toBe(true);
        }
      }
    }
  });

  it('⚠ vertiente única: la franja del alero BAJO mide `a` y la lateral cambia con la figura', () => {
    // El punto de la corrección del proyectista. Si un día alguien «uniforma» estas
    // cotas a 2a, el plano de correas sale con la franja del alero bajo al doble.
    const cA = cotasDeZona(geos[LAYOUT.UNA_AGUA_PRIMADA]);
    const bajoA = cA.find(k => /franja contra el alero BAJO/.test(k.que));
    expect(bajoA.simbolo).toBe("a");
    expect(bajoA.valor).toBe(2);
    expect(cA.find(k => /borde lateral/.test(k.que)).simbolo).toBe("2a");

    const cB = cotasDeZona(geos[LAYOUT.UNA_AGUA]);
    const bajoB = cB.find(k => /franja contra el alero BAJO/.test(k.que));
    expect(bajoB.simbolo).toBe("a");
    expect(cB.find(k => /borde lateral/.test(k.que)).simbolo).toBe("a");
  });

  it('cada zona cotada existe de verdad en esa planta', () => {
    // El otro modo de mentir de una tabla de cotas: nombrar una zona que la figura no
    // tiene. Se controla contra el clasificador, que es la única definición.
    for (const [nombre, geo] of Object.entries(geos)) {
      const hay = new Set(zonasPresentes(geo));
      for (const k of cotasDeZona(geo)) {
        expect(hay, `${nombre}: zona ${k.zona}`).toContain(k.zona);
      }
    }
  });
});

describe('puntosDeRotulo — dónde va el número de cada zona', () => {
  const casos = [
    { layout: LAYOUT.PLANA_H, bx: 40, by: 20, h: 10 },
    { layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    { layout: LAYOUT.CUATRO_AGUAS, bx: 40, by: 20, h: 6, a: 2, ejeCumbrera: "X" },
    { layout: LAYOUT.UNA_AGUA_PRIMADA, bx: 20, by: 30, h: 6, a: 2, pendienteHacia: "+Y" },
    { layout: LAYOUT.UNA_AGUA, bx: 20, by: 30, h: 6, a: 2, pendienteHacia: "-X" },
  ];

  it('el punto de cada zona CAE en esa zona, y hay uno por zona presente', () => {
    for (const geo of casos) {
      const pts = puntosDeRotulo(geo);
      expect(Object.keys(pts).sort(), geo.layout).toEqual(zonasPresentes(geo).sort());
      for (const [z, p] of Object.entries(pts)) {
        expect(zonaEn(p.x, p.y, geo), `${geo.layout}: zona ${z}`).toBe(z);
      }
    }
  });

  it('no hay dos zonas rotuladas en el mismo punto', () => {
    // Fue un defecto real: en cuatro aguas el ① y el ② caían los dos en el centro de la
    // planta y el croquis mostraba una zona menos de las que tiene.
    for (const geo of casos) {
      const pts = Object.values(puntosDeRotulo(geo));
      const vistos = new Set(pts.map(p => `${p.x},${p.y}`));
      expect(vistos.size, geo.layout).toBe(pts.length);
    }
  });

  it('el número no se apoya sobre la línea del contorno', () => {
    // Casi todas las zonas de estas figuras son franjas contra un borde, y el punto «más
    // adentro» de una franja, sin contar el contorno, es el que está pegado al contorno:
    // el círculo salía mordido por la línea de la planta. Se exige que quede al menos a
    // un tercio del ancho de la franja más angosta —`a`, o 0,2h en la cubierta plana—.
    for (const geo of casos) {
      const franja = geo.layout === LAYOUT.PLANA_H ? 0.2 * geo.h : geo.a;
      for (const [z, p] of Object.entries(puntosDeRotulo(geo))) {
        const d = Math.min(p.x, geo.bx - p.x, p.y, geo.by - p.y);
        expect(d, `${geo.layout}: zona ${z}`).toBeGreaterThan(franja / 3);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('celdasDeZona — la planta partida para recortar caras en 3D', () => {
  const geo = (over = {}) => ({ layout: LAYOUT.DOS_AGUAS_CUMBRERA, bx: 20, by: 30,
    h: 7.5, a: 2, ejeCumbrera: "X", ...over });

  const areaDe = (cs) => cs.reduce((s, c) => s + (c.x1 - c.x0) * (c.y1 - c.y0), 0);

  it('⚠ LAS CELDAS SON UNA PARTICIÓN: cubren la planta y no se superponen', () => {
    // Es la diferencia con `regionesDe`, que devuelve piezas EN ORDEN DE PINTADO —en cuatro
    // aguas la zona 1 cubre toda la planta y después queda tapada—. Eso sirve para dibujar en
    // 2D, donde lo último que se pinta gana, y NO para recortar caras en 3D: un pedazo de
    // faldón que perteneciera a dos zonas se dibujaría dos veces con dos colores.
    // ⚠ En cuatro aguas la cumbrera va sobre el LADO LARGO y `zonaEn` lo exige: con
    // `ejeCumbrera: "X"` sobre una planta de 20 × 30 la cumbrera correría sobre el lado
    // corto, que es una geometría que el capítulo 2 ya reorienta antes de llegar acá.
    for (const g of [geo(), geo({ layout: LAYOUT.PLANA_H }),
      geo({ layout: LAYOUT.CUATRO_AGUAS, ejeCumbrera: "Y" }),
      geo({ layout: LAYOUT.DOS_AGUAS_ESQUINAS })]) {
      const cs = celdasDeZona(g);
      expect(areaDe(cs), g.layout).toBeCloseTo(g.bx * g.by, 6);
      // Y ningún par se pisa.
      for (let i = 0; i < cs.length; i++) {
        for (let j = i + 1; j < cs.length; j++) {
          const [p, q] = [cs[i], cs[j]];
          const solapa = p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;
          expect(solapa, `${g.layout}: celdas ${i} y ${j}`).toBe(false);
        }
      }
    }
  });

  it('cada celda es de UNA zona: su centro y sus cuatro cuartos coinciden', () => {
    // Si una celda cruzara una frontera, clasificar su centro pintaría media celda con la
    // zona equivocada. Es el defecto que ya apareció una vez con la franja lateral de la
    // Fig. 5.3-5B, que mide `a` y no 2a.
    const g = geo({ layout: LAYOUT.UNA_AGUA, pendienteHacia: "+Y" });
    for (const c of celdasDeZona(g)) {
      const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
      const w = (c.x1 - c.x0) / 4, h2 = (c.y1 - c.y0) / 4;
      for (const [dx, dy] of [[-w, -h2], [w, -h2], [-w, h2], [w, h2]]) {
        expect(zonaEn(cx + dx, cy + dy, g), `celda en ${cx},${cy}`).toBe(c.zona);
      }
    }
  });

  it('las zonas que aparecen son las mismas que declara `zonasPresentes`', () => {
    for (const layout of [LAYOUT.DOS_AGUAS_CUMBRERA, LAYOUT.PLANA_H, LAYOUT.CUATRO_AGUAS]) {
      const g = geo({ layout, ...(layout === LAYOUT.CUATRO_AGUAS ? { ejeCumbrera: "Y" } : {}) });
      const enCeldas = [...new Set(celdasDeZona(g).map(c => c.zona))].sort();
      expect(enCeldas, layout).toEqual([...zonasPresentes(g)].sort());
    }
  });

  it('⚠ EN CUATRO AGUAS EL PASO LO MANDA `a`, NO EL TAMAÑO DEL EDIFICIO', () => {
    // Es la única zonificación que se muestrea, porque sus limatesas van a 45°. La banda de
    // cumbrera mide 2a: con celdas más gruesas puede caer entera adentro de una celda cuyo
    // centro quede afuera y DESAPARECER, que es justo la zona más succionada de la cubierta.
    // El código tomaba el paso más GRUESO de los dos candidatos y este test lo encontró.
    for (const [bx, by, a] of [[20, 30, 2], [12, 40, 1.2], [30, 30, 3]]) {
      const g = geo({ layout: LAYOUT.CUATRO_AGUAS, ejeCumbrera: by >= bx ? "Y" : "X",
        bx, by, a });
      const cs = celdasDeZona(g);
      expect(cs.some(c => c.zona === "2"), `banda ausente en ${bx}×${by}`).toBe(true);
      for (const c of cs) {
        expect(c.x1 - c.x0).toBeLessThanOrEqual(a / 2 + 1e-9);
        expect(c.y1 - c.y0).toBeLessThanOrEqual(a / 2 + 1e-9);
      }
    }
  });

  it('una planta muy alargada degrada la grilla en vez de dar miles de celdas', () => {
    // El freno para el caso patológico: sin tope, un `a` chico contra una planta larga da un
    // paso finísimo y decenas de miles de celdas. Es preferible una aproximación más gruesa
    // —y anotada— a colgar el dibujo.
    const g = geo({ layout: LAYOUT.CUATRO_AGUAS, ejeCumbrera: "Y", bx: 8, by: 200, a: 0.8 });
    const cs = celdasDeZona(g);
    expect(cs.length).toBeLessThan(20000);
    expect(areaDe(cs)).toBeCloseTo(8 * 200, 6);
  });

  it('una pared no se parte en celdas: se zonifica por su largo', () => {
    expect(() => celdasDeZona(geo({ layout: LAYOUT.PARED }))).toThrow(/franjasDePared/);
  });
});
