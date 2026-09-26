// ANEXO I — COEFICIENTES DE FUERZA PARA SECCIONES UNIFORMES.
//
// El PDF del Anexo SÍ trae capa de texto, así que las tablas se pudieron leer de dos formas
// independientes: extrayendo el texto y mirando la imagen renderizada. Las dos coinciden, y
// la segunda fue necesaria: el extractor de texto DA VUELTA LAS FRACCIONES APILADAS y
// convirtió todos los «b/d» de la Tabla I.1 en «d/b». Leerlas al revés cambia de fila —la
// elipse achatada da 0,7 y la parada 1,7, más del doble— sin que el resultado lo delate.
import { describe, it, expect } from 'vitest';
import {
  TABLA_I1, TABLA_I2, TABLA_I3A, TABLA_I3B, TABLA_I4, TABLA_I5, TABLA_I6,
  VB_I1, VB_I5, factorInclinacion, ALCANCE_ANEXO, I3B_THETA_MAX,
} from '../src/constants/anexo1.js';
import {
  interp, velocidadRafaga, vzb, cfRedondeada, cfAristaViva, cfRectangular, cfPerfil,
  cfCable, keEsbeltez, fuerzaAnexo, analizarAnexo, FAMILIAS_ANEXO, familiaAnexoDe, qEnAnexo,
} from '../src/engine/anexo1.js';
import { TERRENO } from '../src/constants/exposicion.js';

const SITIO = { V: 55, exposicion: "C", Kzt: 1, altitud: 0, usarKe: true };

describe('forma de las tablas', () => {
  it('la Tabla I.1 tiene sus dieciocho filas y dos columnas cada una', () => {
    expect(TABLA_I1).toHaveLength(18);
    for (const f of TABLA_I1) {
      expect(f.cf).toHaveLength(2);
      expect(f.id).toBeTruthy();
      expect(f.label.length).toBeGreaterThan(5);
    }
  });

  it('en la Tabla I.1 el coeficiente nunca CRECE al pasar a régimen supercrítico', () => {
    // Es la firma física de la tabla: cruzar el Reynolds crítico adelanta el punto de
    // desprendimiento y reduce la estela. Una fila donde el segundo valor superara al
    // primero sería un error de transcripción, no un caso raro.
    for (const f of TABLA_I1) {
      expect(f.cf[1], f.id).toBeLessThanOrEqual(f.cf[0]);
    }
  });

  it('las filas que no cambian con el régimen son las de aristas marcadas', () => {
    // Las que tienen Cf igual en las dos columnas son las de radio de redondeo chico, que
    // se comportan como aristas vivas. Si alguna fila redonda «lisa» quedara igual en las
    // dos columnas habría que sospechar de la transcripción.
    const iguales = TABLA_I1.filter(f => f.cf[0] === f.cf[1]).map(f => f.id);
    expect(iguales).toContain("cil_rugoso");
    expect(iguales).toContain("rect_a_r_1_12");
    expect(iguales).not.toContain("cil_liso");
  });

  it('el cilindro liso cae a la mitad al pasar el Reynolds crítico', () => {
    const f = TABLA_I1.find(x => x.id === "cil_liso");
    expect(f.cf).toEqual([1.2, 0.6]);
  });

  // ⚠ LA TRAMPA DEL EXTRACTOR DE TEXTO. `b/d = 1/2` es la elipse ACHATADA —poco alto,
  // mucha cuerda— y es la que menos arrastra. Si las relaciones se hubieran leído como
  // `d/b`, las dos filas quedarían intercambiadas.
  it('la elipse achatada arrastra mucho menos que la parada', () => {
    const achatada = TABLA_I1.find(x => x.id === "elipse_b_d_1_2");
    const parada = TABLA_I1.find(x => x.id === "elipse_b_d_2");
    expect(achatada.cf[0]).toBe(0.7);
    expect(parada.cf[0]).toBe(1.7);
    expect(parada.cf[0]).toBeGreaterThan(achatada.cf[0] * 2);
  });

  it('la Tabla I.2 tiene sus siete secciones', () => {
    expect(TABLA_I2).toHaveLength(7);
  });

  it('en la Tabla I.2 la ORIENTACIÓN cambia el coeficiente casi un 50 %', () => {
    // Es el dato de la tabla: el mismo cuadrado da 2,2 de cara y 1,5 de arista.
    const cara = TABLA_I2.find(x => x.id === "cuad_cara").cf;
    const arista = TABLA_I2.find(x => x.id === "cuad_arista").cf;
    expect(cara).toBe(2.2);
    expect(arista).toBe(1.5);
    expect(cara / arista).toBeGreaterThan(1.4);
  });

  it('el coeficiente baja al acercarse la sección al círculo', () => {
    // cuadrado 2,2 → octógono 1,4 → dodecágono 1,3, y el cilindro de la I.1 arranca en 1,2.
    const v = (id) => TABLA_I2.find(x => x.id === id).cf;
    expect(v("cuad_cara")).toBeGreaterThan(v("octogono"));
    expect(v("octogono")).toBeGreaterThan(v("dodecagono"));
    expect(v("dodecagono")).toBeGreaterThan(TABLA_I1.find(x => x.id === "cil_liso").cf[0] - 0.01);
  });
});

