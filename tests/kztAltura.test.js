// K_zt EN FUNCIÓN DE LA ALTURA — art. 1.8 aplicado al perfil de la pared a barlovento.
//
// El punto de todo este archivo es UNO: K_zt no es un número, es un perfil que DECRECE
// con la altura, y por debajo de z_mín el perfil de K_z está congelado. En esa franja,
// entonces, evaluar arriba del tramo —que es lo correcto cuando K_zt es constante, porque
// K_z crece con z— subestima la presión. Los tests fijan las tres cosas que hacen que eso
// no vuelva a pasar: que K_zt decrezca, que el tramo adopte el peor de sus extremos, y
// que sin accidente declarado nada de esto cambie un solo número.
import { describe, it, expect } from 'vitest';
import { kztEn, kztVariable, gobernanteTramo, alturasCriticasKzt, kz,
  q as qDinamica } from '../src/engine/presionDinamica.js';
import { analizarDireccion, DIRECCIONES, perfilBarlovento } from '../src/engine/edificio.js';
import { aporteParedes } from '../src/engine/resultantes.js';
import { CP_PARED } from '../src/constants/presionesExternas.js';

const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));

// Una loma que cumple las tres condiciones del art. 1.8.1 con holgura, para que el efecto
// se vea y no quede tapado por un K_zt de 1,02.
const LOMA = {
  forma: "loma_2D", exposicion: "B", H_m: 40, Lh_m: 60, x_m: 0,
  lado: "barlovento", cond1_confirmada: true, metodo: "expresiones",
};
const LLANO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const CON_LOMA = { ...LLANO, Kzt: null, topo: LOMA };
const GEO = { a: 20, b: 30, hAlero: 25, theta: 0, tipo: "plana", cumbrera: "X" };

describe('K_zt(z)', () => {
  // Si esto no se cumple, todo el criterio de «el piso del tramo puede gobernar» pierde
  // sentido: sería el techo, como antes.
  it('decrece con la altura, en las tres formas y con los dos métodos', () => {
    for (const forma of ["loma_2D", "escarpa_2D", "colina_3D"]) {
      for (const metodo of ["expresiones", "tabla"]) {
        const sitio = { topo: { ...LOMA, forma, metodo } };
        let previo = Infinity;
        for (let z = 0; z <= 130; z += 2.5) {
          const v = kztEn(sitio, z);
          expect(v, `${forma}/${metodo} z=${z}`).toBeLessThanOrEqual(previo + 1e-12);
          previo = v;
        }
      }
    }
  });

  it('es máximo al ras del terreno y nunca baja de 1', () => {
    const sitio = { topo: LOMA };
    const enCero = kztEn(sitio, 0);
    expect(enCero).toBeGreaterThan(kztEn(sitio, 25));
    for (let z = 0; z <= 200; z += 5) expect(kztEn(sitio, z)).toBeGreaterThanOrEqual(1);
  });

  // La z de K3 es la REAL. El piso de 5 m es del perfil de exposición, no del art. 1.8, y
  // aplicárselo borraría justo la franja donde el efecto topográfico es mayor.
  it('no le aplica a z el piso de 5 m que usa K_z', () => {
    const sitio = { topo: LOMA };
    expect(kz(0, "B")).toBe(kz(5, "B"));                 // K_z sí está congelado
    expect(kztEn(sitio, 0)).toBeGreaterThan(kztEn(sitio, 5));   // K_zt no
  });

  it('sin datos de accidente cae al escalar de `sitio`', () => {
    expect(kztVariable(LLANO)).toBe(false);
    expect(kztEn(LLANO, 0)).toBe(1);
    expect(kztEn({ Kzt: 1.4 }, 37)).toBe(1.4);
    expect(kztVariable(CON_LOMA)).toBe(true);
  });
});

