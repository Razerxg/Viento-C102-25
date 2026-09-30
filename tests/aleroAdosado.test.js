// ART. 5.9 — ALEROS ADOSADOS A PAREDES. LAS CURVAS CONTRA LAS ECUACIONES DE SU COMENTARIO.
//
// Mismo mecanismo que `cyrCurvas.test.js`: `constants/aleroAdosado.js` guarda las curvas de
// las Figs. 5.9-1A/1B/2A/2B como poligonales de puntos de quiebre, y acá se transcriben OTRA
// VEZ las ecuaciones de las Tablas C 5.9-1 a C 5.9-4, tal como las imprime el comentario, y
// se cruzan. Dos transcripciones independientes del mismo papel: una cifra mal copiada de un
// lado no cierra contra el otro.
//
// Lo que este archivo protege además de la conversión:
//   · la CONTINUIDAD en los empalmes, que es el defecto que la forma de ecuación esconde;
//   · las BANDAS de h_c/h_e con sus bordes abiertos y cerrados, que es donde un `<` por un
//     `<=` cambia el coeficiente un 55 %;
//   · el HUECO de la Tabla C 5.9-4 en h_c/h_e ≤ 0,1, que es del reglamento y tiene que
//     avisar, no resolverse en silencio;
//   · que la presión NO lleve (GC_pi), que es lo que separa la 5.9-1 de la 5.3-1;
//   · la interpolación de las excepciones 1 y 2 entre 20 y 30 m.
import { describe, it, expect } from 'vitest';
import {
  FIGURAS_ALERO, FIGURAS_ALERO_LISTA, CARA, DESTINO, H_CORTE, H_EXCEPCION, LIMITE_A,
  PENDIENTE_MAXIMA, figuraAlero,
} from '../src/constants/aleroAdosado.js';
import {
  gcpAlero, bandaDe, presionAlero, verificarElementoAlero, analizarAleroAdosado,
  curvasAleroUsadas, PAREDES,
} from '../src/engine/aleroAdosado.js';
import { gcp } from '../src/engine/cyr.js';
import { P_MINIMA } from '../src/engine/cyrPresiones.js';

const log = Math.log10;
const TOL = 0.005;   // medio dígito del redondeo del propio reglamento

// Las áreas caen a los dos lados de cada meseta y JUSTO SOBRE los tres puntos de quiebre de
// las cuatro tablas —1, 10 y 100 m²—, que es donde un tramo mal convertido se separa.
const AREAS = [0.5, 1, 1.5, 2, 5, 10, 20, 50, 100, 200];

// ═══════════════════════════════════════════════════════════════════════════════
// LAS ECUACIONES, COMO LAS IMPRIME EL COMENTARIO
// ═══════════════════════════════════════════════════════════════════════════════
//
// Con los coeficientes tal cual y en el mismo orden de filas que la tabla, para poder leerlas
// al lado del PDF. No se factoriza nada, aunque tres de los cuatro «positivos» se repitan.

// Tabla C 5.9-1 — superficies, h ≤ 20 m (Fig. 5.9-1A)
const T1 = {
  supNeg: A => A <= 1 ? -1.15 : A <= 10 ? -1.15 + 0.4 * log(A) : -0.75,
  infNeg: A => A <= 1 ? -0.8 : A <= 10 ? -0.8 + 0.15 * log(A) : -0.65,
  pos:    A => A <= 1 ? 0.8 : A <= 10 ? 0.8 - 0.2 * log(A) : 0.6,
};

// Tabla C 5.9-2 — presión neta, h ≤ 20 m (Fig. 5.9-1B)
const T2 = {
  negAlta:  A => A <= 1 ? -1.4 : A <= 10 ? -1.4 + 0.3 * log(A) : -1.1,
  negMedia: A => A <= 1 ? -0.9 : A <= 10 ? -0.9 + 0.25 * log(A) : -0.65,
  negBaja:  A => A <= 1 ? -0.6 : A <= 10 ? -0.6 + 0.1 * log(A) : -0.5,
  pos:      A => A <= 1 ? 0.9 : A <= 10 ? 0.9 - 0.25 * log(A) : 0.65,
};

