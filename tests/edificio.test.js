// EL ENSAMBLADO DEL EDIFICIO.
//
// El motor de presión dinámica ya está verificado contra la Tabla 2.5-2. Lo que falta
// comprobar es el ARMADO: que cada superficie reciba el coeficiente que le toca, la
// presión dinámica que le toca, y que la cubierta se zonifique según corresponda.
import { describe, it, expect } from 'vitest';
import { normalizarGeo, alturaMedia, cpCubiertaBarlovento, cpCubiertaSotavento,
  cpCubiertaParalelo, perfilBarlovento, analizarDireccion, analizarEdificio,
  DIRECCIONES, CASOS_CARGA, momentoTorsor } from '../src/engine/edificio.js';
import { CP_CUBIERTA_BARLOVENTO, CP_CUBIERTA_SOTAVENTO, ANG_BARLOVENTO } from '../src/constants/presionesExternas.js';

const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const GEO = { a: 20, b: 30, hAlero: 6, theta: 0, cumbrera: "X" };
const ENT = { geo: GEO, sitio: SITIO, cerramiento: "cerrado", G: 0.85 };

describe('geometría', () => {
  // La excepción del art. 1.2 no es de redondeo: h define el q de TODA la cubierta y de
  // las paredes a sotavento. Tomar el promedio en un techo de 8° en vez del alero subiría
  // la presión de todas esas superficies.
  it('para θ ≤ 10° la altura media es la del alero', () => {
    for (const t of [0, 5, 10]) {
      expect(alturaMedia({ hAlero: 6, theta: t, a: 20, b: 30, cumbrera: "X" })).toBe(6);
    }
  });

  it('para θ > 10° la altura media sube por encima del alero', () => {
    const h = alturaMedia({ hAlero: 6, theta: 20, a: 20, b: 30, cumbrera: "X" });
    expect(h).toBeGreaterThan(6);
    // cumbrera según X ⇒ el faldón cubre la dimensión b
    expect(h).toBeCloseTo(6 + (30 / 2) * Math.tan(20 * Math.PI / 180) / 2, 9);
  });

  // La luz del faldón es la dimensión NORMAL a la cumbrera. Si se tomara la paralela, un
  // galpón alargado daría una altura media completamente distinta.
  it('la orientación de la cumbrera cambia qué dimensión cubre el faldón', () => {
    const x = alturaMedia({ hAlero: 6, theta: 20, a: 20, b: 30, cumbrera: "X" });
    const y = alturaMedia({ hAlero: 6, theta: 20, a: 20, b: 30, cumbrera: "Y" });
    expect(x).not.toBeCloseTo(y, 3);
  });

  it('los campos llegan como string del formulario y se convierten', () => {
    const g = normalizarGeo({ a: "20", b: "30,5", hAlero: "6", theta: "0" });
    expect(g.a).toBe(20);
    expect(g.b).toBe(30.5);                 // coma decimal, como la escribe el usuario
    expect(g.h).toBe(6);
  });
});

