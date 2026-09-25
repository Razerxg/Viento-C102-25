// LA MALLA 3D DEL EDIFICIO.
//
// El croquis anterior dibujaba siempre un prisma de tapa plana, así que un galpón a dos
// aguas de 30° se veía como una caja. Esto se testea acá y no mirando el dibujo, porque
// un techo mal levantado se ve «casi bien» y nadie lo nota salvo comparando con el
// formulario.
import { describe, it, expect } from 'vitest';
import { mallaEdificio, proyector, normal, carasVisibles } from '../src/lib/volumen3d.js';

const G = { a: 20, b: 30, hAlero: 6, hCumbre: 11, cumbrera: "X", pendienteHacia: "+Y" };
const tipos = ["plana", "vertiente_unica", "dos_aguas", "cuatro_aguas"];
const malla = (o) => mallaEdificio({ ...G, ...o });

describe('geometría de la malla', () => {
  it('la cubierta plana tiene una sola cara de techo, horizontal', () => {
    const m = malla({ tipo: "plana", hCumbre: 6 });
    const cub = m.caras.filter(c => c.tipo === "cubierta");
    expect(cub).toHaveLength(1);
    for (const i of cub[0].v) expect(m.V[i][2]).toBe(6);
  });

  it('el caballete tiene DOS faldones y una cumbrera a la altura declarada', () => {
    const m = malla({ tipo: "dos_aguas" });
    expect(m.caras.filter(c => c.tipo === "cubierta")).toHaveLength(2);
    expect(m.V.filter(v => Math.abs(v[2] - 11) < 1e-9)).toHaveLength(2);
  });

  // La cumbrera corre PARALELA al eje declarado. Si se armara perpendicular, el croquis
  // mostraría el caballete girado 90° respecto del cálculo.
  it('la cumbrera corre paralela al eje declarado', () => {
    const x = malla({ tipo: "dos_aguas", cumbrera: "X" });
    const cx = x.V.filter(v => Math.abs(v[2] - 11) < 1e-9);
    expect(cx.map(v => v[1])).toEqual([15, 15]);          // y constante ⇒ corre según X
    const y = malla({ tipo: "dos_aguas", cumbrera: "Y" });
    const cy = y.V.filter(v => Math.abs(v[2] - 11) < 1e-9);
    expect(cy.map(v => v[0])).toEqual([10, 10]);          // x constante ⇒ corre según Y
  });

  // UN AGUA: se levanta el borde OPUESTO a aquel hacia el que desciende la pendiente. Al
  // revés, el techo queda espejado y no hay forma de notarlo mirando el dibujo.
  it.each([["+Y", 1, 0], ["-Y", 1, 30], ["+X", 0, 0], ["-X", 0, 20]])(
    'un agua que desciende hacia %s levanta el borde opuesto', (hacia, eje, coord) => {
      const m = malla({ tipo: "vertiente_unica", pendienteHacia: hacia });
      const altos = m.V.filter(v => Math.abs(v[2] - 11) < 1e-9);
      expect(altos).toHaveLength(2);
      for (const v of altos) expect(v[eje]).toBe(coord);
    });

  it('un agua tiene una sola cara de cubierta, inclinada', () => {
    const m = malla({ tipo: "vertiente_unica" });
    const cub = m.caras.filter(c => c.tipo === "cubierta");
    expect(cub).toHaveLength(1);
    const zs = cub[0].v.map(i => m.V[i][2]);
    expect(new Set(zs).size).toBe(2);                     // dos alturas: alero y cumbrera
  });

  // Los tímpanos son pentágonos: cuatro vértices no alcanzan para cerrar una pared que
  // sube hasta la cumbrera.
  it('con caballete, los tímpanos tienen cinco vértices', () => {
    const m = malla({ tipo: "dos_aguas", cumbrera: "X" });
    const timp = m.caras.filter(c => c.tipo === "pared" && c.v.length === 5);
    expect(timp).toHaveLength(2);
    expect(timp.map(c => c.id).sort()).toEqual(["x0", "xa"]);
  });

  it.each(tipos)('%s: ninguna cara queda degenerada', (tipo) => {
    const m = malla({ tipo, hCumbre: tipo === "plana" ? 6 : 11 });
    for (const c of m.caras) {
      const n = normal(c.v.map(i => m.V[i]));
      expect(Math.hypot(...n)).toBeCloseTo(1, 9);
      expect(new Set(c.v).size).toBe(c.v.length);         // sin vértices repetidos
    }
  });
});

