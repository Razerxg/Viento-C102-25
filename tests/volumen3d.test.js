// LA MALLA 3D DEL EDIFICIO.
//
// El croquis anterior dibujaba siempre un prisma de tapa plana, así que un galpón a dos
// aguas de 30° se veía como una caja. Esto se testea acá y no mirando el dibujo, porque
// un techo mal levantado se ve «casi bien» y nadie lo nota salvo comparando con el
// formulario.
import { describe, it, expect } from 'vitest';
import { mallaEdificio, normal, carasVisibles } from '../src/lib/volumen3d.js';
import { camara, encuadre } from '../src/lib/camara3d.js';

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

  // UN SÓLIDO CERRADO tiene cada arista compartida por EXACTAMENTE dos caras. Es el
  // invariante que detecta una cara faltante —el piso, que no estaba y hacía que la vista
  // desde abajo mostrara el interior— o una repetida, sin depender de mirar el dibujo.
  it.each(tipos)('%s: el sólido está cerrado — cada arista en dos caras', (tipo) => {
    const m = malla({ tipo, hCumbre: tipo === "plana" ? 6 : 11 });
    const cuenta = new Map();
    for (const c of m.caras) {
      for (let i = 0; i < c.v.length; i++) {
        const a = c.v[i], b = c.v[(i + 1) % c.v.length];
        const k = a < b ? `${a}-${b}` : `${b}-${a}`;
        cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
      }
    }
    for (const [arista, n] of cuenta) expect(`${arista}:${n}`).toBe(`${arista}:2`);
  });

  it.each(tipos)('%s: hay piso, y su normal mira hacia abajo', (tipo) => {
    const m = malla({ tipo, hCumbre: tipo === "plana" ? 6 : 11 });
    const piso = m.caras.filter(c => c.tipo === "piso");
    expect(piso).toHaveLength(1);
    expect(normal(piso[0].v.map(i => m.V[i]))[2]).toBeCloseTo(-1, 9);
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
  const pr = (yaw = 0.7, pitch = 0.5) => {
    const m = malla({ tipo: "dos_aguas" });
    const p = camara(yaw, pitch);
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
      const p = camara(ac, 0.5);
      const vis = carasVisibles(m, p);
      expect(vis.length).toBeLessThanOrEqual(Math.ceil(m.caras.length / 2) + 1);
      expect(vis.length).toBeGreaterThan(1);
    }
  });

  // El pintor: las caras salen de atrás hacia adelante, así que dibujarlas en ese orden
  // resuelve la oclusión sin z-buffer.
  it('las caras visibles vienen ordenadas de atrás hacia adelante', () => {
    const { vis } = pr();
    for (let i = 1; i < vis.length; i++) expect(vis[i].cerca).toBeGreaterThanOrEqual(vis[i - 1].cerca);
  });

  // ⚠ EL TEST QUE FALTABA, y que habría atajado un edificio plegado sobre sí mismo.
  //
  // `proy` y `cerca` tienen que contar la MISMA historia: lo que está más cerca del
  // observador se dibuja más abajo en pantalla, y lo que está más alto se dibuja más
  // arriba. Una versión anterior de esta app negaba sólo el término de z, de modo que el
  // plano horizontal quedaba espejado respecto del vertical y el edificio salía plegado
  // sobre sí mismo.
  //
  // Se formula como invariante entre las DOS funciones y no suponiendo de qué lado está el
  // observador: la primera versión de este test daba por sentado que estaba en −Y y
  // fallaba contra una cámara correcta, que es la forma más fácil de «arreglar» lo bueno.
  it.each([[0], [1.1], [2.5], [4.0], [5.4]])(
    'yaw %s: lo más cercano se dibuja más abajo y lo más alto más arriba', (yaw) => {
      const p = camara(yaw, 0.5);
      const pts = [[3, 1, 0], [-2, 4, 0], [1, -3, 0], [0, 0, 0]];
      for (const a of pts) for (const b of pts) {
        if (p.cerca(...a) - p.cerca(...b) > 1e-9) {
          expect(p.proy(...a)[1]).toBeGreaterThan(p.proy(...b)[1]);
        }
      }
      expect(p.proy(0, 0, 1)[1]).toBeLessThan(p.proy(0, 0, 0)[1]);
    });

  it('con elevación nula el plano horizontal se ve de canto', () => {
    const p = camara(0, 0);
    expect(p.proy(0, 5, 0)[1]).toBeCloseTo(0, 9);         // la profundidad no sube ni baja
    expect(p.proy(0, 0, 1)[1]).toBeCloseTo(-1, 9);        // la altura sí
  });

  it('la proyección conserva el paralelismo: es ortográfica, no perspectiva', () => {
    const { m, p } = pr();
    // dos aristas paralelas del zócalo tienen que proyectarse paralelas
    const d = (i, j) => { const A = p.proy(...m.V[i]), B = p.proy(...m.V[j]); return [B[0]-A[0], B[1]-A[1]]; };
    const u = d(0, 1), v = d(3, 2);
    expect(u[0] * v[1] - u[1] * v[0]).toBeCloseTo(0, 9);
  });
});
