// RECORTE DE CARAS PLANAS, Y LA MALLA CON SUS ALEROS.
//
// Es el cálculo que hay detrás del 3D: las franjas de la Fig. 2.4-1 y las zonas del
// capítulo 5 son PARTICIONES EN PLANTA de superficies que en 3D son caras enteras, así que
// hay que cortar cada cara por líneas verticales. Lo que estos tests protegen es que el
// recorte no pierda ni invente superficie —un pedazo que se cae deja un agujero blanco en el
// croquis, uno que se duplica pinta la misma chapa con dos presiones— y que el corte caiga
// SOBRE el plano del faldón y no en una cota inventada.
import { describe, it, expect } from 'vitest';
import {
  recortarPorPlano, recortarACaja, areaEnPlanta, areaReal, porFranjas, porCeldas, unirFilas,
} from '../src/lib/subdividir3d.js';
import { mallaEdificio, faldones, ESPESOR_ALERO, normal } from '../src/lib/volumen3d.js';

/** Un cuadrado horizontal de 10 × 10 a la cota z. */
const cuadrado = (z = 0) => [[0, 0, z], [10, 0, z], [10, 10, z], [0, 10, z]];

/** Un faldón inclinado: sube de z = 3 en x = 0 a z = 8 en x = 10. */
const rampa = () => [[0, 0, 3], [10, 0, 8], [10, 10, 8], [0, 10, 3]];

