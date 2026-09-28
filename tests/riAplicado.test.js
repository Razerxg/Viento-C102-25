// R_i — LA REDUCCIÓN POR GRAN VOLUMEN, APLICADA DE VERDAD.
//
// ⚠ DURANTE UN TIEMPO `R_i` SE CALCULABA, SE MOSTRABA Y NO SE APLICABA. La pantalla de
// Cerramiento informaba R_i = 0,9327 y las presiones se seguían calculando con ±0,55 en
// vez de ±0,513. Las dos cosas son defendibles por separado —adoptar 1,0 es admisible y
// conservador— pero juntas la pantalla se contradecía a sí misma: el número estaba a la
// vista y no era el que se usó.
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES } from '../src/engine/edificio.js';
import { resultantes } from '../src/engine/resultantes.js';
import { estadosDeCarga, envolventeCritica } from '../src/engine/envolvente.js';
import { ri, riAplicado, gcpiDe, MODOS_RI } from '../src/constants/presionInterna.js';
import { clasificar } from '../src/engine/cerramiento.js';
import { csvPresiones, jsonPresiones, cerramientoDe } from '../src/lib/exportar.js';

const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false,
  puntosPerfil: 6 };
const GEO = { a: "20", b: "30", hAlero: "6", theta: "0", tipo: "plana", cumbrera: "X" };
const mk = (gcpi, ri_) => DIRECCIONES.map(d => analizarDireccion(
  { geo: GEO, sitio: SITIO, cerramiento: "parc_cerrado", G: 0.85, gcpi, ri: ri_ }, d));

describe('las dos vías del art. 1.11.1', () => {
  it('son dos y por defecto va 1,0', () => {
    expect(MODOS_RI.map(x => x.id)).toEqual(["uno", "expresion"]);
    expect(MODOS_RI[0].valor).toBe(1.0);
    expect(riAplicado()).toBe(1.0);
    expect(riAplicado({ modo: "uno", calculado: 0.8 })).toBe(1.0);
  });

  it('con la expresión adoptada se aplica lo que dio la expresión', () => {
    expect(riAplicado({ modo: "expresion", calculado: 0.9327 })).toBe(0.9327);
  });

  // La expresión sólo interviene en parcialmente cerrados. En el resto no hay nada que
  // reducir, y `null` NO es lo mismo que 1,0: uno dice «no aplica» y el otro «aplica y
  // da 1». Si se confundieran, un edificio cerrado podría llevarse una reducción.
  it('sin valor calculado se cae a 1,0 aunque se pida la expresión', () => {
    expect(riAplicado({ modo: "expresion", calculado: null })).toBe(1.0);
    expect(riAplicado({ modo: "expresion" })).toBe(1.0);
  });
});