describe('proyección y visibilidad', () => {
  const pr = (ac = 0.7, el = 0.5) => {
    const m = malla({ tipo: "dos_aguas" });
    const p = proyector({ acimut: ac, elevacion: el, escala: 10, centro: [10, 15, 5] });
    return { m, p, vis: carasVisibles(m, p) };
  };

  // Desde arriba siempre se ve la cubierta, y nunca el piso: es la comprobación mínima de
  // que las normales apuntan hacia afuera y no hacia adentro.
  it('desde arriba se ven las dos faldas y ninguna cara del piso', () => {
    const { vis } = pr(0.7, 0.9);
    expect(vis.filter(c => c.tipo === "cubierta").length).toBeGreaterThan(0);
    for (const c of vis) expect(c.n[2]).toBeGreaterThan(-0.99);
  });

  it('nunca se ve más de la mitad de las caras a la vez', () => {
    const m = malla({ tipo: "dos_aguas" });
    for (const ac of [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6]) {
      const p = proyector({ acimut: ac, elevacion: 0.5, escala: 10, centro: [10, 15, 5] });
      const vis = carasVisibles(m, p);
      expect(vis.length).toBeLessThanOrEqual(Math.ceil(m.caras.length / 2) + 1);
      expect(vis.length).toBeGreaterThan(1);
    }
  });

  // El pintor: las caras salen de atrás hacia adelante, así que dibujarlas en ese orden
  // resuelve la oclusión sin z-buffer.
  it('las caras visibles vienen ordenadas de atrás hacia adelante', () => {
    const { vis } = pr();
    for (let i = 1; i < vis.length; i++) expect(vis[i].z).toBeGreaterThanOrEqual(vis[i - 1].z);
  });

  // ⚠ EL TEST QUE FALTABA, y que habría atajado un edificio plegado sobre sí mismo.
  // `v` es coordenada de SVG y crece hacia ABAJO, así que TODO lo que se aleja del
  // observador hacia arriba en el espacio de la cámara tiene que dar `v` menor: tanto
  // subir en z como alejarse en planta. Una versión anterior negaba sólo el término de z,
  // de modo que el plano horizontal quedaba espejado respecto del vertical.
  it('alejarse en planta y subir en altura dibujan los dos HACIA ARRIBA', () => {
    const p = proyector({ acimut: 0, elevacion: 0.5, escala: 1, centro: [0, 0, 0] });
    const v = (pt) => p.proy(pt)[1];
    expect(v([0, 1, 0])).toBeLessThan(v([0, 0, 0]));      // más lejos ⇒ más arriba
    expect(v([0, 0, 1])).toBeLessThan(v([0, 0, 0]));      // más alto ⇒ más arriba
  });

  it('con elevación nula el plano horizontal se ve de canto', () => {
    const p = proyector({ acimut: 0, elevacion: 0, escala: 1, centro: [0, 0, 0] });
    expect(p.proy([0, 5, 0])[1]).toBeCloseTo(0, 9);       // la profundidad no sube ni baja
    expect(p.proy([0, 0, 1])[1]).toBeCloseTo(-1, 9);      // la altura sí
  });

  it('la proyección conserva el paralelismo: es ortográfica, no perspectiva', () => {
    const { m, p } = pr();
    // dos aristas paralelas del zócalo tienen que proyectarse paralelas
    const d = (i, j) => { const A = p.proy(m.V[i]), B = p.proy(m.V[j]); return [B[0]-A[0], B[1]-A[1]]; };
    const u = d(0, 1), v = d(3, 2);
    expect(u[0] * v[1] - u[1] * v[0]).toBeCloseTo(0, 9);
  });
});