describe('velocidad de ráfaga del Anexo', () => {
  it('a 10 m vale exactamente la velocidad básica', () => {
    // V_z = (z/10)^α̂·V, así que en z = 10 el paréntesis es 1 cualquiera sea la exposición.
    for (const e of ["B", "C", "D"]) {
      expect(velocidadRafaga(10, 55, e)).toBeCloseTo(55, 9);
    }
  });

  it('usa α̂ = 1/α de la Tabla 1.9-1', () => {
    const z = 40, V = 55;
    for (const e of ["B", "C", "D"]) {
      expect(velocidadRafaga(z, V, e))
        .toBeCloseTo(Math.pow(z / 10, TERRENO[e].alfaG) * V, 9);
    }
  });

  it('crece con la altura y más rápido en terreno rugoso', () => {
    // En exposición B el perfil es más empinado: α̂ = 1/7,5 contra 1/11,5 en D.
    const b = velocidadRafaga(60, 55, "B") / velocidadRafaga(10, 55, "B");
    const d = velocidadRafaga(60, 55, "D") / velocidadRafaga(10, 55, "D");
    expect(b).toBeGreaterThan(1);
    expect(b).toBeGreaterThan(d);
  });

  it('V_z·b es el parámetro de entrada de las Tablas I.1 y I.5', () => {
    expect(vzb(10, 55, "C", 0.5)).toBeCloseTo(27.5, 6);
  });
});

describe('Tabla I.1 — interpolación por régimen', () => {
  it('devuelve las columnas tabuladas en los extremos', () => {
    const f = TABLA_I1.find(x => x.id === "cil_liso");
    expect(cfRedondeada("cil_liso", VB_I1[0]).cf).toBeCloseTo(f.cf[0], 9);
    expect(cfRedondeada("cil_liso", VB_I1[1]).cf).toBeCloseTo(f.cf[1], 9);
  });

  it('interpola linealmente entre 4 y 10 m²/s', () => {
    const r = cfRedondeada("cil_liso", 7);   // el punto medio
    expect(r.cf).toBeCloseTo((1.2 + 0.6) / 2, 9);
    expect(r.zona).toBe("de transición");
  });

  it('congela fuera del rango, sin extrapolar', () => {
    expect(cfRedondeada("cil_liso", 0.5).cf).toBeCloseTo(1.2, 9);
    expect(cfRedondeada("cil_liso", 500).cf).toBeCloseTo(0.6, 9);
    expect(cfRedondeada("cil_liso", 0.5).zona).toBe("subcrítica");
    expect(cfRedondeada("cil_liso", 500).zona).toBe("supercrítica");
  });
});