// Tabla C 5.9-3 — superficies, h > 20 m (Fig. 5.9-2A)
// ⚠ Los negativos NO terminan en meseta: el último tramo es «10,0 < A ≤ 100 m²» y la tabla
// no escribe nada para A > 100. La transcripción de acá congela el valor de A = 100, que es
// la misma convención de la poligonal y la lectura conservadora.
const T3 = {
  supNeg: A => A <= 1 ? -1.9 : A <= 10 ? -1.9 + 0.2 * log(A)
                             : A <= LIMITE_A ? -2.4 + 0.7 * log(A) : -2.4 + 0.7 * log(LIMITE_A),
  infNeg: A => A <= 1 ? -1.0 : A <= 10 ? -1.0 + 0.2 * log(A)
                             : A <= LIMITE_A ? -1.1 + 0.3 * log(A) : -1.1 + 0.3 * log(LIMITE_A),
  pos:    A => A <= 1 ? 0.8 : A <= 10 ? 0.8 - 0.2 * log(A) : 0.6,
};

// Tabla C 5.9-4 — presión neta, h > 20 m (Fig. 5.9-2B)
const T4 = {
  negAlta:  A => A <= 1 ? -2.3 : A <= 10 ? -2.3 + 0.2 * log(A)
                               : A <= LIMITE_A ? -3.0 + 0.9 * log(A) : -3.0 + 0.9 * log(LIMITE_A),
  negMedia: A => A <= 1 ? -1.3 : A <= 10 ? -1.3 + 0.55 * log(A) : -0.75,
  pos:      A => A <= 1 ? 0.9 : A <= 10 ? 0.9 - 0.25 * log(A) : 0.65,
};