describe('extremo gobernante del tramo', () => {
  it('sin topografía gobierna siempre el extremo superior', () => {
    for (const [desde, hasta] of [[0, 2], [2, 4.5], [4.5, 9], [9, 20], [20, 25]]) {
      const g = gobernanteTramo({ desde, hasta, sitio: LLANO });
      expect(g.gobierna, `${desde}–${hasta}`).not.toBe("inferior");
      expect(g.q).toBe(qDinamica({ ...LLANO, z: hasta }));
      // Y la COTA informada es la de arriba también en los empates —los dos tramos por
      // debajo de 5 m dan el mismo producto—, porque es la que rotula la fila de la tabla.
      expect(g.z, `${desde}–${hasta}`).toBe(hasta);
    }
  });

  // LA RAZÓN DE SER DEL CAMBIO. Abajo de 5 m K_z no crece y K_zt sí baja: el peor punto
  // del tramo es el piso.
  it('con topografía, en la franja congelada gobierna el extremo inferior', () => {
    const g = gobernanteTramo({ desde: 0, hasta: 4.5, sitio: CON_LOMA });
    expect(g.gobierna).toBe("inferior");
    expect(g.z).toBe(0);
    expect(g.q).toBeGreaterThan(qDinamica({ ...CON_LOMA, z: 4.5, Kzt: kztEn(CON_LOMA, 4.5) }));
  });

  it('informa los dos extremos, no sólo el que gana', () => {
    const g = gobernanteTramo({ desde: 0, hasta: 4.5, sitio: CON_LOMA });
    expect(g.extremos.inferior.z).toBe(0);
    expect(g.extremos.superior.z).toBe(4.5);
    expect(g.extremos.inferior.kzt).toBeGreaterThan(g.extremos.superior.kzt);
    expect(g.extremos.superior.kz).toBe(g.extremos.inferior.kz);   // congelados los dos
  });

  it('el tramo adoptado nunca es menor que cualquiera de sus extremos', () => {
    for (const sitio of [LLANO, CON_LOMA]) {
      for (let z = 0; z < 60; z += 3) {
        const g = gobernanteTramo({ desde: z, hasta: z + 3, sitio });
        expect(g.q).toBeGreaterThanOrEqual(g.extremos.inferior.q - 1e-9);
        expect(g.q).toBeGreaterThanOrEqual(g.extremos.superior.q - 1e-9);
      }
    }
  });
});

describe('el perfil de la pared a barlovento', () => {
  const conLoma = analizarDireccion({ geo: GEO, sitio: CON_LOMA, cerramiento: "cerrado", G: 0.85 }, D["Wx+"]);

  // Lo que pedía el criterio: ningún tramo puede quedar por debajo de lo que daría
  // evaluarlo con el K_zt de la cubierta, que es la simplificación que se eliminó.
  it('ningún tramo queda por debajo del mismo tramo calculado con K_zt(h)', () => {
    const kztH = kztEn(CON_LOMA, conLoma.geo.h);
    for (const t of conLoma.perfil) {
      const conKztH = qDinamica({ ...CON_LOMA, z: t.hasta, Kzt: kztH });
      expect(t.q, `z = ${t.hasta}`).toBeGreaterThanOrEqual(conKztH - 1e-9);
    }
  });

  it('el tramo inferior es ESTRICTAMENTE mayor que con K_zt(h)', () => {
    const kztH = kztEn(CON_LOMA, conLoma.geo.h);
    // El tramo 0 es degenerado [0,0] y sólo rotula la base; el primero con espesor es el 1.
    const bajo = conLoma.perfil.find(t => t.hasta > t.desde);
    expect(bajo.q).toBeGreaterThan(qDinamica({ ...CON_LOMA, z: bajo.hasta, Kzt: kztH }));
  });

  it('cada tramo trae qué extremo gobierna y a qué cota', () => {
    for (const t of conLoma.perfil) {
      expect(["inferior", "superior", "coinciden"]).toContain(t.gobierna);
      expect([t.desde, t.hasta]).toContain(t.zGobernante);
      expect(t.kzt).toBe(kztEn(CON_LOMA, t.zGobernante));
    }
    // Y que efectivamente HAYA tramos gobernados por abajo: si no, el test de arriba
    // pasaría en un perfil donde nunca ocurre y no verificaría nada.
    expect(conLoma.perfil.filter(t => t.gobierna === "inferior").length).toBeGreaterThan(0);
  });

  // REGRESIÓN. Sin accidente declarado, el perfil tiene que dar EXACTAMENTE lo que daba
  // antes de que K_zt dependiera de z: q evaluado en el techo del tramo, con K_zt escalar.
  it('sin topografía da exactamente el perfil de antes del cambio', () => {
    for (const exposicion of ["B", "C", "D"]) {
      for (const hAlero of [3, 4.9, 9, 25, 60]) {
        const sitio = { ...LLANO, exposicion };
        const perfil = perfilBarlovento({ h: hAlero, sitio, hAlero, hCumbre: hAlero, puntos: 10 }).puntos;
        for (const t of perfil) {
          expect(t.q, `${exposicion} h=${hAlero} z=${t.hasta}`)
            .toBe(qDinamica({ ...sitio, z: t.hasta }));
          expect(t.kz).toBe(kz(t.hasta, exposicion));
          expect(t.kzt).toBe(1);
        }
      }
    }
  });
});

