// APLICABILIDAD — en qué fila y en qué columna de la Figura 2.4-1 cayó cada caso.
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES, cpCubiertaBarlovento,
  cpCubiertaSotavento } from '../src/engine/edificio.js';
import { cpSotavento } from '../src/engine/presiones.js';
import { aplicabilidad, aplicabilidadDeTodas, ESTADOS, HL_TABULADO, LB_TABULADO,
  BAJA_ALTURA } from '../src/engine/aplicabilidad.js';
import { CP_CUBIERTA_BARLOVENTO, CP_CUBIERTA_SOTAVENTO,
  CP_PARED } from '../src/constants/presionesExternas.js';

const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));
const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const mk = (geo, dir = "Wx+") =>
  analizarDireccion({ geo, sitio: SITIO, cerramiento: "cerrado", G: 0.85 }, D[dir]);
const de = (geo, dir, id) => aplicabilidad(mk(geo, dir)).items.find(x => x.id === id);

const PLANA = { a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
const aguas = (th, extra = {}) => ({ a: "20", b: "30", hAlero: "6", theta: String(th),
  tipo: "dos_aguas", cumbrera: "Y", ...extra });

describe('los estados no son grados de un mismo eje', () => {
  it('cada estado tiene su tono, y sólo el extendido avisa', () => {
    expect(ESTADOS.dentro.tono).toBe("info");
    // ⚠ «EN EL EXTREMO» NO ES UN AVISO. Las filas de la figura dicen ≤ y ≥: adoptar el
    // extremo es lo que manda, no una licencia del motor. Marcarlo como aviso llenaría
    // de amarillo cualquier galpón largo y haría que se dejen de leer los reales.
    expect(ESTADOS.extremo.tono).toBe("info");
    expect(ESTADOS.extendido.tono).toBe("aviso");
    expect(ESTADOS.fuera.tono).toBe("error");
  });
});

describe('relación L/B — pared a sotavento', () => {
  it('dentro del rango se declara interpolada', () => {
    const x = de(PLANA, "Wx+", "LB");
    expect(x.valor).toBeCloseTo(20 / 30, 9);
    expect(x.estado).toBe("dentro");
    expect(x.tono).toBe("info");
  });

  it('por encima del último punto se declara extremo, y el Cp es el del extremo', () => {
    // L = 100 m paralelo al viento, B = 20: L/B = 5 > 4.
    const geo = { a: "100", b: "20", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
    const x = de(geo, "Wx+", "LB");
    expect(x.valor).toBeCloseTo(5, 9);
    expect(x.estado).toBe("extremo");
    // Y el coeficiente NO se extrapoló: es el mismo que en el último punto tabulado.
    expect(cpSotavento(100, 20)).toBeCloseTo(cpSotavento(80, 20), 9);
    expect(cpSotavento(100, 20)).toBeCloseTo(-0.2, 9);
  });

  it('justo en el último punto tabulado todavía es «dentro»', () => {
    const geo = { a: "80", b: "20", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
    expect(de(geo, "Wx+", "LB").valor).toBeCloseTo(LB_TABULADO[1], 9);
    expect(de(geo, "Wx+", "LB").estado).toBe("dentro");
  });
});

describe('relación h/L — filas de las tablas de cubierta', () => {
  // ⚠ EL RANGO SE CONTRASTA CONTRA LA TABLA, NO SE ESCRIBE DOS VECES. Si mañana se
  // agrega una fila a la figura y este módulo sigue con el rango viejo, un edificio
  // interpolable quedaría informado como «en el extremo» y nadie se enteraría.
  it('el rango declarado son exactamente las filas de la figura', () => {
    const filas = Object.keys(CP_CUBIERTA_BARLOVENTO).map(Number).sort((x, y) => x - y);
    expect(filas).toEqual([0.25, 0.5, 1.0]);
    expect(Object.keys(CP_CUBIERTA_SOTAVENTO).map(Number).sort((x, y) => x - y)).toEqual(filas);
    expect(HL_TABULADO).toEqual([filas[0], filas.at(-1)]);
    // Y lo mismo con L/B, que sale de los puntos de la pared a sotavento.
    expect(CP_PARED.sotavento.puntos.map(p => p[0])).toEqual([0, 1, 2, 4]);
    expect(LB_TABULADO).toEqual([0, 4]);
  });

  it('entre las dos filas superiores también se interpola', () => {
    // h/L = 0,70: por encima de 0,5 y por debajo de 1,0. Es el tramo que se pierde si el
    // rango se corta en la fila del medio.
    const geo = { a: "20", b: "30", hAlero: "14", theta: "0", tipo: "plana", cumbrera: "X" };
    const x = de(geo, "Wx+", "hL");
    expect(x.valor).toBeCloseTo(0.7, 9);
    expect(x.estado).toBe("dentro");
    // Y el Cp efectivamente cambia dentro del tramo: no está congelado. Se mira el
    // faldón a BARLOVENTO: el de sotavento vale −0,60 en las tres filas para θ ≥ 20°, así
    // que ahí la interpolación en h/L no se ve.
    expect(cpCubiertaBarlovento(0.7, 25)[0])
      .not.toBeCloseTo(cpCubiertaBarlovento(1.0, 25)[0], 6);
    expect(cpCubiertaBarlovento(0.7, 25)[0])
      .not.toBeCloseTo(cpCubiertaBarlovento(0.5, 25)[0], 6);
  });

  it('dentro de las filas intermedias se interpola', () => {
    // h = 6 m, L = 20 m ⇒ h/L = 0,30, entre 0,25 y 0,5.
    const x = de(aguas(25), "Wx+", "hL");
    expect(x.valor).toBeGreaterThan(HL_TABULADO[0]);
    expect(x.valor).toBeLessThan(HL_TABULADO[1]);
    expect(x.estado).toBe("dentro");
  });

  it('por encima de 1,0 se lee la fila ≥ 1,0 y no se extrapola', () => {
    const geo = { a: "20", b: "30", hAlero: "40", theta: "25", tipo: "dos_aguas", cumbrera: "Y" };
    const x = de(geo, "Wx+", "hL");
    expect(x.valor).toBeGreaterThan(1);
    expect(x.estado).toBe("extremo");
    expect(x.detalle).toMatch(/h\/L ≥ 1,0/);
    // El Cp de h/L = 2 es idéntico al de h/L = 1: la fila está congelada.
    expect(cpCubiertaBarlovento(2.0, 25)).toEqual(cpCubiertaBarlovento(1.0, 25));
    expect(cpCubiertaSotavento(2.0, 25)).toBeCloseTo(cpCubiertaSotavento(1.0, 25), 9);
  });

  it('por debajo de 0,25 se lee la fila ≤ 0,25', () => {
    const geo = { a: "120", b: "30", hAlero: "5", theta: "25", tipo: "dos_aguas", cumbrera: "Y" };
    const x = de(geo, "Wx+", "hL");
    expect(x.valor).toBeLessThan(HL_TABULADO[0]);
    expect(x.estado).toBe("extremo");
    expect(x.detalle).toMatch(/h\/L ≤ 0,25/);
    expect(cpCubiertaBarlovento(0.1, 25)).toEqual(cpCubiertaBarlovento(0.25, 25));
  });
});

describe('régimen del ángulo de cubierta', () => {
  it('con θ < 10° la cubierta va por franjas y θ no entra en el Cp', () => {
    const x = de(aguas(5), "Wx+", "theta");
    expect(x.estado).toBe("dentro");
    expect(x.rango).toBe("no indexa");
    expect(x.detalle).toMatch(/FRANJAS/);
    // Y es verdad: dos ángulos distintos por debajo de 10° dan el mismo análisis de
    // cubierta. Sin este control la afirmación de la pantalla no estaría respaldada.
    const a5 = mk(aguas(5), "Wx+"), a8 = mk(aguas(8), "Wx+");
    expect(a5.superficies.filter(s => s.tipo === "cubierta").map(s => s.cp))
      .toEqual(a8.superficies.filter(s => s.tipo === "cubierta").map(s => s.cp));
  });

  it('con viento paralelo a la cumbrera θ tampoco entra', () => {
    // Cumbrera según Y y viento según Y: paralelo.
    const x = de(aguas(30), "Wy+", "theta");
    expect(x.rango).toBe("no indexa");
    expect(x.detalle).toMatch(/PARALELO/);
  });

  it('entre 10° y 45° cae dentro de las columnas tabuladas', () => {
    for (const th of [10, 17.5, 25, 35, 45]) {
      const x = de(aguas(th), "Wx+", "theta");
      expect(x.estado).toBe("dentro");
      expect(x.tono).toBe("info");
    }
  });

  // ⚠ ES EL TRAMO DONDE LA FIGURA ESCRIBE UNA EXPRESIÓN Y NO UN NÚMERO. Interpolar hacia
  // ella exige fijar el nodo en 60°, no evaluarla al θ que se está calculando.
  it('entre 45° y 60° la lectura es extendida', () => {
    for (const th of [45.1, 50, 59.9]) {
      const x = de(aguas(th), "Wx+", "theta");
      expect(x.estado).toBe("extendido");
      expect(x.tono).toBe("aviso");
      expect(x.detalle).toMatch(/0,60/);
    }
    // El caso de succión vale 0 en todo el tramo: a 45° ya es 0 y a 60° no existe.
    for (const th of [45, 50, 55, 60]) expect(cpCubiertaBarlovento(0.5, th)[0]).toBeCloseTo(0, 9);
  });

  it('desde 60° hasta 80° se lee la expresión 0,01·θ, sin caso de succión', () => {
    for (const th of [60, 70, 80]) {
      const x = de(aguas(th), "Wx+", "theta");
      expect(x.estado).toBe("extremo");
      expect(x.tono).toBe("info");
      expect(cpCubiertaBarlovento(0.5, th)[1]).toBeCloseTo(0.01 * th, 9);
      expect(cpCubiertaBarlovento(0.5, th)[0]).toBeCloseTo(0, 9);
    }
  });

  // Por encima de 80° la nota manda tratar la cubierta como pared, y ahí la figura se
  // contradice: el faldón a sotavento se sigue leyendo de la tabla de cubierta.
  it('por encima de 80° la lectura es extendida y el aviso dice la contradicción', () => {
    const x = de(aguas(85), "Wx+", "theta");
    expect(x.estado).toBe("extendido");
    expect(x.detalle).toMatch(/PARED/);
    expect(x.detalle).toMatch(/SOTAVENTO/);
    expect(cpCubiertaBarlovento(0.5, 85)).toEqual([0.8, 0.8]);
    // Y el de sotavento sigue siendo el de cubierta, que es lo que el aviso denuncia.
    expect(cpCubiertaSotavento(0.5, 85)).toBeCloseTo(-0.6, 9);
    // En 80° exactos todavía NO: la nota dice «mayor que 80°».
    expect(de(aguas(80), "Wx+", "theta").estado).toBe("extremo");
  });
});

describe('edificio de baja altura — art. 1.2', () => {
  it('cumple con h ≤ 18 m y h ≤ la menor dimensión en planta', () => {
    const x = de(PLANA, "Wx+", "bajaAltura");
    expect(x.cumple).toBe(true);
    expect(x.detalle).toMatch(/envolvente/);
    // El umbral es el de la definición, escrito acá como literal: si se lo tomara de la
    // constante, cambiarla de 18 a 20 dejaría el test en verde.
    expect(BAJA_ALTURA.h).toBe(18);
  });

  it('no cumple si h supera los 18 m, aunque la planta sea enorme', () => {
    const geo = { a: "200", b: "300", hAlero: "24", theta: "0", tipo: "plana", cumbrera: "X" };
    expect(de(geo, "Wx+", "bajaAltura").cumple).toBe(false);
    // Justo en el umbral sí cumple: la definición dice «no supera».
    const justo = { ...geo, hAlero: String(BAJA_ALTURA.h) };
    expect(de(justo, "Wx+", "bajaAltura").cumple).toBe(true);
  });

  it('no cumple si h supera la menor dimensión, aunque sea bajo', () => {
    // ⚠ LA PLANTA ES 10 × 20, NO 10 × 12. Con h = 14 entre las dos dimensiones, la
    // condición se cumple contra la MAYOR y falla contra la MENOR: es el único caso que
    // distingue cuál de las dos usa el motor. Con 10 × 12 las dos dan lo mismo.
    const geo = { a: "10", b: "20", hAlero: "14", theta: "0", tipo: "plana", cumbrera: "X" };
    const x = de(geo, "Wx+", "bajaAltura");
    expect(x.cumple).toBe(false);
    expect(x.detalle).toMatch(/menor dimensión/);
    // Y el motivo es ése y no la altura: 14 m está por debajo de los 18 del umbral.
    expect(14).toBeLessThan(BAJA_ALTURA.h);
  });
});

describe('relación h/B', () => {
  it('se informa, y se dice que NO elige ninguna fila de la figura', () => {
    const x = de(PLANA, "Wx+", "hB");
    expect(x.valor).toBeCloseTo(6 / 30, 9);
    expect(x.rango).toBe("no indexa");
    expect(x.detalle).toMatch(/NO elige/);
    // Y es verdad: con el mismo L/B y el mismo h/L, cambiar sólo B no mueve ningún Cp.
    // Se comprueba con dos edificios homotéticos en planta.
    const uno = mk({ a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" });
    const otro = mk({ a: "40", b: "60", hAlero: "12", theta: "0", tipo: "plana", cumbrera: "X" });
    expect(uno.superficies.map(s => s.cp)).toEqual(otro.superficies.map(s => s.cp));
  });
});

describe('las cuatro direcciones', () => {
  it('cada dirección tiene su lectura: L y B se intercambian', () => {
    const todas = DIRECCIONES.map(d => mk(aguas(25), d.id));
    const ap = aplicabilidadDeTodas(todas);
    expect(ap.porDir).toHaveLength(4);
    const lb = ap.porDir.map(p => p.items.find(x => x.id === "LB").valor);
    expect(lb[0]).toBeCloseTo(20 / 30, 9);
    expect(lb[2]).toBeCloseTo(30 / 20, 9);
  });

  it('el tono del conjunto es el MÁS GRAVE, no el último', () => {
    const suave = aplicabilidadDeTodas(DIRECCIONES.map(d => mk(aguas(25), d.id)));
    expect(suave.tono).toBe("info");
    expect(suave.extendidas).toHaveLength(0);
    // Con θ = 85° sólo las direcciones normales a la cumbrera leen la columna extendida;
    // las paralelas van por franjas. El conjunto tiene que avisar igual.
    const dura = aplicabilidadDeTodas(DIRECCIONES.map(d => mk(aguas(85), d.id)));
    expect(dura.tono).toBe("aviso");
    expect(dura.porDir.some(p => p.tono === "info")).toBe(true);
    expect(dura.extendidas.length).toBeGreaterThan(0);
  });

  it('una lectura extendida repetida en varias direcciones se lista UNA vez', () => {
    // Las dos direcciones del eje X leen la misma columna extendida. Listarla dos veces
    // hace que se deje de leer, que es el modo de falla de una lista de avisos.
    const dura = aplicabilidadDeTodas(DIRECCIONES.map(d => mk(aguas(85), d.id)));
    const normales = dura.porDir.filter(p => p.extendidas.length > 0);
    expect(normales.length).toBeGreaterThan(1);
    expect(dura.extendidas.map(x => x.id)).toEqual(["theta"]);
  });

  // ⚠ ES EL BUG QUE ENCONTRÓ LA VERIFICACIÓN EN NAVEGADOR. Los extremos llevan tono
  // «info» a propósito, así que el rótulo de la tarjeta —que miraba sólo el tono— decía
  // «todo dentro de tabla» en una nave con DOS filas leídas en el extremo.
  it('los extremos se cuentan aparte del tono', () => {
    const larga = { a: "100", b: "20", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
    const ap = aplicabilidad(mk(larga, "Wx+"));
    expect(ap.tono).toBe("info");
    expect(ap.extendidas).toHaveLength(0);
    expect(ap.extremos.map(x => x.id).sort()).toEqual(["LB", "hL"]);
    // El galpón por defecto no tiene ninguno.
    expect(aplicabilidad(mk(PLANA, "Wx+")).extremos).toHaveLength(0);
  });

  it('el conteo de extremos del conjunto es el de la peor dirección', () => {
    // ⚠ LA NAVE VA LARGA SEGÚN Y, NO SEGÚN X. Las direcciones se recorren en el orden
    // Wx+ · Wx− · Wy+ · Wy−, así que con la nave larga según X las dos primeras ya
    // traen los extremos y el test no distinguiría «el máximo» de «la primera».
    const larga = { a: "20", b: "100", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
    const ap = aplicabilidadDeTodas(DIRECCIONES.map(d => mk(larga, d.id)));
    // Según X, L/B = 0,2 y h/L = 0,30: ninguno. Según Y, L/B = 5 y h/L = 0,06: dos.
    expect(ap.porDir.map(p => p.extremos.length)).toEqual([0, 0, 2, 2]);
    expect(ap.extremos).toBe(2);
  });

  it('la baja altura sale una sola vez: no depende de la dirección', () => {
    const ap = aplicabilidadDeTodas(DIRECCIONES.map(d => mk(PLANA, d.id)));
    expect(ap.bajaAltura.cumple).toBe(true);
    for (const p of ap.porDir)
      expect(p.items.find(x => x.id === "bajaAltura").cumple).toBe(ap.bajaAltura.cumple);
  });

  it('todos los items traen magnitud, valor, rango, estado y detalle', () => {
    for (const p of aplicabilidadDeTodas(DIRECCIONES.map(d => mk(aguas(50), d.id))).porDir) {
      expect(p.items.map(x => x.id))
        .toEqual(["hL", "LB", "theta", "hB", "bajaAltura"]);
      for (const x of p.items) {
        expect(typeof x.magnitud).toBe("string");
        expect(typeof x.texto).toBe("string");
        expect(typeof x.rango).toBe("string");
        expect(Object.keys(ESTADOS)).toContain(x.estado);
        expect(x.tono).toBe(ESTADOS[x.estado].tono);
        // Las filas que SÍ leen una tabla llevan la etiqueta del estado; las que no
        // —h/B, la baja altura, θ en franjas— traen la suya y quedan marcadas como tal.
        if (x.deTabla) expect(x.etiqueta).toBe(ESTADOS[x.estado].label);
        else expect(x.etiqueta).not.toBe(ESTADOS[x.estado].label);
        expect(x.detalle.length).toBeGreaterThan(40);
        expect(x.ref).toMatch(/Figura 2\.4-1|Art\. 1\./);
      }
    }
  });
});