// ═══════════════════════════════════════════════════════════════════════════════
describe('las poligonales contra las ecuaciones del comentario', () => {
  const casos = [
    ["5.9-1A superior", FIGURAS_ALERO["5.9-1A"].negPorCara[CARA.SUPERIOR], T1.supNeg],
    ["5.9-1A inferior", FIGURAS_ALERO["5.9-1A"].negPorCara[CARA.INFERIOR], T1.infNeg],
    ["5.9-1A positivo", FIGURAS_ALERO["5.9-1A"].pos, T1.pos],
    ["5.9-1B 0,9–1", FIGURAS_ALERO["5.9-1B"].bandas[0].neg, T2.negAlta],
    ["5.9-1B 0,5–0,9", FIGURAS_ALERO["5.9-1B"].bandas[1].neg, T2.negMedia],
    ["5.9-1B ≤ 0,5", FIGURAS_ALERO["5.9-1B"].bandas[2].neg, T2.negBaja],
    ["5.9-1B positivo", FIGURAS_ALERO["5.9-1B"].pos, T2.pos],
    ["5.9-2A superior", FIGURAS_ALERO["5.9-2A"].negPorCara[CARA.SUPERIOR], T3.supNeg],
    ["5.9-2A inferior", FIGURAS_ALERO["5.9-2A"].negPorCara[CARA.INFERIOR], T3.infNeg],
    ["5.9-2A positivo", FIGURAS_ALERO["5.9-2A"].pos, T3.pos],
    ["5.9-2B 0,9–1", FIGURAS_ALERO["5.9-2B"].bandas[0].neg, T4.negAlta],
    ["5.9-2B 0,1–0,9", FIGURAS_ALERO["5.9-2B"].bandas[1].neg, T4.negMedia],
    ["5.9-2B positivo", FIGURAS_ALERO["5.9-2B"].pos, T4.pos],
  ];

  for (const [nombre, curva, eq] of casos) {
    it(`${nombre} cierra en las diez áreas`, () => {
      for (const A of AREAS) {
        expect(gcp(curva, A), `A = ${A} m²`).toBeCloseTo(eq(A), 2);
        expect(Math.abs(gcp(curva, A) - eq(A)), `A = ${A} m²`).toBeLessThan(TOL);
      }
    });
  }

  it('las áreas del barrido cubren TODOS los puntos de quiebre de las cuatro tablas', () => {
    // Sin esto el barrido podría pasar por al lado de un empalme mal convertido: los
    // errores de conversión de una poligonal se ven JUSTO en el quiebre, no entre quiebres.
    const quiebres = new Set();
    for (const fig of Object.values(FIGURAS_ALERO)) {
      for (const [A] of fig.pos) quiebres.add(A);
      for (const c of Object.values(fig.negPorCara ?? {})) for (const [A] of c) quiebres.add(A);
      for (const b of fig.bandas ?? []) for (const [A] of b.neg) quiebres.add(A);
    }
    for (const A of quiebres) expect(AREAS, `falta el quiebre A = ${A}`).toContain(A);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('continuidad y forma de las curvas', () => {
  const todas = () => {
    const salida = [];
    for (const nombre of FIGURAS_ALERO_LISTA) {
      const fig = FIGURAS_ALERO[nombre];
      salida.push([`${nombre} pos`, fig.pos]);
      for (const [cara, c] of Object.entries(fig.negPorCara ?? {})) salida.push([`${nombre} ${cara}`, c]);
      for (const b of fig.bandas ?? []) salida.push([`${nombre} ${b.rango}`, b.neg]);
    }
    return salida;
  };

  it('ninguna curva salta: el valor en un quiebre es el mismo por los dos lados', () => {
    // Es el defecto que la forma de ecuación esconde y la poligonal hace imposible; el test
    // existe para que siga siéndolo si alguien vuelve a los tramos.
    const eps = 1e-6;
    for (const [nombre, curva] of todas()) {
      for (const [A, g] of curva) {
        expect(gcp(curva, A * (1 - eps)), `${nombre} por debajo de A = ${A}`).toBeCloseTo(g, 4);
        expect(gcp(curva, A * (1 + eps)), `${nombre} por encima de A = ${A}`).toBeCloseTo(g, 4);
      }
    }
  });

  it('los negativos crecen con el área y los positivos decrecen — es la forma de todas', () => {
    for (const [nombre, curva] of todas()) {
      const positiva = curva[0][1] > 0;
      for (let i = 1; i < curva.length; i++) {
        if (positiva) expect(curva[i][1], nombre).toBeLessThan(curva[i - 1][1]);
        else expect(curva[i][1], nombre).toBeGreaterThan(curva[i - 1][1]);
      }
    }
  });

  it('la succión crece con h_c/h_e: la banda alta succiona más que la baja', () => {
    // La tendencia física del artículo, y la que justifica cómo se resuelve el hueco de la
    // Tabla C 5.9-4. Si algún día se invierte, alguien cargó una banda en el lugar de otra.
    for (const nombre of ["5.9-1B", "5.9-2B"]) {
      const bandas = FIGURAS_ALERO[nombre].bandas;
      for (let i = 1; i < bandas.length; i++) {
        for (const A of AREAS) {
          expect(gcp(bandas[i].neg, A), `${nombre} ${bandas[i].rango} vs ${bandas[i - 1].rango} en A = ${A}`)
            .toBeGreaterThan(gcp(bandas[i - 1].neg, A));
        }
      }
    }
  });

  it('h > 20 m succiona más que h ≤ 20 m: cara superior y presión neta', () => {
    // Es lo que hace que la altura del EDIFICIO —y no la del alero— sea el dato que elige la
    // figura: colgar el mismo alero de un edificio más alto lo carga más. Vale en todo el
    // dominio tabulado para la cara superior y para la banda alta de las netas.
    for (const A of AREAS) {
      expect(gcp(FIGURAS_ALERO["5.9-2A"].negPorCara[CARA.SUPERIOR], A), `A = ${A}`)
        .toBeLessThan(gcp(FIGURAS_ALERO["5.9-1A"].negPorCara[CARA.SUPERIOR], A));
      expect(gcp(FIGURAS_ALERO["5.9-2B"].bandas[0].neg, A), `A = ${A}`)
        .toBeLessThan(gcp(FIGURAS_ALERO["5.9-1B"].bandas[0].neg, A));
    }
  });

  it('⚠ LA CARA INFERIOR SE CRUZA EN A ≈ 31,6 m², Y ES LO QUE DICEN LAS TABLAS', () => {
    // Único lugar donde la figura de h > 20 m succiona MENOS que la de h ≤ 20 m dentro del
    // dominio tabulado. Sale de las dos tablas tal como están impresas: la C 5.9-1 congela la
    // cara inferior en −0,65 desde A = 10 m², y el último tramo de la C 5.9-3 —«−1,1 + 0,3
    // log A», 10 < A ≤ 100— la cruza en 10^1,5 = 31,6 m² y llega a −0,50 en A = 100.
    //
    // No es un error de transcripción: el test lo fija para que nadie lo «arregle» sin
    // volver al papel, y para que quede visible si algún día aparece una fe de erratas.
    const inf1 = FIGURAS_ALERO["5.9-1A"].negPorCara[CARA.INFERIOR];
    const inf2 = FIGURAS_ALERO["5.9-2A"].negPorCara[CARA.INFERIOR];
    expect(gcp(inf2, 10)).toBeLessThan(gcp(inf1, 10));         // antes del cruce
    expect(gcp(inf2, 31.6)).toBeCloseTo(gcp(inf1, 31.6), 3);   // el cruce
    expect(gcp(inf2, 50)).toBeGreaterThan(gcp(inf1, 50));      // después
    expect(gcp(inf2, 100)).toBeCloseTo(-0.5, 6);
  });

  it('la cara superior succiona más que la inferior, en las dos figuras de superficies', () => {
    for (const nombre of ["5.9-1A", "5.9-2A"]) {
      for (const A of AREAS) {
        expect(gcp(FIGURAS_ALERO[nombre].negPorCara[CARA.SUPERIOR], A), `${nombre} A = ${A}`)
          .toBeLessThan(gcp(FIGURAS_ALERO[nombre].negPorCara[CARA.INFERIOR], A));
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('las bandas de h_c/h_e, con sus bordes como los escribe la tabla', () => {
  const fig = FIGURAS_ALERO["5.9-1B"];

  it('⚠ h_c/h_e = 0,9 CAE EN LA BANDA ALTA, no en la media', () => {
    // La tabla escribe «0,9 ≤ h_c/h_e ≤ 1» y «0,5 < h_c/h_e < 0,9»: el 0,9 pertenece a la
    // primera. Un `<=` por un `<` en el borde de abajo lo mandaría a la media y el
    // coeficiente bajaría de −1,4 a −0,9, un 36 % menos de succión.
    expect(bandaDe(fig, 0.9).banda.id).toBe("alta");
    expect(bandaDe(fig, 0.8999).banda.id).toBe("media");
  });

  it('el 0,5 cae en la banda baja, que es la que lo escribe con «≤»', () => {
    expect(bandaDe(fig, 0.5).banda.id).toBe("baja");
    expect(bandaDe(fig, 0.5001).banda.id).toBe("media");
  });

  it('las bandas de la Tabla C 5.9-2 cubren (0, 1] sin huecos ni solapes', () => {
    // El barrido va por enteros: acumulando `r += 0.01` el último paso da
    // 1,0000000000000007 y cae fuera de «≤ 1» por punto flotante, no por la tabla.
    for (let i = 1; i <= 100; i++) {
      const r = i / 100;
      const halladas = fig.bandas.filter(b =>
        (b.incluyeDesde ? r >= b.desde : r > b.desde)
        && (b.incluyeHasta ? r <= b.hasta : r < b.hasta));
      expect(halladas.length, `h_c/h_e = ${r.toFixed(2)}`).toBe(1);
    }
  });

  it('⚠ LA TABLA C 5.9-4 NO CUBRE h_c/h_e ≤ 0,1, y eso tiene que avisar', () => {
    // Es un hueco del reglamento: sus bandas son «0,9 ≤ r ≤ 1» y «0,1 < r < 0,9», y no hay
    // tercera fila —la C 5.9-2, su par de h ≤ 20 m, sí la tiene—. Se extiende la banda
    // contigua hacia abajo, que es coherente con la tendencia de las dos tablas, y se avisa.
    // Resolverlo en silencio sería inventar una fila de tabla.
    const b = bandaDe(FIGURAS_ALERO["5.9-2B"], 0.05);
    expect(b.banda.id).toBe("media");
    expect(b.avisos).toHaveLength(1);
    expect(b.avisos[0].texto).toMatch(/no da valores para ese rango/);
    // Y su par de h ≤ 20 m NO avisa, porque ahí la tabla sí escribe el fondo.
    expect(bandaDe(fig, 0.05).avisos).toHaveLength(0);
  });

  it('h_c/h_e > 1 usa la banda alta y avisa: h_c no puede superar h_e', () => {
    const b = bandaDe(fig, 1.2);
    expect(b.banda.id).toBe("alta");
    expect(b.avisos[0].texto).toMatch(/mayor que 1/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('figuraAlero — qué figura rige', () => {
  it('los 20 m van con la figura 5.9-1: el corte es «h ≤ 20 m» / «h > 20 m»', () => {
    expect(figuraAlero(H_CORTE, DESTINO.ESTRUCTURA)).toBe("5.9-1B");
    expect(figuraAlero(H_CORTE + 0.01, DESTINO.ESTRUCTURA)).toBe("5.9-2B");
    expect(figuraAlero(H_CORTE, DESTINO.SUPERFICIES)).toBe("5.9-1A");
    expect(figuraAlero(H_CORTE + 0.01, DESTINO.SUPERFICIES)).toBe("5.9-2A");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('gcpAlero y la interpolación de las excepciones 1 y 2', () => {
  const ctx = (h, extra = {}) => ({ qh: 1000, h, hc: 3, he: 6, ...extra });

  it('sin la excepción, un edificio de 25 m lee la figura de h > 20 m sola', () => {
    const g = gcpAlero(ctx(25), { destino: DESTINO.ESTRUCTURA, A: 5 });
    expect(g.figuras).toEqual(["5.9-2B"]);
    expect(g.interpolada).toBe(false);
    // h_c/h_e = 0,5, que en la Tabla C 5.9-4 está en la banda «0,1 < r < 0,9».
    expect(g.neg).toBeCloseTo(T4.negMedia(5), 6);
  });

  it('con la excepción, a 25 m el valor es el punto medio de las dos figuras', () => {
    // 25 m es la mitad exacta entre 20 y 30: la interpolación lineal da el promedio, que es
    // el único valor que se puede verificar a mano sin repetir la fórmula del motor.
    const g = gcpAlero(ctx(25, { interpolarH: true }), { destino: DESTINO.ESTRUCTURA, A: 5 });
    expect(g.figuras).toEqual(["5.9-1B", "5.9-2B"]);
    expect(g.interpolada).toBe(true);
    // A = 5 y h_c/h_e = 0,5: banda «≤ 0,5» en la C 5.9-2 y «0,1 < r < 0,9» en la C 5.9-4.
    expect(g.neg).toBeCloseTo((T2.negBaja(5) + T4.negMedia(5)) / 2, 6);
    expect(g.pos).toBeCloseTo((T2.pos(5) + T4.pos(5)) / 2, 6);
  });

  it('en los extremos la interpolación devuelve cada figura tal cual', () => {
    const en = (h) => gcpAlero(ctx(h, { interpolarH: true }),
      { destino: DESTINO.ESTRUCTURA, A: 5 }).neg;
    // h = 20 no entra en la excepción («entre 20 m y 30 m» con la figura 1 rigiendo en ≤ 20),
    // así que ahí manda la 5.9-1B directamente y da lo mismo que el extremo interpolado.
    expect(en(H_CORTE + 1e-9)).toBeCloseTo(T2.negBaja(5), 4);
    expect(en(H_EXCEPCION)).toBeCloseTo(T4.negMedia(5), 6);
  });

  it('⚠ LA INTERPOLACIÓN NO APLICA CON h > 30 m, y se avisa que se pidió de más', () => {
    const r = analizarAleroAdosado({
      alero: { pared: "+X", ancho: 6, vuelo: 2, hc: 3, he: 6, pendiente: 0.01,
        dosSuperficies: true, interpolarH: true },
      geo: { h: 35, hAlero: 34 }, V: 45, exposicion: "C", kd: 0.85, altitud: 0,
    });
    expect(r.avisos.some(a => /no se aplica/.test(a.texto))).toBe(true);
    const g = gcpAlero({ ...r.ctx }, { destino: DESTINO.ESTRUCTURA, A: 5 });
    expect(g.figuras).toEqual(["5.9-2B"]);
  });

  it('la excepción da coeficientes MENORES que la figura de h > 20 m sola', () => {
    // Es lo que la vuelve una alternativa y no un camino obligado: por eso el defecto es no
    // usarla y el proyectista la declara.
    for (const h of [21, 25, 29]) {
      const sin = gcpAlero(ctx(h), { destino: DESTINO.ESTRUCTURA, A: 5 }).neg;
      const con = gcpAlero(ctx(h, { interpolarH: true }), { destino: DESTINO.ESTRUCTURA, A: 5 }).neg;
      expect(con, `h = ${h}`).toBeGreaterThan(sin);   // menos negativo = menos succión
    }
  });

  it('las superficies traen las dos caras con un positivo común', () => {
    const g = gcpAlero(ctx(10), { destino: DESTINO.SUPERFICIES, A: 5 });
    expect(g.superior.neg).toBeCloseTo(T1.supNeg(5), 6);
    expect(g.inferior.neg).toBeCloseTo(T1.infNeg(5), 6);
    expect(g.superior.pos).toBeCloseTo(T1.pos(5), 6);
    expect(g.inferior.pos).toBe(g.superior.pos);
  });

  it('las figuras de superficies NO dependen de h_c/h_e — nota 1 de la 5.9-1A', () => {
    // «Las presiones se basan en los valores más críticos para todas las relaciones de
    // h_c/h_e»: ya son la envolvente. Si un día aparecen bandas acá, alguien mezcló las
    // tablas de superficies con las netas.
    const a = gcpAlero({ qh: 1000, h: 10, hc: 1, he: 6 }, { destino: DESTINO.SUPERFICIES, A: 5 });
    const b = gcpAlero({ qh: 1000, h: 10, hc: 6, he: 6 }, { destino: DESTINO.SUPERFICIES, A: 5 });
    expect(a.superior.neg).toBe(b.superior.neg);
    expect(a.inferior.neg).toBe(b.inferior.neg);
  });

  it('por encima de 100 m² las tablas de h > 20 m congelan el valor, y lo avisan', () => {
    const g = gcpAlero(ctx(25), { destino: DESTINO.ESTRUCTURA, A: 300 });
    expect(g.neg).toBeCloseTo(gcp(FIGURAS_ALERO["5.9-2B"].bandas[1].neg, LIMITE_A), 6);
    // La banda media de la C 5.9-4 termina en meseta, así que no avisa; la alta sí.
    const alta = gcpAlero({ qh: 1000, h: 25, hc: 6, he: 6 },
      { destino: DESTINO.ESTRUCTURA, A: 300 });
    expect(alta.avisos.some(a => new RegExp(`supera los ${LIMITE_A}`).test(a.texto))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('presionAlero — la expresión (5.9-1)', () => {
  it('⚠ NO LLEVA (GC_pi): p = q_h (GC_p), y nada más', () => {
    // La 5.9-1 es `p = qh (GCp)` y su lista de símbolos tiene tres entradas. Un alero adosado
    // no encierra un recinto. Copiar la 5.3-1 —que sí resta (GC_pi)— es el error fácil, y
    // este test es lo único que lo impide: con presión interna el número seguiría siendo
    // plausible.
    const p = presionAlero(2000, { pos: 0.7, neg: -1.2 });
    expect(p.pPosCalculada).toBeCloseTo(2000 * 0.7, 9);
    expect(p.pNegCalculada).toBeCloseTo(2000 * -1.2, 9);
  });

  it('el mínimo de 0,80 kN/m² del art. 5.2.2 aplica, y por sentido', () => {
    // El art. 5.2.2 está en «REQUISITOS GENERALES» del capítulo, antes de las partes, y
    // habla de «componentes y revestimientos de edificios y otras estructuras»: no está
    // restringido a la Parte 1.
    const p = presionAlero(500, { pos: 0.6, neg: -3.0 });
    expect(p.pPos).toBe(P_MINIMA);            // 300 N/m² < 800
    expect(p.pNeg).toBeCloseTo(-1500, 9);     // la succión lo supera y queda como está
    expect(p.gobiernaMinimo).toEqual({ pos: true, neg: false });
    expect(p.pPosCalculada).toBeCloseTo(300, 9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('verificarElementoAlero', () => {
  const ctx = (extra = {}) => ({ qh: 1500, h: 8, hc: 3, he: 6, ...extra });

  it('un alero de dos superficies se verifica en las DOS figuras', () => {
    const r = verificarElementoAlero(ctx(), { tipo: "correa", L: 4, s: 1.2 });
    expect(r.destinos.map(d => d.destino)).toEqual([DESTINO.SUPERFICIES, DESTINO.ESTRUCTURA]);
    expect(r.destinos[0].caras.superior).toBeTruthy();
    expect(r.destinos[1].neto).toBeTruthy();
  });

  it('⚠ CON UNA SOLA SUPERFICIE, SÓLO LA FIGURA NETA — C 5.9', () => {
    // «Si el alero consta de una única superficie, solo se aplica la Figura 5.9-1B». Una
    // losa o una chapa sola no tiene dos caras cuyas fijaciones verificar por separado:
    // pedirle la figura A sería verificar una superficie que no existe.
    const r = verificarElementoAlero(ctx({ dosSuperficies: false }),
      { tipo: "chapa", L: 3, s: 1 });
    expect(r.destinos.map(d => d.destino)).toEqual([DESTINO.ESTRUCTURA]);
    expect(r.unaSuperficie).toBe(true);
    expect(r.avisos.some(a => a.ref === "C 5.9")).toBe(true);
  });

  it('el área efectiva es la del art. 1.2, con la regla del tercio', () => {
    const r = verificarElementoAlero(ctx(), { tipo: "correa", L: 6, s: 1.5 });
    expect(r.area.A).toBeCloseTo(12, 9);        // 6 · máx(1,5; 2) = 12
    expect(r.area.tributaria).toBeCloseTo(9, 9);
    expect(r.area.mandaTercio).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('analizarAleroAdosado', () => {
  const base = {
    alero: { pared: "+X", ancho: 6, vuelo: 2.5, hc: 3, he: 6, pendiente: 0.015,
      dosSuperficies: true, interpolarH: false },
    geo: { h: 6.5, hAlero: 6 },
    V: 45, exposicion: "C", kd: 0.85, altitud: 0,
    elementos: [{ tipo: "correa", L: 2.5, s: 1.2, nombre: "correa del alero" }],
  };

  it('⚠ q_h SALE DE LA ALTURA MEDIA DE CUBIERTA DEL EDIFICIO, NO DE LA DEL ALERO', () => {
    // Es la trampa del artículo: «q_h presión dinámica […] evaluada a la altura media de
    // cubierta, h». El mismo alero de 3 m colgado de un edificio de 25 m se carga con la
    // presión dinámica de los 25 m. Si algún día esto se calculara con h_c, la presión
    // caería a la mitad y el resultado seguiría pareciendo razonable.
    const bajo = analizarAleroAdosado(base);
    const alto = analizarAleroAdosado({ ...base, geo: { h: 25, hAlero: 24 } });
    expect(alto.qh).toBeGreaterThan(bajo.qh);
    expect(alto.h).toBe(25);
    expect(alto.hc).toBe(3);                       // el alero no se movió
    expect(alto.figuras[DESTINO.ESTRUCTURA]).toBe("5.9-2B");
    expect(bajo.figuras[DESTINO.ESTRUCTURA]).toBe("5.9-1B");
  });

  it('h_e por defecto es la altura del alero de la cubierta', () => {
    const r = analizarAleroAdosado({ ...base, alero: { ...base.alero, he: "" } });
    expect(r.he).toBe(base.geo.hAlero);
    expect(r.relacion).toBeCloseTo(3 / 6, 9);
  });

  it('⚠ LA PENDIENTE > 2 % SACA AL ALERO DEL ALCANCE DEL ARTÍCULO', () => {
    // C 5.9: «se restringe la aplicabilidad de esta sección a aleros planos con pendiente
    // menor o igual a 2 %». Es una restricción de alcance, no un coeficiente que se ajuste:
    // fuera de ella el artículo no tiene ensayos detrás. Se informa como error y NO se
    // corrige la pendiente ni se cambia de figura.
    const r = analizarAleroAdosado({ ...base,
      alero: { ...base.alero, pendiente: 0.05 } });
    const e = r.avisos.find(a => a.nivel === "error");
    expect(e).toBeTruthy();
    expect(e.ref).toBe("C 5.9");
    expect(e.texto).toMatch(/5,00 %/);
    // Y los números salen igual: el aviso no bloquea el cálculo.
    expect(r.elementos[0].destinos).toHaveLength(2);
  });

  it('el límite es 2 % inclusive', () => {
    const justo = analizarAleroAdosado({ ...base,
      alero: { ...base.alero, pendiente: PENDIENTE_MAXIMA } });
    expect(justo.avisos.some(a => a.nivel === "error")).toBe(false);
  });

  it('avisa que la figura y q_h los elige la altura del edificio', () => {
    const r = analizarAleroAdosado(base);
    expect(r.avisos.some(a => /altura media de cubierta del EDIFICIO/.test(a.texto))).toBe(true);
  });

  it('h_c mayor que h_e avisa', () => {
    const r = analizarAleroAdosado({ ...base, alero: { ...base.alero, hc: 7, he: 6 } });
    expect(r.avisos.some(a => /por encima del alero de la cubierta/.test(a.texto))).toBe(true);
  });

  it('el área del alero es ancho × vuelo, y no es el área efectiva de nada', () => {
    const r = analizarAleroAdosado(base);
    expect(r.areaAlero).toBeCloseTo(6 * 2.5, 9);
    expect(r.elementos[0].area.A).not.toBeCloseTo(r.areaAlero, 3);
  });

  it('las cuatro paredes están declaradas y el orden no sale de Object.keys', () => {
    expect(PAREDES).toEqual(["+X", "-X", "+Y", "-Y"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('curvasAleroUsadas — la curva que dibuja el gráfico es la que se usó', () => {
  it('sin interpolación devuelve las curvas de la figura, tal cual', () => {
    const cs = curvasAleroUsadas({ h: 8, hc: 3, he: 6 }, DESTINO.ESTRUCTURA);
    const neg = cs.find(c => c.signo === "neg");
    expect(neg.puntos).toBe(FIGURAS_ALERO["5.9-1B"].bandas[2].neg);
    expect(neg.original).toBeUndefined();
  });

  it('⚠ LA CURVA INTERPOLADA SE ARMA SOBRE LA UNIÓN DE LAS DOS ABSCISAS', () => {
    // Las curvas de h ≤ 20 m quiebran en 1 y 10; las de h > 20 m en 1, 10 y 100. Casando los
    // puntos por índice se uniría el quiebre de 10 de una con el de 100 de la otra y la
    // curva dibujada sería otra cosa que la que el motor evalúa.
    const cs = curvasAleroUsadas({ h: 25, hc: 6, he: 6, interpolarH: true }, DESTINO.ESTRUCTURA);
    const neg = cs.find(c => c.signo === "neg");
    expect(neg.puntos.map(([A]) => A)).toEqual([1, 10, 100]);
    expect(neg.original).toHaveLength(2);
    expect(neg.nota).toMatch(/interpolada entre/);
  });

  it('la curva dibujada da los mismos valores que el motor, punto por punto', () => {
    // El motivo por el que esta función vive en el motor: si el gráfico armara la curva por
    // su cuenta, el trazo y el número de la tabla saldrían de dos lugares distintos.
    const ctx = { qh: 1000, h: 24, hc: 5.4, he: 6, interpolarH: true };
    const neg = curvasAleroUsadas(ctx, DESTINO.ESTRUCTURA).find(c => c.signo === "neg");
    for (const A of AREAS) {
      expect(gcp(neg.puntos, A), `A = ${A}`)
        .toBeCloseTo(gcpAlero(ctx, { destino: DESTINO.ESTRUCTURA, A }).neg, 9);
    }
  });

  it('las superficies devuelven tres curvas: dos caras y el positivo común', () => {
    const cs = curvasAleroUsadas({ h: 8, hc: 3, he: 6 }, DESTINO.SUPERFICIES);
    expect(cs.map(c => c.etiqueta)).toEqual(["superior", "inferior", "ambas caras"]);
  });
});