describe('Tablas I.3A y I.3B — prismas rectangulares', () => {
  it('devuelve los valores tabulados', () => {
    for (const [db, cf] of TABLA_I3A) {
      expect(cfRectangular({ d: db, b: 1 }).cfx, `d/b = ${db}`).toBeCloseTo(cf, 9);
    }
  });

  // ⚠ EL MÁXIMO NO ESTÁ EN EL CUADRADO. Es el dato que hace que valga la pena tener la
  // tabla entera en vez de una fórmula monótona: en d/b = 0,65 el C_fx llega a 3,0 y en el
  // cuadrado a 2,2.
  it('el pico de C_fx está en d/b = 0,65 y supera al del cuadrado', () => {
    const pico = cfRectangular({ d: 0.65, b: 1 }).cfx;
    const cuadrado = cfRectangular({ d: 1, b: 1 }).cfx;
    expect(pico).toBeCloseTo(3.0, 9);
    expect(pico).toBeGreaterThan(cuadrado);
    // …y es el máximo de toda la tabla, no un valor alto cualquiera
    expect(pico).toBe(Math.max(...TABLA_I3A.map(r => r[1])));
  });

  it('avisa cuando la sección cae cerca del pico', () => {
    const r = cfRectangular({ d: 0.7, b: 1 });
    expect(r.avisos.some(a => /0,65/.test(a.texto))).toBe(true);
    // y no avisa lejos del pico
    expect(cfRectangular({ d: 4, b: 1 }).avisos.some(a => /0,65/.test(a.texto))).toBe(false);
  });

  it('C_fy no es monótono: baja y vuelve a subir', () => {
    // Es la firma de la excitación transversal, y el motivo de que la tabla exista.
    const y = (db) => cfRectangular({ d: db, b: 1 }).cfy;
    expect(y(0.5)).toBeCloseTo(1.2, 9);
    expect(y(2.5)).toBeCloseTo(0.6, 9);
    expect(y(20)).toBeCloseTo(1.0, 9);
    expect(y(2.5)).toBeLessThan(y(0.5));
    expect(y(20)).toBeGreaterThan(y(2.5));
  });

  it('la mayoración por inclinación se aplica SÓLO con d/b > 1', () => {
    expect(factorInclinacion(0.5, 10)).toBe(1);
    expect(factorInclinacion(2, 10)).toBeCloseTo(1 + 2 * Math.tan(10 * Math.PI / 180), 9);
    // …y el motor lo dice cuando no la aplica, en vez de callarse
    const r = cfRectangular({ d: 0.5, b: 1, theta: 10 });
    expect(r.fInc).toBe(1);
    expect(r.avisos.some(a => /no requiere mayorar/.test(a.texto))).toBe(true);
  });

  it('avisa por encima de los 15° del art. I.4 y de los 20° de la nota 2', () => {
    const r = cfRectangular({ d: 2, b: 1, theta: 25 });
    expect(r.avisos.filter(a => a.tono === "error")).toHaveLength(2);
    expect(r.avisos.some(a => new RegExp(`${I3B_THETA_MAX}`).test(a.texto))).toBe(true);
  });
});