describe('coeficientes de cubierta', () => {
  // En los nodos de la tabla la interpolación tiene que devolver el valor tabulado exacto.
  // Si no, hay un error de índice y todos los valores intermedios están corridos.
  it.each([[0.25], [0.5], [1.0]])('h/L = %s: reproduce la fila tabulada de barlovento', (hL) => {
    ANG_BARLOVENTO.slice(0, -1).forEach((t, i) => {
      const esperado = CP_CUBIERTA_BARLOVENTO[hL][i];
      const [neg, pos] = cpCubiertaBarlovento(hL, t);
      expect(neg).toBeCloseTo(esperado[0], 9);
      expect(pos).toBeCloseTo(esperado[1], 9);
    });
  });

  it.each([[0.25], [0.5], [1.0]])('h/L = %s: reproduce la fila tabulada de sotavento', (hL) => {
    expect(cpCubiertaSotavento(hL, 10)).toBeCloseTo(CP_CUBIERTA_SOTAVENTO[hL][0], 9);
    expect(cpCubiertaSotavento(hL, 15)).toBeCloseTo(CP_CUBIERTA_SOTAVENTO[hL][1], 9);
    expect(cpCubiertaSotavento(hL, 25)).toBeCloseTo(CP_CUBIERTA_SOTAVENTO[hL][2], 9);
  });

  // La celda va [succión, presión]. El 0,01·θ de la figura es el valor de PRESIÓN; en ese
  // régimen no hay caso de succión y la ranura correspondiente vale 0. Antes se escribía
  // 0,01·θ en las DOS, y eso hacía que el «caso de succión» de una cubierta a 60° trajera
  // un coeficiente positivo.
  it('θ ≥ 60° usa la expresión 0,01·θ como presión, y no hay caso de succión', () => {
    expect(cpCubiertaBarlovento(0.5, 60)[1]).toBeCloseTo(0.6, 9);
    expect(cpCubiertaBarlovento(0.5, 75)[1]).toBeCloseTo(0.75, 9);
    expect(cpCubiertaBarlovento(0.5, 60)[0]).toBe(0);
    expect(cpCubiertaBarlovento(0.5, 75)[0]).toBe(0);
  });

  // ── NOTA 2, ENTRE 45° Y 60° ───────────────────────────────────────────────────
  // El nodo de 60° vale 0,6 FIJO. El código lo evaluaba al θ actual, así que al
  // interpolar tomaba un extremo superior que subía con θ y el resultado salía CHICO: a
  // 50° usaba 0,50 donde corresponde 0,60.
  it('entre 45° y 60° interpola contra el nodo fijo de 0,6', () => {
    // h/L ≤ 0,25 y θ = 50°: presión = 0,4 + (0,6 − 0,4)·(50 − 45)/(60 − 45).
    expect(cpCubiertaBarlovento(0.25, 50)[1]).toBeCloseTo(0.4 + 0.2 * 5 / 15, 9);
    expect(cpCubiertaBarlovento(0.25, 50)[0]).toBeCloseTo(0, 12);
  });

  it('en todo el tramo 45°–60° el caso de succión es 0', () => {
    for (const hL of [0.25, 0.5, 0.75, 1.0]) {
      for (let th = 45; th <= 60; th += 1.5) {
        expect(cpCubiertaBarlovento(hL, th)[0], `h/L=${hL} θ=${th}`).toBeCloseTo(0, 12);
      }
    }
  });

  it('la presión crece de forma monótona de 45° a 60° y cierra en 0,6', () => {
    let previo = -Infinity;
    for (let th = 45; th <= 60; th += 0.5) {
      const v = cpCubiertaBarlovento(0.25, th)[1];
      expect(v, `θ=${th}`).toBeGreaterThanOrEqual(previo);
      previo = v;
    }
    expect(cpCubiertaBarlovento(0.25, 60)[1]).toBeCloseTo(0.6, 9);
  });

  // Nota # de la figura: por encima de 80° la cubierta ya no es cubierta, es pared.
  it('por encima de 80° de pendiente el Cp pasa a 0,8, el de pared a barlovento', () => {
    expect(cpCubiertaBarlovento(0.5, 85)).toEqual([0.8, 0.8]);
  });

  it('interpola entre ángulos tabulados', () => {
    const [neg] = cpCubiertaBarlovento(0.5, 12.5);
    expect(neg).toBeCloseTo((-0.9 + -0.7) / 2, 9);
  });

  // Las franjas paralelas del h/L ≥ 1,0 se expanden a cuatro para poder interpolar contra
  // las del ≤ 0,5. En los extremos el resultado tiene que ser el tabulado.
  it('las franjas paralelas reproducen los extremos tabulados', () => {
    const bajo = cpCubiertaParalelo(0.5);
    expect(bajo.map(z => z.cp[0])).toEqual([-0.9, -0.9, -0.5, -0.3]);
    const alto = cpCubiertaParalelo(1.0);
    expect(alto.map(z => z.cp[0])).toEqual([-1.3, -0.7, -0.7, -0.7]);
  });

  it('el segundo caso de las franjas es −0,18 en todo el rango', () => {
    for (const hL of [0.5, 0.75, 1.0]) {
      for (const z of cpCubiertaParalelo(hL)) expect(z.cp[1]).toBeCloseTo(-0.18, 9);
    }
  });

  it('las franjas van siempre en orden y la última no tiene tope', () => {
    for (const hL of [0.5, 0.8, 1.0]) {
      const f = cpCubiertaParalelo(hL);
      expect(f.map(z => z.hasta)).toEqual([0.5, 1.0, 2.0, Infinity]);
    }
  });
});