describe('el GC_pi que llega a las presiones', () => {
  const Ri = 0.9327;
  const base = gcpiDe("parc_cerrado");

  it('con R_i = 1,0 nada cambia respecto de la Tabla 1.11-1', () => {
    const conRi = mk(base * 1.0, { modo: "uno", calculado: Ri, aplicado: 1.0 });
    const sinNada = DIRECCIONES.map(d => analizarDireccion(
      { geo: GEO, sitio: SITIO, cerramiento: "parc_cerrado", G: 0.85 }, d));
    for (let i = 0; i < 4; i++) {
      expect(conRi[i].GCpi).toBe(sinNada[i].GCpi);
      expect(conRi[i].superficies.map(s => s.conInternaPos))
        .toEqual(sinNada[i].superficies.map(s => s.conInternaPos));
    }
  });

  // La presión interna de una superficie es q_i·|GC_pi| = q_i·0,55·R_i.
  it('con la expresión, la presión interna de cada superficie es 0,55·R_i·q_i', () => {
    const an = mk(base * Ri, { modo: "expresion", calculado: Ri, aplicado: Ri })[0];
    expect(an.GCpi).toBeCloseTo(0.55 * Ri, 12);
    expect(an.GCpiTabla).toBeCloseTo(0.55, 12);
    for (const s of an.superficies) {
      if (s.tramos) {
        for (const t of s.tramos)
          expect(t.conInternaNeg - t.externa).toBeCloseTo(an.qh * 0.55 * Ri, 9);
        continue;
      }
      expect(s.conInternaNeg - s.externa).toBeCloseTo(an.qh * 0.55 * Ri, 9);
      expect(s.externa - s.conInternaPos).toBeCloseTo(an.qh * 0.55 * Ri, 9);
    }
  });

  it('la presión externa NO cambia: R_i sólo toca la interna', () => {
    const uno = mk(base, { modo: "uno", calculado: Ri, aplicado: 1 })[0];
    const exp = mk(base * Ri, { modo: "expresion", calculado: Ri, aplicado: Ri })[0];
    expect(exp.superficies.map(s => s.externa)).toEqual(uno.superficies.map(s => s.externa));
  });

  it('el corte no cambia y el levantamiento sí', () => {
    // La presión interna se cancela en las paredes —actúa por igual sobre barlovento y
    // sotavento— y no en la cubierta. Es la sutileza 1 de `resultantes.js`, y sirve de
    // control cruzado: si R_i moviera el corte, estaría entrando donde no va.
    const uno = resultantes(mk(base, { modo: "uno", calculado: Ri, aplicado: 1 })[0]);
    const exp = resultantes(mk(base * Ri, { modo: "expresion", calculado: Ri, aplicado: Ri })[0]);
    expect(exp.cortante).toBeCloseTo(uno.cortante, 9);
    expect(Math.abs(exp.levantamiento)).toBeLessThan(Math.abs(uno.levantamiento));
  });
});

describe('el R_i aplicado llega a la envolvente', () => {
  const Ri = 0.9327, base = gcpiDe("parc_cerrado");
  const envDe = (gcpi, ri_) => envolventeCritica(estadosDeCarga({
    analizar: analizarDireccion,
    entrada: { geo: GEO, sitio: SITIO, cerramiento: "parc_cerrado", G: 0.85, gcpi, ri: ri_ },
  }));

  it('el levantamiento de la envolvente baja con la expresión', () => {
    const uno = envDe(base, { modo: "uno", calculado: Ri, aplicado: 1 });
    const exp = envDe(base * Ri, { modo: "expresion", calculado: Ri, aplicado: Ri });
    expect(Math.abs(exp.levantamiento.valor)).toBeLessThan(Math.abs(uno.levantamiento.valor));
    // Y el corte no: la presión interna se cancela en las paredes.
    expect(exp.cortante.valor).toBeCloseTo(uno.cortante.valor, 6);
  });
});

describe('la traza dice cuál se aplicó', () => {
  const Ri = 0.9327, base = gcpiDe("parc_cerrado");
  const paso = (an) => an.traza.find(x => x.simbolo === "GC_pi");

  it('con 1,0 informa el valor de la expresión como NO aplicado', () => {
    const t = paso(mk(base, { modo: "uno", calculado: Ri, aplicado: 1 })[0]);
    expect(t.detalle).toMatch(/R_i = 1,0/);
    expect(t.detalle).toMatch(/0,9327/);
    expect(t.detalle).toMatch(/no aplicado/);
    // Cita la TABLA, no la expresión: la expresión se evaluó pero no entró al cálculo.
    expect(t.ref).toBe("Tabla 1.11-1");
    expect(t.ref).not.toMatch(/expresión/);
  });

  it('con la expresión informa el factor y cita el artículo', () => {
    const t = paso(mk(base * Ri, { modo: "expresion", calculado: Ri, aplicado: Ri })[0]);
    expect(t.ref).toMatch(/\(1\.11-1\)/);
    expect(t.detalle).toMatch(/reducido por R_i = 0,9327/);
    expect(t.texto).toBe("±0,513");
  });

  it('donde la expresión no interviene lo dice, en vez de informar un 1,0 pelado', () => {
    const t = paso(DIRECCIONES.map(d => analizarDireccion({ geo: GEO, sitio: SITIO,
      cerramiento: "cerrado", G: 0.85, gcpi: 0.18,
      ri: { modo: "uno", calculado: null, aplicado: 1 } }, d))[0]);
    expect(t.detalle).toMatch(/no interviene en esta clasificación/);
  });
});