describe('el máximo interior de K_z·K_zt', () => {
  // La regla «el mayor de los dos extremos» sólo es exacta si el producto es monótono
  // dentro del tramo, y con topografía NO lo es: K_z sube, K_zt baja, y el producto tiene
  // joroba. Por eso el perfil se corta también en esos máximos.
  it('el producto tiene joroba: no es monótono entre el suelo y el tope', () => {
    const sitio = { exposicion: "B", topo: { ...LOMA, H_m: 20, Lh_m: 30, x_m: 0 } };
    const p = (z) => kz(z, "B") * kztEn(sitio, z);
    expect(p(6)).toBeGreaterThan(p(5));     // sube
    expect(p(6)).toBeGreaterThan(p(30));    // y después baja
    expect(p(90)).toBeGreaterThan(p(30));   // y vuelve a subir cuando K_zt ya se extinguió
  });

  // ⚠ EL CASO QUE SE ESCAPÓ EN LA PRIMERA VERSIÓN. Buscando sólo el máximo GLOBAL, en un
  // edificio alto el resultado cae en el tope —que ya es extremo del perfil— y la joroba
  // de abajo queda sin corte.
  it('encuentra la joroba de abajo aunque el máximo global esté en el tope', () => {
    const sitio = { exposicion: "B", topo: { ...LOMA, H_m: 20, Lh_m: 30, x_m: 0 } };
    const picos = alturasCriticasKzt(sitio, 5, 90);
    const p = (z) => kz(z, "B") * kztEn(sitio, z);
    expect(picos.length).toBeGreaterThanOrEqual(1);
    expect(picos[0]).toBeGreaterThan(5);
    expect(picos[0]).toBeLessThan(10);
    // Es un máximo LOCAL: supera a sus vecinos, no al tope del edificio. Justamente por
    // eso una búsqueda del máximo global lo pierde.
    expect(p(picos[0])).toBeGreaterThan(p(picos[0] - 0.5));
    expect(p(picos[0])).toBeGreaterThan(p(picos[0] + 0.5));
    expect(p(90)).toBeGreaterThan(p(picos[0]));
  });

  it('sin topografía no hay máximo interior que buscar', () => {
    expect(alturasCriticasKzt(LLANO, 5, 90)).toEqual([]);
  });

  // LA PROPIEDAD QUE IMPORTA, barrida: ningún punto interior de ningún tramo puede quedar
  // por encima de lo que ese tramo adopta. Es lo que hace que la discretización sea
  // conservadora y no sólo «razonable».
  it('ningún punto interior de ningún tramo supera al valor adoptado', () => {
    for (const exposicion of ["B", "C", "D"]) {
      for (const [H_m, Lh_m, x_m] of [[20, 30, 0], [30, 30, 20], [40, 60, 15], [90, 200, 60]]) {
        for (const h of [6, 12, 30, 60, 90]) {
          const sitio = { ...LLANO, exposicion, Kzt: null,
            topo: { ...LOMA, exposicion, H_m, Lh_m, x_m } };
          const perfil = perfilBarlovento({ h, sitio, hAlero: h, hCumbre: h, puntos: 6 }).puntos;
          for (const t of perfil) {
            if (!(t.hasta > t.desde)) continue;
            for (let i = 1; i < 40; i++) {
              const z = t.desde + (t.hasta - t.desde) * i / 40;
              const dentro = qDinamica({ ...sitio, z, Kzt: kztEn(sitio, z) });
              expect(t.q, `${exposicion} H=${H_m} h=${h} z=${z}`)
                .toBeGreaterThanOrEqual(dentro - 1e-6);
            }
          }
        }
      }
    }
  });
});

