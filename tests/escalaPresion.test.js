import { describe, it, expect } from 'vitest';
import { colorPresion, tramosLeyenda, paleta, NULO } from '../src/lib/escalaPresion.js';

describe('escala divergente de presión', () => {
  // Lo que la escala tiene que preservar es la POLARIDAD. Si succión y presión cayeran en
  // el mismo tono, el croquis perdería justamente la distinción que lo hace útil.
  it('succión y presión caen en brazos distintos', () => {
    const c = paleta("claro");
    expect(c.succion).toContain(colorPresion(-1000, 1000));
    expect(c.presion).toContain(colorPresion(1000, 1000));
    expect(colorPresion(-1000, 1000)).not.toBe(colorPresion(1000, 1000));
  });

  it('el punto medio es gris neutro, no un tono', () => {
    expect(colorPresion(0, 1000)).toBe(paleta("claro").neutro);
    expect(colorPresion(NULO - 1, 1000)).toBe(paleta("claro").neutro);
    expect(colorPresion(-(NULO - 1), 1000)).toBe(paleta("claro").neutro);
  });

  // Se normaliza contra el máximo del EDIFICIO. Si cada cara se escalara contra sí misma,
  // todas saldrían del paso más intenso y el croquis no diría cuál gobierna.
  it('la intensidad es relativa al máximo del edificio, no al de cada cara', () => {
    const c = paleta("claro");
    expect(colorPresion(-1000, 1000)).toBe(c.succion.at(-1));
    // 1000 sobre 20000 da 0,05: bien adentro del primer paso, sin quedar pegado a un corte.
    // Una versión anterior usaba un valor que caía JUSTO en el borde y volvía el test una
    // lotería de redondeo en vez de una afirmación sobre la escala.
    expect(colorPresion(-1000, 20000)).toBe(c.succion[0]);
  });

  // El borde entre tramos tiene que resolverse igual en la escala y en la leyenda, o un
  // valor limítrofe saldría de un color y la leyenda lo ubicaría en otro.
  it('un valor JUSTO en un corte cae en el paso de arriba', () => {
    const c = paleta("claro");
    const n = c.succion.length;
    for (let i = 1; i < n; i++) {
      expect(colorPresion(-1000 * i / n, 1000), `corte ${i}/${n}`).toBe(c.succion[i]);
    }
  });

  it('es simétrica: dos presiones opuestas usan el mismo paso de su brazo', () => {
    const c = paleta("claro");
    for (const v of [200, 600, 1000]) {
      expect(c.succion.indexOf(colorPresion(-v, 1000)))
        .toBe(c.presion.indexOf(colorPresion(v, 1000)));
    }
  });

  it('no se sale de la escala si la presión supera el máximo declarado', () => {
    expect(colorPresion(5000, 1000)).toBe(paleta("claro").presion.at(-1));
  });

  // El modo oscuro no es la paleta clara dada vuelta: son pasos elegidos contra la otra
  // superficie, y la dirección de luminosidad se invierte a propósito.
  it('el modo oscuro tiene sus propios pasos', () => {
    expect(paleta("oscuro").succion).not.toEqual(paleta("claro").succion);
    expect(paleta("oscuro").neutro).not.toBe(paleta("claro").neutro);
    expect(colorPresion(-1000, 1000, "oscuro")).toBe(paleta("oscuro").succion.at(-1));
  });

  it('la leyenda cubre un tramo por paso de cada brazo más el neutro, sin huecos', () => {
    const c = paleta("claro");
    const t = tramosLeyenda(1200);
    expect(t).toHaveLength(2 * c.succion.length + 1);
    for (let i = 1; i < t.length; i++) expect(t[i].desde).toBeCloseTo(t[i - 1].hasta, 9);
    expect(t.filter(x => x.nulo)).toHaveLength(1);
    expect(t[0].desde).toBe(-1200);
    expect(t.at(-1).hasta).toBe(1200);
  });

  // El color que la leyenda promete para un tramo tiene que ser el que la escala asigna a
  // un valor de ese tramo. Si se separaran, la leyenda mentiría.
  it('cada tramo de la leyenda coincide con lo que devuelve la escala', () => {
    for (const t of tramosLeyenda(1200)) {
      const medio = (t.desde + t.hasta) / 2;
      expect(colorPresion(medio, 1200)).toBe(t.color);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('la rampa tiene la resolución que el croquis necesita', () => {
  const c = paleta("claro");

  it('⚠ CINCO PASOS POR BRAZO, Y NO TRES', () => {
    // Con tres, un caso real se pintaba de dos colores: en el galpón con voladizo, la zona 1
    // de cubierta, la zona 4 de pared y la zona 2 caían todas en el mismo paso. El color
    // dejaba de decir algo. Este test no custodia el cinco —se puede discutir— sino que
    // custodia que no vuelva a bajar sin que alguien lo mire.
    expect(c.succion.length).toBeGreaterThanOrEqual(5);
    expect(c.presion.length).toBe(c.succion.length);
    expect(paleta("oscuro").succion.length).toBe(c.succion.length);
    expect(paleta("oscuro").presion.length).toBe(c.succion.length);
  });

  it('el caso que motivó el cambio ya usa cuatro tonos', () => {
    // Las presiones medidas sobre el galpón con voladizo en modo C&R, con su máximo.
    const max = 4210;
    const vals = [-1640, -1790, -2220, -3010, -3440];
    const tonos = new Set(vals.map(v => colorPresion(v, max)));
    expect(tonos.size).toBeGreaterThanOrEqual(4);
  });

  it('⚠ EL PASO MÁS DÉBIL NO ES EL NEUTRO: una succión chica se ve', () => {
    // Antes el primer paso era `#b7d3f6`, a 1,54:1 contra la tarjeta blanca, y una succión
    // chica se veía igual que «nada». Acá hay banda neutra aparte —|p| < NULO— así que el
    // paso más claro significa «poca presión, pero la hay».
    expect(colorPresion(-(NULO + 1), 100000)).toBe(c.succion[0]);
    expect(c.succion[0]).not.toBe(c.neutro);
  });

  it('los dos brazos avanzan en el mismo orden: débil primero, fuerte último', () => {
    // Si un brazo estuviera al revés, una succión fuerte se dibujaría pálida y el croquis
    // diría lo contrario de lo que pasa.
    const paso = (v, m) => c.succion.indexOf(colorPresion(-v, m));
    expect(paso(100, 1000)).toBeLessThan(paso(500, 1000));
    expect(paso(500, 1000)).toBeLessThan(paso(1000, 1000));
  });
});