describe('perfil de la pared a barlovento', () => {
  // Es la ÚNICA superficie con q variable. Si usara q_h como el resto, el diagrama de
  // presiones del edificio se aplana y el momento en la base sale mal.
  //
  // ⚠ LOS TESTS DE ESTE BLOQUE SE REESCRIBIERON. La primera versión fijaba la FORMA del
  // perfil —«son exactamente estos seis cortes», «un edificio bajo da un solo tramo»—, y
  // al agregar los N puntos equiespaciados y las cotas con nombre fallaron los cuatro
  // contra un motor correcto. Fijar la forma de una lista es fijar una decisión de
  // presentación; lo que hay que fijar es que la lista CUBRA la altura sin huecos, que es
  // de lo que depende la integración.
  it.each([[4], [12], [27], [60]])('h = %s m: los tramos cubren 0 a h sin huecos ni solapes', (h) => {
    const p = perfilBarlovento({ h, sitio: SITIO, hAlero: h, hCumbre: h });
    expect(p[0].desde).toBe(0);
    expect(p.at(-1).hasta).toBeCloseTo(h, 9);
    for (let i = 1; i < p.length; i++) expect(p[i].desde).toBe(p[i - 1].hasta);
    expect(p.reduce((s, t) => s + (t.hasta - t.desde), 0)).toBeCloseTo(h, 9);
  });

  // Las tres cotas con nombre son las que el proyectista transcribe al modelo. Buscarlas
  // interpolando entre dos filas de la tabla es justo lo que produce errores.
  it('trae señaladas la base, el alero y la altura media', () => {
    const p = perfilBarlovento({ h: 11.46, sitio: SITIO, hAlero: 6, hCumbre: 16.92 });
    const todas = p.flatMap(t => t.marcas ?? []);
    expect(todas).toContain("alero");
    expect(todas).toContain("altura media h");
    expect(p.find(t => t.marcas?.includes("alero")).z).toBeCloseTo(6, 9);
  });

  // COINCIDIR NO ES LO MISMO QUE NO EXISTIR. En cubierta plana el alero, la cumbrera y la
  // altura media son la misma cota; quedarse con la última haría que la tabla dijera sólo
  // «altura media h» y callara que ahí también está el alero.
  it('con cubierta plana las tres cotas coinciden y se informan JUNTAS', () => {
    const p = perfilBarlovento({ h: 8, sitio: SITIO, hAlero: 8, hCumbre: 8 });
    const t = p.find(x => x.z === 8);
    expect(t.marcas).toEqual(expect.arrayContaining(["alero", "cumbrera", "altura media h"]));
    expect(t.marca).toMatch(/alero.*=.*altura media h/);
  });

  it('una cumbrera por encima de la altura media no entra en la tabla de la pared', () => {
    const p = perfilBarlovento({ h: 11.46, sitio: SITIO, hAlero: 6, hCumbre: 16.92 });
    expect(p.every(t => t.z <= 11.46 + 1e-9)).toBe(true);
    expect(p.some(t => t.marca === "cumbrera")).toBe(false);
  });

  it('el número de puntos se puede pedir, y queda acotado como en la planilla', () => {
    const pocos = perfilBarlovento({ h: 40, sitio: SITIO, puntos: 2 });
    const muchos = perfilBarlovento({ h: 40, sitio: SITIO, puntos: 26 });
    expect(muchos.length).toBeGreaterThan(pocos.length);
    // fuera de rango se acota en vez de romper
    expect(perfilBarlovento({ h: 40, sitio: SITIO, puntos: 500 }).length)
      .toBe(perfilBarlovento({ h: 40, sitio: SITIO, puntos: 26 }).length);
  });

  // q NO decrece nunca, pero sí se repite: por debajo de 5 m el perfil está congelado, así
  // que dos tramos consecutivos ahí tienen exactamente el mismo q.
  it('la presión dinámica no decrece, y se repite en la zona congelada', () => {
    const p = perfilBarlovento({ h: 40, sitio: SITIO });
    for (let i = 1; i < p.length; i++) expect(p[i].q).toBeGreaterThanOrEqual(p[i - 1].q);
    const bajos = p.filter(t => t.z <= 5);
    expect(new Set(bajos.map(t => t.q.toFixed(9))).size).toBe(1);
  });

  it('cada tramo trae su Kz y su q, que es lo que la tabla tiene que mostrar', () => {
    for (const t of perfilBarlovento({ h: 25, sitio: SITIO })) {
      expect(t.kz).toBeGreaterThan(0);
      expect(t.q).toBeGreaterThan(0);
    }
  });
});