describe('las salidas dicen qué GC_pi se usó', () => {
  const Ri = 0.9327;
  const cerr = { efectiva: "parc_cerrado", modo: "calculado", gcpiTabla: 0.55,
    gcpi: 0.55 * Ri, modoRi: "expresion", Ri, RiAplicado: Ri, Vi: 3600 };
  const TODAS = mk(0.55 * Ri, { modo: "expresion", calculado: Ri, aplicado: Ri });

  it('el bloque de cerramiento del JSON trae el R_i y los dos GC_pi', () => {
    const c = jsonPresiones({ todas: TODAS, cerramiento: cerr }).cerramiento;
    expect(c.clasificacion).toBe("parc_cerrado");
    expect(c.gcpiTabla).toBe(0.55);
    expect(c.gcpiAplicado).toBeCloseTo(0.55 * Ri, 12);
    expect(c.Ri).toEqual({ modo: "expresion", calculado: Ri, aplicado: Ri,
      ref: "Art. 1.11.1 · expresión (1.11-1)" });
  });

  it('la clasificación pelada sigue funcionando, sin inventar un R_i', () => {
    expect(cerramientoDe("cerrado")).toEqual({ clasificacion: "cerrado" });
    expect(cerramientoDe(null)).toBe(null);
  });

  // Sin el GC_pi, las dos columnas de presión interna del CSV no se pueden reproducir: el
  // que lo reciba va a rehacerlas con el ±0,55 de tabla, que el cálculo nunca usó.
  it('la cabecera del CSV informa el GC_pi aplicado y su R_i', () => {
    const c = csvPresiones({ todas: TODAS, cerramiento: cerr });
    expect(c).toContain("# Cerramiento: parc_cerrado");
    expect(c).toContain("# GC_pi aplicado: ±0.5130");
    expect(c).toContain("(tabla ±0.55");
    expect(c).toContain("R_i = 0.9327");
    expect(c).toContain("expresión (1.11-1)");
  });

  it('con R_i = 1,0 la cabecera lo dice igual, citando el art. 1.11.1', () => {
    const c = csvPresiones({ todas: mk(0.55, { modo: "uno", calculado: Ri, aplicado: 1 }),
      cerramiento: { ...cerr, gcpi: 0.55, modoRi: "uno", RiAplicado: 1 } });
    expect(c).toContain("R_i = 1.0000, art. 1.11.1");
  });
});

describe('el caso real del galpón de 20 × 30', () => {
  // Es el caso que destapó el problema: una puerta abierta, R_i = 0,9327 informado y
  // ±0,55 aplicado.
  it('una abertura dominante da un R_i menor que 1', () => {
    const geo = { a: 20, b: 30, hAlero: 6, theta: 0, tipo: "plana", cumbrera: "X", h: 6 };
    // Una puerta que SE CONSIDERA ABIERTA durante el viento de diseño: es la hipótesis
    // que hace parcialmente cerrado al galpón, y la que destapó el problema.
    const cl = clasificar({ geo, riesgo: "II", aberturas: [
      { superficie: "X-", tipo: "operable", ancho: "4", alto: "4",
        abiertaEnDiseno: true }] });
    expect(cl.clasificacion).toBe("parc_cerrado");
    expect(cl.Ri).toBeLessThan(1);
    expect(cl.Ri).toBeGreaterThan(0.5);
    // Y coincide con la expresión evaluada a mano sobre los mismos datos.
    expect(cl.Ri).toBeCloseTo(ri(cl.Vi, cl.AogTotal), 12);
  });
});