describe('Tabla I.4 — perfiles estructurales', () => {
  it('las nueve secciones tienen sus ángulos y sus dos componentes', () => {
    expect(TABLA_I4).toHaveLength(9);
    for (const p of TABLA_I4) {
      expect(p.cfx).toHaveLength(p.thetas.length);
      expect(p.cfy).toHaveLength(p.thetas.length);
    }
  });

  it('las doble T traen sólo tres ángulos, por simetría', () => {
    for (const id of ["doble_t_048", "doble_t_1", "doble_t_16"]) {
      expect(TABLA_I4.find(p => p.id === id).thetas).toEqual([0, 45, 90]);
    }
    // y las demás, cinco
    expect(TABLA_I4.find(p => p.id === "angulo").thetas).toEqual([0, 45, 90, 135, 180]);
  });

  it('a θ = 0 las doble T y el canal no tienen componente transversal', () => {
    // Son simétricas respecto del eje x: con el viento de frente no hay fuerza lateral.
    for (const id of ["doble_t_048", "doble_t_1", "doble_t_16", "canal", "zeta"]) {
      const r = cfPerfil(id, 0);
      expect(r.elegido.cfy, id).toBe(0);
    }
  });

  it('marca las celdas que la figura escribe con ±', () => {
    // «±2,1» y «±0,5»: el signo es indeterminado y son dos casos. Perder esa marca al
    // transcribir deja un número que parece definido y no lo está.
    expect(cfPerfil("te", 180).elegido.ambY).toBe(true);
    expect(cfPerfil("te", 0).elegido.ambY).toBe(false);
    expect(cfPerfil("doble_t_048", 90).elegido.ambX).toBe(true);
  });

  it('no interpola entre ángulos tabulados', () => {
    // El Anexo da 0, 45, 90, 135 y 180 y no autoriza valores intermedios.
    expect(cfPerfil("angulo", 30).elegido).toBeNull();
    expect(cfPerfil("angulo", 45).elegido).not.toBeNull();
  });

  it('informa el peor ángulo, que es lo que se dimensiona', () => {
    const r = cfPerfil("angulo", 0);
    expect(r.maxCfx).toBe(2.0);      // el 90° y el 180° dan 2,0 en valor absoluto
    expect(r.maxCfx).toBeGreaterThanOrEqual(Math.abs(r.elegido.cfx));
  });
});

describe('Tabla I.5 — cables, tirantes y tuberías', () => {
  it('el umbral es 0,6 m²/s y NO hay interpolación', () => {
    const bajo = cfCable("tub_lisa", 0.59);
    const alto = cfCable("tub_lisa", 0.61);
    expect(bajo.cf).toBe(1.20);
    expect(alto.cf).toBe(0.50);
    // …y justo en el umbral manda el régimen alto, porque la tabla dice «≥ 0,6»
    expect(cfCable("tub_lisa", 0.6).cf).toBe(0.50);
  });

  it('una tubería lisa cae a menos de la mitad y una rugosa no tanto', () => {
    expect(cfCable("tub_lisa", 5).cf).toBe(0.50);
    expect(cfCable("tub_rugosa", 5).cf).toBe(0.70);
    expect(cfCable("tub_rugosa", 5).cf).toBeGreaterThan(cfCable("tub_lisa", 5).cf);
  });

  it('los cables gruesos arrastran más que los finos en los dos regímenes', () => {
    for (const v of [0.1, 5]) {
      expect(cfCable("cable_grueso", v).cf).toBeGreaterThan(cfCable("cable_fino", v).cf);
    }
  });
});

describe('Tabla I.6 — corrección por esbeltez', () => {
  it('devuelve los valores tabulados', () => {
    for (const [e, k] of TABLA_I6) expect(keEsbeltez(e).ke).toBeCloseTo(k, 9);
  });

  it('interpola linealmente, como admite su nota', () => {
    expect(keEsbeltez(11).ke).toBeCloseTo(0.7 + (11 - 8) / (14 - 8) * 0.1, 9);
  });

  it('a partir de ℓ/b = 40 no hay reducción', () => {
    expect(keEsbeltez(40).ke).toBe(1.0);
    expect(keEsbeltez(200).ke).toBe(1.0);
  });

  // La tabla arranca en 8. Por debajo NO se extrapola: la tendencia es decreciente, así que
  // estirarla daría un factor menor, o sea una fuerza menor —el lado inseguro— justo donde
  // el reglamento se calló.
  it('por debajo de 8 adopta el primer valor y lo declara', () => {
    const r = keEsbeltez(3);
    expect(r.ke).toBe(0.7);
    expect(r.fuera).toBe(true);
    expect(r.motivo).toMatch(/no da valores/);
    expect(keEsbeltez(20).fuera).toBe(false);
  });
});

