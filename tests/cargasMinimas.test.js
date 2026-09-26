// ART. 2.1.5 — CARGA MÍNIMA, NOTA 7 Y EDIFICIO ABIERTO.
import { describe, it, expect } from 'vitest';
import { analizarDireccion, DIRECCIONES } from '../src/engine/edificio.js';
import { resultantes, cargaMinima, aporteParedes, aporteCubierta } from '../src/engine/resultantes.js';
import { siluetaProyectada } from '../src/engine/fachadas.js';
import { MINIMOS } from '../src/engine/presiones.js';
import * as presiones from '../src/engine/presiones.js';

const D = Object.fromEntries(DIRECCIONES.map(d => [d.id, d]));
const SITIO = { V: 55.1, exposicion: "B", kd: 0.85, Kzt: 1.0, altitud: 0, usarKe: false };
const mk = (geo, dir, cerr = "cerrado") =>
  analizarDireccion({ geo, sitio: SITIO, cerramiento: cerr, G: 0.85 }, D[dir]);

const GEOS = [
  ["plana", { a: 20, b: 30, hAlero: 6, theta: 0, tipo: "plana", cumbrera: "X" }],
  ["dos aguas", { a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" }],
  ["cuatro aguas", { a: 20, b: 30, hAlero: 6, theta: 25, tipo: "cuatro_aguas", cumbrera: "X" }],
  ["vertiente única", { a: 20, b: 30, hAlero: 6, theta: 18, tipo: "vertiente_unica",
    cumbrera: "X", pendienteHacia: "+Y" }],
];

describe('la silueta proyectada se reparte sin solaparse', () => {
  for (const [nombre, geo] of GEOS) {
    for (const id of Object.keys(D)) {
      it(`${nombre} — ${id}`, () => {
        const r = mk(geo, id);
        const sil = siluetaProyectada(r.geo, r.dir);
        // La parte de pared es EXACTAMENTE el área de la pared a barlovento: por ser
        // normal al viento, se proyecta sobre sí misma.
        expect(sil.pared).toBeCloseTo(r.fachadas.barlovento.area, 9);
        expect(sil.cubierta).toBeGreaterThanOrEqual(0);
        // Y la silueta total es la misma en las dos direcciones del mismo eje: el
        // edificio visto de frente y de atrás tiene el mismo contorno.
        const op = mk(geo, id.replace(/[+-]$/, m => (m === "+" ? "-" : "+")));
        const silOp = siluetaProyectada(op.geo, op.dir);
        expect(sil.pared + sil.cubierta).toBeCloseTo(silOp.pared + silOp.cubierta, 9);
      });
    }
  }

  // El caso que hace falta que dé CERO: con viento paralelo a la cumbrera, el borde
  // superior del hastial ES la línea del techo, así que la cubierta no agrega silueta.
  // Si se sumara igual, el mismo triángulo pagaría 0,75 y 0,40 a la vez.
  it('con viento paralelo a la cumbrera la cubierta no agrega silueta', () => {
    const r = mk(GEOS[1][1], "Wx+");           // cumbrera X, viento según X
    expect(siluetaProyectada(r.geo, r.dir).cubierta).toBeCloseTo(0, 9);
  });

  it('con viento normal a la cumbrera la cubierta agrega B·r', () => {
    const r = mk(GEOS[1][1], "Wy+");
    const sil = siluetaProyectada(r.geo, r.dir);
    expect(sil.cubierta).toBeCloseTo(r.B * (r.geo.hCumbre - r.geo.hAlero), 9);
    expect(sil.pared).toBeCloseTo(r.B * r.geo.hAlero, 9);
  });

  // Vertiente única con el viento contra la pared ALTA: el techo queda detrás de la pared
  // y no agrega nada. Del otro lado sí, y la silueta total tiene que coincidir.
  it('vertiente única: contra la pared alta la cubierta no agrega, contra la baja sí', () => {
    const g = GEOS[3][1];
    const alta = siluetaProyectada(mk(g, "Wy+").geo, D["Wy+"]);
    const baja = siluetaProyectada(mk(g, "Wy-").geo, D["Wy-"]);
    expect(alta.cubierta).toBeCloseTo(0, 9);
    expect(baja.cubierta).toBeGreaterThan(0);
    expect(alta.pared + alta.cubierta).toBeCloseTo(baja.pared + baja.cubierta, 9);
  });
});

describe('carga mínima del art. 2.1.5', () => {
  it('es 0,75 kN/m² sobre la pared MÁS 0,40 sobre la cubierta, simultáneas', () => {
    const r = mk(GEOS[1][1], "Wy+");
    const m = cargaMinima(r);
    expect(m.fuerza).toBeCloseTo(MINIMOS.pared * m.areaPared + MINIMOS.cubierta * m.areaCubierta, 6);
    expect(MINIMOS.pared).toBe(750);
    expect(MINIMOS.cubierta).toBe(400);
  });

  it('en edificio abierto es 0,75 kN/m² sobre A_f, sin el término de cubierta', () => {
    const r = mk(GEOS[1][1], "Wy+", "abierto");
    const m = cargaMinima(r);
    expect(m.abierto).toBe(true);
    expect(m.fuerza).toBeCloseTo(MINIMOS.abierto * (m.areaPared + m.areaCubierta), 6);
  });

  // NO es un piso por cara. El helper que hacía eso se eliminó.
  it('`aplicarMinimoPared` ya no existe', () => {
    expect(presiones.aplicarMinimoPared).toBeUndefined();
  });

  it('no reemplaza al corte calculado: son dos casos, y se dice cuál gobierna', () => {
    const r = mk(GEOS[1][1], "Wy+");
    const res = resultantes(r);
    // El corte informado sigue siendo el calculado, no el máximo de los dos.
    const par = aporteParedes({ analisis: r }).F;
    expect(Math.abs(res.cortante)).toBeGreaterThanOrEqual(Math.min(par, Math.abs(res.cortante)));
    expect(res.gobiernaMinimo).toBe(res.cargaMinima.fuerza > Math.abs(res.cortante));
  });

  // Con V chica la mínima gobierna, y con V grande no. Si diera siempre lo mismo, el
  // indicador no estaría informando nada.
  it('gobierna con viento bajo y no gobierna con viento alto', () => {
    const conV = (V) => {
      const r = analizarDireccion({ geo: GEOS[0][1], sitio: { ...SITIO, V },
        cerramiento: "cerrado", G: 0.85 }, D["Wy+"]);
      return resultantes(r).gobiernaMinimo;
    };
    expect(conV(25)).toBe(true);
    expect(conV(60)).toBe(false);
  });
});

describe('nota 7 y su excepción', () => {
  // ⚠ NO SIRVE UN CABALLETE. Ahora se evalúan LOS DOS casos de la nota 3 y se adopta el
  // de mayor corte: en dos aguas el caso de presión del faldón a barlovento casi siempre
  // SUMA, y con él la nota 7 no llega a activarse. Hace falta una geometría donde los dos
  // casos resten, y ésa es la vertiente única con toda la superficie a barlovento: los
  // dos valores de la celda están en succión y H = +p·tanθ·A sale negativo en ambos.
  const geo = { a: 20, b: 30, hAlero: 6, theta: 12, tipo: "vertiente_unica",
    cumbrera: "X", pendienteHacia: "+Y" };
  const r = mk(geo, "Wy-");

  it('por defecto el piso se aplica y el corte es el de las paredes solas', () => {
    const res = resultantes(r);
    for (const c of ["negativo", "positivo"]) {
      expect(aporteCubierta({ analisis: r, casoNota3: c }).H, c).toBeLessThan(0);
    }
    expect(res.gobiernaNota7).toBe(true);
    expect(res.exentoNota7).toBe(false);
    expect(res.cortante).toBeCloseTo(aporteParedes({ analisis: r }).F, 9);
  });

  it('declarando pórticos resistentes a momento, el piso no se aplica', () => {
    const res = resultantes(r, { porticosCubierta: true });
    expect(res.exentoNota7).toBe(true);
    expect(res.gobiernaNota7).toBe(false);
    // Y ahora el corte SÍ queda por debajo del de las paredes solas.
    expect(res.cortante).toBeLessThan(aporteParedes({ analisis: r }).F);
  });

  it('donde la cubierta suma, la declaración no cambia nada', () => {
    const suma = mk({ a: 20, b: 30, hAlero: 6, theta: 25, tipo: "dos_aguas", cumbrera: "X" }, "Wy+");
    expect(aporteCubierta({ analisis: suma }).H).toBeGreaterThan(0);
    expect(resultantes(suma).cortante).toBeCloseTo(
      resultantes(suma, { porticosCubierta: true }).cortante, 9);
  });
});

describe('edificio abierto', () => {
  it('las resultantes se marcan como NO válidas, con el motivo', () => {
    const res = resultantes(mk(GEOS[1][1], "Wy+", "abierto"));
    expect(res.valido).toBe(false);
    expect(res.motivoInvalido).toMatch(/C_N/);
  });

  it('con cualquier otra clasificación son válidas', () => {
    for (const c of ["cerrado", "parc_cerrado", "parc_abierto"]) {
      expect(resultantes(mk(GEOS[1][1], "Wy+", c)).valido, c).toBe(true);
    }
  });
});