// ═══════════════════════════════════════════════════════════════════════════════
describe('recortar por un semiplano vertical', () => {
  it('una cara que queda entera del lado bueno no se toca', () => {
    const q = recortarPorPlano(cuadrado(), 0, -5, 1);
    expect(areaEnPlanta(q)).toBeCloseTo(100, 9);
  });

  it('una cara que queda entera del lado malo desaparece', () => {
    expect(recortarPorPlano(cuadrado(), 0, 20, 1)).toEqual([]);
  });

  it('un corte al medio deja exactamente la mitad, de cada lado', () => {
    expect(areaEnPlanta(recortarPorPlano(cuadrado(), 0, 5, 1))).toBeCloseTo(50, 9);
    expect(areaEnPlanta(recortarPorPlano(cuadrado(), 0, 5, -1))).toBeCloseTo(50, 9);
  });

  it('⚠ EL CORTE CAE SOBRE EL PLANO DEL FALDÓN, no en una cota inventada', () => {
    // Es lo que hace que el recorte sea exacto y no una aproximación: el punto de corte se
    // interpola en las TRES coordenadas con el parámetro que sale de la coordenada de planta,
    // y como el plano es lineal en (x, y) ese punto cae sobre la cara. Un corte que calculara
    // la z por su cuenta dejaría el pedazo flotando, y en un faldón de 35° se vería.
    const q = recortarPorPlano(rampa(), 0, 4, -1);   // se queda con x ≤ 4
    const enCuatro = q.filter(p => Math.abs(p[0] - 4) < 1e-9);
    expect(enCuatro).toHaveLength(2);
    // z(4) = 3 + (8 − 3) · 4/10 = 5
    for (const p of enCuatro) expect(p[2]).toBeCloseTo(5, 9);
  });

  it('⚠ NO DUPLICA VÉRTICES EN UN CORTE TANGENTE', () => {
    // Una arista que apenas roza el plano de corte —y en una grilla de cortes hay muchas—
    // generaba un vértice por cada corte, y el polígono terminaba con el triple de puntos.
    // Con áreas nulas eso llena el croquis de polígonos invisibles cuyo TRAZO sí se ve.
    const q = recortarPorPlano(cuadrado(), 0, 0, 1);   // el plano pasa por una arista
    expect(q).toHaveLength(4);
    expect(areaEnPlanta(q)).toBeCloseTo(100, 9);
  });

  it('recortar a una caja da la intersección', () => {
    const q = recortarACaja(cuadrado(), { x0: 2, x1: 6, y0: 3, y1: 9 });
    expect(areaEnPlanta(q)).toBeCloseTo(4 * 6, 9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('las áreas', () => {
  it('el área de planta no depende de la pendiente y el área real sí', () => {
    expect(areaEnPlanta(rampa())).toBeCloseTo(100, 9);
    // La rampa sube 5 en 10: su largo real es √(10² + 5²) = 11,180…
    expect(areaReal(rampa())).toBeCloseTo(10 * Math.hypot(10, 5), 6);
    expect(areaReal(cuadrado())).toBeCloseTo(100, 9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('subdividir en franjas', () => {
  const tres = [
    { desde: -1e6, hasta: 3, dato: "a" },
    { desde: 3, hasta: 7, dato: "b" },
    { desde: 7, hasta: 1e6, dato: "c" },
  ];

  it('⚠ LAS FRANJAS CUBREN LA CARA SIN PERDER NI DUPLICAR SUPERFICIE', () => {
    // Es la comprobación que importa: un pedazo que se cae deja un agujero blanco en el
    // croquis —como si esa chapa no recibiera carga— y uno que se cuenta dos veces se pinta
    // con dos presiones distintas según cuál quede encima.
    const piezas = porFranjas(rampa(), 0, tres);
    expect(piezas).toHaveLength(3);
    const suma = piezas.reduce((s, p) => s + areaEnPlanta(p.pts), 0);
    expect(suma).toBeCloseTo(areaEnPlanta(rampa()), 6);
    expect(piezas.map(p => p.dato)).toEqual(["a", "b", "c"]);
  });

  it('también sobre el eje y, y conservando el área real del faldón', () => {
    const piezas = porFranjas(rampa(), 1, tres);
    const suma = piezas.reduce((s, p) => s + areaReal(p.pts), 0);
    expect(suma).toBeCloseTo(areaReal(rampa()), 6);
  });

  it('una franja fuera de la cara no aporta una astilla', () => {
    const piezas = porFranjas(cuadrado(), 0, [{ desde: 50, hasta: 60, dato: "x" }]);
    expect(piezas).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('subdividir en celdas y unir filas', () => {
  it('las celdas cubren la cara entera', () => {
    const celdas = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        celdas.push({ x0: i * 2.5, x1: (i + 1) * 2.5, y0: j * 2.5, y1: (j + 1) * 2.5,
          dato: `${i}${j}` });
      }
    }
    const piezas = porCeldas(rampa(), celdas);
    expect(piezas).toHaveLength(16);
    const suma = piezas.reduce((s, p) => s + areaEnPlanta(p.pts), 0);
    expect(suma).toBeCloseTo(100, 6);
  });

  it('⚠ UNIR FILAS NO CAMBIA EL ÁREA, sólo la cantidad de polígonos', () => {
    // La cubierta de cuatro aguas se muestrea con una grilla, y sin unir salen cientos de
    // celdas —con el trazo de cada una dibujando una cuadrícula que no existe—. La unión
    // tiene que ser exactamente eso: menos polígonos, la misma superficie.
    const celdas = [];
    for (let i = 0; i < 10; i++) {
      celdas.push({ x0: i, x1: i + 1, y0: 0, y1: 5, dato: i < 3 ? "1" : "2" });
    }
    const unidas = unirFilas(celdas);
    expect(unidas).toHaveLength(2);
    expect(unidas[0]).toMatchObject({ x0: 0, x1: 3, dato: "1" });
    expect(unidas[1]).toMatchObject({ x0: 3, x1: 10, dato: "2" });
    const area = (cs) => cs.reduce((s, c) => s + (c.x1 - c.x0) * (c.y1 - c.y0), 0);
    expect(area(unidas)).toBeCloseTo(area(celdas), 9);
  });

  it('no une celdas de filas distintas aunque digan lo mismo', () => {
    const unidas = unirFilas([
      { x0: 0, x1: 1, y0: 0, y1: 1, dato: "1" },
      { x0: 1, x1: 2, y0: 3, y1: 4, dato: "1" },
    ]);
    expect(unidas).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('los faldones y su prolongación con voladizo', () => {
  const G = { a: 20, b: 30, hAlero: 6, hCumbre: 9, tipo: "dos_aguas", cumbrera: "X" };

  it('el plano de cada faldón pasa por el alero y por la cumbrera', () => {
    const [f0, f1] = faldones(G);
    expect(f0.z(10, 0)).toBeCloseTo(6, 9);        // alero
    expect(f0.z(10, 15)).toBeCloseTo(9, 9);       // cumbrera, en b/2
    expect(f1.z(10, 30)).toBeCloseTo(6, 9);
    expect(f1.z(10, 15)).toBeCloseTo(9, 9);
  });

  it('una vertiente única baja hacia donde dice `pendienteHacia`', () => {
    const [f] = faldones({ ...G, tipo: "vertiente_unica", pendienteHacia: "+Y" });
    expect(f.z(10, 30)).toBeCloseTo(6, 9);        // el alero BAJO está en y = b
    expect(f.z(10, 0)).toBeCloseTo(9, 9);         // y el alto en y = 0
  });

  it('⚠ EL VUELO SALE CON LA PENDIENTE DEL FALDÓN, NO HORIZONTAL', () => {
    // Es el motivo por el que la cubierta se arma por planta y plano en vez de por vértices:
    // prolongar el faldón es prolongar su PLANO. Con los vértices a mano, cada tipo de
    // cubierta necesitaba su propio cálculo de la cota del vuelo, y ahí es donde se cuela un
    // alero dibujado a la altura del alero en vez de más abajo.
    const m = mallaEdificio({ ...G,
      voladizo: { porBorde: { "+X": 0, "-X": 0, "+Y": 0, "-Y": 2 } } });
    const arriba = m.caras.filter(c => c.tipo === "voladizo_superior")
      .map(c => c.v.map(i => m.V[i]));
    const enVuelo = arriba.flat().filter(p => Math.abs(p[1] + 2) < 1e-9);
    expect(enVuelo.length).toBeGreaterThan(0);
    // La pendiente es 3 m en 15: dos metros más afuera del alero, la cota baja 0,4.
    for (const p of enVuelo) expect(p[2]).toBeCloseTo(6 - 2 * (3 / 15), 6);
  });

  it('con voladizo aparecen las tres caras del vuelo, con su tipo propio', () => {
    const m = mallaEdificio({ ...G,
      voladizo: { porBorde: { "+X": 1, "-X": 1, "+Y": 1, "-Y": 1 } } });
    const tipos = new Set(m.caras.map(c => c.tipo));
    // ⚠ NINGUNA ES «CUBIERTA». El capítulo 2 le da un C_p propio a la cara inferior a
    // barlovento (art. 2.4.4) y el capítulo 5 manda el elemento de vuelo a la composición del
    // art. 5.7: con el mismo tipo que la cubierta, el croquis les pintaría la presión del
    // faldón y sería un número que no es el de esa superficie.
    for (const t of ["voladizo_superior", "voladizo_inferior", "voladizo_canto"]) {
      expect(tipos.has(t), t).toBe(true);
    }
  });

  it('⚠ LA CUBIERTA SE PARTE EN LA LÍNEA DE PARED, no es una cara sola', () => {
    // El faldón sobre el recinto y el que vuela están en el mismo plano y se ven como una
    // sola chapa, pero en el capítulo 5 no son la misma superficie: el elemento del vuelo
    // lleva el (GC_p) compuesto del art. 5.7, que es mayor en los dos sentidos. Como una cara
    // sola, el croquis pintaría todo el faldón con el coeficiente del interior.
    const v = 1;
    const m = mallaEdificio({ ...G, voladizo: { porBorde: { "+X": v, "-X": v, "+Y": v, "-Y": v } } });
    const pts = (t) => m.caras.filter(c => c.tipo === t).map(c => c.v.map(i => m.V[i]));
    // Lo de adentro no pasa de la línea de pared…
    for (const cara of pts("cubierta")) {
      for (const p of cara) {
        expect(p[0]).toBeGreaterThanOrEqual(-1e-9);
        expect(p[0]).toBeLessThanOrEqual(G.a + 1e-9);
        expect(p[1]).toBeGreaterThanOrEqual(-1e-9);
        expect(p[1]).toBeLessThanOrEqual(G.b + 1e-9);
      }
    }
    // …y las dos partes juntas dan la planta de la cubierta completa.
    const area = (t) => pts(t).reduce((s2, c) => s2 + areaEnPlanta(c), 0);
    expect(area("cubierta") + area("voladizo_superior"))
      .toBeCloseTo((G.a + 2 * v) * (G.b + 2 * v), 6);
  });

  it('⚠ CADA TIRA DEL VUELO SABE DE QUÉ BORDE SALE', () => {
    // No es rotulado: el art. 2.4.4 da la presión positiva de la cara inferior SÓLO al
    // voladizo a barlovento, y cuál es depende de la dirección que se mire. Sin el borde, el
    // croquis le pinta ese C_p = +0,8 a los cuatro vuelos y muestra una presión que tres de
    // ellos no reciben.
    const v = 1;
    const m = mallaEdificio({ ...G, voladizo: { porBorde: { "+X": v, "-X": v, "+Y": v, "-Y": v } } });
    for (const t of ["voladizo_superior", "voladizo_inferior"]) {
      const bordes = m.caras.filter(c => c.tipo === t).map(c => c.borde);
      expect(bordes.every(Boolean), t).toBe(true);
      expect(new Set(bordes), t).toEqual(new Set(["+X", "-X", "+Y", "-Y"]));
    }
    // Y cada tira cae del lado que dice.
    for (const c of m.caras.filter(x => x.tipo === "voladizo_superior")) {
      const pts = c.v.map(i => m.V[i]);
      const eje = c.borde.endsWith("X") ? 0 : 1;
      const L = eje === 0 ? G.a : G.b;
      if (c.borde.startsWith("+")) {
        for (const p of pts) expect(p[eje], c.borde).toBeGreaterThanOrEqual(L - 1e-9);
      } else {
        for (const p of pts) expect(p[eje], c.borde).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it('⚠ LA CARA INFERIOR EXISTE SÓLO SOBRE EL VUELO', () => {
    // Estaba armada con la planta entera, así que desde abajo se veía una «cara inferior del
    // vuelo» cubriendo todo el edificio —y en el modo C&R se pintaba con el coeficiente
    // compuesto sobre una superficie que no es voladizo—. Adentro de la línea de pared no hay
    // cara inferior: hay cielorraso.
    const v = 1;
    const m = mallaEdificio({ ...G, voladizo: { porBorde: { "+X": v, "-X": v, "+Y": v, "-Y": v } } });
    const inf = m.caras.filter(c => c.tipo === "voladizo_inferior")
      .map(c => c.v.map(i => m.V[i]));
    const area = inf.reduce((s2, c) => s2 + areaEnPlanta(c), 0);
    // El marco: la planta de cubierta menos la del edificio.
    expect(area).toBeCloseTo((G.a + 2 * v) * (G.b + 2 * v) - G.a * G.b, 6);
  });

  it('la cara inferior del vuelo mira hacia ABAJO', () => {
    // Si mirara hacia arriba se dibujaría encima del faldón en vez de verse sólo desde abajo,
    // y las dos caras pelearían por el mismo lugar en el orden de pintado.
    const m = mallaEdificio({ ...G,
      voladizo: { porBorde: { "+X": 0, "-X": 0, "+Y": 1, "-Y": 1 } } });
    const inf = m.caras.filter(c => c.tipo === "voladizo_inferior");
    expect(inf.length).toBeGreaterThan(0);
    for (const c of inf) expect(normal(c.v.map(i => m.V[i]))[2]).toBeLessThan(0);
  });

  it('sin voladizo no aparece ninguna cara de alero', () => {
    const m = mallaEdificio(G);
    expect(m.caras.some(c => /voladizo|alero/.test(c.tipo))).toBe(false);
  });

  it('⚠ EL VOLADIZO NO CAMBIA LAS PAREDES', () => {
    // La altura media de cubierta se mide sobre la línea de PARED y un vuelo no levanta el
    // edificio. Si las paredes crecieran con el vuelo, el croquis diría lo contrario de lo
    // que calcula el motor.
    const sin = mallaEdificio(G);
    const con = mallaEdificio({ ...G,
      voladizo: { porBorde: { "+X": 1, "-X": 1, "+Y": 1, "-Y": 1 } } });
    const paredes = (m) => m.caras.filter(c => c.tipo === "pared")
      .map(c => c.v.map(i => m.V[i]));
    expect(JSON.stringify(paredes(con))).toBe(JSON.stringify(paredes(sin)));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('la losa del alero adosado', () => {
  const G = { a: 20, b: 30, hAlero: 6, hCumbre: 9, tipo: "dos_aguas", cumbrera: "X" };
  const conAlero = (pared) => mallaEdificio({ ...G,
    aleroAdosado: { hay: true, pared, ancho: 10, vuelo: 3, hc: 3.5 } });

  it('sale de la pared que se le declara, con su vuelo y a su altura', () => {
    const m = conAlero("+X");
    const sup = m.caras.find(c => c.id === "alero_sup").v.map(i => m.V[i]);
    expect(Math.max(...sup.map(p => p[0]))).toBeCloseTo(20 + 3, 9);   // la punta del vuelo
    expect(Math.min(...sup.map(p => p[0]))).toBeCloseTo(20, 9);        // arranca en la pared
    for (const p of sup) expect(p[2]).toBeCloseTo(3.5, 9);
  });

  it('con la pared a −Y sale para el otro lado', () => {
    const m = conAlero("-Y");
    const sup = m.caras.find(c => c.id === "alero_sup").v.map(i => m.V[i]);
    expect(Math.min(...sup.map(p => p[1]))).toBeCloseTo(-3, 9);
    expect(Math.max(...sup.map(p => p[1]))).toBeCloseTo(0, 9);
  });

  it('⚠ VA CENTRADA SOBRE SU PARED, que es una convención de dibujo', () => {
    // El art. 5.9 pide el ancho del alero pero no dónde empieza sobre la pared: no entra en
    // ningún coeficiente. Centrarlo es la única elección que no inventa una excentricidad.
    const m = conAlero("+X");
    const sup = m.caras.find(c => c.id === "alero_sup").v.map(i => m.V[i]);
    const ys = sup.map(p => p[1]);
    expect(Math.min(...ys)).toBeCloseTo((30 - 10) / 2, 9);
    expect(Math.max(...ys)).toBeCloseTo((30 - 10) / 2 + 10, 9);
  });

  it('la cara superior mira arriba y la inferior abajo, salga para donde salga', () => {
    for (const pared of ["+X", "-X", "+Y", "-Y"]) {
      const m = conAlero(pared);
      const n = (id) => normal(m.caras.find(c => c.id === id).v.map(i => m.V[i]));
      expect(n("alero_sup")[2], pared).toBeGreaterThan(0);
      expect(n("alero_inf")[2], pared).toBeLessThan(0);
    }
  });

  it('⚠ EL ESPESOR ES DE DIBUJO Y ESCALA CON LA ALTURA', () => {
    // Ningún coeficiente depende de él: se dibuja para que el canto se vea desde arriba, que
    // es de donde se mira un croquis isométrico. Va como fracción de `h` para que se vea
    // igual en un shelter de 2,4 m y en un galpón de 30.
    const m = conAlero("+X");
    const sup = m.caras.find(c => c.id === "alero_sup").v.map(i => m.V[i]);
    const inf = m.caras.find(c => c.id === "alero_inf").v.map(i => m.V[i]);
    expect(sup[0][2] - inf[0][2]).toBeCloseTo(ESPESOR_ALERO * G.hAlero, 9);
  });

  it('sin alero declarado no hay ninguna cara de alero', () => {
    expect(mallaEdificio(G).caras.some(c => /^alero/.test(c.tipo))).toBe(false);
  });
});