describe('q_h usa la h del edificio analizado', () => {
  // ⚠ ESTE TEST EXISTE POR UN ERROR DE REPORTE, NO DE CÓDIGO. Al verificar K_zt(z) en el
  // navegador informé K_zt(h) = 2,1146 para un edificio de h = 30 m; ese número es el de
  // z = 6 m, que era el alero por defecto de OTRA corrida. El valor correcto para h = 30
  // es 1,4034. El cálculo estaba bien y el reporte mal, pero un número de q_h que viene
  // de una cota ajena es exactamente el defecto que nadie ve: la presión sale plausible.
  //
  // Con la loma de referencia y Lh → 2H = 80 m:
  //   K1 = 1,30 × 0,5 = 0,650 · K2 = 1 − 15/(1,5·80) = 0,875
  //   K3(z) = e^(−3z/80)  ⇒  K_zt(z) = (1 + 0,56875·e^(−0,0375·z))²
  const TOPO = { ...LOMA, H_m: 40, Lh_m: 60, x_m: 15 };
  const SITIO = { ...LLANO, Kzt: null, topo: TOPO };
  const kztMano = (z) => Math.pow(1 + 0.65 * 0.875 * Math.exp(-3 * z / 80), 2);

  it('el multiplicador a mano coincide con el del motor', () => {
    for (const z of [0, 6, 14.21, 30, 60]) {
      expect(kztEn(SITIO, z), `z = ${z}`).toBeCloseTo(kztMano(z), 10);
    }
    // Y los dos números que se confundieron son efectivamente distintos.
    expect(kztEn(SITIO, 6)).toBeCloseTo(2.1146, 4);
    expect(kztEn(SITIO, 30)).toBeCloseTo(1.4034, 4);
  });

  // La propiedad: q_h sale de K_z(h)·K_zt(h) con la h de ESTE edificio, no de una cota
  // heredada, no del alero por defecto y no del tope del perfil.
  it('q_h = 0,613·K_z(h)·K_zt(h)·K_d·K_e·V², con la h de cada edificio', () => {
    for (const hAlero of [4, 6, 12, 30, 60]) {
      const geo = { a: 20, b: 30, hAlero, theta: 0, tipo: "plana", cumbrera: "X" };
      const r = analizarDireccion({ geo, sitio: SITIO, cerramiento: "cerrado", G: 0.85 }, D["Wx+"]);
      const h = r.geo.h;
      expect(r.qh, `h = ${h}`).toBeCloseTo(
        0.613 * kz(h, "B") * kztMano(h) * 0.85 * 1 * 55.1 * 55.1, 6);
      // Y la traza informa ese mismo K_zt, no otro.
      expect(r.traza.find(t => t.simbolo === "K_zt(h)").valor, `h = ${h}`)
        .toBeCloseTo(kztMano(h), 10);
    }
  });

  // El otro lado del mismo error: cambiar la altura del edificio TIENE que cambiar q_h.
  // Si K_zt quedara pegado a una cota fija, dos edificios distintos darían el mismo.
  it('dos edificios de distinta altura no comparten K_zt(h)', () => {
    const qh = (hAlero) => analizarDireccion(
      { geo: { a: 20, b: 30, hAlero, theta: 0, tipo: "plana", cumbrera: "X" },
        sitio: SITIO, cerramiento: "cerrado", G: 0.85 }, D["Wx+"]);
    const bajo = qh(6), alto = qh(30);
    expect(bajo.traza.find(t => t.simbolo === "K_zt(h)").valor)
      .toBeGreaterThan(alto.traza.find(t => t.simbolo === "K_zt(h)").valor);
  });

  // Las superficies de q_h constante —sotavento, laterales, cubierta— usan ESE q_h.
  it('sotavento, laterales y cubierta llevan el q_h de la altura media', () => {
    const r = analizarDireccion(
      { geo: { a: 20, b: 30, hAlero: 30, theta: 0, tipo: "plana", cumbrera: "X" },
        sitio: SITIO, cerramiento: "cerrado", G: 0.85 }, D["Wx+"]);
    for (const s of r.superficies.filter(s => s.id !== "pared_barlovento")) {
      expect(s.q, s.id).toBeCloseTo(r.qh, 9);
    }
  });
});

describe('corte en la base con K_zt(z)', () => {
  const analisis = analizarDireccion({ geo: GEO, sitio: CON_LOMA, cerramiento: "cerrado", G: 0.85 }, D["Wx+"]);

  // Antes este control comparaba el corte de dos direcciones y esperaba que su cociente
  // fuera exactamente K_zt. Con K_zt(z) eso ya no vale: cada tramo lleva su propio factor
  // y el cociente es un promedio pesado por área, no el factor de ninguna cota. Lo que sí
  // tiene que cerrar —y es más fuerte, porque no depende de ninguna simetría— es que la
  // resultante sea la SUMA DE LOS TRAMOS que la tabla muestra.
  it('la resultante de barlovento es la suma de los tramos de la tabla', () => {
    const { B, G } = analisis;
    const bar = analisis.superficies.find(s => s.id === "pared_barlovento");
    const suma = bar.tramos.reduce(
      (a, t) => a + t.q * G * CP_PARED.barlovento.cp * B * (t.hasta - t.desde), 0);
    expect(aporteParedes({ analisis }).barlovento).toBeCloseTo(suma, 6);
  });

  it('está entre el corte con K_zt(h) y el corte con K_zt al ras del terreno', () => {
    const { B, G, geo } = analisis;
    const cp = CP_PARED.barlovento.cp;
    const corte = (Kzt) => analizarDireccion(
      { geo: GEO, sitio: { ...LLANO, Kzt }, cerramiento: "cerrado", G: 0.85 }, D["Wx+"]
    ).superficies.find(s => s.id === "pared_barlovento")
      .tramos.reduce((a, t) => a + t.q * G * cp * B * (t.hasta - t.desde), 0);

    const real = aporteParedes({ analisis }).barlovento;
    expect(real).toBeGreaterThan(corte(kztEn(CON_LOMA, geo.h)));
    expect(real).toBeLessThan(corte(kztEn(CON_LOMA, 0)));
  });
});
