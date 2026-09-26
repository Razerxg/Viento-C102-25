// EL TIPO DE CUBIERTA CAMBIA EL RESULTADO, NO SÓLO EL DIBUJO.
//
// La primera versión de la app no tenía tipo de cubierta: al inclinarla asumía SIEMPRE dos
// aguas. Para un galpón a un agua —de los casos más comunes— eso da coeficientes
// equivocados y una altura media que es la mitad del remonte real. El error no se nota,
// porque el resultado sigue siendo un número plausible.
import { describe, it, expect } from 'vitest';
import { normalizarGeo, alturaMedia, remonte, modoCubierta, analizarDireccion,
  DIRECCIONES } from '../src/engine/edificio.js';
import { TIPOS_CUBIERTA, tipoDe } from '../src/constants/cubiertas.js';

const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const ent = (geo) => ({ geo, sitio: SITIO, cerramiento: "cerrado", G: 0.85 });
const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));

describe('remonte y altura media según el tipo', () => {
  // EL FACTOR DOS. En dos aguas la cumbrera está al medio y sube sobre media luz; en
  // vertiente única sube sobre la luz entera.
  it('la vertiente única remonta el doble que el caballete simétrico', () => {
    const g = { theta: 20, a: 20, b: 30, cumbrera: "X" };
    expect(remonte({ ...g, tipo: "vertiente_unica" }))
      .toBeCloseTo(2 * remonte({ ...g, tipo: "dos_aguas" }), 9);
  });

  it('el remonte usa la luz NORMAL a la cumbrera', () => {
    const x = remonte({ tipo: "dos_aguas", theta: 20, a: 20, b: 30, cumbrera: "X" });
    const y = remonte({ tipo: "dos_aguas", theta: 20, a: 20, b: 30, cumbrera: "Y" });
    expect(x).toBeCloseTo((30 / 2) * Math.tan(20 * Math.PI / 180), 9);
    expect(y).toBeCloseTo((20 / 2) * Math.tan(20 * Math.PI / 180), 9);
  });

  it('la altura media de un agua queda por encima de la de dos aguas', () => {
    const g = { hAlero: 6, theta: 20, a: 20, b: 30, cumbrera: "X" };
    expect(alturaMedia({ ...g, tipo: "vertiente_unica" }))
      .toBeGreaterThan(alturaMedia({ ...g, tipo: "dos_aguas" }));
  });

  it('con θ ≤ 10° la altura media es el alero, cualquiera sea el tipo', () => {
    for (const t of TIPOS_CUBIERTA.map(x => x.id)) {
      expect(alturaMedia({ hAlero: 6, theta: 8, a: 20, b: 30, cumbrera: "X", tipo: t })).toBe(6);
    }
  });

  it('θ = 0 en cubierta plana aunque se escriba otro ángulo', () => {
    expect(normalizarGeo({ tipo: "plana", theta: 25, a: 20, b: 30, hAlero: 6 }).theta).toBe(0);
  });

  // Sin tipo declarado se INFIERE del ángulo. Caer a «plana» descartaría en silencio el
  // ángulo escrito, que es exactamente el modo de falla que este proyecto evita.
  it('sin tipo declarado se infiere del ángulo, sin perder el dato', () => {
    expect(normalizarGeo({ theta: 25, a: 20, b: 30, hAlero: 6 }).tipo).toBe("dos_aguas");
    expect(normalizarGeo({ theta: 25, a: 20, b: 30, hAlero: 6 }).theta).toBe(25);
    expect(normalizarGeo({ theta: 0, a: 20, b: 30, hAlero: 6 }).tipo).toBe("plana");
  });
});