describe('la fuerza del Anexo', () => {
  it('F = G·C_f·K_e·A_f·q_z', () => {
    expect(fuerzaAnexo({ G: 0.85, cf: 1.2, keEsbeltez: 0.8, area: 10, q: 1000 }))
      .toBeCloseTo(0.85 * 1.2 * 0.8 * 10 * 1000, 6);
  });

  it('el área es b·ℓ y q se evalúa en el baricentro', () => {
    const r = analizarAnexo({ familia: "redondeada",
      datos: { b: 0.5, L: 12, z: 6, filaI1: "cil_liso" },
      sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(r.area).toBeCloseTo(6, 9);
    expect(r.z).toBe(6);
    expect(r.q).toBeCloseTo(qEnAnexo(6, SITIO, 1.0), 9);
    expect(r.esbeltez).toBeCloseTo(24, 9);
  });

  it('la corrección por esbeltez REDUCE la fuerza de un elemento corto', () => {
    const corto = analizarAnexo({ familia: "redondeada",
      datos: { b: 1, L: 10, z: 5, filaI1: "cil_liso" }, sitio: SITIO, kd: 1.0, G: 0.85 });
    const largo = analizarAnexo({ familia: "redondeada",
      datos: { b: 1, L: 50, z: 5, filaI1: "cil_liso" }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(corto.ke.ke).toBeLessThan(largo.ke.ke);
    expect(largo.ke.ke).toBe(1.0);
    // la fuerza por unidad de área del corto es menor, a igualdad de todo lo demás
    expect(corto.F / corto.area).toBeLessThan(largo.F / largo.area);
  });

  it('el rectangular devuelve las dos componentes', () => {
    const r = analizarAnexo({ familia: "rectangular",
      datos: { b: 0.4, L: 8, z: 4, d: 0.26 }, sitio: SITIO, kd: 0.9, G: 0.85 });
    expect(r.cf).toBeGreaterThan(0);
    expect(r.Fy).not.toBeNull();
    expect(r.extra.db).toBeCloseTo(0.65, 9);
    expect(r.cf).toBeCloseTo(3.0, 9);
  });

  it('cada familia declara su tabla y su figura', () => {
    for (const f of FAMILIAS_ANEXO) {
      expect(f.tabla).toMatch(/Tabla/);
      expect(f.fig).toBeTruthy();
      expect(familiaAnexoDe(f.id).id).toBe(f.id);
    }
  });

  it('avisa cuando la esbeltez sale del alcance del art. I.1', () => {
    const r = analizarAnexo({ familia: "redondeada",
      datos: { b: 0.2, L: 20, z: 10, filaI1: "cil_liso" }, sitio: SITIO, kd: 1.0, G: 0.85 });
    expect(r.esbeltez).toBeCloseTo(100, 6);
    expect(r.avisos.some(a => /40/.test(a.texto))).toBe(true);
  });

  it('la traza advierte que el K_e del Anexo no es el del art. 1.12', () => {
    // Dos factores distintos con el mismo símbolo, los dos multiplicando la misma fuerza.
    // Si la traza no lo dijera, no habría dónde enterarse.
    const r = analizarAnexo({ familia: "aristaviva",
      datos: { b: 0.3, L: 6, z: 3, filaI2: "cuad_cara" }, sitio: SITIO, kd: 0.9, G: 0.85 });
    const paso = r.traza.find(p => p.paso === "Corrección por esbeltez");
    expect(paso.detalle).toMatch(/altitud/);
    expect(paso.detalle).toMatch(/1\.12/);
  });
});
