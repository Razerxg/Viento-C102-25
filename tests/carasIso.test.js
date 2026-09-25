// LA SELECCIÓN DE CARAS DE LA ISOMÉTRICA.
//
// Este archivo existe por un bug que el build no detectó, los tests no detectaban y que
// sólo se vio abriendo el croquis: barlovento salía como un triángulo degenerado contra el
// borde. La causa fue espejar las coordenadas del modelo y dejar los índices de cara
// apuntando a la posición original, de modo que la cara que el espejado mandaba atrás era
// justo la que se dibujaba como visible.
import { describe, it, expect } from 'vitest';
import { carasIso } from '../src/lib/carasIso.js';

// (0,0,0) (a,0,0) (a,b,0) (0,b,0) (0,0,h) (a,0,h) (a,b,h) (0,b,h)
const V = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const CASOS = [
  ["Wx+", { ejeX: true,  pos: true }],
  ["Wx-", { ejeX: true,  pos: false }],
  ["Wy+", { ejeX: false, pos: true }],
  ["Wy-", { ejeX: false, pos: false }],
];
// coordenada del vértice `i` DESPUÉS del espejado
const esp = (i, { mirX, mirY }) => {
  const [x, y, z] = V[i];
  return [mirX ? 1 - x : x, mirY ? 1 - y : y, z];
};

describe('caras visibles de la isométrica', () => {
  // LA AFIRMACIÓN QUE HABRÍA ATAJADO EL BUG. Una cara es visible si, ya espejada, queda
  // apoyada sobre x = a (o sobre y = b). Si los índices apuntan a la posición original,
  // sus cuatro vértices caen en x = 0 y esto falla.
  it.each(CASOS)('%s: la pared de x=a tiene sus cuatro vértices en x = a tras espejar', (id, d) => {
    const c = carasIso(d);
    for (const i of c.carXa) expect(esp(i, c)[0]).toBe(1);
  });

  it.each(CASOS)('%s: la pared de y=b tiene sus cuatro vértices en y = b tras espejar', (id, d) => {
    const c = carasIso(d);
    for (const i of c.carYb) expect(esp(i, c)[1]).toBe(1);
  });

  // Una cara degenerada es un polígono con área nula. Con los cuatro vértices sobre un
  // plano y recorridos en orden, el área en ese plano tiene que ser la unidad.
  it.each(CASOS)('%s: ninguna cara es degenerada', (id, d) => {
    const c = carasIso(d);
    const area = (idx, ejes) => {
      const p = idx.map(i => ejes.map(e => esp(i, c)[e]));
      let s = 0;
      for (let k = 0; k < p.length; k++) {
        const m = (k + 1) % p.length;
        s += p[k][0] * p[m][1] - p[m][0] * p[k][1];
      }
      return Math.abs(s / 2);
    };
    expect(area(c.carXa, [1, 2])).toBe(1);        // se mide en el plano y–z
    expect(area(c.carYb, [0, 2])).toBe(1);        // en el plano x–z
    expect(area(c.cubierta, [0, 1])).toBe(1);     // en planta
  });

  it.each(CASOS)('%s: la cubierta es siempre la cara superior', (id, d) => {
    const c = carasIso(d);
    for (const i of c.cubierta) expect(esp(i, c)[2]).toBe(1);
  });

  // Las dos paredes visibles comparten exactamente una arista: dos vértices.
  it.each(CASOS)('%s: las dos paredes comparten una arista, no una cara', (id, d) => {
    const c = carasIso(d);
    const comunes = c.carXa.filter(i => c.carYb.includes(i));
    expect(comunes).toHaveLength(2);
  });

  // El vértice escondido es el que queda en el origen espejado, y no puede pertenecer a
  // ninguna cara visible: si estuviera, las aristas punteadas cruzarían por encima.
  it.each(CASOS)('%s: el vértice oculto queda en el origen y fuera de toda cara visible', (id, d) => {
    const c = carasIso(d);
    expect(esp(c.oculto, c)).toEqual([0, 0, 0]);
    expect(c.carXa).not.toContain(c.oculto);
    expect(c.carYb).not.toContain(c.oculto);
    expect(c.cubierta).not.toContain(c.oculto);
  });

  // Sus tres vecinos son los que difieren en UNA coordenada: son las tres aristas del cubo
  // que nacen en ese vértice.
  it.each(CASOS)('%s: los tres vecinos del oculto difieren en una sola coordenada', (id, d) => {
    const c = carasIso(d);
    expect(c.vecinos).toHaveLength(3);
    const o = esp(c.oculto, c);
    const dif = c.vecinos.map(v => esp(v, c).filter((x, k) => x !== o[k]).length);
    expect(dif).toEqual([1, 1, 1]);
    expect(new Set(c.vecinos).size).toBe(3);
  });
});