describe('análisis por dirección', () => {
  const r = analizarDireccion(ENT, DIRECCIONES[0]);

  it('B es normal al viento y L paralela, y se intercambian según el eje', () => {
    const x = analizarDireccion(ENT, DIRECCIONES[0]);   // viento según X
    const y = analizarDireccion(ENT, DIRECCIONES[2]);   // viento según Y
    expect(x.L).toBe(20); expect(x.B).toBe(30);
    expect(y.L).toBe(30); expect(y.B).toBe(20);
  });

  // La asignación qz/qh es lo que más fácil se cruza y no cambia el aspecto del resultado.
  it('sólo la pared a barlovento usa qz; todo el resto usa qh', () => {
    const bar = r.superficies.find(s => s.id === "pared_barlovento");
    expect(bar.usar).toBe("qz");
    for (const s of r.superficies.filter(s => s.id !== "pared_barlovento")) {
      expect(s.usar).toBe("qh");
      expect(s.q).toBe(r.qh);
    }
  });

  it('cada superficie trae los DOS casos de presión interna', () => {
    for (const s of r.superficies) {
      if (s.tramos) continue;
      expect(s.conInternaPos).toBeDefined();
      expect(s.conInternaNeg).toBeDefined();
      expect(s.conInternaNeg - s.conInternaPos).toBeCloseTo(2 * r.qh * Math.abs(r.GCpi), 6);
    }
  });

  it('el edificio de ejemplo es de cubierta plana: se zonifica en franjas', () => {
    expect(r.superficies.some(s => s.id.startsWith("cub_franja"))).toBe(true);
    expect(r.superficies.some(s => s.id === "cub_sotavento")).toBe(false);
  });

  // Con θ ≥ 10 y viento normal a la cumbrera aparecen los dos faldones. Con viento
  // paralelo, la misma cubierta se zonifica en franjas aunque el ángulo sea el mismo: es
  // la distinción que la Figura 2.4-1 hace y que es fácil pasar por alto.
  it('con θ = 20° la cubierta cambia de tratamiento según la dirección', () => {
    const e = { ...ENT, geo: { ...GEO, theta: 20, cumbrera: "X" } };
    const normal = analizarDireccion(e, DIRECCIONES[2]);     // viento Y ⊥ cumbrera X
    const paralelo = analizarDireccion(e, DIRECCIONES[0]);   // viento X ∥ cumbrera X
    expect(normal.normalACumbrera).toBe(true);
    expect(normal.superficies.some(s => s.id === "cub_sotavento")).toBe(true);
    expect(paralelo.normalACumbrera).toBe(false);
    expect(paralelo.superficies.some(s => s.id.startsWith("cub_franja"))).toBe(true);
  });

  it('las franjas no se extienden más allá del edificio', () => {
    // L/h = 20/6 = 3,33 ⇒ la franja «> 2h» existe; con L corto no debería aparecer
    const corto = analizarDireccion({ ...ENT, geo: { ...GEO, a: 5, hAlero: 10 } }, DIRECCIONES[0]);
    for (const s of corto.superficies.filter(s => s.zona)) {
      expect(s.zona.desde).toBeLessThan(corto.L / corto.geo.h);
    }
  });

  // ⚠ ESTE TEST EXISTE POR UNA MUTACIÓN QUE SOBREVIVIÓ. Calcular L/h en vez de h/L no
  // movía un solo test: los de zonificación llaman a `cpCubiertaParalelo` con el h/L ya
  // calculado, así que verifican la interpolación pero no QUIÉN la alimenta. Hace falta
  // mirar el coeficiente que sale del análisis completo, con una geometría cuyo h/L se
  // conozca de antemano.
  it.each([
    [10, 20, 0.5, -0.9],     // h/L = 0,5 exacto → primera franja −0,9
    [20, 20, 1.0, -1.3],     // h/L = 1,0 exacto → primera franja −1,3
  ])('con h = %s y L = %s el h/L es %s y la primera franja vale %s', (h, L, hL, cp) => {
    const r = analizarDireccion({ ...ENT, geo: { ...GEO, a: L, hAlero: h } }, DIRECCIONES[0]);
    expect(r.hL).toBeCloseTo(hL, 9);
    expect(r.superficies.find(s => s.id === "cub_franja_0").cp).toBeCloseTo(cp, 9);
  });

  // Lo mismo para el faldón: con θ ≥ 10 el coeficiente sale de la tabla de barlovento, y
  // un h/L invertido elegiría otra fila entera.
  it('con h/L = 0,5 y θ = 20° el faldón a barlovento toma los valores de su fila', () => {
    const r = analizarDireccion(
      { ...ENT, geo: { a: 20, b: 20, hAlero: 10, theta: 20, cumbrera: "X" } }, DIRECCIONES[2]);
    expect(r.normalACumbrera).toBe(true);
    // h media sube por encima del alero, así que h/L ya no es 0,5 exacto: se compara
    // contra la interpolación de la MISMA fila, no contra un número escrito a mano
    expect(r.hL).toBeGreaterThan(0.5);
    const neg = r.superficies.find(s => s.id === "cub_barlovento_neg").cp;
    const [espNeg] = cpCubiertaBarlovento(r.hL, 20);
    expect(neg).toBeCloseTo(espNeg, 9);
    expect(neg).toBeLessThan(-0.4);        // entre −0,4 (h/L=0,5) y −0,7 (h/L=1,0)
    expect(neg).toBeGreaterThan(-0.7);
  });

  it('analizarEdificio devuelve las cuatro direcciones, con los id de las hipótesis', () => {
    const todas = analizarEdificio(ENT);
    expect(todas).toHaveLength(4);
    expect(todas.map(t => t.dir.id)).toEqual(["Wx+", "Wx-", "Wy+", "Wy-"]);
  });
});

describe('casos de carga de la Figura 2.4-8', () => {
  it('son cuatro, con los factores de la figura', () => {
    expect(CASOS_CARGA.map(c => c.factor)).toEqual([1.0, 0.75, 0.75, 0.563]);
    expect(CASOS_CARGA.filter(c => c.torsion).map(c => c.n)).toEqual([2, 4]);
  });

  it('la excentricidad de los casos torsionales es 0,15·B', () => {
    for (const c of CASOS_CARGA.filter(c => c.torsion)) expect(c.e).toBe(0.15);
  });

  // M_T = 0,75·(P_W + P_L)·B·e con e = 0,15·B
  it('el momento torsor sigue la expresión de la figura', () => {
    const mt = momentoTorsor({ pW: 800, pL: -500, B: 30, factor: 0.75, e: 0.15 });
    expect(mt).toBeCloseTo(0.75 * (800 + 500) * 30 * (0.15 * 30), 6);
  });
});