describe('modo de tratamiento de la cubierta', () => {
  const geo = (o) => normalizarGeo({ a: 20, b: 30, hAlero: 6, cumbrera: "X", ...o });

  it('por debajo de 10° siempre va por franjas, en toda dirección', () => {
    for (const d of DIRECCIONES) {
      expect(modoCubierta({ geo: geo({ theta: 8, tipo: "dos_aguas" }), dir: d }).modo).toBe("franjas");
    }
  });

  it('con viento paralelo a la cumbrera va por franjas aunque θ sea grande', () => {
    const g = geo({ theta: 30, tipo: "dos_aguas" });      // cumbrera según X
    expect(modoCubierta({ geo: g, dir: D["Wx+"] }).modo).toBe("franjas");
    expect(modoCubierta({ geo: g, dir: D["Wy+"] }).modo).toBe("faldones");
  });

  // NOTA 4 — el hallazgo que motivó todo esto.
  it('la vertiente única NO se parte en faldones: es una sola superficie', () => {
    const g = geo({ theta: 20, tipo: "vertiente_unica", pendienteHacia: "+Y" });
    const m = modoCubierta({ geo: g, dir: D["Wy+"] });
    expect(m.modo).toBe("unica");
    expect(m.motivo).toMatch(/[Nn]ota 4/);
  });

  // Cuál de las dos columnas toma depende de hacia dónde CAE la pendiente respecto del
  // viento. Si desciende hacia +Y y el viento sopla hacia +Y, la cara le da la espalda.
  it('la cara es sotavento si la pendiente cae en el mismo sentido que el viento', () => {
    const g = geo({ theta: 20, tipo: "vertiente_unica", pendienteHacia: "+Y" });
    expect(modoCubierta({ geo: g, dir: D["Wy+"] }).cara).toBe("sotavento");
    expect(modoCubierta({ geo: g, dir: D["Wy-"] }).cara).toBe("barlovento");
  });

  // ⚠ CUATRO AGUAS Y DOS AGUAS COMPARTEN EL TRATAMIENTO, PERO NO NECESARIAMENTE LA MISMA
  // DIRECCIÓN. En dos aguas la cumbrera es dato; en cuatro aguas SALE DEL LADO LARGO, así
  // que con a = 20 y b = 30 la cumbrera va según Y aunque el proyecto diga X. Con eso, la
  // dirección que se trata en faldones se da vuelta: es Wx+, no Wy+.
  it('los dos tipos se tratan en faldones cuando el viento es NORMAL a su cumbrera', () => {
    const dos = geo({ theta: 25, tipo: "dos_aguas" });          // cumbrera declarada: X
    expect(dos.cumbrera).toBe("X");
    expect(modoCubierta({ geo: dos, dir: D["Wy+"] }).modo).toBe("faldones");
    expect(modoCubierta({ geo: dos, dir: D["Wx+"] }).modo).toBe("franjas");

    const cuatro = geo({ theta: 25, tipo: "cuatro_aguas" });    // a = 20 < b = 30
    expect(cuatro.cumbrera).toBe("Y");                          // reorientada al lado largo
    expect(cuatro.cumbreraReorientada).toBe(true);
    expect(modoCubierta({ geo: cuatro, dir: D["Wx+"] }).modo).toBe("faldones");
    expect(modoCubierta({ geo: cuatro, dir: D["Wy+"] }).modo).toBe("franjas");
  });

  it('la pirámide se trata en faldones en las cuatro direcciones', () => {
    const p = normalizarGeo({ a: 25, b: 25, hAlero: 6, theta: 25, tipo: "cuatro_aguas" });
    expect(p.piramide).toBe(true);
    for (const d of DIRECCIONES) {
      expect(modoCubierta({ geo: p, dir: d }).modo, d.id).toBe("faldones");
    }
  });

  it('el motivo siempre viene escrito: es lo que no se puede deducir de un número', () => {
    for (const d of DIRECCIONES) {
      for (const t of ["plana", "vertiente_unica", "dos_aguas"]) {
        const m = modoCubierta({ geo: geo({ theta: t === "plana" ? 0 : 20, tipo: t }), dir: d });
        expect(m.motivo.length).toBeGreaterThan(30);
      }
    }
  });
});

describe('el tipo llega al resultado', () => {
  it('un agua produce UNA superficie de cubierta; dos aguas produce dos faldones', () => {
    const unAgua = analizarDireccion(
      ent({ a: 20, b: 30, hAlero: 6, theta: 20, cumbrera: "X",
        tipo: "vertiente_unica", pendienteHacia: "+Y" }), D["Wy-"]);
    const dosAguas = analizarDireccion(
      ent({ a: 20, b: 30, hAlero: 6, theta: 20, cumbrera: "X", tipo: "dos_aguas" }), D["Wy-"]);
    expect(unAgua.superficies.filter(s => s.id.startsWith("cub_unica")).length).toBeGreaterThan(0);
    expect(unAgua.superficies.some(s => s.id === "cub_sotavento")).toBe(false);
    expect(dosAguas.superficies.some(s => s.id === "cub_sotavento")).toBe(true);
  });

  // La consecuencia numérica: con el mismo alero y el mismo ángulo, el techo a un agua da
  // otra altura media, otro q_h y otras presiones en TODAS las superficies, no sólo en la
  // cubierta. Es el error que la versión anterior cometía en silencio.
  it('a igual alero y ángulo, el tipo cambia q_h y con él toda la pared a sotavento', () => {
    const base = { a: 20, b: 30, hAlero: 6, theta: 25, cumbrera: "X" };
    const uno = analizarDireccion(ent({ ...base, tipo: "vertiente_unica", pendienteHacia: "+Y" }), D["Wy-"]);
    const dos = analizarDireccion(ent({ ...base, tipo: "dos_aguas" }), D["Wy-"]);
    expect(uno.geo.h).toBeGreaterThan(dos.geo.h);
    expect(uno.qh).toBeGreaterThan(dos.qh);
    const p = (r) => r.superficies.find(s => s.id === "pared_sotavento").conInternaNeg;
    expect(Math.abs(p(uno))).toBeGreaterThan(Math.abs(p(dos)));
  });

  it('la mansarda está declarada pero marcada como no implementada', () => {
    expect(tipoDe("mansarda").noImplementada).toBe(true);
  });
});

describe('la traza de decisiones', () => {
  const r = analizarDireccion(ent({ a: 20, b: 30, hAlero: 6, theta: 25, cumbrera: "X",
    tipo: "dos_aguas" }), D["Wy+"]);

  it('cubre los parámetros que entran en la presión dinámica', () => {
    const sim = r.traza.map(t => t.simbolo);
    for (const s of ["V", "K_d", "K_h", "K_zt(h)", "K_e", "q_h", "G", "GC_pi"]) {
      expect(sim).toContain(s);
    }
  });

  // Cada paso tiene que decir DE DÓNDE sale. Un valor sin referencia no se puede revisar,
  // y una herramienta que obliga a confiar en ella pide exactamente lo contrario de lo que
  // debería.
  it('cada paso trae su referencia al reglamento y su explicación', () => {
    for (const t of r.traza) {
      expect(t.ref).toBeTruthy();
      expect(t.detalle.length).toBeGreaterThan(20);
    }
  });

  it('cada superficie dice de qué fila de la figura sale su Cp', () => {
    for (const s of r.superficies) {
      expect(s.cpRef).toBeTruthy();
      expect(s.cpRef).toMatch(/Figura 2\.4-1/);
    }
  });
});
